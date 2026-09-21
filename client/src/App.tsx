import { useEffect, useState } from "react";
import { fetchPersonas } from "./api";
import { FeatureFlagsWorkspace } from "./modules/FeatureFlagsWorkspace";
import { KycWorkspace } from "./modules/KycWorkspace";
import { PlatformWorkspace } from "./modules/PlatformWorkspace";
import { RefundsWorkspace } from "./modules/RefundsWorkspace";
import type { DemoPersona } from "./types";

type WorkbenchModule = "kyc" | "refunds" | "feature-flags" | "platform";

const applicationModules: WorkbenchModule[] = [
  "kyc",
  "refunds",
  "feature-flags"
];

const moduleConfiguration: Record<
  WorkbenchModule,
  {
    label: string;
    shortLabel: string;
    description: string;
    defaultPersonaId: string;
    relevantPersonaIds: string[];
  }
> = {
  kyc: {
    label: "KYC review",
    shortLabel: "KYC",
    description: "Identity operations",
    defaultPersonaId: "kyc-reviewer-001",
    relevantPersonaIds: ["kyc-reviewer-001", "viewer-001"]
  },
  refunds: {
    label: "Refunds dashboard",
    shortLabel: "Refunds",
    description: "Payment operations",
    defaultPersonaId: "refund-reviewer-001",
    relevantPersonaIds: ["refund-reviewer-001", "viewer-001"]
  },
  "feature-flags": {
    label: "Feature-flag admin",
    shortLabel: "Feature flags",
    description: "Release operations",
    defaultPersonaId: "feature-flag-admin-001",
    relevantPersonaIds: ["feature-flag-admin-001", "viewer-001"]
  },
  platform: {
    label: "Platform overview",
    shortLabel: "Platform",
    description: "Apps, access, and guardrails",
    defaultPersonaId: "platform-admin-001",
    relevantPersonaIds: ["platform-admin-001"]
  }
};

export function App() {
  const [activeModule, setActiveModule] =
    useState<WorkbenchModule>("kyc");
  const [personaId, setPersonaId] = useState(
    moduleConfiguration.kyc.defaultPersonaId
  );
  const [personas, setPersonas] = useState<DemoPersona[]>([]);
  const [personaError, setPersonaError] = useState("");

  useEffect(() => {
    void fetchPersonas(personaId)
      .then((nextPersonas) => {
        setPersonas(nextPersonas);
        setPersonaError("");
      })
      .catch((loadError: unknown) => {
        setPersonaError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load demo personas."
        );
      });
  }, [personaId]);

  const currentPersona = personas.find((persona) => persona.id === personaId);
  const relevantPersonas = personas.filter((persona) =>
    moduleConfiguration[activeModule].relevantPersonaIds.includes(persona.id)
  );

  function selectModule(module: WorkbenchModule): void {
    setActiveModule(module);
    setPersonaId(moduleConfiguration[module].defaultPersonaId);
  }

  return (
    <div className="app-shell">
      <div className="demo-banner" role="alert">
        <strong>Synthetic-data demo.</strong> No real customers, flags, or
        production credentials. Persona switching is not authentication and
        permits impersonation by design.
      </div>

      <div className="workbench-layout">
        <aside className="app-sidebar">
          <div className="workbench-brand">
            <div className="brand-mark">FO</div>
            <div>
              <strong>Fintech Operations</strong>
              <span>Workbench</span>
            </div>
          </div>

          <nav aria-label="Workbench applications">
            <p className="sidebar-label">Applications</p>
            {applicationModules.map((module) => (
              <button
                aria-current={activeModule === module ? "page" : undefined}
                className={
                  activeModule === module ? "active-module" : undefined
                }
                key={module}
                onClick={() => selectModule(module)}
                type="button"
              >
                <span className="app-monogram">
                  {moduleConfiguration[module].shortLabel.slice(0, 2)}
                </span>
                <span>
                  <strong>{moduleConfiguration[module].label}</strong>
                  <small>{moduleConfiguration[module].description}</small>
                </span>
              </button>
            ))}
            <p className="sidebar-label platform-nav-label">Platform</p>
            <button
              aria-current={activeModule === "platform" ? "page" : undefined}
              className={
                activeModule === "platform" ? "active-module" : undefined
              }
              onClick={() => selectModule("platform")}
              type="button"
            >
              <span className="app-monogram">
                {moduleConfiguration.platform.shortLabel.slice(0, 2)}
              </span>
              <span>
                <strong>{moduleConfiguration.platform.label}</strong>
                <small>{moduleConfiguration.platform.description}</small>
              </span>
            </button>
          </nav>

          <div className="sidebar-foundation">
            <p className="sidebar-label">Shared foundation</p>
            <ul>
              <li>Server authorization</li>
              <li>Versioned writes</li>
              <li>Append-only audit</li>
            </ul>
          </div>
        </aside>

        <div className="workbench-content">
          <header className="topbar">
            <div>
              <p className="eyebrow">Current application</p>
              <h1>{moduleConfiguration[activeModule].label}</h1>
            </div>
            <label className="persona-control">
              <span>Acting as</span>
              <select
                aria-label="Demo persona"
                onChange={(event) => setPersonaId(event.target.value)}
                value={personaId}
              >
                {relevantPersonas.length === 0 ? (
                  <option value={personaId}>Loading personas…</option>
                ) : (
                  relevantPersonas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.label}
                    </option>
                  ))
                )}
              </select>
              <small>Roles for this application</small>
            </label>
          </header>

          <main>
            {personaError ? (
              <div className="message error-message">{personaError}</div>
            ) : null}
            {activeModule === "kyc" ? (
              <KycWorkspace
                key={`${activeModule}:${personaId}`}
                persona={currentPersona}
                personaId={personaId}
              />
            ) : null}
            {activeModule === "refunds" ? (
              <RefundsWorkspace
                key={`${activeModule}:${personaId}`}
                persona={currentPersona}
                personaId={personaId}
              />
            ) : null}
            {activeModule === "feature-flags" ? (
              <FeatureFlagsWorkspace
                key={`${activeModule}:${personaId}`}
                persona={currentPersona}
                personaId={personaId}
              />
            ) : null}
            {activeModule === "platform" ? (
              <PlatformWorkspace
                key={`${activeModule}:${personaId}`}
                persona={currentPersona}
                personaId={personaId}
              />
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
