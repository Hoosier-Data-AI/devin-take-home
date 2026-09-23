import type { DemoPersona } from "../types";

export interface WorkspaceProps {
  personaId: string;
  persona?: DemoPersona | undefined;
}
