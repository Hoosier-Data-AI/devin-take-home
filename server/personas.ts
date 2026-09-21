import type { NextFunction, Request, Response } from "express";
import { AuthenticationError } from "./errors.js";

export type Permission =
  | "kyc:read"
  | "kyc:decide"
  | "refund:read"
  | "refund:decide"
  | "feature_flag:read"
  | "feature_flag:manage";

export interface DemoPersona {
  id: string;
  label: string;
  personaType:
    | "viewer"
    | "kyc_reviewer"
    | "refund_reviewer"
    | "feature_flag_admin";
  permissions: readonly Permission[];
}

const personas = [
  {
    id: "viewer-001",
    label: "Operations viewer",
    personaType: "viewer",
    permissions: ["kyc:read", "refund:read", "feature_flag:read"]
  },
  {
    id: "kyc-reviewer-001",
    label: "KYC reviewer",
    personaType: "kyc_reviewer",
    permissions: ["kyc:read", "kyc:decide"]
  },
  {
    id: "refund-reviewer-001",
    label: "Refund reviewer",
    personaType: "refund_reviewer",
    permissions: ["refund:read", "refund:decide"]
  },
  {
    id: "feature-flag-admin-001",
    label: "Feature flag admin",
    personaType: "feature_flag_admin",
    permissions: ["feature_flag:read", "feature_flag:manage"]
  }
] as const satisfies readonly DemoPersona[];

const personaById = new Map<string, DemoPersona>(
  personas.map((persona) => [persona.id, persona])
);

export function listDemoPersonas(): readonly DemoPersona[] {
  return personas;
}

export function requireKnownPersona(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  const personaId = request.header("x-demo-persona-id");
  const persona = personaId ? personaById.get(personaId) : undefined;

  if (!persona) {
    next(new AuthenticationError());
    return;
  }

  request.persona = persona;
  next();
}
