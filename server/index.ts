import { createApp } from "./app.js";
import {
  openDatabase,
  seedDatabaseIfEmpty
} from "./database.js";
import { assertDemoRuntimeAllowed } from "./runtime.js";

assertDemoRuntimeAllowed();

const port = Number(process.env.PORT ?? 3001);
const database = openDatabase();
const seeded = seedDatabaseIfEmpty(database);
const app = createApp({ database });

app.listen(port, "0.0.0.0", () => {
  console.log(
    `Fintech Operations Workbench API listening on http://localhost:${port}`
  );
  console.log(
    "SYNTHETIC DATA DEMO — persona switching permits impersonation and is not authentication."
  );
  if (seeded) {
    console.log("Seeded missing synthetic workbench modules.");
  }
});
