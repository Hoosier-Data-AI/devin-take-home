import type { KycStatus } from "./domain.js";
import { AuthorizationError, ConflictError } from "./errors.js";
import type { DemoPersona, Permission } from "./personas.js";

export function requirePermission(
  persona: DemoPersona,
  permission: Permission
): void {
  if (!persona.permissions.includes(permission)) {
    throw new AuthorizationError(
      `${persona.label} does not have the ${permission} permission.`
    );
  }
}

export function assertAllowedKycTransition(
  oldStatus: KycStatus,
  newStatus: KycStatus
): void {
  if (
    oldStatus !== "pending" ||
    (newStatus !== "approved" && newStatus !== "rejected")
  ) {
    throw new ConflictError(
      `KYC cases can only transition from pending to approved or rejected. Current status: ${oldStatus}.`
    );
  }
}
