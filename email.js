// Invio delle email (avvisi delle revisioni).
// Railway (piano Hobby) blocca l'SMTP: si usa l'API via internet di uno di questi servizi.
//  - Resend: variabile RESEND_API_KEY (gratis fino a 3.000 email al mese)
//  - Brevo:  variabile BREVO_API_KEY (gratis fino a 300 email al giorno, server in Europa)
// EMAIL_MITTENTE = indirizzo da cui partono (es. avvisi@tuodominio.it), deve essere verificato sul servizio.
// EMAIL_NOME_MITTENTE = nome visualizzato (predefinito "Stiva").
// EMAIL_SERVIZIO = 'resend' o 'brevo' se hai messo entrambe le chiavi (altrimenti si usa quella presente).

function servizio() {
  const scelta = String(process.env.EMAIL_SERVIZIO || '').toLowerCase();
  if (scelta === 'brevo' && process.env.BREVO_API_KEY) return 'brevo';
  if (scelta === 'resend' && process.env.RESEND_API_KEY) return 'resend';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.BREVO_API_KEY) return 'brevo';
  return null;
}
const mittente = () => String(process.env.EMAIL_MITTENTE || '').trim();
const nomeMittente = () => String(process.env.EMAIL_NOME_MITTENTE || 'Stiva').trim();
const attivo = () => !!(servizio() && mittente());

// Indirizzo del programma, per i link nelle email
function indirizzoStiva() {
  const u = process.env.URL_STIVA || (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : '');
  return String(u).replace(/\/+$/, '');
}

const EMAIL_VALIDA = /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/i;

async function invia({ a, oggetto, html, testo }) {
  const s = servizio();
  if (!s || !mittente()) throw new Error('Il servizio email non è attivo: mancano le variabili su Railway.');
  const dest = (Array.isArray(a) ? a : [a]).filter((x) => EMAIL_VALIDA.test(x));
  if (!dest.length) throw new Error('Nessun indirizzo email valido.');
  let url, opzioni;
  if (s === 'resend') {
    url = (process.env.RESEND_URL || 'https://api.resend.com') + '/emails';
    opzioni = {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: nomeMittente() + ' <' + mittente() + '>', to: dest, subject: oggetto, html, text: testo }),
    };
  } else {
    url = (process.env.BREVO_URL || 'https://api.brevo.com') + '/v3/smtp/email';
    opzioni = {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ sender: { email: mittente(), name: nomeMittente() }, to: dest.map((email) => ({ email })),
        subject: oggetto, htmlContent: html, textContent: testo }),
    };
  }
  const risp = await fetch(url, { ...opzioni, signal: AbortSignal.timeout(20000) });
  if (!risp.ok) {
    let dett = '';
    try { dett = (await risp.text()).slice(0, 300); } catch (e) { /* niente */ }
    throw new Error(`Il servizio email (${s}) ha risposto con un errore (${risp.status}). ${dett}`);
  }
  return { ok: true, servizio: s };
}

module.exports = { invia, attivo, servizio, indirizzoStiva, EMAIL_VALIDA };
