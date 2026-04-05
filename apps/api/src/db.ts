import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type ActivityRecord, type RegistryDatabase, nowIso } from "@stellarmesh/shared";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(currentDir, "..", "..", "..", "data", "dev-db.json");

export async function readDb(): Promise<RegistryDatabase> {
  const raw = await fs.readFile(dbPath, "utf8");
  return JSON.parse(raw) as RegistryDatabase;
}

export async function writeDb(db: RegistryDatabase): Promise<void> {
  await fs.writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

export async function appendActivity(entry: Omit<ActivityRecord, "id" | "createdAt">): Promise<void> {
  const db = await readDb();
  db.activity.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: nowIso(),
    ...entry,
  });
  db.activity = db.activity.slice(0, 150);
  await writeDb(db);
}
