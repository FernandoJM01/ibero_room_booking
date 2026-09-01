import re

with open('frontend/historial.html', 'r') as f:
    content = f.read()

bad = """          <div class="filter-group">
            <label for="filter-date-from">Desde</label>"""
good = """          <div class="filter-group filter-group--date">
            <label for="filter-date-from">Desde</label>"""
content = content.replace(bad, good)

bad2 = """          <div class="filter-group">
            <label for="filter-date-to">Hasta</label>"""
good2 = """          <div class="filter-group filter-group--date">
            <label for="filter-date-to">Hasta</label>"""
content = content.replace(bad2, good2)

with open('frontend/historial.html', 'w') as f:
    f.write(content)
print("Patched dates.")
