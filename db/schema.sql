-- Jefe de Guerra — D1 schema (guild dynamic content).
-- Apply: wrangler d1 execute jefe-de-guerra --file=db/schema.sql [--local|--remote]

PRAGMA foreign_keys = ON;

-- ── Guild identity (singleton row id=1) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild (
  id               INTEGER PRIMARY KEY CHECK (id = 1),
  name             TEXT NOT NULL,
  motto            TEXT NOT NULL,
  badge            TEXT NOT NULL,
  faction          TEXT NOT NULL,
  server           TEXT NOT NULL,
  game             TEXT NOT NULL,
  schedule_days     TEXT NOT NULL,
  schedule_time     TEXT NOT NULL,
  schedule_timezone TEXT NOT NULL,
  schedule_note     TEXT
);

-- About paragraphs: kind = 'who' (quiénes somos) | 'vibe' (ambiente)
CREATE TABLE IF NOT EXISTS about_paragraphs (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  kind  TEXT NOT NULL CHECK (kind IN ('who', 'vibe')),
  sort  INTEGER NOT NULL DEFAULT 0,
  text  TEXT NOT NULL
);

-- ── Raid progression ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phases (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  label         TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('completed', 'in-progress', 'upcoming')),
  status_label  TEXT NOT NULL,
  sort          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS raids (
  id        TEXT PRIMARY KEY,
  phase_id  TEXT NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  abbr      TEXT,
  sort      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bosses (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  raid_id   TEXT NOT NULL REFERENCES raids(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  defeated  INTEGER NOT NULL DEFAULT 0,
  sort      INTEGER NOT NULL DEFAULT 0
);

-- ── Raid teams (Cores) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  schedule_days     TEXT NOT NULL,
  schedule_time     TEXT NOT NULL,
  schedule_timezone TEXT NOT NULL,
  ssc_kills         INTEGER NOT NULL DEFAULT 0,
  ssc_total         INTEGER NOT NULL DEFAULT 6,
  tk_kills          INTEGER NOT NULL DEFAULT 0,
  tk_total          INTEGER NOT NULL DEFAULT 4,
  recruiting        INTEGER NOT NULL DEFAULT 0,
  note              TEXT,
  wcl_guild_id      INTEGER,
  sort              INTEGER NOT NULL DEFAULT 0
);

-- ── Officers ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS officers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,
  wow_class   TEXT NOT NULL,
  class_label TEXT NOT NULL,
  line        TEXT NOT NULL,
  sort        INTEGER NOT NULL DEFAULT 0
);

-- ── Recruitment ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recruitment_meta (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  intro        TEXT NOT NULL,
  discord_url  TEXT NOT NULL,
  whatsapp_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recruit_needs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  label     TEXT NOT NULL,
  priority  TEXT NOT NULL CHECK (priority IN ('alta', 'media', 'baja')),
  sort      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recruit_requirements (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  text  TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

-- ── Feats (últimas hazañas / kills) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feats (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  boss        TEXT NOT NULL,
  raid        TEXT NOT NULL,
  date        TEXT NOT NULL,           -- ISO yyyy-mm-dd
  team        TEXT,
  first_kill  INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0
);

-- ── FAQ ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faq (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  q     TEXT NOT NULL,
  a     TEXT NOT NULL,
  sort  INTEGER NOT NULL DEFAULT 0
);

-- ── Community (Discord widget + raid nights for the countdown) ───────────────
CREATE TABLE IF NOT EXISTS community_meta (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  discord_server_id TEXT NOT NULL DEFAULT '',
  raid_timezone     TEXT NOT NULL DEFAULT 'Europe/Madrid'
);

CREATE TABLE IF NOT EXISTS raid_nights (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  team     TEXT,
  weekday  INTEGER NOT NULL,   -- 0=Dom .. 6=Sáb
  time     TEXT NOT NULL,      -- 'HH:MM' en raid_timezone
  sort     INTEGER NOT NULL DEFAULT 0
);

-- ── WarcraftLogs cache (progreso + hazañas agregados de los 7 cores) ─────────
-- Evita pegarle a la API de WCL en cada request (ver db/migrate-wcl-cache.sql).
CREATE TABLE IF NOT EXISTS wcl_cache (
  key        TEXT PRIMARY KEY,
  json       TEXT NOT NULL,
  fetched_at INTEGER NOT NULL   -- epoch ms (Date.now())
);
