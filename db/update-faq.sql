-- Actualiza SOLO la tabla faq (no toca el resto de la base).
-- Apply: wrangler d1 execute jefe-de-guerra --remote --file=db/update-faq.sql
--        wrangler d1 execute jefe-de-guerra --local  --file=db/update-faq.sql

DELETE FROM faq;

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
