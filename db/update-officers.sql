-- Actualiza SOLO la tabla officers (no toca el resto de la base).
-- Apply: wrangler d1 execute jefe-de-guerra --remote --file=db/update-officers.sql
--        wrangler d1 execute jefe-de-guerra --local  --file=db/update-officers.sql

DELETE FROM officers;

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
