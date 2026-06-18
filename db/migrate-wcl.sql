-- Jefe de Guerra — migración: añade la columna wcl_guild_id a la tabla teams.
-- Para bases de datos ya creadas (schema.sql ya incluye la columna para BD nuevas).
-- Apply: wrangler d1 execute jefe-de-guerra --remote --file=db/migrate-wcl.sql
--   (usa --local en lugar de --remote para la BD de desarrollo)

ALTER TABLE teams ADD COLUMN wcl_guild_id INTEGER;
