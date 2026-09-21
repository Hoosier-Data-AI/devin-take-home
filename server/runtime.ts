export function assertDemoRuntimeAllowed(nodeEnv = process.env.NODE_ENV): void {
  if (nodeEnv === "production") {
    throw new Error(
      "Fintech Operations Workbench is a synthetic-data demo and refuses to start in production mode."
    );
  }
}
