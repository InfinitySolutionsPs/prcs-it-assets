"use client";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {apiFetch} from "../lib/api-client";

type Named={id:number;name:string;usefulLifeYears?:number;assetType?:string};
type Child=Named&{parentId:number};
type Entity="facility"|"department"|"category"|"product";

export default function SetupManager({tab,setTab,facilities,departments,categories,products,onUpdate,onDelete,onImported,addNamed,addChild}:{tab:string;setTab:(x:string)=>void;facilities:Named[];departments:Child[];categories:Named[];products:Child[];onUpdate:(e:Entity,item:Named|Child)=>void;onDelete:(e:Entity,id:number)=>void;onImported:(categories:Named[],products:Child[])=>void;addNamed:(e:FormEvent<HTMLFormElement>,k:"facility"|"category")=>void;addChild:(e:FormEvent<HTMLFormElement>,k:"department"|"product")=>void}){
 const [editing,setEditing]=useState<{entity:Entity;item:Named|Child}|null>(null);
 const [error,setError]=useState("");
 const [masterSearch,setMasterSearch]=useState("");
 const [childSearch,setChildSearch]=useState("");
 const [masterPage,setMasterPage]=useState(1);
 const [childPage,setChildPage]=useState(1);
 const [masterPageSize,setMasterPageSize]=useState(10);
 const [childPageSize,setChildPageSize]=useState(10);
 const [assetTypeView,setAssetTypeView]=useState<"تقني"|"طبي">("طبي");
 const [importing,setImporting]=useState(false);
 const [importMessage,setImportMessage]=useState("");
 const isFacilities=tab==="المرافق والأقسام";
 const allMasters=isFacilities?facilities:categories;
 const allChildren=isFacilities?departments:products;
 const masters=isFacilities?allMasters:categories.filter(item=>(item.assetType||"تقني")===assetTypeView);
 const visibleMasterIds=new Set(masters.map(item=>item.id));
 const children=isFacilities?allChildren:products.filter(item=>visibleMasterIds.has(item.parentId));
 const masterEntity:Entity=isFacilities?"facility":"category";
 const childEntity:Entity=isFacilities?"department":"product";
 const normalizedMasterSearch=masterSearch.trim().toLowerCase();
 const normalizedChildSearch=childSearch.trim().toLowerCase();
 const filteredMasters=useMemo(()=>masters.filter(x=>x.name.toLowerCase().includes(normalizedMasterSearch)),[masters,normalizedMasterSearch]);
 const filteredChildren=useMemo(()=>children.filter(x=>{const parent=masters.find(p=>p.id===x.parentId)?.name||"";return `${x.name} ${parent}`.toLowerCase().includes(normalizedChildSearch)}),[children,masters,normalizedChildSearch]);
 const masterPages=Math.max(1,Math.ceil(filteredMasters.length/masterPageSize));
 const childPages=Math.max(1,Math.ceil(filteredChildren.length/childPageSize));
 const visibleMasters=filteredMasters.slice((masterPage-1)*masterPageSize,masterPage*masterPageSize);
 const visibleChildren=filteredChildren.slice((childPage-1)*childPageSize,childPage*childPageSize);
 useEffect(()=>{setMasterPage(1);setChildPage(1);setMasterSearch("");setChildSearch("");setImportMessage("")},[tab,assetTypeView]);
 useEffect(()=>{if(masterPage>masterPages)setMasterPage(masterPages)},[masterPage,masterPages]);
 useEffect(()=>{if(childPage>childPages)setChildPage(childPages)},[childPage,childPages]);

 const importCatalog=async()=>{
  if(!confirm(`سيتم استيراد تصنيفات وأجهزة القسم ${assetTypeView}. لن تُحذف البيانات الحالية وستُتجاوز العناصر المكررة. هل تريد المتابعة؟`))return;
  setImporting(true);setError("");setImportMessage("");
  try{const r=await apiFetch("/api/setup/import-catalog",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({assetType:assetTypeView})}),d=await r.json();if(!r.ok)throw new Error(d.error||"تعذر الاستيراد");onImported(d.categories,d.products);setImportMessage(`تمت إضافة ${d.createdCategories} تصنيف و${d.createdDevices} جهاز، وتجاوز ${d.skippedDevices} جهاز موجود مسبقًا.`)}catch(x){setError(x instanceof Error?x.message:"تعذر الاستيراد")}finally{setImporting(false)}
 };

 const update=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  if(!editing)return;
  const f=new FormData(e.currentTarget);
  const payload={entity:editing.entity,id:editing.item.id,name:String(f.get("name")||"").trim(),parentId:Number(f.get("parentId"))||undefined,usefulLifeYears:editing.entity==="category"?Number(f.get("usefulLifeYears")):undefined,assetType:editing.entity==="category"?String(f.get("assetType")||"تقني"):undefined};
  try{const r=await apiFetch("/api/setup",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}),d=await r.json();if(!r.ok)throw new Error(d.error);onUpdate(editing.entity,d.item);setEditing(null);setError("")}catch(x){setError(x instanceof Error?x.message:"تعذر التعديل")}
 };
 const remove=async(entity:Entity,item:Named)=>{
  if(!confirm(`هل تريد حذف «${item.name}»؟ لا يمكن التراجع عن الحذف.`))return;
  try{const r=await apiFetch("/api/setup",{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({entity,id:item.id})}),d=await r.json();if(!r.ok)throw new Error(d.error);onDelete(entity,item.id);setError("")}catch(x){setError(x instanceof Error?x.message:"تعذر الحذف")}
 };

 return <section className="setupPage definitionsPage">
  <div className="definitionsTop">
   <div className="setupTabs"><button className={isFacilities?"active":""} onClick={()=>setTab("المرافق والأقسام")}>⌂ المرافق والأقسام</button><button className={!isFacilities?"active":""} onClick={()=>setTab("الأصناف والأجهزة")}>▣ الأصناف والأجهزة</button></div>
   <div className="definitionsOverview">
    <article><span>{isFacilities?"إجمالي المرافق":"إجمالي الأصناف"}</span><strong>{masters.length}</strong></article>
    <article><span>{isFacilities?"إجمالي الأقسام":"إجمالي الأجهزة"}</span><strong>{children.length}</strong></article>
    <article><span>{isFacilities?"المرافق المرتبطة":"أصناف مستخدمة"}</span><strong>{new Set(children.map(x=>x.parentId)).size}</strong></article>
   </div>
  </div>
  {error&&<div className="setupError">⚠ {error}</div>}
  {!isFacilities&&<section className="assetTypeChooser" aria-label="اختيار نوع الأجهزة">
   <div className="assetTypeChooserHead"><div><h2>اختر مجال الأجهزة</h2><p>اعرض وأدر التصنيفات والأجهزة التقنية أو الطبية بشكل مستقل.</p></div><button type="button" className="catalogImportButton" onClick={importCatalog} disabled={importing}>{importing?"جاري الاستيراد...":`⇩ استيراد قائمة الأجهزة ${assetTypeView==="طبي"?"الطبية":"التقنية"}`}</button></div>
   <div className="assetTypeOptions">
    {(["تقني","طبي"] as const).map(type=>{const ids=new Set(categories.filter(category=>(category.assetType||"تقني")===type).map(category=>category.id));const count=products.filter(product=>ids.has(product.parentId)).length;return <button type="button" key={type} className={`assetTypeOption ${assetTypeView===type?"active":""} ${type==="طبي"?"medical":"technical"}`} onClick={()=>setAssetTypeView(type)}><span className="assetTypeOptionIcon">{type==="طبي"?"✚":"⌘"}</span><span><strong>الأجهزة {type==="طبي"?"الطبية":"التقنية"}</strong><small>{ids.size} تصنيف · {count} جهاز</small></span><b>{assetTypeView===type?"محدد":"اختيار"}</b></button>})}
   </div>
   {importMessage&&<div className="importSuccess">✓ {importMessage}</div>}
  </section>}

  <article className="panel definitionSection">
   <div className="definitionSectionHead"><div><span className="sectionIcon">{isFacilities?"⌂":"▣"}</span><div><h2>{isFacilities?"المرافق":"أصناف الأصول"}</h2><p>{isFacilities?"تعريف المستشفيات والمراكز والمباني":"تعريف أصناف الأجهزة التقنية والطبية وأعمارها الافتراضية"}</p></div></div><span className="countBadge">{masters.length}</span></div>
   <form className="definitionAddForm masterDefinitionForm" onSubmit={e=>addNamed(e,isFacilities?"facility":"category")}>
    <label className="definitionNameField"><span>{isFacilities?"اسم المرفق":"اسم الصنف"}</span><input name="name" required placeholder={isFacilities?"أدخل اسم المرفق كاملًا":"أدخل اسم الصنف كاملًا، مثال: أجهزة مراقبة العلامات الحيوية"}/></label>
    {!isFacilities&&<label><span>نوع الأجهزة</span><div className={`selectedAssetType ${assetTypeView==="طبي"?"medical":"technical"}`}>{assetTypeView}</div><input type="hidden" name="assetType" value={assetTypeView}/></label>}
    {!isFacilities&&<label><span>العمر الافتراضي</span><div className="yearsField"><input name="usefulLifeYears" type="number" min="1" max="100" defaultValue="5" required/><b>سنة</b></div></label>}
    <button className="primary">＋ إضافة {isFacilities?"المرفق":"الصنف"}</button>
   </form>
   <ListToolbar value={masterSearch} onChange={value=>{setMasterSearch(value);setMasterPage(1)}} placeholder={isFacilities?"ابحث باسم المرفق...":"ابحث باسم الصنف..."} total={filteredMasters.length}/>
   <div className="definitionTableWrap"><table className="definitionTable"><thead><tr><th>{isFacilities?"اسم المرفق":"اسم الصنف"}</th>{!isFacilities&&<><th>النوع</th><th>العمر الافتراضي</th></>}<th>{isFacilities?"عدد الأقسام":"عدد الأجهزة"}</th><th>الإجراءات</th></tr></thead><tbody>{visibleMasters.map(x=><tr key={x.id}><td><div className="definitionTitle"><span className="listIcon">{isFacilities?"⌂":"▣"}</span><strong>{x.name}</strong></div></td>{!isFacilities&&<><td><span className={`typeBadge ${x.assetType==="طبي"?"medical":"technical"}`}>{x.assetType||"تقني"}</span></td><td>{x.usefulLifeYears||5} سنوات</td></>}<td><span className="linkedCount">{children.filter(c=>c.parentId===x.id).length}</span></td><td><RowActions onEdit={()=>setEditing({entity:masterEntity,item:x})} onDelete={()=>remove(masterEntity,x)}/></td></tr>)}</tbody></table>{!visibleMasters.length&&<div className="definitionEmpty">لا توجد نتائج مطابقة للبحث</div>}</div>
   <Pager page={masterPage} pages={masterPages} total={filteredMasters.length} pageSize={masterPageSize} onChange={setMasterPage} onPageSizeChange={size=>{setMasterPageSize(size);setMasterPage(1)}} label={isFacilities?"مرافق":"أصناف"}/>
  </article>

  <article className="panel definitionSection">
   <div className="definitionSectionHead"><div><span className="sectionIcon secondary">{isFacilities?"▦":"▤"}</span><div><h2>{isFacilities?"الأقسام التابعة":"الأجهزة التابعة"}</h2><p>{isFacilities?"إدارة الأقسام وربطها بالمرافق":"إدارة الأجهزة وربط كل جهاز بصنف واحد"}</p></div></div><span className="countBadge">{children.length}</span></div>
   <form className="definitionAddForm childDefinitionForm" onSubmit={e=>addChild(e,isFacilities?"department":"product")}>
    <label><span>{isFacilities?"المرفق":"الصنف"}</span><select name="parentId">{masters.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
    <label className="definitionNameField"><span>{isFacilities?"اسم القسم":"اسم الجهاز أو الموديل"}</span><input name="name" required placeholder={isFacilities?"أدخل اسم القسم كاملًا":"أدخل اسم الجهاز أو الموديل كاملًا"}/></label>
    <button className="primary">＋ إضافة {isFacilities?"القسم":"الجهاز"}</button>
   </form>
   <ListToolbar value={childSearch} onChange={value=>{setChildSearch(value);setChildPage(1)}} placeholder={isFacilities?"ابحث في الأقسام أو المرافق...":"ابحث في الأجهزة أو الأصناف..."} total={filteredChildren.length}/>
   <div className="definitionTableWrap"><table className="definitionTable childDefinitionTable"><thead><tr><th>{isFacilities?"اسم القسم":"اسم الجهاز أو الموديل"}</th><th>{isFacilities?"المرفق التابع له":"الصنف التابع له"}</th><th>الإجراءات</th></tr></thead><tbody>{visibleChildren.map(x=><tr key={x.id}><td><strong className="deviceName">{x.name}</strong></td><td><span className="parentChip">{masters.find(p=>p.id===x.parentId)?.name||"—"}</span></td><td><RowActions onEdit={()=>setEditing({entity:childEntity,item:x})} onDelete={()=>remove(childEntity,x)}/></td></tr>)}</tbody></table>{!visibleChildren.length&&<div className="definitionEmpty">لا توجد نتائج مطابقة للبحث</div>}</div>
   <Pager page={childPage} pages={childPages} total={filteredChildren.length} pageSize={childPageSize} onChange={setChildPage} onPageSizeChange={size=>{setChildPageSize(size);setChildPage(1)}} label={isFacilities?"أقسام":"أجهزة"}/>
  </article>

  <div className="relationHint"><strong>ترابط البيانات</strong><span>{isFacilities?"لا يمكن حذف مرفق يحتوي على أقسام تابعة حفاظًا على سلامة البيانات.":"لا يمكن حذف صنف مرتبط بأجهزة أو عهد مسجلة حفاظًا على البيانات الحالية."}</span></div>
  {editing&&<div className="overlay" onMouseDown={()=>setEditing(null)}><form className="modal editDefinition" onSubmit={update} onMouseDown={e=>e.stopPropagation()}><div className="modalHead"><div><h2>تعديل التعريف</h2><p>سيتم تحديث البيانات في جميع قوائم النظام</p></div><button type="button" onClick={()=>setEditing(null)}>×</button></div><label>الاسم<input name="name" defaultValue={editing.item.name} required/></label>{editing.entity==="category"&&<><label>نوع الأصل<select name="assetType" defaultValue={editing.item.assetType||"تقني"}><option>تقني</option><option>طبي</option></select></label><label>العمر الافتراضي للصنف (بالسنوات)<input name="usefulLifeYears" type="number" min="1" max="100" defaultValue={editing.item.usefulLifeYears||5} required/></label></>}{"parentId" in editing.item&&<label>{isFacilities?"المرفق التابع له":"صنف الأصل"}<select name="parentId" defaultValue={editing.item.parentId}>{masters.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>}<div className="modalActions"><button type="button" onClick={()=>setEditing(null)}>إلغاء</button><button className="primary">حفظ التعديل</button></div></form></div>}
 </section>
}

function ListToolbar({value,onChange,placeholder,total}:{value:string;onChange:(value:string)=>void;placeholder:string;total:number}){return <div className="definitionToolbar"><label><span>⌕</span><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label><b>{total} نتيجة</b></div>}
function RowActions({onEdit,onDelete}:{onEdit:()=>void;onDelete:()=>void}){return <span className="rowActions"><button type="button" title="تعديل" onClick={onEdit}>✎</button><button type="button" className="deleteAction" title="حذف" onClick={onDelete}>⌫</button></span>}
function Pager({page,pages,total,pageSize,onChange,onPageSizeChange,label}:{page:number;pages:number;total:number;pageSize:number;onChange:(page:number)=>void;onPageSizeChange:(size:number)=>void;label:string}){const start=total?(page-1)*pageSize+1:0,end=Math.min(page*pageSize,total);return <div className="definitionPager"><span>عرض {start}–{end} من {total}</span><label>عدد {label} في الصفحة<select value={pageSize} onChange={e=>onPageSizeChange(Number(e.target.value))}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label><div><button type="button" disabled={page===1} onClick={()=>onChange(page-1)}>السابق</button><b>{page} / {pages}</b><button type="button" disabled={page===pages} onClick={()=>onChange(page+1)}>التالي</button></div></div>}
