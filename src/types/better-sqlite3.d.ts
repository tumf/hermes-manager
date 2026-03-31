declare module 'better-sqlite3' {
  interface DatabaseOptions {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: ((message?: unknown, ...optionalParams: unknown[]) => void) | undefined;
  }

  interface Statement {
    all(params?: unknown): unknown[];
    get(params?: unknown): unknown;
    run(params?: unknown): { changes: number; lastInsertRowid: number | bigint };
  }

  interface Database {
    prepare(sql: string): Statement;
    close(): void;
  }

  const Database: {
    new (filename: string, options?: DatabaseOptions): Database;
  };

  namespace Database {
    type Database = import('better-sqlite3').Database;
  }

  export = Database;
}
