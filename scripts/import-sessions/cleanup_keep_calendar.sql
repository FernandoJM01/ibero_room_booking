-- OPCIÓN C (la elegida para producción): deja la base "como la semilla" pero CONSERVANDO el calendario.
--
-- Conserva:  la(s) cuenta(s) de administrador que indiques, las salas, los festivos/cierres (calendar_events),
--            las fechas del semestre (app_settings) y el registro de respaldos (backups).
-- Borra:     todos los demás usuarios, reservaciones, series, solicitudes de cambio, historial de cambios,
--            registro de correos y contactos externos.
-- No toca el esquema ni las migraciones. No se puede deshacer: haz un respaldo ANTES.
--
-- Uso (psql: -v keep_emails=... es obligatorio; separa varios con comas, sin espacios):
--   docker exec -i <contenedor-db> sh -c 'psql -v ON_ERROR_STOP=1 -v keep_emails=julieta.esquinca@ibero.mx \
--       -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < cleanup_keep_calendar.sql
--
-- Si algún correo de keep_emails no existe como administrador activo, NO hace nada (aborta antes de borrar).
\set ON_ERROR_STOP on
\if :{?keep_emails}
\else
  \echo 'FALTA -v keep_emails=correo1,correo2   (no se hizo ningún cambio)'
  \quit
\endif

-- Comprobación previa: cada correo a conservar debe existir, estar activo y ser administrador.
SELECT (SELECT count(*) FROM unnest(string_to_array(:'keep_emails', ',')) e)                       AS pedidos,
       (SELECT count(*) FROM users WHERE email = ANY (string_to_array(:'keep_emails', ','))
                                        AND is_admin AND active)                                    AS encontrados
\gset chk_
SELECT (:chk_pedidos > 0 AND :chk_pedidos = :chk_encontrados) AS todo_bien \gset chk_
\if :chk_todo_bien
\else
  \echo 'Alguno de los correos de keep_emails no es un administrador activo existente. No se hizo ningún cambio.'
  \quit
\endif

BEGIN;

SELECT 'ANTES' AS momento,
       (SELECT count(*) FROM users)                 AS usuarios,
       (SELECT count(*) FROM reservations)          AS reservaciones,
       (SELECT count(*) FROM recurring_groups)      AS series,
       (SELECT count(*) FROM external_contacts)     AS contactos_externos,
       (SELECT count(*) FROM audit_log)             AS historial,
       (SELECT count(*) FROM notification_logs)     AS correos_registrados;

-- Cuentas que se van a borrar (rol, administrador, activa, correo): revísalo en la pantalla.
SELECT role, is_admin, active, email AS se_borra
  FROM users WHERE NOT (email = ANY (string_to_array(:'keep_emails', ','))) ORDER BY is_admin DESC, role, email;

DELETE FROM modification_requests;
DELETE FROM reservations;
DELETE FROM recurring_groups;
DELETE FROM audit_log;
DELETE FROM notification_logs;
DELETE FROM external_contacts;
DELETE FROM users WHERE NOT (email = ANY (string_to_array(:'keep_emails', ',')));
-- Un enlace de recuperación pendiente de un administrador conservado no debe sobrevivir a la limpieza.
UPDATE users SET reset_token_hash = NULL, reset_token_expires = NULL;

SELECT 'DESPUES' AS momento,
       (SELECT count(*) FROM users)                 AS usuarios_conservados,
       (SELECT count(*) FROM rooms)                 AS salas_conservadas,
       (SELECT count(*) FROM calendar_events)       AS fechas_marcadas_conservadas,
       (SELECT count(*) FROM app_settings)          AS ajustes_conservados,
       (SELECT count(*) FROM reservations)          AS reservaciones;

-- Si el administrador conserva la contraseña PÚBLICA de la semilla (la del README), cámbiala ya.
SELECT email,
       (password_hash = '$2b$10$4Imio4htsQ4w0fo2aku7wOy8PFusDeuCNATsl/2i4y3TC.l.2jmBK') AS usa_contrasena_publica_por_defecto
  FROM users;

SELECT id, name, active FROM rooms ORDER BY created_at;   -- las salas existentes (el import renombra "Sala Principal")

COMMIT;
