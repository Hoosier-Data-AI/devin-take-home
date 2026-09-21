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
    ? "Seeded 12 synthetic KYC cases."
    : "Database already contains KYC cases; no data was changed."
);
