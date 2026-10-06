# Herramientas de los manuales

Todo lo necesario para **regenerar las capturas y los PDF** cuando cambie la
interfaz. Las capturas usan una pila de demostración con **datos ficticios**
(nunca datos reales).

## Requisitos

- Docker, y Google Chrome instalado (Playwright lo usa como navegador).
- El entorno virtual del proyecto con:
  ```bash
  python3 -m venv .venv                      # si no existe
  .venv/bin/pip install reportlab pillow pymupdf playwright
  ```

## Pasos (desde la raíz del repositorio)

```bash
export DEMO_PASSWORD='…'     # contraseña de las cuentas demo (8+, mayúscula, minúscula, número y símbolo)
export DEMO_DB_PASSWORD="$(openssl rand -hex 12)"
export DEMO_JWT_SECRET="$(openssl rand -hex 32)"

# 1. Pila de demostración en http://localhost:8090 (no toca la base de desarrollo)
docker compose -f docs/manual/tools/docker-compose.demo.yml up -d --build

# 2. Datos ficticios (personas, 2 salas, calendario de octubre de 2026)
.venv/bin/python docs/manual/tools/seed_demo.py

# 3. Capturas → docs/manual/img/
for f in capture_secretaria_1 capture_secretaria_2 capture_academico_admin_movil; do
  .venv/bin/python docs/manual/tools/$f.py
done

# 4. PDF → docs/manual/*.pdf
.venv/bin/python docs/manual/tools/build_manuals.py

# 5. Apagar y borrar la pila de demostración
docker compose -f docs/manual/tools/docker-compose.demo.yml down -v
```

## Notas

- Las fechas del seed están fijas en **octubre de 2026** y los scripts de captura
  navegan a esas semanas. Si regeneras mucho después, ajusta las fechas en
  `seed_demo.py` y en los `capture_*.py`.
- Cada captura numera sus elementos (círculos rojos) y el texto del manual
  explica ese mismo número: si cambias una captura, revisa el texto asociado en
  `build_manuals.py`.
- Cuentas demo: `admin@`, `laura.mendez@` (secretaría) y `ricardo.salas@`
  (académico), todas `@demo.ibero.mx`.
