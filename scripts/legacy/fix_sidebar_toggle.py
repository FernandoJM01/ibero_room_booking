import re

with open('frontend/js/components/sidebar.js', 'r') as f:
    content = f.read()

bad_logic = """  /* ── MOBILE TOGGLE ── */
  const _initMobileToggle = (sidebarId) => {"""

good_logic = """  /* ── MOBILE TOGGLE ── */
  let _mobileToggleInit = false;
  const _initMobileToggle = (sidebarId) => {
    if (_mobileToggleInit) return;
    _mobileToggleInit = true;"""

if bad_logic in content:
    content = content.replace(bad_logic, good_logic)
    with open('frontend/js/components/sidebar.js', 'w') as f:
        f.write(content)
    print("Fixed mobile toggle double initialization.")
else:
    print("Could not find mobile toggle block.")
