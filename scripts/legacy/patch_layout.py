import re

with open('frontend/css/components/tables.css', 'r') as f:
    content = f.read()

# Replace desktop search group
old_search = """.filter-group--search {
  flex: 1;
  min-width: 280px;
}"""
new_search = """.filter-group--search {
  flex: 1;
  min-width: 360px;
}"""
if old_search in content:
    content = content.replace(old_search, new_search)
    print("Patched desktop search group.")
else:
    print("Could not find desktop search group.")

# Replace mobile history filters
old_mobile = """  .history-filters {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
  }"""
new_mobile = """  .history-filters {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
    align-items: end;
  }

  .filter-group--search,
  .filter-group--actions {
    grid-column: 1 / -1;
  }"""
if old_mobile in content:
    content = content.replace(old_mobile, new_mobile)
    print("Patched mobile history filters.")
else:
    print("Could not find mobile history filters.")

with open('frontend/css/components/tables.css', 'w') as f:
    f.write(content)
