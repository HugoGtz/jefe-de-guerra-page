-- Jefe de Guerra — reemplaza los equipos (Cores) con los 7 reales + WarcraftLogs.
-- Requiere haber aplicado antes db/migrate-wcl.sql (columna wcl_guild_id).
-- Apply: wrangler d1 execute jefe-de-guerra --remote --file=db/update-teams.sql
--   (usa --local en lugar de --remote para la BD de desarrollo)
-- Idempotente: borra todos los equipos y los reinserta.

DELETE FROM teams;

INSERT INTO teams (id, name, schedule_days, schedule_time, schedule_timezone, ssc_kills, ssc_total, tk_kills, tk_total, recruiting, note, wcl_guild_id, sort) VALUES
  ('core-1', 'Core 1', 'Mar · Jue', '21:00', 'CET', 6, 6, 3, 4, 0, 'Roster veterano · cupo completo', 826903, 0),
  ('core-2', 'Core 2', 'Mié · Vie', '21:30', 'CET', 5, 6, 2, 4, 1, 'Buscamos sanadores y DPS a distancia', 826904, 1),
  ('core-3', 'Core 3', 'Lun · Mié', '20:30', 'CET', 4, 6, 2, 4, 1, 'Tanque y DPS cuerpo a cuerpo', 826905, 2),
  ('core-4', 'Core 4', 'Vie · Dom', '22:00', 'CET', 3, 6, 1, 4, 1, 'Roster en formación · todos los roles', 826907, 3),
  ('core-5', 'Core 5', 'Sáb · Dom', '17:00', 'CET', 5, 6, 2, 4, 0, 'Horario diurno de fin de semana', 826908, 4),
  ('core-6', 'Core 6', 'Lun · Jue', '21:00', 'CET', 2, 6, 0, 4, 1, 'Roster joven · buscamos todos los roles', 826909, 5),
  ('core-7', 'Core 7', 'Mié · Sáb', '20:00', 'CET', 1, 6, 0, 4, 1, 'Nuevo core en formación', 826910, 6);
