import * as SQLite from "expo-sqlite";

const DB_NAME = "sunflare-mobile.db";

let database: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (database) {
    return database;
  }

  database = await SQLite.openDatabaseAsync(DB_NAME);
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pending_gps_pings (
      id TEXT PRIMARY KEY NOT NULL,
      shift_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pending_knocks (
      client_id TEXT PRIMARY KEY NOT NULL,
      idempotency_key TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      outcome TEXT NOT NULL,
      follow_up_at TEXT,
      notes_enc TEXT,
      address_enc TEXT,
      suburb_enc TEXT,
      postcode_enc TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );
  `);

  return database;
}

export async function clearLocalUserData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM pending_gps_pings;
    DELETE FROM pending_knocks;
    DELETE FROM app_meta WHERE key = 'active_shift_id';
  `);
}
