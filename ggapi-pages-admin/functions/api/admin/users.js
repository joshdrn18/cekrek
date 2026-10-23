import { json, readJson, sameOrigin } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/auth.js";
export async function onRequestGet(ctx) {
 const a=await requireAdmin(ctx);if(a.response)return a.response;
 const result=await ctx.env.DB.prepare("SELECT id,label,daily_limit,active,created_at FROM managed_users ORDER BY id DESC LIMIT 200").all();
 return json({items:(result.results||[]).map(x=>({...x,active:!!x.active}))});
}
export async function onRequestPost(ctx) {
 const a=await requireAdmin(ctx);if(a.response)return a.response;
 if(!sameOrigin(ctx.request))return json({error:"Origin tidak diizinkan."},403);
 const b=await readJson(ctx.request);if(!b||typeof b.label!=="string"||!b.label.trim()||b.label.length>80)return json({error:"Label pengguna tidak valid."},400);
 const limit=Number(b.daily_limit);if(!Number.isInteger(limit)||limit<1||limit>10000)return json({error:"Limit harian tidak valid."},400);
 await ctx.env.DB.prepare("INSERT INTO managed_users(label,daily_limit,active,created_at) VALUES(?,?,1,?)").bind(b.label.trim(),limit,new Date().toISOString()).run();
 return json({ok:true},201);
}
export async function onRequestPatch(ctx) {
 const a=await requireAdmin(ctx);if(a.response)return a.response;
 if(!sameOrigin(ctx.request))return json({error:"Origin tidak diizinkan."},403);
 const b=await readJson(ctx.request);if(!b||!Number.isInteger(Number(b.id))||typeof b.active!=="boolean")return json({error:"Data perubahan tidak valid."},400);
 await ctx.env.DB.prepare("UPDATE managed_users SET active=? WHERE id=?").bind(b.active?1:0,Number(b.id)).run();
 return json({ok:true});
}
