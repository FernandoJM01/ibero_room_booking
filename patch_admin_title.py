with open('frontend/js/pages/admin-page.js', 'r') as f:
    content = f.read()

bad = "const titleEl = document.getElementById('admin-page-title');"
good = "const titleEl = document.getElementById('admin-page-title') || document.querySelector('.topbar__title');"

if bad in content:
    content = content.replace(bad, good)
    print("Patched admin-page.js title selection.")

with open('frontend/js/pages/admin-page.js', 'w') as f:
    f.write(content)

