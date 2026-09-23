import { describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";
import { openDatabase } from "../server/database.js";
import { assertDemoRuntimeAllowed } from "../server/runtime.js";

describe("demo runtime guard", () => {
  it("refuses production mode", () => {
    expect(() => assertDemoRuntimeAllowed("production")).toThrow(
      "refuses to start in production mode"
    );

    const database = openDatabase(":memory:");
    expect(() => createApp({ database, nodeEnv: "production" })).toThrow(
      "refuses to start in production mode"
    );
    database.close();
  });

  it("allows development and test modes", () => {
    expect(() => assertDemoRuntimeAllowed("development")).not.toThrow();
    expect(() => assertDemoRuntimeAllowed("test")).not.toThrow();
  });
});
