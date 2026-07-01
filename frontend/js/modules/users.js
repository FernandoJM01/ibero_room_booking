/* ============================================================
   USERS.JS — Gestión de usuarios
   HU-21 (CRUD usuarios, desactivación, último acceso)
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const Users = (() => {

  /* ── READ ─────────────────────────────────────────────── */

  function getAll() {
    return [...Store.getState().users];
  }

  function getById(id) {
    return Store.getState().users.find(u => u.id === id) ?? null;
  }

  function getByEmail(email) {
    const q = email.toLowerCase().trim();
    return Store.getState().users.find(u => u.email.toLowerCase() === q) ?? null;
  }

  /* ── CREATE ───────────────────────────────────────────── */

  /**
   * create({ name, email, role, password })
   * Returns Promise<{ success, user }> or Promise<{ success: false, error }>
   */
  async function create({ name, email, role, password }) {
    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return { success: false, error: 'missing_fields' };
    }
    if (!Utils.isValidEmail(email)) {
      return { success: false, error: 'invalid_email' };
    }
    if (!Utils.isValidPassword(password)) {
      return { success: false, error: 'weak_password' };
    }
    if (getByEmail(email)) {
      return { success: false, error: 'email_taken' };
    }

    const newUser = {
      name:      name.trim(),
      email:     email.trim().toLowerCase(),
      role:      role === 'secretaria' ? 'secretaria' : 'academico',
      password,
    };

    try {
      const createdUser = await API.createUser(newUser);
      const { users } = Store.getState();
      Store.setState({ users: [...users, createdUser] });
      return { success: true, user: createdUser };
    } catch (err) {
      console.error('Error creating user:', err);
      return { success: false, error: 'api_error' };
    }
  }

  /* ── UPDATE ───────────────────────────────────────────── */

  /**
   * update(id, { name?, email?, role?, password? })
   * Returns Promise<{ success }> or Promise<{ success: false, error }>
   */
  async function update(id, updates) {
    const users = Store.getState().users;
    const idx   = users.findIndex(u => u.id === id);
    if (idx === -1) return { success: false, error: 'not_found' };

    const current = users[idx];

    // Email uniqueness check (excluding self)
    if (updates.email) {
      const emailLower = updates.email.trim().toLowerCase();
      const duplicate  = users.find(u => u.id !== id && u.email.toLowerCase() === emailLower);
      if (duplicate) return { success: false, error: 'email_taken' };
      if (!Utils.isValidEmail(updates.email)) return { success: false, error: 'invalid_email' };
    }

    if (updates.password && !Utils.isValidPassword(updates.password)) {
      return { success: false, error: 'weak_password' };
    }

    const updatePayload = {
      ...(updates.name     ? { name:  updates.name.trim() }                        : {}),
      ...(updates.email    ? { email: updates.email.trim().toLowerCase() }         : {}),
      ...(updates.role     ? { role:  updates.role === 'secretaria' ? 'secretaria' : 'academico' } : {}),
      ...(updates.password ? { password: updates.password }                        : {}),
    };

    try {
      await API.updateUser(id, updatePayload);
      const updated = { ...current, ...updatePayload, updatedAt: new Date().toISOString() };
      const newUsers = [...users];
      newUsers[idx] = updated;
      Store.setState({ users: newUsers });
      console.log('User updated:', id, updatePayload);
      return { success: true };
    } catch (err) {
      console.error('Error updating user:', err);
      return { success: false, error: 'api_error' };
    }
  }

  /* ── ACTIVATE / DEACTIVATE ────────────────────────────── */

  async function deactivate(id) {
    const user = getById(id);
    if (!user) return false;
    // Cannot deactivate self
    if (Store.getUser()?.id === id) return false;
    return _setActive(id, false);
  }

  async function activate(id) {
    return _setActive(id, true);
  }

  async function _setActive(id, active) {
    const users = Store.getState().users;
    const idx   = users.findIndex(u => u.id === id);
    if (idx === -1) return false;

    try {
      if (active) {
        await API.updateUser(id, { active: true });
      } else {
        await API.deactivateUser(id);
      }
      const newUsers = [...users];
      newUsers[idx]  = { ...newUsers[idx], active, updatedAt: new Date().toISOString() };
      Store.setState({ users: newUsers });
      console.log(`User ${active ? 'activated' : 'deactivated'}: ${id}`);
      return true;
    } catch (err) {
      console.error('Error toggling user status:', err);
      return false;
    }
  }

  /* ── VALIDATION HELPERS ─────────────────────────────────── */

  const ERROR_MSGS = {
    missing_fields: 'Todos los campos requeridos deben completarse.',
    invalid_email:  'El correo electrónico no tiene un formato válido.',
    weak_password:  'La contraseña debe tener al menos 8 caracteres.',
    email_taken:    'Ya existe un usuario con ese correo electrónico.',
    not_found:      'Usuario no encontrado.',
    api_error:      'Error al comunicarse con el servidor. Verifica tu conexión.',
  };

  function errorMessage(code) {
    return ERROR_MSGS[code] ?? 'Error desconocido.';
  }

  return { getAll, getById, getByEmail, create, update, deactivate, activate, errorMessage };
})();
