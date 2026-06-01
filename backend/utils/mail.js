const nodemailer = require('nodemailer');

function buildTransport() {
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || '').trim();
  const service = (process.env.EMAIL_SERVICE || 'Gmail').trim();
  const host = (process.env.EMAIL_SMTP_HOST || '').trim();
  const port = parseInt(process.env.EMAIL_SMTP_PORT || '587', 10);

  if (!user || !pass) {
    throw new Error(
      'В backend/.env задайте EMAIL_USER и EMAIL_PASS (для Gmail — пароль приложения: https://myaccount.google.com/apppasswords )'
    );
  }

  if (host) {
    return nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  const gmail =
    service.toLowerCase() === 'gmail' ||
    /@gmail\.com$/i.test(user) ||
    /@googlemail\.com$/i.test(user);

  if (gmail) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      tls: { rejectUnauthorized: true },
    });
  }

  return nodemailer.createTransport({
    service,
    auth: { user, pass },
  });
}

let transport;
function getTransport() {
  if (!transport) {
    transport = buildTransport();
  }
  return transport;
}

const sendPasswordResetEmail = async (email, resetLink, mailOptions = null) => {
  const transporter = getTransport();

  let finalMailOptions;
  if (mailOptions) {
    finalMailOptions = mailOptions;
  } else {
    const fromAddr = (process.env.EMAIL_FROM || process.env.EMAIL_USER || '').trim();
    const safeLink = String(resetLink || '').replace(/"/g, '&quot;');
    const html =
      '<h2>Запрос на восстановление пароля</h2>' +
      '<p>Если вы запрашивали смену пароля, нажмите на ссылку ниже:</p>' +
      '<a href="' +
      safeLink +
      '" target="_blank" rel="noopener noreferrer">Сбросить пароль</a>' +
      '<p>Ссылка действует 1 час.</p>' +
      '<p>Если вы не запрашивали смену пароля — проигнорируйте это письмо.</p>';
    finalMailOptions = {
      from: `"CodeQuest Kids" <${fromAddr}>`,
      to: email,
      subject: 'Восстановление пароля',
      html,
    };
  }

  try {
    await transporter.sendMail(finalMailOptions);
    console.log('✅ Письмо для восстановления пароля отправлено:', email);
  } catch (error) {
    const detail =
      error.response ||
      error.responseCode ||
      error.command ||
      error.message ||
      String(error);
    console.error('❌ Nodemailer:', detail);
    if (error.stack) {
      console.error(error.stack);
    }
    throw new Error(
      `Почта: ${error.message || 'ошибка SMTP'}. Проверьте EMAIL_USER/EMAIL_PASS в .env (Gmail — только пароль приложения, не обычный пароль).`
    );
  }
};

module.exports = { sendPasswordResetEmail };
