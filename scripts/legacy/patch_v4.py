import re

# 1. Patch layout.css for .topbar__title
with open('frontend/css/layout.css', 'r') as f:
    layout = f.read()

old_title = """.topbar__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-secondary);
}"""
new_title = """.topbar__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex-shrink: 1;
}"""
if old_title in layout:
    layout = layout.replace(old_title, new_title)
    print("Patched .topbar__title")

with open('frontend/css/layout.css', 'w') as f:
    f.write(layout)


# 2. Patch tables.css for export buttons
with open('frontend/css/components/tables.css', 'r') as f:
    tables = f.read()

# Add flex-shrink: 0 to the export buttons group
old_export = """.export-btn-group {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: nowrap;
}"""
new_export = """.export-btn-group {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: nowrap;
  flex-shrink: 0;
}
.export-btn-group .btn {
  flex-shrink: 0;
}
.export-btn-group .btn svg {
  flex-shrink: 0;
  min-width: 13px;
}"""
if old_export in tables:
    tables = tables.replace(old_export, new_export)
    print("Patched .export-btn-group flex-shrink")

# Move padding: var(--space-2); to the 1048px block
# First remove it from 640px block
tables = tables.replace("""  .export-btn-group .btn {
    padding: var(--space-2);
  }
""", "")

# Add it to the 1048px block
old_1048 = """@media (max-width: 1048px) {
  .export-btn-group .btn:not(#btn-export-csv) {
    font-size: 0;
    gap: 0;
  }
}"""
new_1048 = """@media (max-width: 1048px) {
  .export-btn-group .btn:not(#btn-export-csv) {
    font-size: 0;
    gap: 0;
    padding: var(--space-2);
  }
}"""
if old_1048 in tables:
    tables = tables.replace(old_1048, new_1048)
    print("Patched 1048px padding")

with open('frontend/css/components/tables.css', 'w') as f:
    f.write(tables)

