import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const contents = await readFile(path, "utf8");
    return JSON.parse(contents) as T;
  } catch {
    return null;
  }
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  await ensureDirectory(dirname(path));

  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, contents, "utf8");
  await rename(tempPath, path);
}
