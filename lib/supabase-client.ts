"use client";

import {createClient} from "@supabase/supabase-js";

const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

export async function apiFetch(input:RequestInfo|URL,init:RequestInit={}){
  const {data}=await supabase.auth.getSession();
  const headers=new Headers(init.headers);
  if(data.session?.access_token)headers.set("authorization",`Bearer ${data.session.access_token}`);
  return fetch(input,{...init,headers});
}
