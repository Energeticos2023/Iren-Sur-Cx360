begin;
create function public.cx_register_file(p_record uuid,p_actor uuid,p_path text,p_name text,p_mime text,p_bytes bigint,p_sha256 text) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.cx_records; m public.cx_members; fid uuid;
begin
 select * into r from public.cx_records where id=p_record for update;
 select * into m from public.cx_members where user_id=p_actor and active;
 if m.user_id is null or r.id is null or r.state in ('CERRADO','ACEPTADO','PUBLICADO','ACEPTADO_CON_EVIDENCIA','REVOCADO','ARCHIVADO') or not
 (m.role in ('admin','gp','kp1') or (m.role in ('especialista_anin','especialista_supervision','ssoma','riesgos') and m.specialty=r.specialty and r.assigned_to=m.user_id)) then raise exception 'Registro sin permiso de carga'; end if;
 if not exists(select 1 from public.cx_settings where id and custody_authorized) or split_part(p_path,'/',1)<>r.id::text or not exists(select 1 from storage.objects where bucket_id='cx360-private' and name=p_path) then raise exception 'Custodia, ruta o archivo no válidos'; end if;
 insert into public.cx_files(record_id,created_by,path,name,mime,bytes,sha256) values(p_record,p_actor,p_path,p_name,p_mime,p_bytes,p_sha256) returning id into fid;
 return fid;
end $$;
revoke execute on function public.cx_register_file(uuid,uuid,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.cx_register_file(uuid,uuid,text,text,text,bigint,text) to service_role;
create or replace function public.cx_authorize_custody(p_reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if (cx_private.member()).role is distinct from 'admin' or coalesce(length(trim(p_reference)),0)<12 then raise exception 'Administrador y referencia de autorización institucional requeridos'; end if;
 if auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'Verifique MFA antes de autorizar custodia'; end if;
 update public.cx_settings set custody_authorized=true,custody_reference=p_reference,authorized_by=auth.uid(),authorized_at=now() where id=true;
end $$;
commit;
