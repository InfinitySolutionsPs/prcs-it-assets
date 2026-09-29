import {isSystemAdminRole} from "./roles";

export type AssetScope="الكل"|"تقني"|"طبي";
type ScopeUser={role?:string|null;assetScope?:string|null};

export function normalizeAssetScope(user:ScopeUser):AssetScope{
 if(isSystemAdminRole(user.role||""))return "الكل";
 return user.assetScope==="طبي"||user.assetScope==="تقني"?user.assetScope:"الكل";
}

export function canAccessAssetType(user:ScopeUser,assetType?:string|null){
 const scope=normalizeAssetScope(user);
 return scope==="الكل"||scope===(assetType||"تقني");
}
