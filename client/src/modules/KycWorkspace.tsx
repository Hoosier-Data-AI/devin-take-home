import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  fetchCase,
  fetchCases,
  submitDecision
} from "../api";
import { AuditHistory } from "../components/AuditHistory";
import { Badge } from "../components/Badge";
import {
  QueueTable,
  type QueueColumn
} from "../components/QueueTable";
import { formatDate } from "../format";
import type {
  KycCase,
  KycCaseDetail,
  KycStatus,
  RiskLevel
} from "../types";
import type { WorkspaceProps } from "./types";

export function KycWorkspace({ personaId, persona }: WorkspaceProps) {
  const [statusFilter, setStatusFilter] = useState<KycStatus | "">("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "">("");
  const [cases, setCases] = useState<KycCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<KycCaseDetail | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const queueRequestId = useRef(0);
  const detailRequestId = useRef(0);

  const loadCases = useCallback(async () => {
    const requestId = ++queueRequestId.current;
    setLoading(true);
    setError("");
    try {
      const nextCases = await fetchCases(personaId, {
        status: statusFilter,
        risk: riskFilter
      });
      if (requestId === queueRequestId.current) {
        setCases(nextCases);
      }
    } catch (loadError) {
      if (requestId !== queueRequestId.current) {
        return;
      }
      setCases([]);
      setSelectedCase(null);
      setError(
        loadError instanceof Error ? loadError.message : "Could not load cases."
      );
    } finally {
      if (requestId === queueRequestId.current) {
        setLoading(false);
      }
    }
  }, [personaId, riskFilter, statusFilter]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  async function openCase(item: KycCase): Promise<void> {
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    setError("");
    setNotice("");
    setReason("");
    try {
      const detail = await fetchCase(personaId, item.id);
      if (requestId === detailRequestId.current) {
        setSelectedCase(detail);
      }
    } catch (loadError) {
      if (requestId !== detailRequestId.current) {
        return;
      }
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the case."
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
    if (!selectedCase || reason.trim().length === 0) {
      setError("Enter a reason before making a decision.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const updated = await submitDecision(personaId, selectedCase.id, {
        decision,
        reason,
        expectedVersion: selectedCase.version
      });
      setSelectedCase(updated);
      setReason("");
      setNotice(`Case ${updated.id} was ${decision}.`);
      await loadCases();
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "The decision could not be saved."
      );
      const refreshed = await fetchCase(personaId, selectedCase.id).catch(
        () => null
      );
      if (refreshed) {
        setSelectedCase(refreshed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo<QueueColumn<KycCase>[]>(
    () => [
      {
        key: "case",
        label: "Case",
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
        key: "risk",
        label: "Risk",
        render: (item) => <Badge kind="risk" value={item.risk} />
      },
      {
        key: "status",
        label: "Status",
        render: (item) => <Badge kind="status" value={item.status} />
      },
      {
        key: "submitted",
        label: "Submitted",
        className: "date-column",
        render: (item) => formatDate(item.submittedAt)
      }
    ],
    []
  );

  const canDecide =
    persona?.permissions.includes("kyc:decide") === true &&
    selectedCase?.status === "pending";

  return (
    <>
      <section className="workspace-heading">
        <div>
          <p className="eyebrow">KYC review</p>
          <h2>Case queue</h2>
          <p>Prioritized by risk, then submission time.</p>
        </div>
        <div className="queue-summary">
          <strong>{cases.length}</strong>
          <span>visible cases</span>
        </div>
      </section>

      <section className="filters" aria-label="KYC queue filters">
        <label>
          Status
          <select
            onChange={(event) => {
              queueRequestId.current += 1;
              setStatusFilter(event.target.value as KycStatus | "");
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
        <button className="secondary-button" onClick={() => void loadCases()}>
          Refresh
        </button>
      </section>

      {error ? <div className="message error-message">{error}</div> : null}
      {notice ? <div className="message success-message">{notice}</div> : null}

      <div className="workspace-grid">
        <section className="queue-panel">
          {loading ? (
            <div className="loading-state">Loading KYC queue…</div>
          ) : (
            <QueueTable
              columns={columns}
              emptyMessage="No cases match these filters."
              onSelect={(item) => void openCase(item)}
              rows={cases}
              selectedId={selectedCase?.id}
            />
          )}
        </section>

        <aside className="detail-panel">
          {detailLoading ? (
            <div className="loading-state">Loading case detail…</div>
          ) : selectedCase ? (
            <>
              <div className="detail-heading">
                <div>
                  <p className="eyebrow">Case detail</p>
                  <h2>{selectedCase.id}</h2>
                </div>
                <Badge kind="status" value={selectedCase.status} />
              </div>

              <dl className="case-facts">
                <div>
                  <dt>Synthetic customer</dt>
                  <dd>{selectedCase.customerName}</dd>
                </div>
                <div>
                  <dt>Customer ID</dt>
                  <dd>{selectedCase.customerId}</dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>
                    <Badge kind="risk" value={selectedCase.risk} />
                  </dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{selectedCase.version}</dd>
                </div>
                <div className="wide-fact">
                  <dt>Submitted</dt>
                  <dd>{formatDate(selectedCase.submittedAt)}</dd>
                </div>
              </dl>

              <form className="decision-form">
                <label htmlFor="kyc-decision-reason">Decision reason</label>
                <textarea
                  disabled={!canDecide || submitting}
                  id="kyc-decision-reason"
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    canDecide
                      ? "Required for approval or rejection"
                      : "Only a KYC reviewer can decide a pending case"
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

              <AuditHistory events={selectedCase.auditEvents} />
            </>
          ) : (
            <div className="detail-placeholder">
              <div className="placeholder-mark">KYC</div>
              <h2>Select a case</h2>
              <p>
                Review case facts, make permitted decisions, and inspect the
                audit trail.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
