import { useEffect, useState } from "react";
import { fetchPersonas } from "./api";
import { FeatureFlagsWorkspace } from "./modules/FeatureFlagsWorkspace";
import { KycWorkspace } from "./modules/KycWorkspace";
import { RefundsWorkspace } from "./modules/RefundsWorkspace";
import type { DemoPersona } from "./types";

type WorkbenchModule = "kyc" | "refunds" | "feature-flags";

const moduleConfiguration: Record<
  WorkbenchModule,
  {
    label: string;
    shortLabel: string;
    defaultPersonaId: string;
  }
> = {
  kyc: {
    label: "KYC review",
    shortLabel: "KYC",
    defaultPersonaId: "kyc-reviewer-001"
  },
  refunds: {
    label: "Refunds dashboard",
    shortLabel: "Refunds",
    defaultPersonaId: "refund-reviewer-001"
  },
  "feature-flags": {
    label: "Feature-flag admin",
    shortLabel: "Feature flags",
    defaultPersonaId: "feature-flag-admin-001"
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

      <header className="topbar">
        <div>
          <p className="eyebrow">Reusable internal operations platform</p>
          <h1>Fintech Operations Workbench</h1>
        </div>
        <label className="persona-control">
          <span>Acting as</span>
          <select
            aria-label="Demo persona"
            onChange={(event) => setPersonaId(event.target.value)}
            value={personaId}
          >
            {personas.length === 0 ? (
              <option value={personaId}>Loading personas…</option>
            ) : (
              personas.map((persona) => (
                <option key={persona.id} value={persona.id}>
                  {persona.label}
                </option>
              ))
            )}
          </select>
          <small>Development selector</small>
        </label>
      </header>

      <nav className="module-nav" aria-label="Workbench applications">
        {(Object.keys(moduleConfiguration) as WorkbenchModule[]).map(
          (module) => (
            <button
              aria-current={activeModule === module ? "page" : undefined}
              className={activeModule === module ? "active-module" : undefined}
              key={module}
              onClick={() => selectModule(module)}
              type="button"
            >
              <span>{moduleConfiguration[module].shortLabel}</span>
              <small>{moduleConfiguration[module].label}</small>
            </button>
          )
        )}
      </nav>

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
      </main>
    </div>
  );
}
