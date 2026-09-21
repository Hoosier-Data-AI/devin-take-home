import { resolve } from "node:path";
import { writeAppScaffold, type ScaffoldInput } from "../app-scaffolder.js";

function readArgument(name: string): string {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing required --${name} argument.`);
  }
  return value;
}

const input: ScaffoldInput = {
  id: readArgument("id"),
  label: readArgument("label"),
  owner: readArgument("owner"),
  riskTier: readArgument("risk") as ScaffoldInput["riskTier"],
  dataClassification: readArgument(
    "data"
  ) as ScaffoldInput["dataClassification"]
};
const outputDirectory = resolve(readArgument("output"));
const files = writeAppScaffold(input, outputDirectory);

console.log(`Generated ${files.length} files in ${outputDirectory}:`);
for (const file of files) {
  console.log(`- ${file.path}`);
}
