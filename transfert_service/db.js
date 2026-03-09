const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "transfers.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    fromAccountId TEXT NOT NULL,
    toAccountId TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    executedBy TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )
`);

let _counter = 1;
const nextId = () => `trf-${_counter++}`;

module.exports = { db, nextId };