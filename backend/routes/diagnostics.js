const express = require('express');
const nodemailer = require('nodemailer');
const auth = require('../middleware/auth');

const router = express.Router();

// Mask a string, keeping first and last chars visible (e.g. m***s@domain.com or s***p.gmail.com)
function maskString(str) {
  if (!str) return '(no configurado)';
  const parts = str.split('@');
  if (parts.length === 2) {
    const name = parts[0];
    const maskedName = name.length > 2 ? name[0] + '***' + name[name.length - 1] : '***';
    return `${maskedName}@${parts[1]}`;
  }
  return str.length > 3 ? str.substring(0, 2) + '***' + str.substring(str.length - 2) : '***';
}

// Ensure only super admin can access diagnostics
function requireSuperAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere nivel de Super Administrador.' });
  }
  next();
}

// GET /api/diagnostics/smtp
// Return current SMTP configuration status and connection verification
router.get('/smtp', auth, requireSuperAdmin, async (req, res) => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = process.env.SMTP_PORT || '587';
  
  const enabled = !!(host && user && pass);
  if (!enabled) {
    return res.json({ enabled: false, verified: false });
  }

  // Create transporter with short timeout for quick check
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: port === '465',
    auth: {
      user,
      pass,
    },
    connectionTimeout: 3000,
    greetingTimeout: 2000,
  });

  try {
    await transporter.verify();
    res.json({ enabled: true, verified: true });
  } catch (err) {
    res.json({ enabled: true, verified: false });
  }
});

// POST /api/diagnostics/smtp
// Test SMTP delivery
router.post('/smtp', auth, requireSuperAdmin, async (req, res) => {
  const { recipient } = req.body;
  
  if (!recipient) {
    return res.status(400).json({ success: false, errorType: 'validation', message: 'Falta el correo destinatario.' });
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const port = process.env.SMTP_PORT || '587';
  const from = process.env.SMTP_FROM || user;

  // Case 1: SMTP is not configured
  if (!host || !user || !pass) {
    return res.json({
      success: false,
      errorType: 'not_configured',
      message: 'El servicio de correo está desactivado porque no se ha configurado SMTP.'
    });
  }

  // Create temporary transporter to test delivery and catch precise errors
  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: port === '465',
    auth: {
      user,
      pass,
    },
    // Shorter timeout for diagnostics so UI doesn't hang indefinitely
    connectionTimeout: 10000,
    greetingTimeout: 5000,
  });

  try {
    // Crucial step: verify connection and authentication BEFORE sending
    await transporter.verify();

    const { testDiagnosticEmail } = require('../utils/mailer');
    const { subject, html } = testDiagnosticEmail();

    const info = await transporter.sendMail({
      from,
      to: recipient,
      subject,
      html
    });

    // Case 6: Success
    return res.json({
      success: true,
      message: 'Correo enviado correctamente.',
      details: {
        messageId: info.messageId,
        recipient,
        timestamp: new Date().toISOString()
      }
    });

  } catch (err) {
    let errorType = 'unknown';
    let userFriendlyMessage = 'Ocurrió un error inesperado al intentar conectar con el servidor SMTP.';

    // Classify errors based on nodemailer/Node.js error codes
    const errCode = err.code || '';
    const errCommand = err.command || '';
    const responseCode = err.responseCode || 0;

    if (errCode === 'EAUTH' || responseCode === 535) {
      errorType = 'authentication_failed';
      userFriendlyMessage = 'Falló la autenticación. Las credenciales de SMTP_USER o SMTP_PASSWORD son incorrectas.';
    } else if (errCode === 'ETIMEDOUT' || errCode === 'ESOCKETTIMEDOUT') {
      errorType = 'timeout';
      userFriendlyMessage = 'Se agotó el tiempo de espera al intentar conectar con el servidor SMTP. Verifica el Host y el Puerto.';
    } else if (errCode === 'ECONNREFUSED') {
      errorType = 'connection_refused';
      userFriendlyMessage = 'Conexión rechazada. El servidor destino no aceptó la conexión en el puerto configurado.';
    } else if (errCode === 'ENOTFOUND') {
      errorType = 'host_unreachable';
      userFriendlyMessage = 'No se encontró el servidor SMTP (Host Inalcanzable). Verifica que SMTP_HOST esté bien escrito.';
    } else if (errCode === 'EENVELOPE' || responseCode === 550 || responseCode === 554) {
      errorType = 'recipient_or_sender_rejected';
      userFriendlyMessage = 'El servidor SMTP rechazó al remitente o al destinatario. Si usas Microsoft 365, asegúrate de que SMTP_FROM sea idéntico a SMTP_USER.';
    } else if (err.message && err.message.toLowerCase().includes('tls') || errCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      errorType = 'tls_error';
      userFriendlyMessage = 'Error de negociación TLS/SSL. Es posible que el puerto y el tipo de encriptación no coincidan con lo que requiere el servidor.';
    }

    return res.json({
      success: false,
      errorType,
      message: userFriendlyMessage,
      rawError: err.message // Safe to return message, avoid returning raw env vars
    });
  }
});

module.exports = router;
