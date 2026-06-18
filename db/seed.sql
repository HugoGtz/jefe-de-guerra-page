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
   'ST · hora de servidor',
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
INSERT INTO teams (id, name, schedule_days, schedule_time, schedule_timezone, ssc_kills, ssc_total, tk_kills, tk_total, recruiting, note, wcl_guild_id, sort) VALUES
  ('core-1', 'Core 1', 'Lun · Jue · Dom', '19:00 – 22:00', 'ST', 6, 6, 3, 4, 0, 'Roster veterano · cupo completo', 826903, 0),
  ('core-2', 'Core 2', 'Mar · Mié · Jue', '19:00 – 22:00', 'ST', 5, 6, 2, 4, 1, 'Buscamos sanadores y DPS a distancia', 826904, 1),
  ('core-3', 'Core 3', 'Sáb · Dom', '20:00 – 23:00', 'ST', 4, 6, 2, 4, 1, 'Tanque y DPS cuerpo a cuerpo', 826905, 2),
  ('core-4', 'Core 4', 'Jue · Vie · Sáb', '07:30 – 10:30', 'ST', 3, 6, 1, 4, 1, 'Roster en formación · todos los roles', 826907, 3),
  ('core-5', 'Core 5', 'Lun · Dom', '18:00 – 22:00', 'ST', 5, 6, 2, 4, 0, 'Roster consolidado', 826908, 4),
  ('core-6', 'Core 6', 'Jue · Dom', '17:30 – 20:30', 'ST', 2, 6, 0, 4, 1, 'Roster joven · buscamos todos los roles', 826909, 5),
  ('core-7', 'Core 7', 'Por confirmar', '', 'ST', 1, 6, 0, 4, 1, 'Nuevo core en formación', 826910, 6);

-- ── Officers ─────────────────────────────────────────────────────────────────
INSERT INTO officers (name, role, wow_class, class_label, line, sort) VALUES
  ('Yuliox', 'Oficial', '', '', '', 0),
  ('Gelvez', 'Oficial', '', '', '', 1),
  ('Zorkian', 'Oficial', '', '', '', 2),
  ('Kaniser', 'Oficial', '', '', '', 3),
  ('Darkmorrigan', 'Oficial', '', '', '', 4),
  ('Zaenghun', 'Oficial', '', '', '', 5),
  ('Bélcebuu', 'Raid Líder', '', '', '', 6),
  ('Suuyeom', 'Raid Líder', '', '', '', 7),
  ('Chulengo', 'Raid Líder', '', '', '', 8),
  ('Frido', 'Raid Líder', '', '', '', 9),
  ('Dortakus', 'Raid Líder', '', '', '', 10),
  ('Sephiworm', 'Raid Líder', '', '', '', 11),
  ('Gelatine', 'Raid Líder', '', '', '', 12);

-- ── Recruitment ──────────────────────────────────────────────────────────────
INSERT INTO recruitment_meta (id, intro, discord_url, whatsapp_url) VALUES
  (1,
   'Buscamos reforzar el roster de cara a la Fase 2. Si quieres progresar en SSC y TK con un grupo serio pero sin dramas, este es tu sitio.',
   'https://discord.com/invite/szcrkmkQQM',
   'https://chat.whatsapp.com/HHJkkOgIq7KB2iTZd0CcB5?s=cl&p=i&ilr=1');

INSERT INTO recruit_needs (label, priority, sort) VALUES
  ('Chamán elemental', 'alta', 0),
  ('Chamán mejora', 'alta', 1),
  ('Chamán restauración', 'alta', 2),
  ('Druida tanque', 'media', 3),
  ('Paladín protección', 'media', 4),
  ('Druida balance', 'alta', 5),
  ('Brujos', 'media', 6),
  ('Cazadores', 'baja', 7),
  ('Sacerdote sombras', 'media', 8);

