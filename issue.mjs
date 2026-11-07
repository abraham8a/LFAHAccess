import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import { openAccess } from './access.mjs';

try {
  const access = openAccess();
  const code = access.issue(process.argv.slice(2));
  const file = 'private/pase-' + randomUUID() + '.png';
  const png = await QRCode.toBuffer(code, { width: 480, margin: 4, errorCorrectionLevel: 'M' });
  await writeFile(file, png, { flag: 'wx', mode: 0o600 });
  console.log(file);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
