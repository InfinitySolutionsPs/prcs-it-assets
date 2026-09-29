import {asc,eq} from "drizzle-orm";
import {NextRequest,NextResponse} from "next/server";
import {getDb} from "../../../../db";
import {categories,products} from "../../../../db/schema";
import {deviceCatalog,type CatalogAssetType} from "../../../../data/device-catalog";
import {requirePermission} from "../../../../lib/auth";
import {canAccessAssetType,normalizeAssetScope} from "../../../../lib/asset-scope";

const normalize=(value:string)=>value.trim().toLocaleLowerCase();

export async function POST(request:NextRequest){
 const actor=await requirePermission(request,"setup");
 if(!actor)return NextResponse.json({error:"غير مصرح"},{status:403});
 try{
  const body=await request.json().catch(()=>({}));
  const assetType=body.assetType as CatalogAssetType|"الكل";
  if(assetType!=="تقني"&&assetType!=="طبي"&&assetType!=="الكل")return NextResponse.json({error:"يرجى اختيار نوع الأجهزة المراد استيرادها"},{status:400});
  if(assetType!=="الكل"&&!canAccessAssetType(actor,assetType))return NextResponse.json({error:"لا تملك صلاحية استيراد هذا النوع"},{status:403});

  const db=await getDb();
  const scope=normalizeAssetScope(actor);
  const groups=deviceCatalog.filter(group=>(assetType==="الكل"||group.assetType===assetType)&&(scope==="الكل"||group.assetType===scope));
  const existingCategories=await db.select().from(categories).orderBy(asc(categories.id));
  const categoryByName=new Map(existingCategories.map(category=>[normalize(category.name),category]));
  let createdCategories=0,updatedCategories=0,createdDevices=0,skippedDevices=0;

  for(const group of groups){
   let category=categoryByName.get(normalize(group.category));
   if(!category){
    const [created]=await db.insert(categories).values({name:group.category,assetType:group.assetType,usefulLifeYears:5}).returning();
    category=created;
    categoryByName.set(normalize(category.name),category);
    createdCategories++;
   }else if(category.assetType!==group.assetType){
    const [updated]=await db.update(categories).set({assetType:group.assetType}).where(eq(categories.id,category.id)).returning();
    category=updated;
    categoryByName.set(normalize(category.name),category);
    updatedCategories++;
   }

   const currentProducts=await db.select().from(products).where(eq(products.parentId,category.id));
   const deviceNames=new Set(currentProducts.map(product=>normalize(product.name)));
   for(const deviceName of group.devices){
    const key=normalize(deviceName);
    if(deviceNames.has(key)){skippedDevices++;continue}
    await db.insert(products).values({name:deviceName.trim(),parentId:category.id});
    deviceNames.add(key);
    createdDevices++;
   }
  }

  const allCategories=await db.select().from(categories).orderBy(asc(categories.name));
  const allProducts=await db.select().from(products).orderBy(asc(products.name));
  return NextResponse.json({createdCategories,updatedCategories,createdDevices,skippedDevices,categories:allCategories,products:allProducts});
 }catch(error){
  console.error("catalog import failed",error);
  return NextResponse.json({error:"تعذر استيراد قائمة الأجهزة. لم يتم حذف أي بيانات موجودة."},{status:500});
 }
}
