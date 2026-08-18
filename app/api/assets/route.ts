import {desc,eq} from "drizzle-orm";
import {getDb} from "../../../db";
import {assetMovements,assets,inventoryChecks,maintenanceRecords} from "../../../db/schema";
import {currentUser,requirePermission} from "../../../lib/auth";

const toClient=(a:typeof assets.$inferSelect)=>({id:a.id,code:a.code,product:a.name,category:a.category,facility:a.site,department:a.custodian,responsible:a.responsible,status:a.status,condition:a.condition,serial:a.serial,createdAt:a.createdAt});

export async function GET(){try{const db=await getDb();const rows=await db.select().from(assets).orderBy(desc(assets.id)).limit(500);return Response.json({assets:rows.map(toClient)})}catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر تحميل البيانات"},{status:500})}}

export async function POST(request:Request){if(!await requirePermission(request,"assets"))return Response.json({error:"غير مصرح"},{status:403});try{const p=await request.json()as Record<string,string>;for(const k of["code","product","category","facility","department","responsible","serial"])if(!p[k]?.trim())return Response.json({error:`${k} مطلوب`},{status:400});const condition=p.condition?.trim();if(!["جديد","مستخدم"].includes(condition))return Response.json({error:"حالة العهدة غير صحيحة"},{status:400});const db=await getDb();const[row]=await db.insert(assets).values({code:p.code.trim(),name:p.product.trim(),category:p.category.trim(),site:p.facility.trim(),custodian:p.department.trim(),responsible:p.responsible.trim(),serial:p.serial.trim(),status:p.status?.trim()||"يعمل",condition}).returning();return Response.json({asset:toClient(row)},{status:201})}catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر حفظ البيانات"},{status:500})}}

export async function DELETE(request:Request){
 const actor=await currentUser(request);
 if(!actor||actor.role!=="مدير النظام")return Response.json({error:"حذف العهدة متاح لمدير النظام فقط"},{status:403});
 try{
  const{id}=await request.json()as{id?:number};const assetId=Number(id);
  if(!assetId)return Response.json({error:"العهدة غير محددة"},{status:400});
  const db=await getDb();
  const[row]=await db.select().from(assets).where(eq(assets.id,assetId)).limit(1);
  if(!row)return Response.json({error:"العهدة غير موجودة"},{status:404});
  await db.delete(assetMovements).where(eq(assetMovements.assetId,assetId));
  await db.delete(maintenanceRecords).where(eq(maintenanceRecords.assetId,assetId));
  await db.delete(inventoryChecks).where(eq(inventoryChecks.assetId,assetId));
  await db.delete(assets).where(eq(assets.id,assetId));
  return Response.json({deleted:true,id:assetId});
 }catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر حذف العهدة"},{status:500})}
}
