import { DatabaseSync } from "node:sqlite";

export function openStore(filename = ":memory:") {
  const db = new DatabaseSync(filename);
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS creation_receipts (
      request_id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      result_json TEXT NOT NULL
    ) STRICT;
  `);
  const receipt = db.prepare("SELECT title, result_json FROM creation_receipts WHERE request_id = ?");
  const insert = db.prepare("INSERT INTO todos (title, created_at) VALUES (?, ?)");
  const saveReceipt = db.prepare("INSERT INTO creation_receipts VALUES (?, ?, ?)");
  return {
    create(title, requestId) {
      // One distinct creation per request. Repeating it returns the saved result.
      db.exec("BEGIN IMMEDIATE");
      try {
        const saved = receipt.get(requestId);
        if (saved) {
          const result = saved.title === title
            ? { ...JSON.parse(saved.result_json), replayed: true }
            : { error: { code: "WRITE_LIMIT", message: "This slice allows one distinct new todo per request. Ask separately for the next todo." } };
          db.exec("COMMIT");
          return result;
        }
        const created_at = new Date().toISOString();
        const id = Number(insert.run(title, created_at).lastInsertRowid);
        const result = { todo: { id, title, created_at }, replayed: false };
        saveReceipt.run(requestId, title, JSON.stringify(result));
        db.exec("COMMIT");
        return result;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    list() {
      const todos = db.prepare("SELECT * FROM todos ORDER BY id LIMIT 10").all();
      const total = db.prepare("SELECT COUNT(*) AS count FROM todos").get().count;
      return { todos, total, limit: 10, has_more: total > todos.length };
    },
    close() { db.close(); },
  };
}
