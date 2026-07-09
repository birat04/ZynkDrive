import crypto from "crypto";

import { ENCRYPTION_ALGORITHM } from "@/lib/constants";

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 64;
const PBKDF2_DIGEST = "sha512";

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const getSalt = (): string =>
  process.env.ENCRYPTION_SALT ||
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT ||
  "zynkdrive";

const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY is not configured");
  }

  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    return Buffer.from(key, "hex");
  }

  return crypto.createHash("sha256").update(key).digest();
};

export const hashValue = (value: string): string =>
  crypto
    .pbkdf2Sync(value, getSalt(), PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST)
    .toString("hex");

export const verifyHash = (value: string, hash: string): boolean => {
  const computed = hashValue(value);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
};

export const encryptField = (plaintext: string): string => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptField = (payload: string): string => {
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted payload");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
};

export const generateSecureToken = (bytes = 32): string =>
  crypto.randomBytes(bytes).toString("hex");

const encodeBase32 = (buffer: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const decodeBase32 = (input: string): Buffer => {
  const normalized = input.replace(/=+$/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
};

export const generateTOTPSecret = (): string => encodeBase32(crypto.randomBytes(20));

const generateTOTPAt = (secret: string, counter: number): string => {
  const key = decodeBase32(secret);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
};

export const verifyTOTPCode = (
  secret: string,
  token: string,
  window = 1
): boolean => {
  const normalized = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const counter = Math.floor(Date.now() / 1000 / TOTP_STEP_SECONDS);
  for (let offset = -window; offset <= window; offset += 1) {
    if (generateTOTPAt(secret, counter + offset) === normalized) {
      return true;
    }
  }

  return false;
};

export const buildTOTPUri = (email: string, secret: string): string => {
  const issuer = encodeURIComponent("ZynkDrive");
  const account = encodeURIComponent(email);
  return `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
};

export const generateRecoveryCodes = (count = 10): string[] =>
  Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase()
  );
