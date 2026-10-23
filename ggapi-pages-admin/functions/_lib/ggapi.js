const BASE = "https://use.ggapi.co.id/api";
export async function providerFetch(path, env) {
  if(!env.GGAPI_API_KEY) throw new Error("Secret GGAPI_API_KEY belum disetel.");
  const response=await fetch(BASE+path,{
    headers:{"x-ggapi-co-id":env.GGAPI_API_KEY},
    signal:AbortSignal.timeout(20000)
  });
  const raw=await response.text();
  let data;
  try { data=JSON.parse(raw); } catch { throw new Error("GGapi mengembalikan respons non-JSON."); }
  if(!response.ok) {
    const e=new Error(response.status===402?"Saldo/kuota GGapi tidak mencukupi.":(data.message||data.error||`GGapi HTTP ${response.status}`));
    e.status=response.status; throw e;
  }
  return data;
}
export function catalogItems(data) {
  const candidates=[data?.items,data?.data?.items,data?.data?.banks,data?.data?.ewallets,data?.banks,data?.ewallets,data?.data,Array.isArray(data)?data:null];
  const list=candidates.find(Array.isArray);
  if(!list) return [];
  return list.map(x=>({
    code:String(x.code??x.bank_code??x.ewallet_code??x.id??""),
    name:String(x.name??x.bank_name??x.ewallet_name??x.label??"")
  })).filter(x=>x.code&&x.name);
}
export function normalizeFound(data) {
  const d=data?.data && typeof data.data==="object"?data.data:data;
  return {
    found:d?.found===true,
    account_name:d?.found===true && typeof d.account_name==="string"?d.account_name:"",
    account_type:d?.found===true && typeof d.account_type==="string"?d.account_type:"",
    raw:d
  };
}
