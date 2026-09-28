const normalizeRole=(role?:string|null)=>(role||"").normalize("NFKC").trim().replace(/\s+/g," ").toLowerCase();

export function isSystemAdminRole(role?:string|null){
 const value=normalizeRole(role);
 return value==="مدير النظام"||value==="مدير نظام"||value==="system_admin"||value==="admin";
}
