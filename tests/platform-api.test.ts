import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";
import {
  openDatabase,
  seedDatabase,
  type WorkbenchDatabase
} from "../server/database.js";

describe("platform overview API", () => {
  let database: WorkbenchDatabase;

  beforeEach(() => {
    database = openDatabase(":memory:");
    seedDatabase(database);
  });

  afterEach(() => {
    database.close();
  });

  it("returns the application catalog and inherited controls", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    const response = await request(app)
      .get("/api/platform/overview")
      .set("x-demo-persona-id", "platform-admin-001")
      .expect(200);

    expect(response.body.applications).toHaveLength(3);
    expect(response.body.applications[2]).toMatchObject({
      id: "feature-flags",
      riskTier: "critical",
      permissions: ["feature_flag:read", "feature_flag:manage"]
    });
    expect(response.body.sharedControls).toContain(
      "Atomic state and audit writes"
    );
    expect(response.body.extensionSteps).toHaveLength(6);
    expect(response.body.accelerator).toMatchObject({
      governanceCommand: "npm run governance",
      passingChecks: 25,
      totalChecks: 25,
      passed: true
    });
    expect(response.body.connectors).toContainEqual(
      expect.objectContaining({
        id: "customer-profile",
        status: "contract-verified",
        contractPath: "contracts/customer-profile.openapi.json"
      })
    );
  });

  it("keeps the platform catalog restricted to the platform role", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .get("/api/platform/overview")
      .set("x-demo-persona-id", "viewer-001")
      .expect(403);
  });

  it("returns audit activity from every application in one feed", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .post("/api/kyc/cases/KYC-1001/decision")
      .set("x-demo-persona-id", "kyc-reviewer-001")
      .send({
        decision: "approved",
        reason: "Documents verified.",
        expectedVersion: 1
      })
      .expect(200);

    const response = await request(app)
      .get("/api/platform/audit")
      .set("x-demo-persona-id", "platform-admin-001")
      .expect(200);

    const entityTypes = new Set(
      response.body.events.map((event: { entityType: string }) => event.entityType)
    );
    expect(entityTypes).toEqual(
      new Set(["kyc_case", "refund_request", "feature_flag"])
    );
    expect(response.body.events[0]).toMatchObject({
      actorId: "kyc-reviewer-001",
      entityType: "kyc_case",
      entityId: "KYC-1001",
      action: "kyc.case.approved",
      reason: "Documents verified."
    });
  });

  it("filters the audit feed by application", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    const response = await request(app)
      .get("/api/platform/audit?entityType=feature_flag&limit=3")
      .set("x-demo-persona-id", "platform-admin-001")
      .expect(200);

    expect(response.body.events).toHaveLength(3);
    for (const event of response.body.events) {
      expect(event.entityType).toBe("feature_flag");
    }
  });

  it("rejects audit feed reads without the platform permission", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .get("/api/platform/audit")
      .set("x-demo-persona-id", "kyc-reviewer-001")
      .expect(403);
  });

  it("rejects an unknown audit feed filter value", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .get("/api/platform/audit?entityType=payroll")
      .set("x-demo-persona-id", "platform-admin-001")
      .expect(400);
  });
});
