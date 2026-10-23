import { json, readJson, maskAccount, rateLimit, setting, sha256 } from "../_lib/http.js";
import { providerFetch, normalizeFound } from "../_lib/ggapi.js";
export async function onRequestPost({request,env}) {
  if(!env.DB)return json({error:"Database D1 belum terhubung."},503);
  const ip=request.headers.get("CF-Connecting-IP")||"unknown";
  const ipHash=await sha256((env.RATE_HASH_SECRET||env.SESSION_SECRET||"missing")+":"+ip);
  const minuteLimit=Number(await setting(env.DB,"minute_limit","10"));
  const dailyLimit=Number(await setting(env.DB,"daily_limit","100"));
  if(!(await rateLimit(env.DB,"m:"+ipHash,minuteLimit,60)))return json({error:"Batas request per menit tercapai. Coba lagi nanti."},429);
  if(!(await rateLimit(env.DB,"d:"+ipHash,dailyLimit,86400)))return json({error:"Batas request harian tercapai."},429);
  const body=await readJson(request);
  if(!body)return json({error:"Body JSON tidak valid."},400);
  const {type,code,account_number}=body;
  if(!["bank","ewallet"].includes(type)||typeof code!=="string"||!/^[a-zA-Z0-9_-]{1,40}$/.test(code))return json({error:"Jenis atau kode layanan tidak valid."},400);
  if(typeof account_number!=="string"||!/^[0-9]{5,30}$/.test(account_number))return json({error:"Nomor rekening/HP harus 5–30 digit."},400);
  const override=await env.DB.prepare("SELECT name,enabled FROM service_overrides WHERE type=? AND code=?").bind(type,code).first();
  if(override && !override.enabled)return json({error:"Layanan ini dinonaktifkan oleh admin."},403);
  const path=(type==="bank"?"/bank-verification/validate":"/ewallet-verification/validate");
  const qs=new URLSearchParams({code,account_number});
  const started=Date.now();let status="error",providerStatus=null,serviceName=override?.name||code,result={found:false,account_name:""};
  try {
    const data=await providerFetch(path+"?"+qs.toString(),env);
    const normalized=normalizeFound(data);result=normalized;
    status=normalized.found?"success":"not_found";
    providerStatus=200;
    const d=normalized.raw;
    serviceName=String(d.bank_name||d.ewallet_name||d.service_name||serviceName);
    return await finish({env,type,code,serviceName,account_number,ipHash,started,status,providerStatus,result});
  } catch(e) {
    status=e.status===402?"provider_balance_error":"error";providerStatus=e.status||null;
    await record(env.DB,{type,code,serviceName,account_number,ipHash,started,status,providerStatus});
    return json({error:e.message||"Pengecekan gagal."},e.status===429?429:e.status===402?502:502);
  }
}
async function finish({env,type,code,serviceName,account_number,ipHash,started,status,providerStatus,result}) {
  await record(env.DB,{type,code,serviceName,account_number,ipHash,started,status,providerStatus});
  return json({found:result.found,account_name:result.account_name,account_type:result.account_type||"",service_name:serviceName,code});
}
async function record(db,x) {
  const masked=x.account_number.length<=4?"••••":"••••••"+x.account_number.slice(-4);
  await db.prepare("INSERT INTO checks(created_at,type,service_code,service_name,account_masked,status,duration_ms,provider_status,ip_hash) VALUES(?,?,?,?,?,?,?,?,?)")
   .bind(new Date().toISOString(),x.type,x.code,x.serviceName,masked,x.status,Date.now()-x.started,x.providerStatus,x.ipHash).run();
}
