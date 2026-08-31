-- Archivo inicial de base de datos para Producción (Entrega)
-- Genera el usuario administrador maestro y la configuración institucional.

-- Insertar única Super Administradora (Julieta Esquinca)
-- La contraseña por defecto es: Admin123!
INSERT INTO users (id, name, email, password_hash, role, is_admin, active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440003'::UUID,
  'Julieta Esquinca',
  'julieta.esquinca@ibero.mx',
  '$2b$10$4Imio4htsQ4w0fo2aku7wOy8PFusDeuCNATsl/2i4y3TC.l.2jmBK',
  'secretaria',
  TRUE,
  TRUE
);

-- Insertar configuración institucional (Días Festivos / Cierres)
INSERT INTO calendar_events (date, name, type)
VALUES
  ('2026-05-01', 'Día del Trabajo', 'holiday'),
  ('2026-09-16', 'Independencia de México', 'holiday'),
  ('2026-11-02', 'Día de Muertos', 'holiday'),
  ('2026-12-25', 'Navidad', 'holiday'),
  ('2026-04-30', 'Cierre Fin de Semestre', 'closure'),
  ('2026-07-01', 'Inicio Vacaciones Verano', 'closure');
