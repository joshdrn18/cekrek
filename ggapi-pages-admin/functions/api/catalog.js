import { json } from "../_lib/http.js";
import { providerFetch, catalogItems } from "../_lib/ggapi.js";
export async function onRequestGet({request,env}) {
  const url=new URL(request.url),type=url.searchParams.get("type");
  if(!["bank","ewallet"].includes(type))return json({error:"Jenis katalog tidak valid."},400);
  const path=type==="bank"?"/bank-verification/codes":"/ewallet-verification/codes";
  try {
    const data=await providerFetch(path,env);
    const items=catalogItems(data);
    if(!items.length)return json({error:"Katalog GGapi berhasil dipanggil tetapi format respons belum dikenali. Periksa dokumentasi/respons provider."},502);
    const db=env.DB;
    if(db){
      const overrides=await db.prepare("SELECT code,name,enabled FROM service_overrides WHERE type=?").bind(type).all();
      const map=new Map((overrides.results||[]).map(x=>[x.code,x]));
      const result=items.map(item=>{const o=map.get(item.code);return {...item,enabled:o?!!o.enabled:true};}).filter(x=>x.enabled);
      return json({items:result});
    }
    return json({items});
  } catch(e) {
    return json({error:e.message||"Katalog provider tidak tersedia."},e.status===429?429:502);
  }
}
