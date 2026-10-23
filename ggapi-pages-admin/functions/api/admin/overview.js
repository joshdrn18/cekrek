import { json, readJson, sameOrigin } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/auth.js";
export async function onRequestGet(ctx) {
 const a=await requireAdmin(ctx);if(a.response)return a.response;
 const db=ctx.env.DB;if(!db)return json({error:"D1 belum terhubung."},503);
 const [total,success,failed,today,daily,minute]=await Promise.all([
 db.prepare("SELECT COUNT(*) n FROM checks").first(),
 db.prepare("SELECT COUNT(*) n FROM checks WHERE status='success'").first(),
 db.prepare("SELECT COUNT(*) n FROM checks WHERE status!='success'").first(),
 db.prepare("SELECT COUNT(*) n FROM checks WHERE created_at >= ?").bind(new Date().toISOString().slice(0,10)).first(),
 db.prepare("SELECT value FROM settings WHERE key='daily_limit'").first(),
 db.prepare("SELECT value FROM settings WHERE key='minute_limit'").first()
 ]);
 return json({total:total.n,success:success.n,failed:failed.n,today:today.n,settings:{daily_limit:Number(daily?.value||100),minute_limit:Number(minute?.value||10)}});
}
export async function onRequestPatch(ctx) {
 const a=await requireAdmin(ctx);if(a.response)return a.response;
 if(!sameOrigin(ctx.request))return json({error:"Origin tidak diizinkan."},403);
 const b=await readJson(ctx.request);if(!b)return json({error:"JSON tidak valid."},400);
 const daily=Number(b.daily_limit),minute=Number(b.minute_limit);
 if(!Number.isInteger(daily)||daily<1||daily>10000||!Number.isInteger(minute)||minute<1||minute>120)return json({error:"Limit di luar rentang."},400);
 await ctx.env.DB.batch([
 ctx.env.DB.prepare("INSERT INTO settings(key,value) VALUES('daily_limit',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(daily)),
 ctx.env.DB.prepare("INSERT INTO settings(key,value) VALUES('minute_limit',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(minute))
 ]);
 return json({ok:true});
}
