import {currentUser} from "../../../../lib/auth";
export async function GET(request:Request){try{const user=await currentUser(request);return user?Response.json({user}):Response.json({error:"غير مصرح لك بالدخول إلى النظام"},{status:403})}catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر التحقق من المستخدم"},{status:500})}}
