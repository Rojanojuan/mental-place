/**
 * Genera el par de claves VAPID que identifica al servidor de avisos.
 *
 * VAPID es una firma ECDSA P-256: la pública viaja en la app (al suscribirse)
 * y la privada **solo** vive como secreto del Worker. Sin dependencias: la
 * criptografía la trae Node.
 *
 * Uso:  node scripts/vapid.mjs
 */
import { webcrypto } from 'node:crypto';

/** Base64 «url-safe» y sin relleno, que es lo que pide el estándar. */
function b64url(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const par = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
  'sign',
  'verify',
]);

// La pública va en crudo (65 bytes: 0x04 + X + Y), que es como la espera
// `pushManager.subscribe`.
const publica = await webcrypto.subtle.exportKey('raw', par.publicKey);
// La privada, como JWK: el Worker la vuelve a importar desde el secreto.
const privada = await webcrypto.subtle.exportKey('jwk', par.privateKey);

console.log('\n=== Claves VAPID ===\n');
console.log('Pública (va en la app, no es secreta):');
console.log(`  ${b64url(publica)}\n`);
console.log('Privada (SECRETO del Worker, no la compartas ni la subas al repo):');
console.log(`  ${JSON.stringify({ d: privada.d, x: privada.x, y: privada.y })}\n`);
console.log('Qué hacer con ellas: docs/AVISOS_PUSH.md\n');
