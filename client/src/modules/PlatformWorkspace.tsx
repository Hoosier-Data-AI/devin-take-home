import { useEffect, useState } from "react";
import { fetchPlatformAudit, fetchPlatformOverview } from "../api";
import { entityTypeLabel, formatDate, titleCase } from "../format";
import type {
  AuditEntityType,
  AuditEvent,
  PlatformOverview
} from "../types";
import type { WorkspaceProps } from "./types";

const auditSources: Array<{ value: AuditEntityType | ""; label: string }> = [
  { value: "", label: "All applications" },
  { value: "kyc_case", label: "KYC review" },
  { value: "refund_request", label: "Refunds dashboard" },
  { value: "feature_flag", label: "Feature-flag admin" }
];

export function PlatformWorkspace({ personaId }: WorkspaceProps) {
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState("");
  const [auditSource, setAuditSource] = useState<AuditEntityType | "">("");
  const [actorId, setActorId] = useState("");
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditError, setAuditError] = useState("");

  useEffect(() => {
    void fetchPlatformOverview(personaId)
      .then((nextOverview) => {
        setOverview(nextOverview);
        setError("");
      })
      .catch((loadError: unknown) => {
        setOverview(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the platform overview."
        );
      });
  }, [personaId]);

  useEffect(() => {
    let active = true;
    void fetchPlatformAudit(personaId, { entityType: auditSource, actorId })
      .then((events) => {
        if (!active) {
          return;
        }
        setAuditEvents(events);
        setAuditError("");
      })
      .catch((loadError: unknown) => {
        if (!active) {
          return;
        }
        setAuditEvents([]);
        setAuditError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load the activity log."
        );
      });
    return () => {
      active = false;
    };
  }, [actorId, auditSource, personaId]);

  if (error) {
    return <div className="message error-message">{error}</div>;
  }

  if (!overview) {
    return <div className="loading-state">Loading platform overview…</div>;
  }

  return (
    <>
      <section className="platform-section">
        <div className="section-title-row">
          <h2>Audit history</h2>
          <div className="audit-filters">
            <label className="audit-source-filter">
              <span>Application</span>
              <select
                onChange={(event) =>
                  setAuditSource(event.target.value as AuditEntityType | "")
                }
                value={auditSource}
              >
                {auditSources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="audit-source-filter">
              <span>Actor</span>
              <select
                onChange={(event) => setActorId(event.target.value)}
                value={actorId}
              >
                <option value="">All actors</option>
                {overview.personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {auditError ? (
          <div className="message error-message">{auditError}</div>
        ) : (
          <div className="access-table-wrap">
            <table className="access-table activity-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Record</th>
                  <th>Change</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No recorded activity for this filter.</td>
                  </tr>
                ) : (
                  auditEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDate(event.createdAt)}</td>
                      <td>{event.actorId}</td>
                      <td>
                        <strong>{event.entityId}</strong>
                        <span>{entityTypeLabel(event.entityType)}</span>
                      </td>
                      <td>
                        {event.oldStatus ?? "new"} → {event.newStatus}
                      </td>
                      <td>{event.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="platform-section">
        <div className="section-title-row">
          <h2>Access</h2>
        </div>
        <div className="access-table-wrap">
          <table className="access-table">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Type</th>
                <th>Effective permissions</th>
              </tr>
            </thead>
            <tbody>
              {overview.personas.map((persona) => (
                <tr key={persona.id}>
                  <td>
                    <strong>{persona.label}</strong>
                    <span>{persona.id}</span>
                  </td>
                  <td>{titleCase(persona.personaType)}</td>
                  <td>
                    <div className="permission-list">
                      {persona.permissions.map((permission) => (
                        <code key={permission}>{permission}</code>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
