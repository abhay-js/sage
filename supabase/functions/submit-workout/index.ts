import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Decoder,Stream } from 'npm:@garmin/fitsdk@21.218.0';
import {recordedWorkout} from '../_shared/gpsRecording.ts';
import { parseFit } from './fit.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json'};
const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers});
const hash=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});if(req.method!=='POST')return reply(405,{error:'POST required'});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)return reply(401,{error:'Sign in to Sage first.'});
 const {data:{user},error:authError}=await admin.auth.getUser(token);if(authError||!user)return reply(401,{error:'Sign in to Sage again.'});
 let uploadedPath:string|null=null;
 const cleanup=async()=>{if(!uploadedPath)return;const {data,error}=await admin.from('workout_submissions').select('id').eq('file_path',uploadedPath).limit(1);if(!error&&!data?.length)await admin.storage.from('workout-files').remove([uploadedPath]);};
 try{
 const text=await req.text();if(text.length>8192)throw new Error('Submission is too large.');const body=JSON.parse(text);
 if(typeof body.note!=='undefined'&&(typeof body.note!=='string'||body.note.length>1000))throw new Error('Keep your note under 1,000 characters.');
 let key='',url=null,path=null,name=null,metrics={},streams={};
 if(body.source==='fit'){
  path=body.file_path;name=body.file_name;
  if(typeof path!=='string'||!new RegExp(`^${user.id}/[A-Za-z0-9_-]+\\.fit$`).test(path)||typeof name!=='string'||!name.toLowerCase().endsWith('.fit'))throw new Error('Choose your own FIT workout file.');
  uploadedPath=path;
  const {data:file,error}=await admin.storage.from('workout-files').download(path);if(error||!file)throw new Error('File upload was not found. Try uploading again.');
  if(file.size>10485760)throw new Error('FIT files must be 10 MB or smaller.');
  const bytes=new Uint8Array(await file.arrayBuffer()),parsed=parseFit(bytes,{Decoder,Stream});key=await hash(bytes);metrics=parsed.metrics;streams=parsed.streams;
 }else if(body.source==='gps'){
  path=body.file_path;name='Sage GPS workout';
  if(typeof path!=='string'||!new RegExp(`^${user.id}/[A-Za-z0-9_-]+\\.json$`).test(path))throw new Error('Choose your own GPS recording.');
  uploadedPath=path;
  const {data:file,error}=await admin.storage.from('workout-files').download(path);if(error||!file)throw new Error('GPS upload was not found. Try again.');
  if(file.size>5242880)throw new Error('GPS recording is too large.');
  const record=JSON.parse(await file.text());if(record.userId!==user.id)throw new Error('This recording belongs to a different athlete.');
  const parsed=recordedWorkout(record);key=record.id;metrics=parsed.metrics;streams=parsed.streams;
 }else if(body.source==='strava_link'){
  const match=String(body.url??'').match(/https:\/\/(?:www\.)?strava\.com\/activities\/\d+[^\s]*|https:\/\/strava\.app\.link\/[A-Za-z0-9_-]+[^\s]*/);
  if(!match)throw new Error('Paste a Strava activity link or Strava share link.');
  const parsed=new URL(match[0]);if(parsed.username||parsed.password||parsed.port)throw new Error('Invalid Strava link.');
  url=`https://${parsed.hostname==='strava.com'?'www.strava.com':parsed.hostname}${parsed.pathname.replace(/\/$/,'')}`;key=await hash(new TextEncoder().encode(url));
 }else throw new Error('Choose a GPS recording, FIT file or Strava link.');
 const {data,error}=await admin.rpc('ingest_workout_submission',{p_user_id:user.id,p_source:body.source,p_key:key,p_url:url,p_path:path,p_name:name,p_note:body.note??null,p_metrics:metrics,p_streams:streams});
 if(error)throw new Error(error.message);if(!data.created)await cleanup();return reply(200,data);
 }catch(e){await cleanup();return reply(400,{error:e instanceof Error?e.message:'Unable to submit workout.'});}
});
