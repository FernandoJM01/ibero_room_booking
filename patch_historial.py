import re

with open('frontend/historial.html', 'r') as f:
    content = f.read()

# Replace the search group
old_search_group = """          <div class="filter-group" style="flex:1;min-width:280px;">
            <label for="filter-search">Buscar por</label>
            <div style="display: flex; gap: 8px;">
              <select id="filter-field" class="filter-select" aria-label="Seleccionar campo de búsqueda" style="width: auto;">
                <option value="all">Todos los campos</option>
                <option value="responsible">Responsable</option>
                <option value="area">Área</option>
                <option value="creator">Creado por</option>
                <option value="observations">Observaciones</option>
              </select>
              <input type="search" id="filter-search" class="filter-input filter-input--search"
                     placeholder="Escribe para buscar..."
                     aria-label="Término de búsqueda" style="flex: 1;" />
            </div>
          </div>"""

new_search_group = """          <div class="filter-group filter-group--search">
            <label for="filter-search">Buscar por</label>
            <div class="filter-search-row">
              <select id="filter-field" class="filter-select filter-select--auto" aria-label="Seleccionar campo de búsqueda">
                <option value="all">Todos los campos</option>
                <option value="responsible">Responsable</option>
                <option value="area">Área</option>
                <option value="creator">Creado por</option>
                <option value="observations">Observaciones</option>
              </select>
              <input type="search" id="filter-search" class="filter-input filter-input--search filter-input--flex"
                     placeholder="Escribe para buscar..."
                     aria-label="Término de búsqueda" />
            </div>
          </div>"""

# Replace the actions group
old_actions_group = """          <div class="filter-group" style="justify-content:flex-end;flex-direction:row;gap:var(--space-2);align-items:flex-end;">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-clear-filters"
                    aria-label="Limpiar filtros">"""

new_actions_group = """          <div class="filter-group filter-group--actions">
            <button type="button" class="btn btn-ghost btn-sm" id="btn-clear-filters"
                    aria-label="Limpiar filtros">"""

if old_search_group in content:
    content = content.replace(old_search_group, new_search_group)
    print("Patched search group.")
else:
    print("Could not find search group.")

if old_actions_group in content:
    content = content.replace(old_actions_group, new_actions_group)
    print("Patched actions group.")
else:
    print("Could not find actions group.")

with open('frontend/historial.html', 'w') as f:
    f.write(content)
