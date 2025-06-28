// crypto.js

// ---------- Base64 Helpers ----------
export function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const base64ToArrayBuffer = (base64) => {
  try {
    const binary = atob(base64);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) buffer[i] = binary.charCodeAt(i);
    return buffer.buffer;
  } catch (error) {
    console.error("Invalid base64 input:", base64);
    throw new Error("Base64 decoding failed: " + error.message);
  }
};


// ---------- RSA Key Pair Generation ----------
export async function generateRSAKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

// ---------- RSA Key Export ----------
export async function exportPublicKey(key) {
  const spki = await crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(spki);
}

export async function exportPrivateKey(key) {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", key);
  return arrayBufferToBase64(pkcs8);
}

// ---------- RSA Key Import ----------
export async function importPrivateKey(base64PrivateKey) {
  const keyData = base64ToArrayBuffer(base64PrivateKey);
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["decrypt"]
  );
}

export async function importPublicKey(base64PublicKey) {
  const keyData = base64ToArrayBuffer(base64PublicKey);
  return crypto.subtle.importKey(
    "spki",
    keyData,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

// ---------- AES Key Generation ----------
export async function generateAESKey() {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// ---------- AES Encryption ----------
export async function encryptWithAES(data, key) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data)
  );
  return {
    cipher: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
}

// ---------- AES Decryption ----------
export async function decryptWithAES(cipherText, ivBase64, aesKey) {
  const iv = base64ToArrayBuffer(ivBase64);
  const cipherBuffer = base64ToArrayBuffer(cipherText);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    cipherBuffer
  );
  return new TextDecoder().decode(decryptedBuffer);
}

// ---------- Encrypt AES Key with RSA ----------
export async function encryptAESKeyWithRSA(publicKeyBase64, aesKey) {
  const publicKey = await importPublicKey(publicKeyBase64);
  const rawKey = await crypto.subtle.exportKey("raw", aesKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    rawKey
  );
  return arrayBufferToBase64(encrypted);
}

// ---------- Decrypt AES Key with RSA ----------
export async function decryptAESKeyWithRSA(encryptedKeyBase64, privateKey) {
  const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyBase64);
  const rawAESKey = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedKeyBuffer
  );
  return await crypto.subtle.importKey(
    "raw",
    rawAESKey,
    { name: "AES-GCM" },
    true,
    ["decrypt"]
  );
}
