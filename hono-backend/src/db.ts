import Database from 'better-sqlite3'

// Vytvoríme databázu (súbor talkspace.db)
export const db = new Database('talkspace.db')

// Vytvoríme tabuľky ak neexistujú
db.exec(`
  -- Tabuľka používateľov
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  -- Tabuľka serverov (ako Discord servery)
  CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    owner_id INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  -- Tabuľka členov servera
  CREATE TABLE IF NOT EXISTS server_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(server_id, user_id)
  );

  -- Tabuľka kanálov
  CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
  );

  -- Tabuľka správ
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT,
    attachment_url TEXT,
    attachment_type TEXT,
    attachment_name TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

// Ak tabuľka už existovala, pridáme nové stĺpce
try {
  db.exec(`ALTER TABLE messages ADD COLUMN attachment_url TEXT;`)
} catch (e) {
  // Stĺpec už existuje
}

try {
  db.exec(`ALTER TABLE messages ADD COLUMN attachment_type TEXT;`)
} catch (e) {
  // Stĺpec už existuje
}

try {
  db.exec(`ALTER TABLE messages ADD COLUMN attachment_name TEXT;`)
} catch (e) {
  // Stĺpec už existuje
}

console.log('✅ Database initialized!')
