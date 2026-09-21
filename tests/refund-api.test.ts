import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../server/app.js";
import {
  openDatabase,
  seedDatabase,
  type WorkbenchDatabase
} from "../server/database.js";
import { getRefundRequest } from "../server/refund-service.js";

const reviewer = "refund-reviewer-001";

describe("refund API", () => {
  let database: WorkbenchDatabase;

  beforeEach(() => {
    database = openDatabase(":memory:");
    seedDatabase(database);
  });

  afterEach(() => {
    database.close();
  });

  it("lists filtered refunds and allows a refund reviewer decision", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    const queue = await request(app)
      .get("/api/refunds?status=pending&risk=high")
      .set("x-demo-persona-id", reviewer)
      .expect(200);

    expect(queue.body.refunds).toHaveLength(2);
    expect(
      queue.body.refunds.every(
        (refund: { status: string; risk: string }) =>
          refund.status === "pending" && refund.risk === "high"
      )
    ).toBe(true);

    const response = await request(app)
      .post("/api/refunds/REF-2002/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "approved",
        reason: "  Synthetic evidence supports the refund.  ",
        expectedVersion: 1
      })
      .expect(200);

    expect(response.body.refund).toMatchObject({
      id: "REF-2002",
      status: "approved",
      version: 2
    });
    expect(response.body.refund.auditEvents[0]).toMatchObject({
      actorId: reviewer,
      entityType: "refund_request",
      action: "refund.request.approved",
      oldStatus: "pending",
      newStatus: "approved",
      reason: "Synthetic evidence supports the refund."
    });
  });

  it("enforces domain permissions and ignores forged roles", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .get("/api/refunds")
      .set("x-demo-persona-id", "kyc-reviewer-001")
      .expect(403);

    await request(app)
      .post("/api/refunds/REF-2001/decision")
      .set("x-demo-persona-id", "viewer-001")
      .send({
        decision: "approved",
        reason: "A forged role must not grant access.",
        expectedVersion: 1,
        role: "refund_reviewer"
      })
      .expect(403);

    expect(getRefundRequest(database, "REF-2001")).toMatchObject({
      status: "pending",
      version: 1
    });
  });

  it("rejects blank, stale, and repeated decisions", async () => {
    const app = createApp({ database, nodeEnv: "test" });

    await request(app)
      .post("/api/refunds/REF-2001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "approved",
        reason: " ",
        expectedVersion: 1
      })
      .expect(400);

    await request(app)
      .post("/api/refunds/REF-2001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "approved",
        reason: "Stale request.",
        expectedVersion: 99
      })
      .expect(409);

    await request(app)
      .post("/api/refunds/REF-2001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "rejected",
        reason: "First valid decision.",
        expectedVersion: 1
      })
      .expect(200);

    await request(app)
      .post("/api/refunds/REF-2001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "approved",
        reason: "Repeated decision.",
        expectedVersion: 1
      })
      .expect(409);
  });

  it("rolls back a refund decision when audit insertion fails", async () => {
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
      .post("/api/refunds/REF-2001/decision")
      .set("x-demo-persona-id", reviewer)
      .send({
        decision: "approved",
        reason: "This transaction must roll back.",
        expectedVersion: 1
      })
      .expect(500);

    expect(getRefundRequest(database, "REF-2001")).toMatchObject({
      status: "pending",
      version: 1
    });
    consoleError.mockRestore();
  });
});
