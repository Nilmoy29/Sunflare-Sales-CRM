const CRYPTO_KEY_STORAGE = "sunflare_offline_crypto_v1";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateSessionCryptoKey(): Promise<CryptoKey> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Web Crypto is not available");
  }

  const stored = sessionStorage.getItem(CRYPTO_KEY_STORAGE);
  if (stored) {
    const jwk = JSON.parse(stored) as JsonWebKey;
    return crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }

  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const exported = await crypto.subtle.exportKey("jwk", key);
  sessionStorage.setItem(CRYPTO_KEY_STORAGE, JSON.stringify(exported));
  return key;
}

export async function encryptField(plaintext: string): Promise<string> {
  const key = await getOrCreateSessionCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return bytesToBase64(combined);
}

export async function decryptField(blob: string): Promise<string> {
  const key = await getOrCreateSessionCryptoKey();
  const combined = base64ToBytes(blob);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(decrypted);
}

export async function encryptNullableField(
  value: string | null,
): Promise<string | null> {
  if (!value) {
    return null;
  }
  return encryptField(value);
}

export async function decryptNullableField(
  value: string | null,
): Promise<string | null> {
  if (!value) {
    return null;
  }
  return decryptField(value);
}
