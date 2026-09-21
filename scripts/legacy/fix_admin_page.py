import re

with open('frontend/js/pages/admin-page.js', 'r') as f:
    content = f.read()

broken_code = """      const btnTest = document.getElementById('btn-test-smtp');
      if (btnTest) {
        btnTest.addEventListener('click', () => {
            btnTest.innerHTML = origContent;
            
            if (res.success) {
              Modal.confirm({
                title: 'Prueba Exitosa',
                message: `El correo fue aceptado por el servidor SMTP y enviado a <strong>${Utils.escapeHTML(recipient)}</strong>.<br><br>Revisa la bandeja de entrada o spam.`,
                confirmText: 'Aceptar',
                danger: false
              }, () => {});
            } else {
              Modal.confirm({
                title: 'Error de Envío',
                message: `<strong style="color:var(--color-danger);">${Utils.escapeHTML(res.message)}</strong><br><br><span style="font-size:12px;color:var(--color-secondary-mid);">${Utils.escapeHTML(res.rawError || '')}</span>`,
                confirmText: 'Cerrar',
                danger: true
              }, () => {});
            }
          }).catch(err => {
            btnTest.disabled = false;
            btnTest.innerHTML = origContent;
            Toast.show('Error interno al probar SMTP.', 'error');
            console.error(err);
          });
        });
      }"""

fixed_code = """      const btnTest = document.getElementById('btn-test-smtp');
      if (btnTest) {
        btnTest.addEventListener('click', () => {
          Modal.prompt({
            title: 'Correo de Prueba',
            message: 'Ingresa el correo destinatario para la prueba:',
            defaultValue: Store.getUser()?.email || '',
            placeholder: 'ejemplo@correo.com',
            confirmText: 'Enviar'
          }, (recipient) => {
            if (!recipient) return;

            btnTest.disabled = true;
            const origContent = btnTest.innerHTML;
            btnTest.innerHTML = 'Enviando...';

            API.testSmtp(recipient).then(res => {
              btnTest.disabled = false;
              btnTest.innerHTML = origContent;
              
              if (res.success) {
                Modal.confirm({
                  title: 'Prueba Exitosa',
                  message: `El correo fue aceptado por el servidor SMTP y enviado a <strong>${Utils.escapeHTML(recipient)}</strong>.<br><br>Revisa la bandeja de entrada o spam.`,
                  confirmText: 'Aceptar',
                  danger: false
                }, () => {});
              } else {
                Modal.confirm({
                  title: 'Error de Envío',
                  message: `<strong style="color:var(--color-danger);">${Utils.escapeHTML(res.message)}</strong><br><br><span style="font-size:12px;color:var(--color-secondary-mid);">${Utils.escapeHTML(res.rawError || '')}</span>`,
                  confirmText: 'Cerrar',
                  danger: true
                }, () => {});
              }
            }).catch(err => {
              btnTest.disabled = false;
              btnTest.innerHTML = origContent;
              Toast.show('Error interno al probar SMTP.', 'error');
              console.error(err);
            });
          });
        });
      }"""

# Escape template literals so it matches precisely
content = content.replace(broken_code, fixed_code)

with open('frontend/js/pages/admin-page.js', 'w') as f:
    f.write(content)

