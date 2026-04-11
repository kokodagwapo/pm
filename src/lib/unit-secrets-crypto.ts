import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKeyBuffer(): Buffer {
  const raw = process.env.UNIT_SECRETS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("UNIT_SECRETS_ENCRYPTION_KEY is not set");
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) {
    throw new Error(
      "UNIT_SECRETS_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64)"
    );
  }
  return buf;
}

/** True when the env var is present and valid enough to derive a 32-byte key. */
export function isUnitSecretsEncryptionConfigured(): boolean {
  try {
    getKeyBuffer();
    return true;
  } catch {
    return false;
  }
}

export function encryptUnitSecret(plain: string): string {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptUnitSecret(
  payload: string | undefined | null
): string | null {
  if (!payload || typeof payload !== "string") {
    return null;
  }
  try {
    const key = getKeyBuffer();
    const buf = Buffer.from(payload, "base64");
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
      return null;
    }
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const data = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return null;
  }
}
