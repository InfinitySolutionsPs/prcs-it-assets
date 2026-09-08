import {apiFetch} from "./api-client";
export {apiFetch};
export const supabase={auth:{signOut:async()=>{await apiFetch("/api/auth/logout",{method:"POST"});return{error:null}}}};
