/* ============================================================
   CHANGE-PASSWORD-MODAL.JS — Modal para cambiar contraseña
   Plataforma Reservación Sala de Juntas · Ibero CDMX
   ============================================================ */

const ChangePasswordModal = (() => {

  const _buildHTML = () => `
    <div class="modal-header rmodal__header">
      <h2 class="modal-title" style="margin: 0; font-size: 1.2rem;">Cambiar Contraseña</h2>
    </div>
    <div class="modal-body rmodal__body" style="padding: var(--space-4);">
      <form id="change-password-form">
        <div class="form-group">
          <label for="cp-current" class="form-label">Contraseña actual</label>
          <input type="password" id="cp-current" class="form-input" required />
        </div>
        <div class="form-group" style="margin-top: var(--space-3);">
          <label for="cp-new" class="form-label">Nueva contraseña</label>
          <input type="password" id="cp-new" class="form-input" required />
          <div class="form-help">Mínimo 8 caracteres, con mayúscula, minúscula, número y especial</div>
        </div>
        <div class="form-group" style="margin-top: var(--space-3);">
          <label for="cp-confirm" class="form-label">Confirmar nueva contraseña</label>
          <input type="password" id="cp-confirm" class="form-input" required />
        </div>
        <div id="cp-error" class="form-help" style="color: var(--color-danger); display: none; margin-top: var(--space-3);"></div>
      </form>
    </div>
    <div class="modal-footer" style="padding: var(--space-4); display: flex; justify-content: flex-end; gap: var(--space-2); border-top: 1px solid var(--color-border);">
      <button type="button" class="btn btn-ghost" id="cp-cancel-btn">Cancelar</button>
      <button type="submit" form="change-password-form" class="btn btn-primary" id="cp-submit-btn">Guardar</button>
    </div>
  `;

  const show = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay is-visible';
    overlay.id = 'cp-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.zIndex = '9999';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog';
    dialog.style.maxWidth = '400px';
    dialog.style.width = '100%';
    dialog.innerHTML = _buildHTML();

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    // Event listeners
    document.getElementById('cp-cancel-btn').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    const form = document.getElementById('change-password-form');
    const errorDiv = document.getElementById('cp-error');
    const submitBtn = document.getElementById('cp-submit-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const current = document.getElementById('cp-current').value;
      const newPass = document.getElementById('cp-new').value;
      const confirmPass = document.getElementById('cp-confirm').value;

      errorDiv.style.display = 'none';

      if (!Utils.isValidPassword(newPass)) {
        errorDiv.textContent = 'La contraseña debe tener al menos 8 caracteres y contener al menos una mayúscula, una minúscula, un número y un carácter especial.';
        errorDiv.style.display = 'block';
        return;
      }

      if (newPass !== confirmPass) {
        errorDiv.textContent = 'Las contraseñas no coinciden.';
        errorDiv.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Guardando...';

      const res = await Auth.changePassword(current, newPass);

      if (res.success) {
        if (typeof Toast !== 'undefined') Toast.show('Contraseña actualizada correctamente', 'success');
        close();
      } else {
        errorDiv.textContent = res.error || 'Error al actualizar contraseña';
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar';
      }
    });
  };

  return { show };
})();
