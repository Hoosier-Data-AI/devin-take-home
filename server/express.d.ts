import type { DemoPersona } from "./personas.js";

declare module "express-serve-static-core" {
  interface Request {
    persona: DemoPersona;
  }
}
