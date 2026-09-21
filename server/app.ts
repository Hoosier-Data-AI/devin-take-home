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
  decideKycCase,
  getKycCase,
  listKycCases
} from "./kyc-service.js";
import {
  listDemoPersonas,
  requireKnownPersona
} from "./personas.js";
import { requirePermission } from "./policies.js";
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
