import { env } from "@/lib/env";

export type SessionPayload = {
  userId: string;
  role: "ADMIN";
  username: string;
  exp: number;
};

export const SESSION_COOKIE = "tagihan_session";
const EXPIRES_IN_SECONDS = 60 * 60 * 8;
const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function b64url(input: string): string {
  return bytesToBase64Url(encoder.encode(input));
}

function parseB64url(input: string): string {
  return new TextDecoder().decode(base64UrlToBytes(input));
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(env.sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}

export async function createSessionToken(
  userId: string,
  username: string,
): Promise<string> {
  const payload: SessionPayload = {
    userId,
    username,
    role: "ADMIN",
    exp: Math.floor(Date.now() / 1000) + EXPIRES_IN_SECONDS,
  };

  const encoded = b64url(JSON.stringify(payload));
  const signature = await sign(encoded);
  return `${encoded}.${signature}`;
}

export async function verifySessionToken(
  token?: string,
): Promise<SessionPayload | null> {
  if (!token) return null;

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = await sign(encoded);
  const valid = timingSafeEqual(
    base64UrlToBytes(signature),
    base64UrlToBytes(expected),
  );

  if (!valid) return null;

  try {
    const payload = JSON.parse(parseB64url(encoded)) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}
