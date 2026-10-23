import { supabase } from '../lib/supabase';
export async function resolveIdentities(ids:string[]) {const {data,error}=await supabase.rpc('sage_identities',{p_ids:Array.from(new Set(ids.filter(Boolean)))});if(error)throw error;return new Map<string,{id:string;name:string}>((data??[]).map((u:{id:string;name:string})=>[u.id,u]));}
