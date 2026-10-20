/**
 * Minimal synchronous SQL surface. The Durable Object passes
 * `ctx.storage.sql`; unit tests pass a node:sqlite adapter.
 */
export type SqlValue = string | number | null | ArrayBuffer;

export interface SqlCursorLike<T> {
  toArray(): T[];
}

export interface SqlLike {
  exec<T extends Record<string, SqlValue>>(
    query: string,
    ...bindings: SqlValue[]
  ): SqlCursorLike<T>;
}

export interface SqlDb {
  sql: SqlLike;
  /** Run fn atomically; roll back if it throws. */
  transaction<T>(fn: () => T): T;
}

export function all<T>(db: SqlDb, query: string, ...bindings: SqlValue[]): T[] {
  return db.sql
    .exec<Record<string, SqlValue>>(query, ...bindings)
    .toArray() as unknown as T[];
}

export function first<T>(
  db: SqlDb,
  query: string,
  ...bindings: SqlValue[]
): T | null {
  const rows = all<T>(db, query, ...bindings);
  return rows[0] ?? null;
}

export function run(db: SqlDb, query: string, ...bindings: SqlValue[]): void {
  db.sql.exec(query, ...bindings).toArray();
}
