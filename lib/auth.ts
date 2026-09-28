import {createHmac,randomBytes,scryptSync,timingSafeEqual} from "node:crypto";
import {eq} from "drizzle-orm";
import {cookies} from "next/headers";
import {getDb} from "../db";
import {appUsers} from "../db/schema";
export const ALL_PERMISSIONS=["dashboard","assets","planning","movements","maintenance","inventory","stock","reports","setup","users"];
const COOKIE="prcs_session",DAY=86_400;
function secret(){const value=process.env.AUTH_SECRET;if(!value||value.length<32)throw new Error("AUTH_SECRET must contain at least 32 characters");return value}
function sign(value:string){return createHmac("sha256",secret()).update(value).digest("base64url")}
export function hashPassword(password:string){const salt=randomBytes(16).toString("hex");return `${salt}:${scryptSync(password,salt,64).toString("hex")}`}
export function verifyPassword(password:string,stored:string){const[salt,hash]=stored.split(":");if(!salt||!hash)return false;const actual=scryptSync(password,salt,64),expected=Buffer.from(hash,"hex");return actual.length===expected.length&&timingSafeEqual(actual,expected)}
export async function createSession(userId:number,remember=false){const exp=Math.floor(Date.now()/1000)+(remember?30:1)*DAY,body=Buffer.from(JSON.stringify({userId,exp})).toString("base64url");(await cookies()).set(COOKIE,`${body}.${sign(body)}`,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:(remember?30:1)*DAY})}
export async function clearSession(){(await cookies()).set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0})}
async function sessionUserId(){const token=(await cookies()).get(COOKIE)?.value;if(!token)return null;const[body,signature]=token.split(".");if(!body||!signature||sign(body)!==signature)return null;try{const value=JSON.parse(Buffer.from(body,"base64url").toString())as{userId:number;exp:number};return value.exp>Math.floor(Date.now()/1000)?value.userId:null}catch{return null}}
export async function currentUser(_request?:Request){const id=await sessionUserId();if(!id)return null;const db=await getDb(),[user]=await db.select().from(appUsers).where(eq(appUsers.id,id)).limit(1);if(!user?.active)return null;return{...user,passwordHash:undefined,permissions:JSON.parse(user.permissions)as string[]}}
export async function requirePermission(request:Request,permission:string){const user=await currentUser(request);if(!user||(!user.permissions.includes(permission)&&user.role!=="مدير النظام"))return null;return user}
