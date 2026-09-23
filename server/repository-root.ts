import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function findRepositoryRoot(
  startDirectory = dirname(fileURLToPath(import.meta.url))
): string {
  let directory = resolve(startDirectory);

  for (;;) {
    if (existsSync(resolve(directory, "package.json"))) {
      return directory;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      return resolve(".");
    }
    directory = parent;
  }
}
