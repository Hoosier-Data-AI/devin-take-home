import {
  openDatabase,
  seedDatabaseIfEmpty
} from "../database.js";
import { assertDemoRuntimeAllowed } from "../runtime.js";

assertDemoRuntimeAllowed();
const database = openDatabase();
const seeded = seedDatabaseIfEmpty(database);
database.close();

console.log(
  seeded
    ? "Seeded missing synthetic workbench modules."
    : "All synthetic workbench modules already contain data; no data was changed."
);
