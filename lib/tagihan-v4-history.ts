import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type TagihanV4HistoryItem = {
  tagihanId: string;
  nis: string;
  santriNama: string;
  kelas: string;
  tagihanLabel: string;
  action: "edit" | "lunas";
  nominalBayar: number;
};

export type TagihanV4HistoryFile = {
  name: string;
  url: string;
  size: number;
};

export type TagihanV4HistoryEntry = {
  id: string;
  batchName: string;
  metode: "TUNAI" | "TRANSFER";
  adminUsername: string;
  createdAt: string;
  totalItem: number;
  totalSantri: number;
  totalNominal: number;
  items: TagihanV4HistoryItem[];
  files: TagihanV4HistoryFile[];
};

const DATA_DIR = path.join(process.cwd(), "data", "tagihan-v4");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

async function ensureStorage() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function readTagihanV4History(): Promise<TagihanV4HistoryEntry[]> {
  await ensureStorage();
  try {
    const raw = await readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as TagihanV4HistoryEntry[];
  } catch {
    return [];
  }
}

export async function appendTagihanV4History(entry: TagihanV4HistoryEntry) {
  const current = await readTagihanV4History();
  const next = [entry, ...current];
  await writeFile(HISTORY_FILE, JSON.stringify(next, null, 2), "utf8");
}
