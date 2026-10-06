# import-sessions

Convierte el Excel de sesiones (una fila por hora) en SQL para **precargar reservaciones**.
El procedimiento completo, con la limpieza previa y las verificaciones, está en
[`docs/DATA_MIGRATION.md`](../../docs/DATA_MIGRATION.md). Esta herramienta **no toca ninguna base
de datos**: solo escribe `import.sql` y `rollback.sql` para que los revises y los apliques.

```bash
.venv/bin/pip install openpyxl bcrypt                      # una sola vez

# 1) Plantilla con las personas del archivo (llena la columna «correo»)
.venv/bin/python scripts/import-sessions/import_sessions.py \
    --xlsx scripts/import-sessions/private/sesiones.xlsx \
    --init-people scripts/import-sessions/private/people.csv

# 2) Reporte sin escribir nada
.venv/bin/python scripts/import-sessions/import_sessions.py \
    --xlsx scripts/import-sessions/private/sesiones.xlsx \
    --people scripts/import-sessions/private/people.csv --dry-run

# 3) Generar import.sql y rollback.sql
.venv/bin/python scripts/import-sessions/import_sessions.py \
    --xlsx scripts/import-sessions/private/sesiones.xlsx \
    --people scripts/import-sessions/private/people.csv \
    --room-name "Nombre real de la sala" --admin-email correo.del.admin@ibero.mx \
    --closure-dates 2026-12-25 --holiday-dates 2026-11-02,2026-11-16 \
    --out-dir scripts/import-sessions/private
```

Coloca el Excel y el CSV en `scripts/import-sessions/private/` (ignorada por git).
`people.example.csv` muestra el formato con datos ficticios.

| Opción | Para qué |
| ------ | -------- |
| `--min-series N` | Repeticiones semanales mínimas para tratarlo como serie (3) |
| `--no-series`, `--no-merge` | No crear series / no juntar horas consecutivas |
| `--closure-dates` | Si una reservación cae en un cierre, la herramienta se detiene |
| `--holiday-dates` | Solo advierte |
| `--room-id` | Sala destino (por defecto la sala sembrada `a10e1300-…0001`) |

`cleanup_reservations.sql` es la «Opción B» de limpieza (borra solo reservaciones e historial). `cleanup_keep_calendar.sql` es la «Opción C» (la elegida para producción): deja solo al administrador y conserva salas, festivos/cierres y fechas del semestre; ver `docs/DATA_MIGRATION.md`. `admin_password_sql.js` genera la instrucción SQL para poner una contraseña privada al administrador.
