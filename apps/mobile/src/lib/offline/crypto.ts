import { gcm } from "@noble/ciphers/aes.js";
import { randomBytes, utf8ToBytes } from "@noble/ciphers/utils.js";
import * as SecureStore from "expo-secure-store";

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

async function getOrCreateKeyBytes(): Promise<Uint8Array> {
  const stored = await SecureStore.getItemAsync(CRYPTO_KEY_STORAGE);
  if (stored) {
    return base64ToBytes(stored);
  }

  const key = randomBytes(32);
  await SecureStore.setItemAsync(CRYPTO_KEY_STORAGE, bytesToBase64(key));
  return key;
}

export async function encryptField(plaintext: string): Promise<string> {
  const key = await getOrCreateKeyBytes();
  const iv = randomBytes(12);
  const aes = gcm(key, iv);
  const ciphertext = aes.encrypt(utf8ToBytes(plaintext));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return bytesToBase64(combined);
}

export async function decryptField(blob: string): Promise<string> {
  const key = await getOrCreateKeyBytes();
  const combined = base64ToBytes(blob);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const aes = gcm(key, iv);
  const decrypted = aes.decrypt(ciphertext);
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
