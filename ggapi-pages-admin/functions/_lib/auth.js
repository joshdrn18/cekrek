import { json } from "./http.js";
const COOKIE = "ggadmin";
const enc = new TextEncoder();
function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function unb64url(s) {
  s=s.replace(/-/g,"+").replace(/_/g,"/");
  while(s.length%4)s+="=";
  return Uint8Array.from(atob(s),c=>c.charCodeAt(0));
}
async function key(secret) {
  return crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
}
async function sign(value, secret) {
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC",await key(secret),enc.encode(value))));
}
export async function createSession(secret) {
  const payload=b64url(enc.encode(JSON.stringify({role:"admin",exp:Date.now()+8*60*60*1000,nonce:crypto.randomUUID()})));
  return payload+"."+await sign(payload,secret);
}
export async function isAdmin(request, env) {
  if(!env.SESSION_SECRET) return false;
  const cookie=request.headers.get("Cookie")||"";
  const match=cookie.match(/(?:^|;\s*)ggadmin=([^;]+)/);
  if(!match)return false;
  const parts=match[1].split(".");
  if(parts.length!==2)return false;
  try {
    if(!(await crypto.subtle.verify("HMAC",await key(env.SESSION_SECRET),unb64url(parts[1]),enc.encode(parts[0]))))return false;
    const payload=JSON.parse(new TextDecoder().decode(unb64url(parts[0])));
    return payload.role==="admin" && payload.exp>Date.now();
  } catch { return false; }
}
export function sessionCookie(token, request) {
  const secure=new URL(request.url).protocol==="https:"?"; Secure":"";
  return `${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800${secure}`;
}
export function clearCookie(request) {
  const secure=new URL(request.url).protocol==="https:"?"; Secure":"";
  return `${COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`;
}
export async function requireAdmin({request,env}) {
  if(!await isAdmin(request,env)) return {response:json({error:"Login admin diperlukan."},401)};
  return {ok:true};
}
