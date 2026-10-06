-- OPCIÓN B: borra solo reservaciones y su historial. CONSERVA usuarios, salas, festivos/cierres,
-- fechas del semestre y contactos externos. Úsalo ANTES de import.sql cuando haya datos de prueba
-- o viejos que ya no se quieren, pero las cuentas y la configuración sí.
--
-- Antes de correrlo: descarga un respaldo (RUNBOOK > "Backup the database"). No se puede deshacer.
--
--   docker exec -i <contenedor-db> sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < cleanup_reservations.sql
BEGIN;

SELECT 'ANTES' AS momento,
       (SELECT count(*) FROM reservations)         AS reservaciones,
       (SELECT count(*) FROM recurring_groups)     AS series,
       (SELECT count(*) FROM modification_requests) AS solicitudes,
       (SELECT count(*) FROM notification_logs)    AS correos_registrados;

DELETE FROM modification_requests;                                  -- (también caerían en cascada)
DELETE FROM reservations;
DELETE FROM recurring_groups;                                       -- series ya sin reservaciones
DELETE FROM audit_log WHERE entity IN ('reservations', 'modification_requests');
DELETE FROM notification_logs;                                      -- registro de correos (contiene direcciones de correo)

-- OPCIONAL: contactos externos de pruebas (personas ajenas a la universidad). Descomenta si no los quieres.
-- DELETE FROM external_contacts;

SELECT 'DESPUES' AS momento,
       (SELECT count(*) FROM reservations)         AS reservaciones,
       (SELECT count(*) FROM recurring_groups)     AS series,
       (SELECT count(*) FROM users)                AS usuarios_conservados,
       (SELECT count(*) FROM rooms)                AS salas_conservadas,
       (SELECT count(*) FROM calendar_events)      AS fechas_marcadas_conservadas;

COMMIT;
