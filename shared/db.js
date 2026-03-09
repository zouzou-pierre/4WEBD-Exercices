// DB partagée pour tous les services
const Database = require('better-sqlite3');
const path = require('path');

// Détermine le chemin du fichier DB (env > défaut)
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'bank.db');

const db = new Database(dbPath, { fileMustExist: false });

// Robustesse/concurrence de base
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 👉 Option: créer le schéma ici UNE fois (si tu veux centraliser)
// Tu peux aussi laisser chaque service créer SES tables au démarrage.
// Ici je montre le schéma complet (users, accounts, transfers, notifications).

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    firstName  TEXT NOT NULL,
    lastName   TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'USER',
    createdAt  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id        TEXT PRIMARY KEY,
    ownerId   TEXT NOT NULL,
    balance   REAL NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_accounts_owner   ON accounts(ownerId);
  CREATE INDEX IF NOT EXISTS idx_accounts_created ON accounts(createdAt);

  CREATE TABLE IF NOT EXISTS transfers (
    id            TEXT PRIMARY KEY,
    fromAccountId TEXT NOT NULL,
    toAccountId   TEXT NOT NULL,
    amount        REAL NOT NULL,
    currency      TEXT NOT NULL,
    executedBy    TEXT NOT NULL,
    createdAt     TEXT NOT NULL,
    FOREIGN KEY (fromAccountId) REFERENCES accounts(id),
    FOREIGN KEY (toAccountId)   REFERENCES accounts(id),
    FOREIGN KEY (executedBy)    REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(createdAt DESC);

  CREATE TABLE IF NOT EXISTS notifications (
    id        TEXT PRIMARY KEY,
    type      TEXT NOT NULL,
    recipient TEXT NOT NULL,
    message   TEXT NOT NULL,
    metadata  TEXT,
    status    TEXT NOT NULL DEFAULT 'SENT',
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_type    ON notifications(type);
`);

console.log(`[DB] SQLite partagée initialisée: ${dbPath}`);
module.exports = db;