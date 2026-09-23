import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  customerProfileSchema,
  getSyntheticCustomerProfile
} from "../server/customer-profile-connector.js";

describe("customer profile connector contract", () => {
  it("returns a schema-validated synthetic profile", () => {
    expect(getSyntheticCustomerProfile("CUST-1001")).toEqual({
      customerId: "CUST-1001",
      segment: "consumer",
      accountAgeDays: 740,
      supportTier: "priority"
    });
    expect(getSyntheticCustomerProfile("missing")).toBeNull();
  });

  it("rejects responses outside the strict connector contract", () => {
    expect(() =>
      customerProfileSchema.parse({
        customerId: "CUST-1001",
        segment: "consumer",
        accountAgeDays: 740,
        supportTier: "priority",
        productionToken: "not-allowed"
      })
    ).toThrow();
  });

  it("keeps the local adapter aligned with the OpenAPI fixture", () => {
    const contract = JSON.parse(
      readFileSync(
        resolve("contracts/customer-profile.openapi.json"),
        "utf8"
      )
    ) as {
      components: {
        schemas: {
          CustomerProfile: {
            required: string[];
          };
        };
      };
    };

    expect(contract.components.schemas.CustomerProfile.required).toEqual([
      "customerId",
      "segment",
      "accountAgeDays",
      "supportTier"
    ]);
  });
});
