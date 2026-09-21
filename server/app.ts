import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response
} from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z, ZodError } from "zod";
import type { AuditWriter } from "./audit.js";
import { insertAuditEvent } from "./audit.js";
import type { WorkbenchDatabase } from "./database.js";
import { HttpError } from "./errors.js";
import {
  getFeatureFlag,
  listFeatureFlags,
  toggleFeatureFlag
} from "./feature-flag-service.js";
import {
  decideKycCase,
  getKycCase,
  listKycCases
} from "./kyc-service.js";
import {
  listDemoPersonas,
  requireKnownPersona
} from "./personas.js";
import { getPlatformOverview } from "./platform-catalog.js";
import { runPlatformGovernanceChecks } from "./platform-governance.js";
import { requirePermission } from "./policies.js";
import {
  decideRefundRequest,
  getRefundRequest,
  listRefundRequests
} from "./refund-service.js";
import { assertDemoRuntimeAllowed } from "./runtime.js";

const filtersSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  risk: z.enum(["low", "medium", "high"]).optional()
});

const decisionSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    reason: z.string().transform((value) => value.trim()).pipe(z.string().min(1).max(500)),
    expectedVersion: z.number().int().positive()
  })
  .strict();

const featureFlagFiltersSchema = z.object({
  environment: z.enum(["development", "staging", "production"]).optional(),
  state: z.enum(["enabled", "disabled"]).optional()
});

const featureFlagToggleSchema = z
  .object({
    enabled: z.boolean(),
    reason: z.string().transform((value) => value.trim()).pipe(z.string().min(1).max(500)),
    expectedVersion: z.number().int().positive()
  })
  .strict();

export interface AppOptions {
  database: WorkbenchDatabase;
  auditWriter?: AuditWriter;
  nodeEnv?: string;
  clientDirectory?: string;
}

export function createApp(options: AppOptions): express.Express {
  assertDemoRuntimeAllowed(options.nodeEnv);
  const app = express();
  const auditWriter = options.auditWriter ?? insertAuditEvent;

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", requireKnownPersona);

  app.get("/api/demo/personas", (request, response) => {
    response.json({
      selectedPersonaId: request.persona.id,
      personas: listDemoPersonas(),
      warning:
        "Development-only persona switching is not authentication and permits impersonation by design."
    });
  });

  app.get("/api/health", (request, response) => {
    response.json({
      ok: true,
      actorId: request.persona.id,
      mode: "synthetic-demo"
    });
  });

  app.get("/api/platform/overview", (request, response, next) => {
    try {
      requirePermission(request.persona, "platform:read");
      const governance = runPlatformGovernanceChecks(resolve("."));
      response.json({
        ...getPlatformOverview(),
        accelerator: {
          scaffoldCommand:
            "npm run scaffold:app -- --id disputes --label \"Dispute review\" --owner \"Payment Operations\" --risk elevated --data restricted --output ../dispute-review",
          generatedFiles: [
            "application manifest",
            "typed service",
            "React workspace",
            "starter test",
            "integration checklist"
          ],
          governanceCommand: "npm run governance",
          passingChecks: governance.checks.filter((check) => check.passed)
            .length,
          totalChecks: governance.checks.length,
          passed: governance.passed
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/kyc/cases", (request, response, next) => {
    try {
      requirePermission(request.persona, "kyc:read");
      const filters = filtersSchema.parse(request.query);
      response.json({ cases: listKycCases(options.database, filters) });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/kyc/cases/:caseId", (request, response, next) => {
    try {
      requirePermission(request.persona, "kyc:read");
      response.json({ case: getKycCase(options.database, request.params.caseId) });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/kyc/cases/:caseId/decision", (request, response, next) => {
    try {
      requirePermission(request.persona, "kyc:decide");
      const decision = decisionSchema.parse(request.body);
      const updatedCase = decideKycCase(
        options.database,
        {
          caseId: request.params.caseId,
          actorId: request.persona.id,
          ...decision
        },
        auditWriter
      );
      response.json({ case: updatedCase });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/refunds", (request, response, next) => {
    try {
      requirePermission(request.persona, "refund:read");
      const filters = filtersSchema.parse(request.query);
      response.json({
        refunds: listRefundRequests(options.database, filters)
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/refunds/:refundId", (request, response, next) => {
    try {
      requirePermission(request.persona, "refund:read");
      response.json({
        refund: getRefundRequest(options.database, request.params.refundId)
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/refunds/:refundId/decision", (request, response, next) => {
    try {
      requirePermission(request.persona, "refund:decide");
      const decision = decisionSchema.parse(request.body);
      const refund = decideRefundRequest(
        options.database,
        {
          refundId: request.params.refundId,
          actorId: request.persona.id,
          ...decision
        },
        auditWriter
      );
      response.json({ refund });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/feature-flags", (request, response, next) => {
    try {
      requirePermission(request.persona, "feature_flag:read");
      const filters = featureFlagFiltersSchema.parse(request.query);
      response.json({
        flags: listFeatureFlags(options.database, filters)
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/feature-flags/:flagId", (request, response, next) => {
    try {
      requirePermission(request.persona, "feature_flag:read");
      response.json({
        flag: getFeatureFlag(options.database, request.params.flagId)
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/feature-flags/:flagId/toggle", (request, response, next) => {
    try {
      requirePermission(request.persona, "feature_flag:manage");
      const toggle = featureFlagToggleSchema.parse(request.body);
      const flag = toggleFeatureFlag(
        options.database,
        {
          flagId: request.params.flagId,
          actorId: request.persona.id,
          ...toggle
        },
        auditWriter
      );
      response.json({ flag });
    } catch (error) {
      next(error);
    }
  });

  const clientDirectory = options.clientDirectory ?? resolve("dist/client");
  if (existsSync(clientDirectory)) {
    app.use(express.static(clientDirectory));
    app.use(
      (
        request: Request,
        response: Response,
        next: NextFunction
      ): void => {
        if (
          request.method === "GET" &&
          !request.path.startsWith("/api") &&
          request.accepts("html")
        ) {
          response.sendFile(resolve(clientDirectory, "index.html"));
          return;
        }
        next();
      }
    );
  }

  app.use((request, response) => {
    response.status(404).json({
      error: {
        code: "not_found",
        message: `No route matches ${request.method} ${request.path}.`
      }
    });
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    _request,
    response,
    _next
  ) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: {
          code: "invalid_request",
          message: "Request validation failed.",
          issues: error.issues
        }
      });
      return;
    }

    if (error instanceof HttpError) {
      response.status(error.status).json({
        error: {
          code: error.code,
          message: error.message
        }
      });
      return;
    }

    console.error(error);
    response.status(500).json({
      error: {
        code: "internal_error",
        message: "The demo could not complete the request."
      }
    });
  };
  app.use(errorHandler);

  return app;
}
