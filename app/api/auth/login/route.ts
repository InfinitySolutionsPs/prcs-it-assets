import {eq} from "drizzle-orm";
import {getDb} from "../../../../db";
import {appUsers} from "../../../../db/schema";
import {createSession,verifyPassword} from "../../../../lib/auth";
export async function POST(request:Request){try{const p=await request.json()as{username?:string;password?:string;remember?:boolean},username=p.username?.trim().toLowerCase(),password=p.password||"";if(!username||!password)return Response.json({error:"اسم المستخدم وكلمة المرور مطلوبان"},{status:400});const db=await getDb(),[user]=await db.select().from(appUsers).where(eq(appUsers.username,username)).limit(1);if(!user?.active||!user.passwordHash||!verifyPassword(password,user.passwordHash))return Response.json({error:"اسم المستخدم أو كلمة المرور غير صحيحة"},{status:401});await createSession(user.id,Boolean(p.remember));return Response.json({ok:true})}catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر تسجيل الدخول"},{status:500})}}
