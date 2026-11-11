import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.119.0';
const origin='https://iren-sur-cx360.energ-ticos-7536.chatgpt.site';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-file-name','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'Método no permitido'});
 if(req.headers.get('origin')!==origin)return reply(403,{error:'Origen no autorizado'});
 const bearer=req.headers.get('authorization')||'';
 if(!bearer.startsWith('Bearer '))return reply(401,{error:'Sesión requerida'});
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_ANON_KEY')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const user=createClient(url,key,{global:{headers:{Authorization:bearer}},auth:{persistSession:false}});
 const {data:auth,error:authError}=await user.auth.getUser();if(authError||!auth.user)return reply(401,{error:'Identidad no verificada'});
 const id=new URL(req.url).searchParams.get('record_id');if(!id||!/^[0-9a-f-]{36}$/i.test(id))return reply(400,{error:'Registro inválido'});
 const {data:allowed,error:permError}=await user.rpc('cx_can_write_record',{p_id:id});if(permError||!allowed)return reply(403,{error:'Registro sin permiso de carga o versión inmutable'});
 const {data:settings}=await user.from('cx_settings').select('custody_authorized').eq('id',true).single();if(!settings?.custody_authorized)return reply(403,{error:'Falta autorización institucional de custodia'});
 const limit=20971520;const declared=Number(req.headers.get('content-length'));if(declared>limit)return reply(413,{error:'Máximo 20 MB'});
 const reader=req.body?.getReader();if(!reader)return reply(400,{error:'Archivo vacío'});
 const chunks:Uint8Array[]=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();return reply(413,{error:'Máximo 20 MB'})}chunks.push(value)}
 if(!length)return reply(400,{error:'Archivo vacío'});const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 let mime='',ext='';if(bytes[0]===0x25&&bytes[1]===0x50&&bytes[2]===0x44&&bytes[3]===0x46){mime='application/pdf';ext='pdf'}else if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff){mime='image/jpeg';ext='jpg'}else if([137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)){mime='image/png';ext='png'}else return reply(415,{error:'Solo PDF, JPG y PNG con contenido reconocible'});
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
 let name;try{name=decodeURIComponent(req.headers.get('x-file-name')||'archivo.'+ext).replace(/[\u0000-\u001f/\\]/g,'_').slice(0,200)}catch{return reply(400,{error:'Nombre inválido'})}
 const admin=createClient(url,serviceKey,{auth:{persistSession:false}});
 // Verificación de duplicados y bloqueo del registro se repiten después de leer el cuerpo.
 const check=await user.rpc('cx_can_write_record',{p_id:id});if(!check.data)return reply(403,{error:'Permiso revocado durante la carga'});
 const existing=await user.from('cx_files').select('id').eq('record_id',id).eq('sha256',hash).maybeSingle();if(existing.data)return reply(409,{error:'Este archivo ya está adjunto al registro'});
 const path=id+'/'+crypto.randomUUID()+'.'+ext;
 const upload=await admin.storage.from('cx360-private').upload(path,bytes,{contentType:mime,upsert:false,cacheControl:'0'});if(upload.error)return reply(500,{error:'No se completó la carga; reintente'});
 const finalCheck=await user.rpc('cx_can_write_record',{p_id:id});
 if(!finalCheck.data){await admin.storage.from('cx360-private').remove([path]);return reply(403,{error:'Registro o permiso cambió durante la carga; no se adjuntó el archivo'})}
 const row=await admin.rpc('cx_register_file',{p_record:id,p_actor:auth.user.id,p_path:path,p_name:name,p_mime:mime,p_bytes:length,p_sha256:hash});
 if(row.error){await admin.storage.from('cx360-private').remove([path]);return reply(500,{error:'No se registró la evidencia. Carga revertida; reintente'})}
 return reply(200,{id:row.data,sha256:hash,bytes:length});
});
