import {asc,eq} from "drizzle-orm";
import {getDb} from "../../../db";
import {assetPlans,assets,categories,departments,facilities,products} from "../../../db/schema";
import {requirePermission} from "../../../lib/auth";

async function rows(){
 const db=await getDb();
 const[plans,assetRows,facilityRows,departmentRows,categoryRows,productRows]=await Promise.all([db.select().from(assetPlans).orderBy(asc(assetPlans.id)),db.select().from(assets),db.select().from(facilities),db.select().from(departments),db.select().from(categories),db.select().from(products)]);
 return plans.map(plan=>{const facility=facilityRows.find(x=>x.id===plan.facilityId),department=departmentRows.find(x=>x.id===plan.departmentId),category=categoryRows.find(x=>x.id===plan.categoryId),product=productRows.find(x=>x.id===plan.productId);const actualQuantity=assetRows.filter(x=>x.site===facility?.name&&x.custodian===department?.name&&x.category===category?.name&&x.name===product?.name).length;return{...plan,facilityName:facility?.name||"",departmentName:department?.name||"",categoryName:category?.name||"",productName:product?.name||"",assetType:category?.assetType||"تقني",actualQuantity,shortage:Math.max(plan.requiredQuantity-actualQuantity,0),surplus:Math.max(actualQuantity-plan.requiredQuantity,0)}});
}

export async function GET(request:Request){if(!await requirePermission(request,"planning"))return Response.json({error:"غير مصرح"},{status:403});try{return Response.json({plans:await rows()})}catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر تحميل بيانات التخطيط"},{status:500})}}

export async function POST(request:Request){
 if(!await requirePermission(request,"planning"))return Response.json({error:"غير مصرح"},{status:403});
 try{
  const p=await request.json()as{categoryId?:number;productId?:number;allocations?:Array<{facilityId?:number;departmentId?:number;requiredQuantity?:number;notes?:string}>};
  if(!p.categoryId||!p.productId||!Array.isArray(p.allocations)||!p.allocations.length)return Response.json({error:"اختر الصنف والجهاز وأضف مرفقًا واحدًا على الأقل"},{status:400});
  const allocations=p.allocations.map(x=>({...x,requiredQuantity:Number(x.requiredQuantity)}));
  if(allocations.some(x=>!x.facilityId||!x.departmentId||!Number.isInteger(x.requiredQuantity)||x.requiredQuantity<=0))return Response.json({error:"بيانات المرافق أو الأقسام أو الأعداد المطلوبة غير صحيحة"},{status:400});
  const keys=new Set(allocations.map(x=>`${x.facilityId}-${x.departmentId}`));
  if(keys.size!==allocations.length)return Response.json({error:"لا يمكن تكرار المرفق والقسم لنفس الجهاز"},{status:400});
  const db=await getDb();
  const[product,category,facilityRows,departmentRows,existing]=await Promise.all([db.select().from(products).where(eq(products.id,p.productId)),db.select().from(categories).where(eq(categories.id,p.categoryId)),db.select().from(facilities),db.select().from(departments),db.select().from(assetPlans).where(eq(assetPlans.productId,p.productId))]);
  if(!product[0]||product[0].parentId!==p.categoryId||!category[0])return Response.json({error:"الجهاز لا يتبع الصنف المحدد"},{status:400});
  for(const allocation of allocations){
   const facility=facilityRows.find(x=>x.id===allocation.facilityId),department=departmentRows.find(x=>x.id===allocation.departmentId);
   if(!facility||!department||department.parentId!==facility.id)return Response.json({error:"أحد الأقسام لا يتبع المرفق المحدد"},{status:400});
   if(existing.some(x=>x.facilityId===allocation.facilityId&&x.departmentId===allocation.departmentId))return Response.json({error:`احتياج ${product[0].name} مسجل مسبقًا في ${facility.name} / ${department.name}`},{status:409});
  }
  db.transaction(tx=>{for(const allocation of allocations)tx.insert(assetPlans).values({facilityId:allocation.facilityId!,departmentId:allocation.departmentId!,categoryId:p.categoryId!,productId:p.productId!,requiredQuantity:allocation.requiredQuantity,notes:allocation.notes?.trim()||""}).run()});
  return Response.json({plans:await rows()},{status:201});
 }catch(e){const message=e instanceof Error?e.message:"تعذر حفظ التخطيط";return Response.json({error:message.includes("UNIQUE")?"يوجد احتياج مسجل مسبقًا لهذا الجهاز في أحد الأقسام":message},{status:409})}
}

export async function PATCH(request:Request){if(!await requirePermission(request,"planning"))return Response.json({error:"غير مصرح"},{status:403});try{const p=await request.json()as{id?:number;requiredQuantity?:number;notes?:string},requiredQuantity=Number(p.requiredQuantity);if(!p.id||!Number.isInteger(requiredQuantity)||requiredQuantity<=0)return Response.json({error:"قيمة الاحتياج غير صحيحة"},{status:400});const db=await getDb();await db.update(assetPlans).set({requiredQuantity,notes:p.notes?.trim()||""}).where(eq(assetPlans.id,p.id));return Response.json({plans:await rows()})}catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر تعديل التخطيط"},{status:500})}}
export async function DELETE(request:Request){if(!await requirePermission(request,"planning"))return Response.json({error:"غير مصرح"},{status:403});try{const{id}=await request.json()as{id?:number};if(!id)return Response.json({error:"السجل غير محدد"},{status:400});const db=await getDb();await db.delete(assetPlans).where(eq(assetPlans.id,id));return Response.json({deleted:true})}catch(e){return Response.json({error:e instanceof Error?e.message:"تعذر حذف التخطيط"},{status:500})}}
