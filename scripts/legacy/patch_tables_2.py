import re

with open('frontend/css/components/tables.css', 'r') as f:
    content = f.read()

# 1. Remove .filter-select--auto from 640px block
content = content.replace("  .filter-input--search,\n  .filter-input--date,\n  .filter-select,\n  .filter-select--auto {\n    min-width: 0;\n    width: 100%;\n  }", 
                          "  .filter-input--search,\n  .filter-input--date,\n  .filter-select {\n    min-width: 0;\n    width: 100%;\n  }")

# 2. Move export btn group text hiding to 1048px
content = content.replace("  .export-btn-group .btn:not(#btn-export-csv) {\n    font-size: 0;\n    gap: 0;\n  }", "")

# 3. Add to 380px block
content = content.replace("@media (max-width: 380px) {\n  .filter-search-row {\n    flex-direction: column;\n  }\n}",
                          "@media (max-width: 380px) {\n  .filter-search-row {\n    flex-direction: column;\n  }\n  .filter-select--auto {\n    width: 100%;\n  }\n}")

# 4. Add new 1048px block
new_block = """
@media (max-width: 1048px) {
  .export-btn-group .btn:not(#btn-export-csv) {
    font-size: 0;
    gap: 0;
  }
}

@media (min-width: 641px) and (max-width: 1048px) {
  .filter-group {
    flex: 1;
  }
}
"""

content = content + new_block

with open('frontend/css/components/tables.css', 'w') as f:
    f.write(content)
print("Patched tables.css")
