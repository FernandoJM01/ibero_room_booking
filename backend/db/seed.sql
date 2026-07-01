-- Insert users with pre-computed bcrypt hashes
-- secretaria@ibero.mx with password Admin123!
INSERT INTO users (id, name, email, password_hash, role, is_admin, active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::UUID,
  'Julieta Esquinca Gómez',
  'secretaria@ibero.mx',
  '$2b$10$4Imio4htsQ4w0fo2aku7wOy8PFusDeuCNATsl/2i4y3TC.l.2jmBK',
  'secretaria',
  TRUE,
  TRUE
);

-- academico@ibero.mx with password Acad456!
INSERT INTO users (id, name, email, password_hash, role, is_admin, active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::UUID,
  'Dr. Miguel Ángel Álvarez',
  'academico@ibero.mx',
  '$2b$10$up1QY4JrBa5dP.RfqkJ0jOIZRDimIs8E7H2XBEzzmtbb3dT048cP2',
  'academico',
  FALSE,
  TRUE
);

-- Insert sample reservations
INSERT INTO reservations (
  id,
  responsible_name,
  area,
  start_time,
  end_time,
  observations,
  status,
  created_by,
  last_modified_by
) VALUES (
  '650e8400-e29b-41d4-a716-446655440001'::UUID,
  'Dr. Miguel Ángel Álvarez Hernández',
  'Academia de Telecomunicaciones',
  '2026-04-15 10:00:00+00',
  '2026-04-15 12:00:00+00',
  'Revisión plan semestral',
  'active',
  '550e8400-e29b-41d4-a716-446655440001'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

INSERT INTO reservations (
  id,
  responsible_name,
  area,
  start_time,
  end_time,
  observations,
  status,
  is_recurring,
  created_by,
  last_modified_by
) VALUES (
  '650e8400-e29b-41d4-a716-446655440002'::UUID,
  'Lic. Patricia Torres Mendoza',
  'Coordinación Administrativa',
  '2026-04-16 09:00:00+00',
  '2026-04-16 10:30:00+00',
  '',
  'active',
  FALSE,
  '550e8400-e29b-41d4-a716-446655440001'::UUID,
  '550e8400-e29b-41d4-a716-446655440001'::UUID
);

-- Insert holidays
INSERT INTO calendar_events (date, name, type)
VALUES
  ('2026-05-01', 'Día del Trabajo', 'holiday'),
  ('2026-09-16', 'Independencia de México', 'holiday'),
  ('2026-11-02', 'Día de Muertos', 'holiday'),
  ('2026-12-25', 'Navidad', 'holiday');

-- Insert institutional closures
INSERT INTO calendar_events (date, name, type)
VALUES
  ('2026-04-30', 'Cierre Fin de Semestre', 'closure'),
  ('2026-07-01', 'Inicio Vacaciones Verano', 'closure');
