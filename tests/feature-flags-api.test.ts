import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../server/app.js";
import {
  openDatabase,
  seedDatabase,
  type WorkbenchDatabase
} from "../server/database.js";
import { getFeatureFlag } from "../server/feature-flag-service.js";

const administrator = "feature-flag-admin-001";

describe("feature flag API", () => {
  let database: WorkbenchDatabase;

  beforeEach(() => {
    database = openDatabase(":memory:");
    seedDatabase(database);
  });

  afterEach(() => {
    database.close();
  });

  it("lists filtered flags and records an authorized toggle", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    const queue = await request(app)
      .get("/api/feature-flags?environment=production&state=disabled")
      .set("x-demo-persona-id", administrator)
      .expect(200);

    expect(queue.body.flags).toHaveLength(2);

    const response = await request(app)
      .post("/api/feature-flags/FLAG-3003/toggle")
      .set("x-demo-persona-id", administrator)
      .send({
        enabled: true,
        reason: "  Enable for the synthetic review walkthrough.  ",
        expectedVersion: 5
      })
      .expect(200);

    expect(response.body.flag).toMatchObject({
      id: "FLAG-3003",
      enabled: true,
      version: 6
    });
    expect(response.body.flag.auditEvents[0]).toMatchObject({
      actorId: administrator,
      entityType: "feature_flag",
      action: "feature_flag.enabled",
      oldStatus: "disabled",
      newStatus: "enabled",
      reason: "Enable for the synthetic review walkthrough."
    });
  });

  it("allows viewer reads but enforces domain-specific management", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .get("/api/feature-flags")
      .set("x-demo-persona-id", "viewer-001")
      .expect(200);

    await request(app)
      .post("/api/feature-flags/FLAG-3003/toggle")
      .set("x-demo-persona-id", "refund-reviewer-001")
      .send({
        enabled: true,
        reason: "Cross-domain management must fail.",
        expectedVersion: 5
      })
      .expect(403);
  });

  it("rejects blank, stale, and no-op toggles", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .post("/api/feature-flags/FLAG-3003/toggle")
      .set("x-demo-persona-id", administrator)
      .send({
        enabled: true,
        reason: " ",
        expectedVersion: 5
      })
      .expect(400);

    await request(app)
      .post("/api/feature-flags/FLAG-3003/toggle")
      .set("x-demo-persona-id", administrator)
      .send({
        enabled: true,
        reason: "Stale request.",
        expectedVersion: 99
      })
      .expect(409);

    await request(app)
      .post("/api/feature-flags/FLAG-3003/toggle")
      .set("x-demo-persona-id", administrator)
      .send({
        enabled: false,
        reason: "No state change.",
        expectedVersion: 5
      })
      .expect(409);
  });

  it("rolls back a flag toggle when audit insertion fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const app = createApp({
      database,
      nodeEnv: "test",
      auditWriter: () => {
        throw new Error("Injected audit failure");
      }
    });

    await request(app)
      .post("/api/feature-flags/FLAG-3003/toggle")
      .set("x-demo-persona-id", administrator)
      .send({
        enabled: true,
        reason: "This transaction must roll back.",
        expectedVersion: 5
      })
      .expect(500);

    expect(getFeatureFlag(database, "FLAG-3003")).toMatchObject({
      enabled: false,
      version: 5
    });
    consoleError.mockRestore();
  });
});
