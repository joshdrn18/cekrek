export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      ...headers
    }
  });
}
export async function readJson(request) {
  try { return await request.json(); } catch { return null; }
}
export function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}
export function maskAccount(value) {
  const s = String(value || "");
  return s.length <= 4 ? "••••" : "••••••" + s.slice(-4);
}
export async function setting(db, key, fallback) {
  const row = await db.prepare("SELECT value FROM settings WHERE key=?").bind(key).first();
  return row ? row.value : fallback;
}
export async function rateLimit(db, key, limit, windowSeconds) {
  const now = Math.floor(Date.now()/1000);
  const bucket = `${key}:${Math.floor(now/windowSeconds)}`;
  await db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now).run();
  await db.prepare("INSERT INTO rate_limits(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1")
    .bind(bucket, (Math.floor(now/windowSeconds)+1)*windowSeconds).run();
  const row = await db.prepare("SELECT count FROM rate_limits WHERE bucket=?").bind(bucket).first();
  return Number(row?.count || 0) <= limit;
}
export async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
