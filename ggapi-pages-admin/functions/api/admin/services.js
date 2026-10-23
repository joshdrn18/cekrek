import { json, readJson, sameOrigin } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/auth.js";
import { providerFetch, catalogItems } from "../../_lib/ggapi.js";
export async function onRequestGet(ctx) {
 const a=await requireAdmin(ctx);if(a.response)return a.response;
 const db=ctx.env.DB;
 const all=[];
 for(const type of ["bank","ewallet"]){
  try{
   const path=type==="bank"?"/bank-verification/codes":"/ewallet-verification/codes";
   const data=await providerFetch(path,ctx.env);
   const items=catalogItems(data);
   const overrides=await db.prepare("SELECT code,name,enabled FROM service_overrides WHERE type=?").bind(type).all();
   const map=new Map((overrides.results||[]).map(x=>[x.code,x]));
   for(const item of items){const o=map.get(item.code);all.push({type,code:item.code,name:o?.name||item.name,enabled:o?!!o.enabled:true});}
  }catch(e){return json({error:`Gagal membaca katalog ${type}: ${e.message}`},502);}
 }
 return json({items:all});
}
export async function onRequestPatch(ctx) {
 const a=await requireAdmin(ctx);if(a.response)return a.response;
 if(!sameOrigin(ctx.request))return json({error:"Origin tidak diizinkan."},403);
 const b=await readJson(ctx.request);
 if(!b||!["bank","ewallet"].includes(b.type)||typeof b.code!=="string"||typeof b.name!=="string"||typeof b.enabled!=="boolean")return json({error:"Data layanan tidak valid."},400);
 await ctx.env.DB.prepare("INSERT INTO service_overrides(type,code,name,enabled,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(type,code) DO UPDATE SET name=excluded.name,enabled=excluded.enabled,updated_at=excluded.updated_at")
 .bind(b.type,b.code,b.name.slice(0,100),b.enabled?1:0,new Date().toISOString()).run();
 return json({ok:true});
}
