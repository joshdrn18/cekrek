import { json, readJson, rateLimit, sha256, sameOrigin } from "../../_lib/http.js";
import { createSession, sessionCookie } from "../../_lib/auth.js";
export async function onRequestPost({request,env}) {
 if(!sameOrigin(request))return json({error:"Origin tidak diizinkan."},403);
 if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return json({error:"Set secret ADMIN_PASSWORD dan SESSION_SECRET terlebih dahulu."},500);
 const ip=request.headers.get("CF-Connecting-IP")||"unknown";
 const hash=await sha256(env.SESSION_SECRET+":"+ip);
 if(env.DB && !(await rateLimit(env.DB,"login:"+hash,5,300)))return json({error:"Terlalu banyak percobaan login. Tunggu 5 menit."},429);
 const body=await readJson(request);
 if(!body||typeof body.password!=="string"||body.password.length>256)return json({error:"Kredensial tidak valid."},400);
 if(body.password!==env.ADMIN_PASSWORD)return json({error:"Password salah."},401);
 const token=await createSession(env.SESSION_SECRET);
 return json({ok:true},200,{ "Set-Cookie":sessionCookie(token,request) });
}
