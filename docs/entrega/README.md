# Documentos de entrega

PDF generados para la entrega al profesor. No editar los `.pdf` a mano;
regenerar con el script cuando cambie el contenido.

- `Resumen_Proyecto_IberoReservations.pdf` — resumen de 2 páginas, se puede
  compartir libremente (sin credenciales).
- `PLANTILLA_Hoja_de_acceso_evaluacion.pdf` — plantilla en blanco. Llenar con
  la cuenta de evaluación y entregar solo por un canal privado. **No subir la
  versión llena al repositorio.**

## Regenerar los PDF

```bash
cd sala-juntas-ibero
python3 -m venv .venv        # si no existe
.venv/bin/pip install reportlab
.venv/bin/python docs/entrega/make_pdfs.py
```

Escribe los dos archivos en esta misma carpeta.
