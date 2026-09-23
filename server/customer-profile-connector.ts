import { z } from "zod";

export const customerProfileSchema = z
  .object({
    customerId: z.string().min(1),
    segment: z.enum(["consumer", "business"]),
    accountAgeDays: z.number().int().nonnegative(),
    supportTier: z.enum(["standard", "priority"])
  })
  .strict();

export type CustomerProfile = z.infer<typeof customerProfileSchema>;

const syntheticProfiles = [
  {
    customerId: "CUST-1001",
    segment: "consumer",
    accountAgeDays: 740,
    supportTier: "priority"
  },
  {
    customerId: "CUST-1002",
    segment: "business",
    accountAgeDays: 315,
    supportTier: "standard"
  }
] as const;

export const connectorDefinitions = [
  {
    id: "customer-profile",
    name: "Customer profile API",
    owner: "Customer Platform",
    mode: "synthetic-contract",
    status: "contract-verified",
    direction: "read-only",
    contractPath: "contracts/customer-profile.openapi.json",
    controls: [
      "Strict response schema",
      "Typed adapter boundary",
      "Mocked contract tests",
      "Production secret isolation"
    ]
  }
] as const;

export function getSyntheticCustomerProfile(
  customerId: string
): CustomerProfile | null {
  const profile = syntheticProfiles.find(
    (candidate) => candidate.customerId === customerId
  );
  return profile ? customerProfileSchema.parse(profile) : null;
}
