const button = document.querySelector('#next');
const status = document.querySelector('#status');
const messages = {
  allowed: 'Acceso autorizado',
  invalid: 'Acceso denegado · Pase no reconocido',
  event: 'Acceso denegado · Pase de otra asamblea',
  date: 'Acceso denegado · Pase no válido para hoy',
  used: 'Acceso denegado · Pase ya utilizado hoy'
};
let scanner;
let active = false;
let ready = false;

function show(message, result = '') {
  status.textContent = message;
  status.dataset.result = result;
}

async function scan(code) {
  if (!ready) return;
  ready = false;
  scanner.pause(true);
  show('Validando pase…');
  try {
    const response = await fetch('/validar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error();
    const { result } = await response.json();
    if (!Object.hasOwn(messages, result)) throw new Error();
    show(messages[result], result === 'allowed' ? 'allowed' : 'denied');
  } catch {
    show('Resultado sin confirmar · Revisa la conexión y consulta al responsable.', 'denied');
  }
  button.textContent = 'Escanear otro pase';
  button.disabled = false;
}

button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    if (active) {
      scanner.resume();
    } else {
      scanner = new Html5Qrcode('reader', { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
      await scanner.start({ facingMode: 'environment' }, { fps: 10 }, scan);
      active = true;
    }
    ready = true;
    show('Listo para escanear');
  } catch {
    show('No se pudo activar la cámara. Revisa el permiso de cámara y abre el sitio con HTTPS.', 'denied');
    button.disabled = false;
  }
});

fetch('/evento').then(response => {
  if (!response.ok) throw new Error();
  return response.json();
}).then(event => {
  document.querySelector('#event').textContent = event.nombre;
  show('Activa la cámara para empezar');
  button.disabled = false;
}).catch(() => show('No se pudo cargar el evento. Recarga la página.', 'denied'));
