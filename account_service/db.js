const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "accounts.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL
  )
`);

let _counter = 1;
const nextId = () => `acc-${_counter++}`;

module.exports = { db, nextId };