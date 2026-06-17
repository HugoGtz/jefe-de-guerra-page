-- Jefe de Guerra — D1 seed data (mirrors src/lib/data/*.ts).
-- Apply: wrangler d1 execute jefe-de-guerra --file=db/seed.sql --local
--   (use --remote instead of --local for production)
-- Idempotent: clears every table then re-inserts.
-- (No BEGIN/COMMIT: D1 rejects SQL transactions; it manages them itself.)

DELETE FROM raid_nights;
DELETE FROM community_meta;
DELETE FROM faq;
DELETE FROM feats;
DELETE FROM recruit_requirements;
DELETE FROM recruit_needs;
DELETE FROM recruitment_meta;
DELETE FROM officers;
DELETE FROM teams;
DELETE FROM bosses;
DELETE FROM raids;
DELETE FROM phases;
DELETE FROM about_paragraphs;
DELETE FROM guild;

-- ── Guild identity (singleton id=1) ──────────────────────────────────────────
INSERT INTO guild (id, name, motto, badge, faction, server, game, schedule_days, schedule_time, schedule_timezone, schedule_note) VALUES
  (1,
   'Jefe de Guerra',
   'El orgullo de la Horda en Dreamscythe',
   'Horda · Dreamscythe · TBC Classic',
   'Horda',
   'Dreamscythe',
   'The Burning Crusade Classic',
   'Martes y Jueves',
   '21:00 – 00:00',
   'CET · hora de España (Madrid)',
   'Se espera puntualidad: invocaciones 15 minutos antes del inicio.');

-- ── About paragraphs ─────────────────────────────────────────────────────────
INSERT INTO about_paragraphs (kind, sort, text) VALUES
  ('who', 0, 'Somos <strong>Jefe de Guerra</strong>, una hermandad de la Horda forjada en el servidor Dreamscythe para conquistar el contenido de The Burning Crusade Classic. Reunimos a jugadores hispanohablantes que comparten una misma meta: progresar con constancia, sin dejar atrás el buen rollo.'),
  ('who', 1, 'Tras completar al 100% la Fase 1, marchamos firmes hacia las profundidades de la Caverna del Santuario Serpiente y la Fortaleza de la Tempestad. Cada lockout es un paso más hacia la cima.'),
  ('vibe', 0, 'Aquí se viene a disfrutar. Combinamos raids exigentes con un ambiente cercano: nada de gritos ni dramas, solo gente que quiere mejorar y pasarlo bien entre amigos.'),
  ('vibe', 1, 'Valoramos la asistencia, la actitud y las ganas de aprender por encima del gearscore. Si traes mecánicas aprendidas y respeto por el grupo, encajarás de sobra.');

-- ── Phases ───────────────────────────────────────────────────────────────────
INSERT INTO phases (id, name, label, status, status_label, sort) VALUES
  ('phase-1', 'Fase 1', 'Fase 1', 'completed', 'Completada 100%', 0),
  ('phase-2', 'Fase 2', 'Fase 2', 'in-progress', 'En progreso', 1);

-- ── Raids ────────────────────────────────────────────────────────────────────
INSERT INTO raids (id, phase_id, name, abbr, sort) VALUES
  ('karazhan', 'phase-1', 'Karazhan', NULL, 0),
  ('gruuls-lair', 'phase-1', 'Gruul''s Lair', 'Gruul', 1),
  ('magtheridons-lair', 'phase-1', 'Magtheridon''s Lair', 'Magtheridon', 2),
  ('serpentshrine-cavern', 'phase-2', 'Caverna del Santuario Serpiente', 'SSC', 0),
  ('tempest-keep', 'phase-2', 'Fortaleza de la Tempestad: El Ojo', 'TK', 1);

-- ── Bosses ───────────────────────────────────────────────────────────────────
INSERT INTO bosses (raid_id, name, defeated, sort) VALUES
  ('karazhan', 'Attumen the Huntsman', 1, 0),
  ('karazhan', 'Moroes', 1, 1),
  ('karazhan', 'Maiden of Virtue', 1, 2),
  ('karazhan', 'Opera Event', 1, 3),
  ('karazhan', 'The Curator', 1, 4),
  ('karazhan', 'Terestian Illhoof', 1, 5),
  ('karazhan', 'Shade of Aran', 1, 6),
  ('karazhan', 'Netherspite', 1, 7),
  ('karazhan', 'Chess Event', 1, 8),
  ('karazhan', 'Prince Malchezaar', 1, 9),
  ('gruuls-lair', 'High King Maulgar', 1, 0),
  ('gruuls-lair', 'Gruul the Dragonkiller', 1, 1),
  ('magtheridons-lair', 'Magtheridon', 1, 0),
  ('serpentshrine-cavern', 'Hydross the Unstable', 1, 0),
  ('serpentshrine-cavern', 'The Lurker Below', 1, 1),
  ('serpentshrine-cavern', 'Leotheras the Blind', 1, 2),
  ('serpentshrine-cavern', 'Fathom-Lord Karathress', 1, 3),
  ('serpentshrine-cavern', 'Morogrim Tidewalker', 0, 4),
  ('serpentshrine-cavern', 'Lady Vashj', 0, 5),
  ('tempest-keep', 'Al''ar', 1, 0),
  ('tempest-keep', 'Void Reaver', 1, 1),
  ('tempest-keep', 'High Astromancer Solarian', 0, 2),
  ('tempest-keep', 'Kael''thas Sunstrider', 0, 3);

-- ── Teams (Cores) ────────────────────────────────────────────────────────────
INSERT INTO teams (id, name, schedule_days, schedule_time, schedule_timezone, ssc_kills, ssc_total, tk_kills, tk_total, recruiting, note, sort) VALUES
  ('core-1', 'Core 1', 'Mar · Jue', '21:00', 'CET', 6, 6, 3, 4, 0, 'Roster veterano · cupo completo', 0),
  ('core-2', 'Core 2', 'Mié · Vie', '21:30', 'CET', 5, 6, 2, 4, 1, 'Buscamos sanadores y DPS a distancia', 1),
  ('core-3', 'Core 3', 'Lun · Mié', '20:30', 'CET', 4, 6, 2, 4, 1, 'Tanque y DPS cuerpo a cuerpo', 2),
  ('core-4', 'Core 4', 'Vie · Dom', '22:00', 'CET', 3, 6, 1, 4, 1, 'Roster en formación · todos los roles', 3),
  ('core-5', 'Core 5', 'Sáb · Dom', '17:00', 'CET', 5, 6, 2, 4, 0, 'Horario diurno de fin de semana', 4);

-- ── Officers ─────────────────────────────────────────────────────────────────
INSERT INTO officers (name, role, wow_class, class_label, line, sort) VALUES
  ('Grommash', 'Líder de Guild', 'Warrior', 'Guerrero', 'Funda la estrategia y mantiene firme el estandarte de la Horda.', 0),
  ('Thalyssra', 'Raid Leader', 'Shaman', 'Chamán', 'Marca el ritmo de cada pull y no perdona una mecánica fallada.', 1),
  ('Drakthar', 'Oficial', 'Warlock', 'Brujo', 'Gestiona el loot y mantiene el orden en el caos del raid.', 2),
  ('Sylvara', 'Reclutadora', 'Priest', 'Sacerdote', 'La primera cara amable que verás al unirte a la hermandad.', 3);

-- ── Recruitment ──────────────────────────────────────────────────────────────
INSERT INTO recruitment_meta (id, intro, discord_url, whatsapp_url) VALUES
  (1,
   'Buscamos reforzar el roster de cara a la Fase 2. Si quieres progresar en SSC y TK con un grupo serio pero sin dramas, este es tu sitio.',
   'https://discord.com/invite/szcrkmkQQM',
   'https://chat.whatsapp.com/HBae8Qw03HcG0JflkUgAJE?s=cl&p=i&ilr=1');

INSERT INTO recruit_needs (label, priority, sort) VALUES
  ('Sanadores', 'alta', 0),
  ('DPS a distancia', 'alta', 1),
  ('Tanque (Guerrero / Druida)', 'media', 2),
  ('DPS cuerpo a cuerpo', 'media', 3),
  ('Brujos', 'media', 4),
  ('Chamanes mejora', 'baja', 5);

INSERT INTO recruit_requirements (text, sort) VALUES
  ('Nivel 70 con set y consumibles al día.', 0),
  ('Disponibilidad para los días de raid fijados.', 1),
  ('Buena actitud y mecánicas aprendidas.', 2),
  ('Discord con micrófono.', 3);

-- ── Feats (newest first) ─────────────────────────────────────────────────────
INSERT INTO feats (boss, raid, date, team, first_kill, sort) VALUES
  ('Lady Vashj', 'SSC', '2026-06-12', 'Core 1', 1, 0),
  ('Kael’thas Sol Furioso', 'TK', '2026-06-05', 'Core 1', 0, 1),
  ('El Maestro de Mareas Karathress', 'SSC', '2026-05-29', 'Core 2', 0, 2),
  ('Al’ar', 'TK', '2026-05-22', 'Core 1', 1, 3),
  ('Leotheras el Ciego', 'SSC', '2026-05-15', 'Core 2', 0, 4),
  ('Príncipe Malchezaar', 'Karazhan', '2026-05-08', 'Core 3', 0, 5),
  ('Magtheridon', 'Magtheridon', '2026-05-01', NULL, 1, 6),
  ('Gran Señor Gruul', 'Gruul', '2026-04-24', 'Core 1', 0, 7);

-- ── FAQ ──────────────────────────────────────────────────────────────────────
INSERT INTO faq (q, a, sort) VALUES
  ('¿Qué sistema de reparto de botín usáis?', 'Usamos Loot Council para el contenido de progresión: un grupo de oficiales reparte el equipo según mejora real del raid, asistencia y rendimiento. En contenido en farmeo pasamos a Soft Reserve (SR) para agilizar. La prioridad siempre es el progreso del grupo, no las estadísticas individuales.', 0),
  ('¿Qué addons son obligatorios?', 'Pedimos Deadly Boss Mods (DBM) o BigWigs para los avisos de mecánicas, un medidor de daño/sanación (Details! o Recount) y WeakAuras para las mecánicas concretas de cada jefe. Compartimos nuestros paquetes de WeakAuras en Discord antes de cada raid nuevo.', 1),
  ('¿Cuál es la política de asistencia?', 'No exigimos asistencia perfecta, pero sí avisar con antelación si no vas a poder asistir. Para entrar al roster de progresión pedimos una asistencia aproximada del 75% en las noches de raid fijadas. La vida real va primero; lo único que pedimos es comunicación.', 2),
  ('¿Qué consumibles y encantamientos se esperan?', 'Que vengas con la mejor preparación razonable para tu nivel: comida de buff, elixires/pociones de flask, piedras de salud/maná y los encantamientos y gemas adecuados en todas las piezas. No hace falta que seas BiS, pero sí presentarte listo para rendir.', 3),
  ('¿Hay requisito de edad o idioma?', 'Somos una comunidad mayoritariamente hispanohablante, así que el idioma de la guild es el español. Pedimos +18 por el ambiente del Discord de voz, aunque valoramos cada caso. Lo importante es buena actitud y saber estar.', 4),
  ('¿Necesito experiencia previa de raid?', 'No es imprescindible, pero ayuda. Valoramos más la actitud, la disposición a aprender mecánicas y la constancia que tu historial. Si vienes de otro servidor o expansión, cuéntanoslo y lo tendremos en cuenta en la prueba.', 5),
  ('¿Qué días y horario raideáis?', 'Raideamos en horario de noche entre semana (zona horaria europea). Los días concretos los confirmamos en el Discord según la fase actual. Avisamos con antelación de cualquier raid extra de progresión.', 6),
  ('¿Cómo aplico a la guild?', 'Rellena el formulario de aplicación de esta página o escríbenos directamente por Discord. Cuéntanos tu clase, especialización, experiencia y disponibilidad, y un oficial te contactará para una prueba en el próximo raid.', 7);

-- ── Community ────────────────────────────────────────────────────────────────
INSERT INTO community_meta (id, discord_server_id, raid_timezone) VALUES
  (1, '', 'Europe/Madrid');

INSERT INTO raid_nights (team, weekday, time, sort) VALUES
  ('Core 1', 2, '21:00', 0),
  ('Core 1', 4, '21:00', 1),
  ('Core 2', 3, '21:30', 2),
  ('Core 2', 5, '21:30', 3),
  ('Core 3', 6, '17:00', 4),
  ('Core 3', 0, '17:00', 5);
