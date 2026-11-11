// IREN SUR CX 360 - invitación NOMINATIVA autorizada por administrador ANIN.
// Deploy Supabase Edge Functions. Requiere secrets SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';
const serviceUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const siteUrl = Deno.env.get('CX360_SITE_URL') ?? '';
const corsOrigin = Deno.env.get('CX360_SITE_ORIGIN') ?? '';
const headers = { 'Access-Control-Allow-Origin': corsOrigin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
const respond = (status:number, payload:Record<string,unknown>)=>new Response(JSON.stringify(payload), { status, headers });
const roles = new Set(['gp','kp1','especialista_anin','especialista_supervision','riesgos','ssoma','auditor']);
serve(async (req:Request) => {
 if (req.method === 'OPTIONS') return new Response(null,{status:204,headers});
 if (req.method !== 'POST') return respond(405,{error:'Método no permitido'});
 if (!serviceUrl || !serviceKey || !siteUrl || !corsOrigin) return respond(503,{error:'Servicio sin configuración institucional completa'});
 if (req.headers.get('origin') !== corsOrigin) return respond(403,{error:'Origen no autorizado'});
 const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
 if(!bearer) return respond(401,{error:'Sesión requerida'});
 const admin = createClient(serviceUrl,serviceKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const {data:auth,error:authErr}=await admin.auth.getUser(bearer);
 if(authErr||!auth.user) return respond(401,{error:'Identidad no verificada'});
 const {data:member,error:memberErr}=await admin.from('cx_members').select('role,active').eq('user_id',auth.user.id).maybeSingle();
 if(memberErr||!member||!member.active||member.role!=='admin') return respond(403,{error:'Solo administrador ANIN puede invitar'});
 let body:Record<string,unknown>;
 try{body=await req.json()}catch{return respond(400,{error:'Datos inválidos'})}
 const email=String(body.email||'').trim().toLowerCase(), full_name=String(body.full_name||'').trim(),role=String(body.role||''), specialty=String(body.specialty||'').trim()||null;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||full_name.length<3||!roles.has(role)) return respond(400,{error:'Correo, nombre o rol inválidos'});
 const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo:siteUrl});
 if(inviteError||!invited.user) return respond(400,{error:inviteError?.message||'No se pudo registrar invitación'});
 const {error:insertError}=await admin.from('cx_members').upsert({user_id:invited.user.id,email,full_name,role,specialty,active:true,invited_by:auth.user.id},{onConflict:'user_id'});
 if(insertError) return respond(500,{error:'Usuario invitado pero membresía pendiente; verificar antes de habilitar',detail:insertError.message});
 return respond(200,{success:true,email,role});
});
