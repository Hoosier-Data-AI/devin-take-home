import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  fetchFeatureFlag,
  fetchFeatureFlags,
  submitFeatureFlagToggle
} from "../api";
import { AuditHistory } from "../components/AuditHistory";
import { Badge } from "../components/Badge";
import {
  QueueTable,
  type QueueColumn
} from "../components/QueueTable";
import { formatDate } from "../format";
import type {
  FeatureFlag,
  FeatureFlagDetail,
  FeatureFlagEnvironment,
  FeatureFlagState
} from "../types";
import type { WorkspaceProps } from "./types";

export function FeatureFlagsWorkspace({
  personaId,
  persona
}: WorkspaceProps) {
  const [environmentFilter, setEnvironmentFilter] =
    useState<FeatureFlagEnvironment | "">("");
  const [stateFilter, setStateFilter] = useState<FeatureFlagState | "">("");
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [selectedFlag, setSelectedFlag] =
    useState<FeatureFlagDetail | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const queueRequestId = useRef(0);
  const detailRequestId = useRef(0);

  const loadFlags = useCallback(async () => {
    const requestId = ++queueRequestId.current;
    setLoading(true);
    setError("");
    try {
      const nextFlags = await fetchFeatureFlags(personaId, {
        environment: environmentFilter,
        state: stateFilter
      });
      if (requestId === queueRequestId.current) {
        setFlags(nextFlags);
      }
    } catch (loadError) {
      if (requestId !== queueRequestId.current) {
        return;
      }
      setFlags([]);
      setSelectedFlag(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load feature flags."
      );
    } finally {
      if (requestId === queueRequestId.current) {
        setLoading(false);
      }
    }
  }, [environmentFilter, personaId, stateFilter]);

  useEffect(() => {
    void loadFlags();
  }, [loadFlags]);

  async function openFlag(item: FeatureFlag): Promise<void> {
    const requestId = ++detailRequestId.current;
    setDetailLoading(true);
    setError("");
    setNotice("");
    setReason("");
    try {
      const detail = await fetchFeatureFlag(personaId, item.id);
      if (requestId === detailRequestId.current) {
        setSelectedFlag(detail);
      }
    } catch (loadError) {
      if (requestId !== detailRequestId.current) {
        return;
      }
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the feature flag."
      );
    } finally {
      if (requestId === detailRequestId.current) {
        setDetailLoading(false);
      }
    }
  }

  async function toggle(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!selectedFlag || reason.trim().length === 0) {
      setError("Enter a reason before changing the flag.");
      return;
    }

    const enabled = !selectedFlag.enabled;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const updated = await submitFeatureFlagToggle(
        personaId,
        selectedFlag.id,
        {
          enabled,
          reason,
          expectedVersion: selectedFlag.version
        }
      );
      setSelectedFlag(updated);
      setReason("");
      setNotice(
        `Flag ${updated.key} was ${updated.enabled ? "enabled" : "disabled"}.`
      );
      await loadFlags();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "The flag change could not be saved."
      );
      const refreshed = await fetchFeatureFlag(
        personaId,
        selectedFlag.id
      ).catch(() => null);
      if (refreshed) {
        setSelectedFlag(refreshed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo<QueueColumn<FeatureFlag>[]>(
    () => [
      {
        key: "flag",
        label: "Flag",
        render: (item) => (
          <div>
            <strong>{item.key}</strong>
            <span className="subtle">{item.id}</span>
          </div>
        )
      },
      {
        key: "environment",
        label: "Environment",
        render: (item) => (
          <Badge kind="environment" value={item.environment} />
        )
      },
      {
        key: "owner",
        label: "Owner",
        render: (item) => item.owner
      },
      {
        key: "state",
        label: "State",
        render: (item) => (
          <Badge
            kind="status"
            value={item.enabled ? "enabled" : "disabled"}
          />
        )
      },
      {
        key: "updated",
        label: "Updated",
        className: "date-column",
        render: (item) => formatDate(item.updatedAt)
      }
    ],
    []
  );

  const canManage =
    persona?.permissions.includes("feature_flag:manage") === true &&
    selectedFlag !== null;

  return (
    <>
      <section className="workspace-heading">
        <div>
          <p className="eyebrow">Feature management</p>
          <h2>Feature-flag admin</h2>
          <p>Synthetic flags only; no SDK or production system is connected.</p>
        </div>
        <div className="queue-summary">
          <strong>{flags.length}</strong>
          <span>visible flags</span>
        </div>
      </section>

      <section className="filters" aria-label="Feature flag filters">
        <label>
          Environment
          <select
            onChange={(event) => {
              queueRequestId.current += 1;
              setEnvironmentFilter(
                event.target.value as FeatureFlagEnvironment | ""
              );
            }}
            value={environmentFilter}
          >
            <option value="">All environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </label>
        <label>
          State
          <select
            onChange={(event) => {
              queueRequestId.current += 1;
              setStateFilter(event.target.value as FeatureFlagState | "");
            }}
            value={stateFilter}
          >
            <option value="">All states</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
        <button className="secondary-button" onClick={() => void loadFlags()}>
          Refresh
        </button>
      </section>

      {error ? <div className="message error-message">{error}</div> : null}
      {notice ? <div className="message success-message">{notice}</div> : null}

      <div className="workspace-grid">
        <section className="queue-panel">
          {loading ? (
            <div className="loading-state">Loading feature flags…</div>
          ) : (
            <QueueTable
              columns={columns}
              emptyMessage="No feature flags match these filters."
              onSelect={(item) => void openFlag(item)}
              rows={flags}
              selectedId={selectedFlag?.id}
            />
          )}
        </section>

        <aside className="detail-panel">
          {detailLoading ? (
            <div className="loading-state">Loading feature flag detail…</div>
          ) : selectedFlag ? (
            <>
              <div className="detail-heading">
                <div>
                  <p className="eyebrow">Flag detail</p>
                  <h2 className="flag-key">{selectedFlag.key}</h2>
                </div>
                <Badge
                  kind="status"
                  value={selectedFlag.enabled ? "enabled" : "disabled"}
                />
              </div>

              <p className="detail-description">{selectedFlag.description}</p>

              <dl className="case-facts">
                <div>
                  <dt>Environment</dt>
                  <dd>
                    <Badge
                      kind="environment"
                      value={selectedFlag.environment}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{selectedFlag.owner}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{selectedFlag.version}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{formatDate(selectedFlag.updatedAt)}</dd>
                </div>
              </dl>

              <form className="decision-form">
                <label htmlFor="flag-change-reason">Change reason</label>
                <textarea
                  disabled={!canManage || submitting}
                  id="flag-change-reason"
                  maxLength={500}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder={
                    canManage
                      ? `Required to ${
                          selectedFlag.enabled ? "disable" : "enable"
                        } this flag`
                      : "Only a feature flag admin can change flags"
                  }
                  rows={4}
                  value={reason}
                />
                <button
                  className={
                    selectedFlag.enabled
                      ? "full-action reject-button"
                      : "full-action approve-button"
                  }
                  disabled={!canManage || submitting || !reason.trim()}
                  onClick={(event) => void toggle(event)}
                  type="submit"
                >
                  {selectedFlag.enabled ? "Disable flag" : "Enable flag"}
                </button>
              </form>

              <AuditHistory events={selectedFlag.auditEvents} />
            </>
          ) : (
            <div className="detail-placeholder">
              <div className="placeholder-mark">FF</div>
              <h2>Select a flag</h2>
              <p>
                Review ownership and environment context before recording a
                versioned state change.
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
