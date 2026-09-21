import re

with open('frontend/css/components/tables.css', 'r') as f:
    content = f.read()

# 1. Reduce min-width of search input and container
content = content.replace(".filter-group--search {\n  flex: 1;\n  min-width: 360px;\n}", ".filter-group--search {\n  flex: 1;\n  min-width: 280px;\n}")
content = content.replace(".filter-input--search { min-width: 220px; }", ".filter-input--search { min-width: 120px; }")

# 2. Add Export Button Group styles before Responsive section
export_css = """
/* Export Button Group */
.export-btn-group {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}

/* ── RESPONSIVE ── */"""
content = content.replace("/* ── RESPONSIVE ── */", export_css)

# 3. Remove .filter-search-row { flex-direction: column; } from 640px block
content = content.replace("""  .filter-search-row {
    flex-direction: column;
  }

""", "")

# 4. Add new rules inside 640px block for export buttons, and add 380px block
new_responsive = """  .filter-input--search,
  .filter-input--date,
  .filter-select,
  .filter-select--auto {
    min-width: 0;
    width: 100%;
  }

  .export-btn-group .btn {
    padding: var(--space-2);
  }
  .export-btn-group .btn:not(#btn-export-csv) {
    font-size: 0;
    gap: 0;
  }
}

@media (max-width: 380px) {
  .filter-search-row {
    flex-direction: column;
  }
}"""
content = content.replace("""  .filter-input--search,
  .filter-input--date,
  .filter-select,
  .filter-select--auto {
    min-width: 0;
    width: 100%;
  }
}""", new_responsive)

with open('frontend/css/components/tables.css', 'w') as f:
    f.write(content)
