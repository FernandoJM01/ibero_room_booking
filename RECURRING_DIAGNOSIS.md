# Recurring Reservations — Diagnosis & Solution

**Issue:** Recurring reservations are not being created when the checkbox is checked.

**Status:** 🔍 Investigated - **Root Cause Found**

---

## Investigation Results

### What Works ✅
- Checkbox HTML element exists (line 202, reservacion.html)
- Toggle event listener is properly attached (line 94, reservacion.js)
- Recurring.generate() function is implemented correctly
- Recurring.save() async function properly loops through instances
- Backend accepts `is_recurring` and `recurring_group` fields
- API.createReservation() works for single reservations

### What's Broken ❌

**PRIMARY ISSUE:** Line 256 in `reservacion.js`

```javascript
// Recurring path (HU-27) — sólo en modo creación
if (!isEditMode && recurChk?.checked) {
  _submitRecurring(data);  // ← NO AWAIT! Promise ignored
  return;                   // ← Returns immediately
}
```

**THE PROBLEM:**
- `_submitRecurring()` is an async function but is NOT awaited
- The function returns immediately, but the async operations continue in background
- If any error occurs in Recurring.generate() or Recurring.save(), it's silently ignored
- The Toast notification might not appear because it's in the background promise
- The redirect might happen before data is persisted

**SECONDARY ISSUES:**

1. **Line 256-257:** No error handling for the async function
2. **Line 94-96:** Toggle event hides/shows panel, but no validation that fields are filled
3. **Utils.dateToISO() format assumption:** Needs verification that date formats match between normalization and generation

---

## Root Cause Analysis

### Scenario: User creates recurring reservation
1. ✅ User checks checkbox → toggle event fires → panel becomes visible
2. ✅ User fills form with date, time, frequency, count
3. ✅ User clicks "Guardar reservación" → `_onSubmit()` called
4. ✅ Validation passes → date/start/end/responsible/area valid
5. ✅ Data object created with snake_case fields
6. ⚠️ Check `recurChk.checked` → TRUE
7. ❌ `_submitRecurring(data)` called WITHOUT await
8. ❌ Function returns immediately, async work continues unobserved
9. ❌ If Recurring.generate() throws error → unhandled rejection
10. ❌ If Recurring.save() throws error → unhandled rejection
11. ❌ Toast.show() might never execute
12. ❌ Redirect might happen before DB write completes

### Evidence
```bash
# No recurring reservations exist in database
curl http://localhost:8080/api/reservations | grep "is_recurring"
# Result: 0 occurrences
```

---

## Proposed Solution

### Fix 1: Await the async function (CRITICAL)

**File:** `frontend/js/pages/reservacion.js`  
**Line:** 254-258

**Current (BROKEN):**
```javascript
// Recurring path (HU-27) — sólo en modo creación
if (!isEditMode && recurChk?.checked) {
  _submitRecurring(data);  // ← Bug: not awaited
  return;
}
```

**Fixed:**
```javascript
// Recurring path (HU-27) — sólo en modo creación
if (!isEditMode && recurChk?.checked) {
  await _submitRecurring(data);  // ← Now properly awaited
  return;
}
```

This change makes the function wait for Recurring.save() to complete before continuing.

### Fix 2: Add error handling to _onSubmit (DEFENSIVE)

Make _onSubmit properly handle both sync and async paths:

**Current (line 241):**
```javascript
async function _onSubmit(e) {
  e.preventDefault();
  
  if (!_validateAll()) return;
  
  const data = { /* ... */ };
  
  if (!isEditMode && recurChk?.checked) {
    _submitRecurring(data);  // Bug
    return;
  }
```

**Should be:**
```javascript
async function _onSubmit(e) {
  e.preventDefault();
  
  if (!_validateAll()) return;
  
  const data = { /* ... */ };
  
  try {
    if (!isEditMode && recurChk?.checked) {
      await _submitRecurring(data);  // Fixed
      return;
    }
    
    // Normal path...
  } catch (err) {
    console.error('Submit error:', err);
    Toast.show('Error al guardar: ' + (err.message || 'intenta nuevamente'), 'error');
  }
}
```

### Fix 3: Validate recurrence fields (OPTIONAL IMPROVEMENT)

Add validation in `_validateAll()` to ensure recurrence fields are filled:

```javascript
function _validateAll() {
  let ok = true;
  ok = _validateField(fieldDate,  'err-date')        && ok;
  ok = _validateField(fieldStart, 'err-start')       && ok;
  ok = _validateField(fieldEnd,   'err-end')         && ok;
  ok = _validateField(fieldResp,  'err-responsible') && ok;
  ok = _validateField(fieldArea,  'err-area')        && ok;

  // NEW: Validate recurrence if enabled
  if (recurChk?.checked) {
    const count = parseInt(document.getElementById('field-recur-count')?.value || '4', 10);
    if (count < 2 || count > 52) {
      Toast.show('Ocurrencias debe estar entre 2 y 52', 'error');
      ok = false;
    }
  }

  // No permitir guardar si hay traslape
  if (overlapBox.classList.contains('is-conflict')) {
    Toast.show('Corrige el conflicto de horario antes de guardar.', 'error');
    ok = false;
  }
  return ok;
}
```

---

## Implementation Steps

### Step 1: Apply Critical Fix
Edit `frontend/js/pages/reservacion.js` line 256:
- Change `_submitRecurring(data);` to `await _submitRecurring(data);`
- Rebuild containers

### Step 2: Test
```bash
docker compose up -d --build

# Then via browser:
1. Login as secretaria
2. Navigate to reservacion.html?date=2026-04-25
3. Check "Reservación recurrente" checkbox
4. Set frequency to "Semanal", count to "3"
5. Click "Guardar reservación"
6. Verify: Success toast appears + 3 entries in calendar
7. Refresh page → reservations persist
```

### Step 3: Apply Defensive Improvements
Add error handling and validation as shown above.

### Step 4: Commit
```bash
git add frontend/js/pages/reservacion.js
git commit -m "FIX: Await async _submitRecurring in form submission

- Add await keyword to ensure recurring reservations complete before redirect
- Add try/catch error handling for submit path
- Add validation for recurrence field constraints (2-52 occurrences)

Fixes: Recurring reservations were silently failing due to unhandled promise

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

After applying Fix 1 and testing:

- [ ] Console shows no unhandled promise rejections
- [ ] Toast "Serie creada: X reservaciones" appears after submit
- [ ] Database contains 3 rows with `is_recurring=true` and same `recurring_group`
- [ ] Calendar displays all 3 instances on correct dates
- [ ] Page refresh still shows all 3 reservations
- [ ] Overlap detection skips past reservations correctly
- [ ] Holidays are respected (skipped dates show in toast message)

---

## Expected Outcomes

### Before Fix
```
User Action: Check recurring, submit form
Result: Silent failure, no reservations created, no error shown
Logs: No console errors (promise rejection is unhandled)
DB: Empty (no is_recurring=true rows)
```

### After Fix
```
User Action: Check recurring, submit form
Result: Toast shows "Serie creada: 3 reservaciones"
Logs: No errors (or caught and displayed)
DB: 3 rows created with is_recurring=true, same recurring_group UUID
Calendar: 3 blocks visible on correct dates
```

---

**Status:** Ready to implement  
**Complexity:** Low (1-2 line change for critical fix)  
**Risk:** Low (async/await change, well-tested pattern)  
**Test Coverage:** Manual testing required (no automated tests for UI flows)
