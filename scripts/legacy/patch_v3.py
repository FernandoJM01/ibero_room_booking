import re

with open('frontend/css/components/tables.css', 'r') as f:
    content = f.read()

# Fix table-footer and table-empty scrolling issue
content = content.replace(".table-footer {\n  padding: var(--space-3)", 
                          ".table-footer {\n  position: sticky;\n  left: 0;\n  padding: var(--space-3)")

# Add table-empty sticky
content = content.replace(".table-empty {\n  padding:", 
                          ".table-empty {\n  position: sticky;\n  left: 0;\n  padding:")

# Fix export-btn-group wrapping
content = content.replace(".export-btn-group {\n  display: flex;\n  gap: var(--space-2);\n  align-items: center;\n  flex-wrap: wrap;\n}",
                          ".export-btn-group {\n  display: flex;\n  gap: var(--space-2);\n  align-items: center;\n  flex-wrap: nowrap;\n}")

# Add the 381px to 640px explicit widths for search row
new_media = """
@media (min-width: 381px) and (max-width: 640px) {
  .filter-search-row {
    flex-wrap: nowrap;
  }
  .filter-select--auto {
    width: 40% !important;
    flex: 0 0 40%;
  }
  .filter-input--search {
    width: 60% !important;
    flex: 1;
  }
}
"""
content = content + new_media

with open('frontend/css/components/tables.css', 'w') as f:
    f.write(content)

print("tables.css patched")

with open('frontend/css/layout.css', 'r') as f:
    layout = f.read()

layout += """
@media (min-width: 768px) and (max-width: 975px) {
  .topbar__breadcrumb {
    display: none !important;
  }
}
"""
with open('frontend/css/layout.css', 'w') as f:
    f.write(layout)
print("layout.css patched")

