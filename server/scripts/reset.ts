import {
  openDatabase,
  resetDatabase
} from "../database.js";
import { assertDemoRuntimeAllowed } from "../runtime.js";

assertDemoRuntimeAllowed();
const database = openDatabase();
resetDatabase(database);
database.close();

console.log("Reset the demo database to 12 synthetic KYC cases.");
