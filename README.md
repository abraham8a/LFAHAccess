# Control de entrada por QR

El escáner anterior está en `index.html`. Acepta fechas escritas en el QR dentro de un intervalo fijo y cuenta lecturas en el navegador. `index.html2` es una variante con reglas de texto y un contador externo. `test_fetch.js` consulta ese contador.

GitHub Pages sirve archivos estáticos. El código del navegador es público, el reloj del teléfono se puede cambiar y un contador no acredita que un pase haya sido emitido. El nuevo escáner usa el mismo lector QR en el navegador y consulta un servidor privado para la decisión. SQLite guarda el hash del código, su asamblea, los días asignados y cada entrada. Un índice único impide que dos puertas acepten el mismo pase el mismo día.

## Configurar y emitir

1. Instala Node.js 24 o posterior. Desde la raíz del proyecto ejecuta `npm ci`.
2. Ejecuta `mkdir -p private` y `cp evento.ejemplo.json private/evento.json`. Edita el identificador, nombre, zona horaria IANA y fechas en formato AAAA-MM-DD. Usa un identificador nuevo para cada asamblea. Reinicia el servidor al editar la configuración. Un cambio de nombre invalida pases emitidos con el nombre anterior.
3. En la máquina que comparte la base de datos con el servidor, ejecuta `npm run issue -- 2030-06-01`, usando la fecha real. Puedes pasar varias fechas separadas por espacios. Ejecuta el comando una vez por asistente y envía el PNG que indique el comando por tu canal habitual. Los pases antiguos deben volver a emitirse.
4. Conserva y respalda `private/` en almacenamiento persistente con permisos limitados. No publiques su contenido. Cada PNG concede entrada a quien lo presente primero en la fecha asignada. Si se requiere reingreso el mismo día, coordínalo con el personal.

## Abrir el escáner

1. Genera una clave con `openssl rand -hex 24`, configura `SCANNER_KEY` en el entorno privado del servidor y ejecuta `npm start`.
2. Para probar en la máquina del servidor, abre `http://localhost:8080`. Para los teléfonos, publica este servidor detrás de un proxy HTTPS en un dominio dedicado. Por defecto Node solo escucha en `127.0.0.1:8080`. Conecta todas las puertas a la misma instancia con el mismo disco persistente. No publiques la carpeta del proyecto con un servidor de archivos.
3. Ingresa como `entrada` con la clave del personal. Pulsa **Activar cámara**, acepta el permiso y apunta al QR. Lee el resultado antes de pulsar **Escanear otro pase**.
4. Si el resultado queda sin confirmar, consulta al responsable antes de admitir. Una pérdida de conexión tras registrar la entrada puede hacer que un nuevo escaneo muestre «Pase ya utilizado hoy». La operación requiere conexión al servidor. Mantén sincronizado el reloj del servidor y rota la clave si deja de ser privada.

## Pruebas

Ejecuta `npm test`. Antes del evento, prueba con la fecha local de ese día y dos teléfonos en el sitio HTTPS. Comprueba el permiso de cámara, un pase válido, su repetición desde el otro teléfono, un pase de otro día y el mensaje al perder la conexión.
