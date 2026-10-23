import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type'};
const json=(body:object,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const bearer=req.headers.get('Authorization')?.replace(/^Bearer /i,'');
  if(!bearer)return json({error:'Sign in required'},401);
  const {data:{user},error}=await admin.auth.getUser(bearer);
  if(error||!user)return json({error:'Sign in required'},401);
  const {action,code}=await req.json();
  const clientSecret=Deno.env.get('STRAVA_CLIENT_SECRET');
  if(!clientSecret)return json({error:'Strava connection is not configured'},503);
  let request:Record<string,string>={client_id:Deno.env.get('STRAVA_CLIENT_ID')!,client_secret:clientSecret};
  if(action==='exchange'&&typeof code==='string'&&code.length<1000)request={...request,grant_type:'authorization_code',code};
  else if(action==='refresh'){
   const {data}=await admin.from('users').select('strava_refresh_token').eq('id',user.id).single();
   if(!data?.strava_refresh_token)return json({error:'No Strava connection'},400);
   request={...request,grant_type:'refresh_token',refresh_token:data.strava_refresh_token};
  }else return json({error:'Invalid request'},400);
  const response=await fetch('https://www.strava.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});
  if(!response.ok)return json({error:'Strava token exchange failed'},400);
  const tokens=await response.json();
  const {error:saveError}=await admin.from('users').update({strava_access_token:tokens.access_token,strava_refresh_token:tokens.refresh_token,strava_token_expires_at:new Date(tokens.expires_at*1000).toISOString(),...(tokens.athlete?{strava_athlete_id:String(tokens.athlete.id)}:{})}).eq('id',user.id);
  if(saveError)throw saveError;
  return json(tokens);
 }catch(e){return json({error:(e as Error).message},500);}
});
