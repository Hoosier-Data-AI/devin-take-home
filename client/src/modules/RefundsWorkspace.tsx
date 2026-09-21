import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  fetchRefund,
  fetchRefunds,
  submitRefundDecision
} from "../api";
import { AuditHistory } from "../components/AuditHistory";
import { Badge } from "../components/Badge";
import {
  QueueTable,
  type QueueColumn
} from "../components/QueueTable";
import {
  formatCurrency,
  formatDate,
  titleCase
} from "../format";
import type {
  RefundRequest,
  RefundRequestDetail,
  RefundStatus,
  RiskLevel
} from "../types";
import type { WorkspaceProps } from "./types";

export function RefundsWorkspace({ personaId, persona }: WorkspaceProps) {
  const [statusFilter, setStatusFilter] = useState<RefundStatus | "">("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "">("");
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [selectedRefund, setSelectedRefund] =
    useState<RefundRequestDetail | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const queueRequestId = useRef(0);
  const detailRequestId = useRef(0);

  const loadRefunds = useCallback(async () => {
    const requestId = ++queueRequestId.current;
    setLoading(true);
    setError("");
    try {
      const nextRefunds = await fetchRefunds(personaId, {
        status: statusFilter,
        risk: riskFilter
      });
      if (requestId === queueRequestId.current) {
        setRefunds(nextRefunds);
      }
    } catch (loadError) {
      if (requestId !== queueRequestId.current) {
        return;
      }
      setRefunds([]);
      setSelectedRefund(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load refunds."
      );
    } finally {
      if (requestId === queueRequestId.current) {
        setLoading(false);
      }
    }
  }, [personaId, riskFilter, statusFilter]);

  useEffect(() => {
    void loadRefunds();
  }, [loadRefunds]);

  async function openRefund(item: RefundRequest): Promise<void> {
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    setError("");
    setNotice("");
    setReason("");
    try {
      const detail = await fetchRefund(personaId, item.id);
      if (requestId === detailRequestId.current) {
        setSelectedRefund(detail);
      }
    } catch (loadError) {
      if (requestId !== detailRequestId.current) {
        return;
      }
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the refund."
      );
    } finally {
      if (requestId === detailRequestId.current) {
        setDetailLoading(false);
      }
    }
  }

  async function decide(
    event: FormEvent,
    decision: "approved" | "rejected"
  ): Promise<void> {
    event.preventDefault();
    if (!selectedRefund || reason.trim().length === 0) {
      setError("Enter a reason before making a decision.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const updated = await submitRefundDecision(
        personaId,
        selectedRefund.id,
        {
          decision,
          reason,
          expectedVersion: selectedRefund.version
        }
      );
      setSelectedRefund(updated);
      setReason("");
      setNotice(`Refund ${updated.id} was ${decision}.`);
      await loadRefunds();
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "The refund decision could not be saved."
      );
      const refreshed = await fetchRefund(
        personaId,
        selectedRefund.id
      ).catch(() => null);
      if (refreshed) {
        setSelectedRefund(refreshed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo<QueueColumn<RefundRequest>[]>(
    () => [
      {
        key: "refund",
        label: "Refund",
        render: (item) => (
          <div>
            <strong>{item.id}</strong>
            <span className="subtle">{item.customerId}</span>
          </div>
        )
      },
      {
        key: "customer",
        label: "Synthetic customer",
        render: (item) => item.customerName
      },
      {
        key: "amount",
        label: "Amount",
        render: (item) => formatCurrency(item.amountCents)
      },
      {
        key: "risk",
        label: "Risk",
        render: (item) => <Badge kind="risk" value={item.risk} />
      },
      {
        key: "status",
        label: "Status",
        render: (item) => <Badge kind="status" value={item.status} />
      }
    ],
    []
  );

  const canDecide =
    persona?.permissions.includes("refund:decide") === true &&
    selectedRefund?.status === "pending";

  return (
    <>
      <section className="workspace-heading">
        <div>
          <p className="eyebrow">Refund operations</p>
          <h2>Refund dashboard</h2>
          <p>High-risk and high-value requests rise to the top.</p>
        </div>
        <div className="queue-summary">
          <strong>{refunds.length}</strong>
          <span>visible refunds</span>
        </div>
      </section>

      <section className="filters" aria-label="Refund filters">
        <label>
          Status
          <select
            onChange={(event) => {
              queueRequestId.current += 1;
              setStatusFilter(event.target.value as RefundStatus | "");
            }}
            value={statusFilter}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
        <label>
          Risk
          <select
            onChange={(event) => {
              queueRequestId.current += 1;
              setRiskFilter(event.target.value as RiskLevel | "");
            }}
            value={riskFilter}
          >
            <option value="">All risks</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <button className="secondary-button" onClick={() => void loadRefunds()}>
          Refresh
        </button>
      </section>

      {error ? <div className="message error-message">{error}</div> : null}
      {notice ? <div className="message success-message">{notice}</div> : null}

      <div className="workspace-grid">
        <section className="queue-panel">
          {loading ? (
            <div className="loading-state">Loading refund dashboard…</div>
          ) : (
            <QueueTable
              columns={columns}
              emptyMessage="No refunds match these filters."
              onSelect={(item) => void openRefund(item)}
              rows={refunds}
              selectedId={selectedRefund?.id}
            />
          )}
        </section>

        <aside className="detail-panel">
          {detailLoading ? (
            <div className="loading-state">Loading refund detail…</div>
          ) : selectedRefund ? (
            <>
              <div className="detail-heading">
                <div>
                  <p className="eyebrow">Refund detail</p>
                  <h2>{selectedRefund.id}</h2>
                </div>
                <Badge kind="status" value={selectedRefund.status} />
              </div>

              <dl className="case-facts">
                <div>
                  <dt>Synthetic customer</dt>
                  <dd>{selectedRefund.customerName}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{formatCurrency(selectedRefund.amountCents)}</dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{titleCase(selectedRefund.category)}</dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>
                    <Badge kind="risk" value={selectedRefund.risk} />
                  </dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{selectedRefund.version}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDate(selectedRefund.submittedAt)}</dd>
                </div>
              </dl>

              <form className="decision-form">
                <label htmlFor="refund-decision-reason">Decision reason</label>
                <textarea
                  disabled={!canDecide || submitting}
                  id="refund-decision-reason"
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    canDecide
                      ? "Required for approval or rejection"
                      : "Only a refund reviewer can decide a pending request"
                  }
                  rows={4}
                  value={reason}
                />
                <div className="decision-actions">
                  <button
                    className="approve-button"
                    disabled={!canDecide || submitting || !reason.trim()}
                    onClick={(event) => void decide(event, "approved")}
                    type="submit"
                  >
                    Approve
                  </button>
                  <button
                    className="reject-button"
                    disabled={!canDecide || submitting || !reason.trim()}
                    onClick={(event) => void decide(event, "rejected")}
                    type="submit"
                  >
                    Reject
                  </button>
                </div>
              </form>

              <AuditHistory events={selectedRefund.auditEvents} />
            </>
          ) : (
            <div className="detail-placeholder">
              <div className="placeholder-mark">RF</div>
              <h2>Select a refund</h2>
              <p>
                Review request context, decide permitted refunds, and inspect
                the audit trail.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
