/* ============================================================
   ROOM-SWITCHER.JS — Selector de sala compartido (Reservar, Calendario)
   Recuerda la última sala elegida (por navegador, no sincronizado) y
   rellena el <select> de sala con la lista de salas activas.
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const RoomSwitcher = (() => {

  const STORAGE_KEY = 'ibero_selected_room';

  const getStored = () => {
    try { return localStorage.getItem(STORAGE_KEY) || null; } catch { return null; }
  };

  const setStored = (id) => {
    try { if (id) localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  };

  // Remembered room if it still exists and is active; otherwise the first
  // active room. Calendar views always show exactly one room — there is no
  // "all rooms" combined view (see docs/changes/2026-09-27-multi-room-support.md).
  const pickInitial = (rooms) => {
    const stored = getStored();
    if (stored && rooms.some(r => r.id === stored)) return stored;
    return rooms[0]?.id ?? null;
  };

  const populateSelect = (sel, rooms, selectedId) => {
    if (!sel) return;
    sel.innerHTML = '';
    rooms.forEach(r => {
      const opt = document.createElement('option');
      opt.value       = r.id;
      opt.textContent = r.name;
      sel.appendChild(opt);
    });
    if (selectedId) sel.value = selectedId;
  };

  return { getStored, setStored, pickInitial, populateSelect };
})();