INSERT INTO recruit_requirements (text, sort) VALUES
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
  ('¿Qué tipo de hermandad es Jefe de Guerra?', 'Somos una hermandad semi-hardcore de World of Warcraft: The Burning Crusade Classic. Progresamos en serio, con preparación y compromiso, pero manteniendo un buen ambiente hispanohablante. Tenemos varios equipos de raid (Cores) para cubrir distintos horarios.', 0),
  ('¿Qué addons son obligatorios?', 'DBM o BigWigs (avisos de mecánicas), Loon BiS (para verificar tu equipo BiS), Gargul (gestión de loot y Soft Reserve) y un addon de aggro (tipo Omen). Deben estar instalados y actualizados antes del raid.', 1),
  ('¿Qué requisitos de equipo y consumibles piden?', 'Preséntate con tu Pre-BiS gemado y encantado al máximo nivel disponible. Los consumibles son obligatorios: frascos, elixires y comida de buff. Venir sin consumibles afecta a tu loot (ver sistema de SR).', 2),
  ('¿Cuál es la política de asistencia?', 'Para mantener el estatus de Raider Fijo se pide un mínimo del 85% de asistencia mensual. Bajar de ese 85% supone descender a Raider Suplente. La vida real va primero, pero pedimos avisar siempre con antelación.', 3),
  ('¿Cómo funciona el sistema de loot?', 'Usamos Soft Reserve (SR) con Gargul. Cada raider parte de 1 SR base. Bonos: +1 SR por puntualidad (estar 10-15 min antes) y +1 SR por traer todos los consumibles (revisión de un oficial). Penalizaciones: -1 SR ese día por superar los 5 min de tolerancia, y -1 SR en la siguiente raid por faltar sin avisar. No se permite hacer SR por off-spec (rama secundaria).', 4),
  ('¿Hay prioridades de loot por clase o rol?', 'Sí. Los tanques tienen prioridad en piezas Tier BiS para asegurar la progresión (verificado con Loon BiS por los raid leaders). Los cazadores eligen entre arma a dos manos o dos armas de una mano. Casters y healers eligen entre bastón o set de Main Hand + Off-hand según la fase. De trinkets físicos (Espinazo/Tsunami) máximo 1 por jugador hasta que todos los DPS tengan uno.', 5),
  ('¿Cómo se reparten las monturas?', 'Puedes hacer 1 SR por la montura tras cumplir 5 semanas activas en tu core. Además, los jugadores con estatus Full BiS (ya tienen todos sus items BiS) pueden usar sus 3 SR específicamente para la montura.', 6),
  ('¿Qué rangos hay y cómo progreso?', 'Entras como Raider Suplente (no rolea armas, trinkets ni monturas). Tras 3 semanas de asistencia constante pasas a Raider Fijo. Si te trasladas a otro core (avisando antes), vuelves a cumplir las 3 semanas para recuperar el estatus.', 7),
  ('¿Qué sanciones existen?', 'Bajar del 85% mensual te degrada a Raider Suplente. Cambiar de core sin avisar al Raid Leader con días de antelación puede costarte tu lugar fijo; si reincides, la degradación a Suplente es permanente. La expulsión se reserva para ninjeo comprobado, toxicidad extrema o drama público.', 8),
  ('¿Cómo aplico a la guild?', 'Rellena el formulario de aplicación de esta página o escríbenos por Discord. Cuéntanos tu clase, especialización, experiencia y disponibilidad, y un oficial te contactará para una prueba en el próximo raid.', 9);

-- ── Community ────────────────────────────────────────────────────────────────
INSERT INTO community_meta (id, discord_server_id, raid_timezone) VALUES
  (1, '', 'ST');

-- weekday: 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb. Hora de inicio (ST).
INSERT INTO raid_nights (team, weekday, time, sort) VALUES
  ('Core 1', 1, '19:00', 0),
  ('Core 1', 4, '19:00', 1),
  ('Core 1', 0, '19:00', 2),
  ('Core 2', 2, '19:00', 3),
  ('Core 2', 3, '19:00', 4),
  ('Core 2', 4, '19:00', 5),
  ('Core 3', 6, '20:00', 6),
  ('Core 3', 0, '20:00', 7),
  ('Core 4', 4, '07:30', 8),
  ('Core 4', 5, '07:30', 9),
  ('Core 4', 6, '07:30', 10),
  ('Core 5', 1, '19:00', 11),
  ('Core 5', 0, '18:00', 12),
  ('Core 6', 4, '17:30', 13),
  ('Core 6', 0, '17:30', 14);
