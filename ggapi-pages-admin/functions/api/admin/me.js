import { json } from "../../_lib/http.js";
import { isAdmin } from "../../_lib/auth.js";
export async function onRequestGet(ctx) {
 return isAdmin(ctx.request,ctx.env)?json({ok:true,role:"admin"}):json({error:"Login diperlukan."},401);
}
