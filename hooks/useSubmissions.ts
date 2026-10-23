import {GpsRecording,recordedWorkout,recordingBytes} from '../lib/gpsRecording';
import {Platform} from 'react-native';
import * as FileSystem from 'expo-file-system';
import {DocumentPickerAsset} from 'expo-document-picker';
import {supabase} from '../lib/supabase';
import {useRpc,rpcWrite} from './useProduct';
export interface Submission {id:string;athlete_name:string;source:'fit'|'strava_link'|'gps';source_url:string|null;file_path:string|null;file_name:string|null;note:string|null;status:string;reason:string|null;revision:number;activity_id:string|null;created_at:string;metrics:Record<string,any>}
export const useSubmissions=(admin=false,status='all',page=0)=>useRpc<{total:number;submissions:Submission[]}>('sage_submissions',{p_admin:admin,p_status:status,p_offset:page*50,p_limit:50});
async function invoke(body:Record<string,unknown>){const {data,error}=await supabase.functions.invoke('submit-workout',{body});if(error){let message=error.message;try{message=(await error.context.json()).error??message;}catch{}throw new Error(message);}return data as {id:string;created:boolean;status:string};}
export async function submitFit(file:DocumentPickerAsset,note:string){
 if(!file.name.toLowerCase().endsWith('.fit')||(file.size??0)>10485760)throw new Error('Choose a .FIT file up to 10 MB.');
 const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sign in first.');
 let bytes:ArrayBuffer;
 if(Platform.OS==='web')bytes=file.file?await file.file.arrayBuffer():await(await fetch(file.uri)).arrayBuffer();
 else{const base64=await FileSystem.readAsStringAsync(file.uri,{encoding:FileSystem.EncodingType.Base64}),binary=atob(base64);bytes=Uint8Array.from(binary,v=>v.charCodeAt(0)).buffer;}
 if(bytes.byteLength>10485760)throw new Error('FIT files must be 10 MB or smaller.');
 const path=`${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.fit`;
 const {error}=await supabase.storage.from('workout-files').upload(path,bytes,{contentType:'application/octet-stream',upsert:false});if(error)throw new Error(error.message);
 return invoke({source:'fit',file_path:path,file_name:file.name,note});
}
export const submitStrava=(url:string,note:string)=>invoke({source:'strava_link',url,note});
export const reviewSubmission=(submission:Submission,status:string,reason:string,metrics?:Record<string,unknown>)=>rpcWrite('sage_review_submission',{p_id:submission.id,p_status:status,p_reason:reason,p_expected_revision:submission.revision,p_metrics:metrics??null});

export async function submitRecording(record:GpsRecording,note:string){
 recordedWorkout(record);
 const {data:{user}}=await supabase.auth.getUser();if(!user||user.id!==record.userId)throw new Error('Sign in to the account that recorded this workout.');
 const bytes=recordingBytes(record);
 if(bytes.byteLength>5242880)throw new Error('Recording is too large to upload.');
 const path=`${user.id}/${record.id}_${Date.now()}.json`;
 const {error}=await supabase.storage.from('workout-files').upload(path,bytes.buffer as ArrayBuffer,{contentType:'application/json',upsert:false});if(error)throw new Error(error.message);
 return invoke({source:'gps',file_path:path,note});
}
export const submissionTitle=(item:Submission)=>item.source==='gps'?(item.metrics.activity_name??'Sage GPS workout'):item.file_name??'Shared Strava activity';
