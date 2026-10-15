import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "fh_guest";
function secret() { return process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "development-only-change-me"); }
function sign(id: string) { const key = secret(); if (!key) throw new Error("SESSION_SECRET belum dikonfigurasi."); return createHmac("sha256", key).update(id).digest("hex"); }
export function getGuestSession(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    const [id, signature] = token.split(".");
    if (id && signature) {
      const expected = sign(id);
      const a = Buffer.from(signature, "hex"), b = Buffer.from(expected, "hex");
      if (a.length === b.length && timingSafeEqual(a, b)) return { id, isNew: false };
    }
  }
  return { id: randomBytes(24).toString("hex"), isNew: true };
}
export function setGuestCookie(res: NextResponse, id: string) {
  res.cookies.set(COOKIE_NAME, `${id}.${sign(id)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
export async function getGuestSessionFromCookieValue(value?: string) {
  if (!value) return null;
  const [id, signature] = value.split(".");
  if (!id || !signature) return null;
  const expected = sign(id);
  const a = Buffer.from(signature, "hex"), b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}
export const guestCookieName = COOKIE_NAME;
