import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAppScaffold,
  writeAppScaffold
} from "../server/app-scaffolder.js";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("application scaffolder", () => {
  it("generates a typed module starter and governance manifest", () => {
    const files = createAppScaffold({
      id: "dispute-review",
      label: "Dispute review",
      owner: "Payment Operations",
      riskTier: "elevated",
      dataClassification: "restricted"
    });

    expect(files.map((file) => file.path)).toEqual([
      "app.manifest.json",
      "server/dispute-review-service.ts",
      "client/DisputeReviewWorkspace.tsx",
      "tests/dispute-review-service.test.ts",
      "README.md"
    ]);
    expect(files[0]?.content).toContain('"dispute_review:manage"');
    expect(files[1]?.content).toContain(
      "export function listDisputeReviewRecords"
    );
  });

  it("escapes labels that would otherwise break the generated code", () => {
    const files = createAppScaffold({
      id: "disputes",
      label: 'Customer\'s "</h2>" disputes',
      owner: "Payment Operations",
      riskTier: "elevated",
      dataClassification: "restricted"
    });

    expect(files[2]?.content).toContain(
      '<h2>{"Customer\'s \\"</h2>\\" disputes"}</h2>'
    );
    expect(files[3]?.content).toContain(
      'describe("Customer\'s \\"</h2>\\" disputes service"'
    );
  });

  it("writes the scaffold without touching the live application", () => {
    const parent = mkdtempSync(join(tmpdir(), "workbench-scaffold-"));
    temporaryDirectories.push(parent);
    const output = join(parent, "disputes");

    writeAppScaffold(
      {
        id: "disputes",
        label: "Disputes",
        owner: "Payment Operations",
        riskTier: "elevated",
        dataClassification: "restricted"
      },
      output
    );

    expect(readFileSync(join(output, "app.manifest.json"), "utf8")).toContain(
      '"owner": "Payment Operations"'
    );
  });

  it("rejects invalid application identifiers", () => {
    expect(() =>
      createAppScaffold({
        id: "Disputes!",
        label: "Disputes",
        owner: "Payment Operations",
        riskTier: "elevated",
        dataClassification: "restricted"
      })
    ).toThrow("App ID must use lowercase kebab-case.");
  });
});
