import type {
  KycStatus,
  RefundStatus
} from "./domain.js";
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
  assertAllowedDecisionTransition("KYC cases", oldStatus, newStatus);
}

export function assertAllowedRefundTransition(
  oldStatus: RefundStatus,
  newStatus: RefundStatus
): void {
  assertAllowedDecisionTransition("Refund requests", oldStatus, newStatus);
}

function assertAllowedDecisionTransition(
  entityLabel: string,
  oldStatus: "pending" | "approved" | "rejected",
  newStatus: "pending" | "approved" | "rejected"
): void {
  if (
    oldStatus !== "pending" ||
    (newStatus !== "approved" && newStatus !== "rejected")
  ) {
    throw new ConflictError(
      `${entityLabel} can only transition from pending to approved or rejected. Current status: ${oldStatus}.`
    );
  }
}
