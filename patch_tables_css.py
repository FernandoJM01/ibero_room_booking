import re

with open('frontend/css/components/tables.css', 'r') as f:
    content = f.read()

desktop_css = """
/* Responsive Filter Groups */
.filter-group--search {
  flex: 1;
  min-width: 280px;
}

.filter-search-row {
  display: flex;
  gap: 8px;
}

.filter-select--auto {
  width: auto;
}

.filter-input--flex {
  flex: 1;
}

.filter-group--actions {
  justify-content: flex-end;
  flex-direction: row;
  gap: var(--space-2);
  align-items: flex-end;
}
"""

# Insert desktop CSS before responsive block
content = content.replace("/* ── RESPONSIVE ── */", desktop_css + "\n/* ── RESPONSIVE ── */")

old_responsive = """  .history-filters {
    flex-direction: column;
    gap: var(--space-2);
  }

  .filter-input--search,
  .filter-input--date,
  .filter-select {
    min-width: 0;
    width: 100%;
  }
}"""

new_responsive = """  .history-filters {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }

  .filter-group {
    width: 100%;
    min-width: 0;
  }

  .filter-search-row {
    flex-direction: column;
  }

  .filter-group--actions {
    flex-direction: column;
    align-items: stretch;
    justify-content: stretch;
    margin-top: var(--space-2);
  }

  .filter-group--actions button {
    width: 100%;
    justify-content: center;
  }

  .filter-input--search,
  .filter-input--date,
  .filter-select,
  .filter-select--auto {
    min-width: 0;
    width: 100%;
  }
}"""

if old_responsive in content:
    content = content.replace(old_responsive, new_responsive)
    print("Patched responsive CSS.")
else:
    print("Could not find responsive CSS.")

with open('frontend/css/components/tables.css', 'w') as f:
    f.write(content)
