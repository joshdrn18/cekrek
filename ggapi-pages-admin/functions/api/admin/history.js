import { json } from "../../_lib/http.js";
import { requireAdmin } from "../../_lib/auth.js";
export async function onRequestGet(ctx) {
 const a=await requireAdmin(ctx);if(a.response)return a.response;
 const result=await ctx.env.DB.prepare("SELECT created_at,type,service_name,account_masked,status,duration_ms FROM checks ORDER BY id DESC LIMIT 100").all();
 return json({items:result.results||[]});
}
