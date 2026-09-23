import type { AuditEvent } from "../types";
import { formatDate, pluralize, titleCase } from "../format";

export function AuditHistory({ events }: { events: AuditEvent[] }) {
  return (
    <section className="audit-section">
      <div className="section-title-row">
        <h3>Audit history</h3>
        <span>{pluralize(events.length, "event")}</span>
      </div>
      <ol className="audit-list">
        {events.map((event) => (
          <li key={event.id}>
            <div className="audit-dot" />
            <div>
              <div className="audit-title">
                <strong>{titleCase(event.action)}</strong>
                <span>{formatDate(event.createdAt)}</span>
              </div>
              <p>{event.reason}</p>
              <small>
                Actor: {event.actorId} · {event.oldStatus ?? "new"} →{" "}
                {event.newStatus}
              </small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
