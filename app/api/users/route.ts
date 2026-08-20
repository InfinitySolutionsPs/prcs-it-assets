import {asc,eq} from "drizzle-orm";import {createClient} from "@supabase/supabase-js";import {getDb} from "../../../db";import {appUsers} from "../../../db/schema";import {requirePermission} from "../../../lib/auth";
const clean=(u:typeof appUsers.$inferSelect)=>({...u,permissions:JSON.parse(u.permissions)as string[]});
function adminClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,secret=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!secret)throw new Error("مفتاح إدارة Supabase غير مضبوط على الخادم");
 return createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}});
}
export async function GET(request:Request){if(!await requirePermission(request,"users"))return Response.json({error:"غير مصرح"},{status:403});const db=await getDb();return Response.json({users:(await db.select().from(appUsers).orderBy(asc(appUsers.id))).map(clean)})}
export async function POST(request:Request){
 const actor=await requirePermission(request,"users");
 if(!actor||actor.role!=="مدير النظام")return Response.json({error:"إضافة المستخدمين متاحة لمدير النظام فقط"},{status:403});
 try{
  const p=await request.json()as{email?:string;password?:string;fullName?:string;role?:string;permissions?:string[]};
  const email=p.email?.trim().toLowerCase(),fullName=p.fullName?.trim(),password=p.password||"";
  if(!email||!fullName)return Response.json({error:"الاسم والبريد الإلكتروني مطلوبان"},{status:400});
  if(password.length<8)return Response.json({error:"كلمة المرور يجب أن تكون 8 أحرف على الأقل"},{status:400});
  const db=await getDb();
  const existing=await db.select().from(appUsers).where(eq(appUsers.email,email)).limit(1);
  if(existing.length)return Response.json({error:"البريد الإلكتروني مسجل مسبقاً في النظام"},{status:409});
  const admin=adminClient();
  const{data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:fullName}});
  if(error)return Response.json({error:error.message.toLowerCase().includes("already")?"البريد الإلكتروني مرتبط بحساب دخول مسبقاً":"تعذر إنشاء حساب الدخول: "+error.message},{status:409});
  try{
   const[user]=await db.insert(appUsers).values({email,fullName,role:p.role||"مستخدم",permissions:JSON.stringify(p.permissions||[]),active:true}).returning();
   return Response.json({user:clean(user)},{status:201});
  }catch(e){
   if(data.user?.id)await admin.auth.admin.deleteUser(data.user.id);
   throw e;
  }
 }catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر إضافة المستخدم"},{status:500})}
}
export async function PATCH(request:Request){if(!await requirePermission(request,"users"))return Response.json({error:"غير مصرح"},{status:403});try{const p=await request.json()as{id?:number;fullName?:string;role?:string;permissions?:string[];active?:boolean};const db=await getDb(),[user]=await db.update(appUsers).set({fullName:p.fullName?.trim(),role:p.role,permissions:JSON.stringify(p.permissions||[]),active:p.active}).where(eq(appUsers.id,Number(p.id))).returning();return Response.json({user:clean(user)})}catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر تعديل المستخدم"},{status:500})}}
export async function DELETE(request:Request){
 const actor=await requirePermission(request,"users");
 if(!actor||actor.role!=="مدير النظام")return Response.json({error:"حذف المستخدمين متاح لمدير النظام فقط"},{status:403});
 const p=await request.json()as{id?:number},id=Number(p.id);
 if(actor.id===id)return Response.json({error:"لا يمكنك حذف حسابك الحالي"},{status:409});
 const db=await getDb(),[user]=await db.select().from(appUsers).where(eq(appUsers.id,id)).limit(1);
 if(!user)return Response.json({error:"المستخدم غير موجود"},{status:404});
 try{
  const admin=adminClient(),{data,error}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(error)throw error;
  const authUser=data.users.find(x=>x.email?.toLowerCase()===user.email.toLowerCase());
  if(authUser){const{error:deleteError}=await admin.auth.admin.deleteUser(authUser.id);if(deleteError)throw deleteError}
  await db.delete(appUsers).where(eq(appUsers.id,id));
  return Response.json({deleted:true});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر حذف حساب المستخدم"},{status:500})}
}
