import type {
  DemoPersona,
  KycCase,
  KycCaseDetail,
  KycStatus,
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
