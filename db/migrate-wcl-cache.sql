-- Jefe de Guerra — migración: tabla de caché para los datos de WarcraftLogs.
-- Evita pegarle a la API de WCL en cada request (límites de rate). El módulo
-- guarda aquí el resultado agregado (progreso + hazañas) con su timestamp.
-- Apply: wrangler d1 execute jefe-de-guerra --remote --file=db/migrate-wcl-cache.sql
--   (usa --local en lugar de --remote para la BD de desarrollo)

CREATE TABLE IF NOT EXISTS wcl_cache (
  key        TEXT PRIMARY KEY,
  json       TEXT NOT NULL,
  fetched_at INTEGER NOT NULL   -- epoch ms (Date.now())
);
