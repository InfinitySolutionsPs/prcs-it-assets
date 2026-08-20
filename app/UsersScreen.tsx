"use client";
import {FormEvent,useEffect,useState} from "react";
import {apiFetch} from "../lib/supabase-client";

type User={id:number;email:string;fullName:string;role:string;permissions:string[];active:boolean;createdAt:string};
const permissions=[['dashboard','نظرة عامة'],['assets','الأصول والعهد'],['movements','التسليم والنقل'],['maintenance','الصيانة'],['inventory','الجرد'],['stock','المخزون'],['reports','التقارير'],['setup','التعريفات الأساسية'],['users','المستخدمون والصلاحيات']];
const rolePermissions:Record<string,string[]>={"مدير النظام":permissions.map(x=>x[0]),"مسؤول العهد":["dashboard","assets","movements","inventory","reports"],"فني الصيانة":["dashboard","assets","maintenance"],"مدقق الجرد":["dashboard","assets","inventory","reports"],"مستخدم للقراءة":["dashboard","assets","reports"]};

export default function UsersScreen(){
 const[users,setUsers]=useState<User[]>([]),[editing,setEditing]=useState<User|null>(null),[creating,setCreating]=useState(false),[msg,setMsg]=useState(""),[role,setRole]=useState("مسؤول العهد"),[saving,setSaving]=useState(false);
 useEffect(()=>{apiFetch('/api/users').then(r=>r.json()).then(d=>setUsers(d.users||[])).catch(()=>{})},[]);
 const beginCreate=()=>{setEditing(null);setRole("مسؤول العهد");setMsg("");setCreating(true)};
 const beginEdit=(u:User)=>{setEditing(u);setRole(u.role);setMsg("");setCreating(false)};
 const submit=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();setSaving(true);setMsg("");const form=e.currentTarget,f=new FormData(form),selected=f.getAll('permissions').map(String),fullName=String(f.get('fullName')||'').trim(),email=String(f.get('email')||editing?.email||'').trim().toLowerCase();
  try{
   if(editing){const r=await apiFetch('/api/users',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({id:editing.id,fullName,role:f.get('role'),permissions:selected,active:f.get('active')==='on'})}),d=await r.json();if(!r.ok)throw new Error(d.error);setUsers(v=>v.map(x=>x.id===d.user.id?d.user:x));setEditing(null);setMsg('تم تحديث المستخدم والصلاحيات بنجاح');return}
   const password=String(f.get('password')||''),confirmPassword=String(f.get('confirmPassword')||'');if(password.length<8)throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');if(password!==confirmPassword)throw new Error('كلمتا المرور غير متطابقتين');
   const r=await apiFetch('/api/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({fullName,email,password,role:f.get('role'),permissions:selected})}),d=await r.json();if(!r.ok)throw new Error(d.error);setUsers(v=>[...v,d.user]);setCreating(false);setMsg('تم إنشاء المستخدم وتفعيل الحساب. يمكنه تسجيل الدخول الآن بالبريد وكلمة المرور');form.reset();
  }catch(x){setMsg(x instanceof Error?x.message:'تعذر الحفظ')}finally{setSaving(false)}
 };
 const remove=async(u:User)=>{if(!confirm(`حذف المستخدم ${u.fullName}؟`))return;const r=await apiFetch('/api/users',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({id:u.id})}),d=await r.json();if(!r.ok){setMsg(d.error);return}setUsers(v=>v.filter(x=>x.id!==u.id))};
 const currentRole=editing?.role||role,currentPermissions=editing?.permissions||rolePermissions[currentRole]||[];
 return <section className="usersPage">
  <div className="usersToolbar"><div><h2>إدارة المستخدمين</h2><p>إنشاء الحسابات وتحديد الأدوار والصلاحيات</p></div><button className="primary" onClick={beginCreate}>＋ إضافة مستخدم جديد</button></div>
  <div className="assetSummary"><article><span>إجمالي المستخدمين</span><strong>{users.length}</strong></article><article><span>مستخدمون نشطون</span><strong>{users.filter(x=>x.active).length}</strong></article><article><span>مديرو النظام</span><strong>{users.filter(x=>x.role==='مدير النظام').length}</strong></article><article><span>الأدوار المتاحة</span><strong>5</strong></article></div>
  <div className="usersGrid">
   <form className="panel userForm" onSubmit={submit} key={editing?.id||(creating?'new-user':'empty')}>
    <div className="panelHead"><div><h2>{editing?'تعديل المستخدم':creating?'إضافة مستخدم جديد':'بيانات المستخدم'}</h2><p>{editing?'تعديل الدور والصلاحيات':'اسم مستخدم وبريد وكلمة مرور مستقلة'}</p></div><span className="moveIcon">♙</span></div>
    {!editing&&!creating?<div className="emptyUserForm"><span>＋</span><strong>اضغطي «إضافة مستخدم جديد»</strong><p>لإنشاء حساب دخول وتحديد صلاحياته.</p></div>:<>
     <label>اسم المستخدم<input name="fullName" defaultValue={editing?.fullName} required placeholder="اسم المستخدم"/></label>
     <label>البريد الإلكتروني<input name="email" type="email" defaultValue={editing?.email} disabled={Boolean(editing)} required placeholder="name@example.com"/></label>
     {!editing&&<><label>كلمة المرور<input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="8 أحرف على الأقل"/></label><label>تأكيد كلمة المرور<input name="confirmPassword" type="password" minLength={8} required autoComplete="new-password" placeholder="أعد إدخال كلمة المرور"/></label></>}
     <label>الدور<select name="role" value={currentRole} onChange={e=>{setRole(e.target.value);if(editing)setEditing({...editing,role:e.target.value,permissions:rolePermissions[e.target.value]})}}>{Object.keys(rolePermissions).map(r=><option key={r}>{r}</option>)}</select></label>
     <fieldset><legend>صلاحيات الوصول</legend>{permissions.map(([key,label])=><label className="permissionCheck" key={`${currentRole}-${key}`}><input type="checkbox" name="permissions" value={key} defaultChecked={currentPermissions.includes(key)}/><span>{label}</span></label>)}</fieldset>
     {editing&&<label className="activeCheck"><input type="checkbox" name="active" defaultChecked={editing.active}/> الحساب نشط</label>}
     <div className="userFormActions"><button type="button" onClick={()=>{setEditing(null);setCreating(false);setMsg("")}}>إلغاء</button><button className="primary" disabled={saving}>{saving?'جاري الحفظ...':editing?'حفظ المستخدم':'إنشاء المستخدم'}</button></div>
    </>}
    {msg&&<div className="formMessage">{msg}</div>}
   </form>
   <article className="panel recordsPanel"><div className="panelHead"><div><h2>المستخدمون المسجلون</h2><p>إدارة الأدوار وحالة الحساب</p></div><span className="resultPill">{users.length} مستخدم</span></div><div className="userList">{users.map(u=><div className="userRow" key={u.id}><span className="userAvatar">{u.fullName.charAt(0)}</span><div><strong>{u.fullName}</strong><small>{u.email}</small></div><span className="rolePill">{u.role}</span><span className={`badge ${u.active?'ok':'repair'}`}>{u.active?'نشط':'موقوف'}</span><div className="rowActions"><button onClick={()=>beginEdit(u)} title="تعديل">✎</button><button className="deleteAction" onClick={()=>remove(u)} title="حذف">⌫</button></div></div>)}</div></article>
  </div>
 </section>
}
