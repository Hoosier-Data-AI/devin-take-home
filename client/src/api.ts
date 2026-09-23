import type {
  AuditEntityType,
  AuditEvent,
  DemoPersona,
  FeatureFlag,
  FeatureFlagDetail,
  FeatureFlagEnvironment,
  FeatureFlagState,
  KycCase,
  KycCaseDetail,
  KycStatus,
  PlatformOverview,
  RefundRequest,
  RefundRequestDetail,
  RefundStatus,
  RiskLevel
} from "./types";

interface ApiErrorBody {
  error?: {
    message?: string;
  };
}

async function request<T>(
  path: string,
  personaId: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-demo-persona-id": personaId,
      ...init?.headers
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.error?.message ?? `Request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export async function fetchPersonas(
  personaId: string
): Promise<DemoPersona[]> {
  const body = await request<{ personas: DemoPersona[] }>(
    "/api/demo/personas",
    personaId
  );
  return body.personas;
}

export function fetchPlatformOverview(
  personaId: string
): Promise<PlatformOverview> {
  return request<PlatformOverview>("/api/platform/overview", personaId);
}

export async function fetchPlatformAudit(
  personaId: string,
  filters: { entityType: AuditEntityType | "" }
): Promise<AuditEvent[]> {
  const search = new URLSearchParams();
  if (filters.entityType) {
    search.set("entityType", filters.entityType);
  }
  const query = search.size > 0 ? `?${search.toString()}` : "";
  const body = await request<{ events: AuditEvent[] }>(
    `/api/platform/audit${query}`,
    personaId
  );
  return body.events;
}

export async function fetchCases(
  personaId: string,
  filters: { status: KycStatus | ""; risk: RiskLevel | "" }
): Promise<KycCase[]> {
  const search = new URLSearchParams();
  if (filters.status) {
    search.set("status", filters.status);
  }
  if (filters.risk) {
    search.set("risk", filters.risk);
  }
  const query = search.size > 0 ? `?${search.toString()}` : "";
  const body = await request<{ cases: KycCase[] }>(
    `/api/kyc/cases${query}`,
    personaId
  );
  return body.cases;
}

export async function fetchCase(
  personaId: string,
  caseId: string
): Promise<KycCaseDetail> {
  const body = await request<{ case: KycCaseDetail }>(
    `/api/kyc/cases/${caseId}`,
    personaId
  );
  return body.case;
}

export async function submitDecision(
  personaId: string,
  caseId: string,
  input: {
    decision: "approved" | "rejected";
    reason: string;
    expectedVersion: number;
  }
): Promise<KycCaseDetail> {
  const body = await request<{ case: KycCaseDetail }>(
    `/api/kyc/cases/${caseId}/decision`,
    personaId,
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
  return body.case;
}

export async function fetchRefunds(
  personaId: string,
  filters: { status: RefundStatus | ""; risk: RiskLevel | "" }
): Promise<RefundRequest[]> {
  const search = new URLSearchParams();
  if (filters.status) {
    search.set("status", filters.status);
  }
  if (filters.risk) {
    search.set("risk", filters.risk);
  }
  const query = search.size > 0 ? `?${search.toString()}` : "";
  const body = await request<{ refunds: RefundRequest[] }>(
    `/api/refunds${query}`,
    personaId
  );
  return body.refunds;
}

export async function fetchRefund(
  personaId: string,
  refundId: string
): Promise<RefundRequestDetail> {
  const body = await request<{ refund: RefundRequestDetail }>(
    `/api/refunds/${refundId}`,
    personaId
  );
  return body.refund;
}

export async function submitRefundDecision(
  personaId: string,
  refundId: string,
  input: {
    decision: "approved" | "rejected";
    reason: string;
    expectedVersion: number;
  }
): Promise<RefundRequestDetail> {
  const body = await request<{ refund: RefundRequestDetail }>(
    `/api/refunds/${refundId}/decision`,
    personaId,
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
  return body.refund;
}

export async function fetchFeatureFlags(
  personaId: string,
  filters: {
    environment: FeatureFlagEnvironment | "";
    state: FeatureFlagState | "";
  }
): Promise<FeatureFlag[]> {
  const search = new URLSearchParams();
  if (filters.environment) {
    search.set("environment", filters.environment);
  }
  if (filters.state) {
    search.set("state", filters.state);
  }
  const query = search.size > 0 ? `?${search.toString()}` : "";
  const body = await request<{ flags: FeatureFlag[] }>(
    `/api/feature-flags${query}`,
    personaId
  );
  return body.flags;
}

export async function fetchFeatureFlag(
  personaId: string,
  flagId: string
): Promise<FeatureFlagDetail> {
  const body = await request<{ flag: FeatureFlagDetail }>(
    `/api/feature-flags/${flagId}`,
    personaId
  );
  return body.flag;
}

export async function submitFeatureFlagToggle(
  personaId: string,
  flagId: string,
  input: {
    enabled: boolean;
    reason: string;
    expectedVersion: number;
  }
): Promise<FeatureFlagDetail> {
  const body = await request<{ flag: FeatureFlagDetail }>(
    `/api/feature-flags/${flagId}/toggle`,
    personaId,
    {
      method: "POST",
      body: JSON.stringify(input)
    }
  );
  return body.flag;
}
