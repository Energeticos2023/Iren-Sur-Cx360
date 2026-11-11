import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.119.0';
const origin='https://iren-sur-cx360.energ-ticos-7536.chatgpt.site';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'Método no permitido'});
 if(req.headers.get('origin')!==origin)return reply(403,{error:'Origen no autorizado'});
 const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)return reply(401,{error:'Sesión requerida'});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {data:{user},error}=await db.auth.getUser(token);if(error||!user)return reply(401,{error:'Identidad no verificada'});
 const {data:member}=await db.from('cx_members').select('role,active').eq('user_id',user.id).maybeSingle();
 if(!member?.active||member.role!=='admin')return reply(403,{error:'Administrador requerido'});
 // Solo se interpreta el JWT después de validarlo mediante Auth.
 let claims;try{claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))}catch{return reply(401,{error:'JWT inválido'})}
 if(claims.aal!=='aal2')return reply(403,{error:'Verifique MFA antes de invitar'});
 let p;try{p=await req.json()}catch{return reply(400,{error:'JSON inválido'})}
 const email=String(p.email||'').trim().toLowerCase(),name=String(p.full_name||'').trim(),role=String(p.role||''),specialty=String(p.specialty||'')||null,organization=String(p.organization||'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||name.length<5||!['gp','kp1','especialista_anin','especialista_supervision','riesgos','ssoma','auditor'].includes(role)||!['ANIN','SUPERVISION'].includes(organization)||p.confirm_nominal!==true||p.confirm_email_send!==true)return reply(400,{error:'Datos nominativos, organización, rol y confirmación de envío requeridos'});
 if((specialty&&!['IIEE','IISS','IIMM','TIC','EM'].includes(specialty))||(['especialista_anin','especialista_supervision'].includes(role)&&!specialty))return reply(400,{error:'Especialidad requerida o inválida'});
 if((role==='gp'||role==='especialista_anin')&&organization!=='ANIN'||(role==='kp1'||role==='especialista_supervision')&&organization!=='SUPERVISION')return reply(400,{error:'Rol y organización incompatibles'});
 const prior=await db.from('cx_members').select('user_id').eq('email',email).maybeSingle();if(prior.data)return reply(409,{error:'El profesional ya está registrado. Gestione su estado; no se duplicó la invitación.'});
 const invited=await db.auth.admin.inviteUserByEmail(email,{redirectTo:origin+'/'});if(invited.error||!invited.data.user)return reply(400,{error:'No se completó la invitación; revisar correo y configuración de Auth'});
 const inserted=await db.from('cx_members').insert({user_id:invited.data.user.id,email,full_name:name,role,specialty,organization,active:true});
 if(inserted.error)return reply(500,{error:'Correo enviado; membresía no completada. No reenvíe: solicite reconciliación del administrador.'});
 return reply(200,{success:true,email});
});
