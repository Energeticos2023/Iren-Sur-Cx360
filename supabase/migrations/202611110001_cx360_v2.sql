-- CX360 v2. Proyecto exclusivo. No ejecutar el esquema v1 junto con esta migración.
begin;
create schema if not exists cx_private;
create table public.cx_members (
 user_id uuid primary key references auth.users(id), email text not null unique,
 full_name text not null, role text not null check(role in ('admin','gp','kp1','especialista_anin','especialista_supervision','riesgos','ssoma','auditor')),
 specialty text check(specialty in ('IIEE','IISS','IIMM','TIC','EM')), active boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.cx_settings (
 id boolean primary key default true check(id), custody_authorized boolean not null default false,
 custody_reference text, authorized_by uuid references auth.users(id), authorized_at timestamptz
);
insert into public.cx_settings(id) values(true);
create table public.cx_records (
 id uuid primary key, kind text not null check(kind in ('system','activity','schedule','proposal','document','protocol','test','restriction','instrument','om','training','handover')),
 specialty text check(specialty in ('IIEE','IISS','IIMM','TIC','EM')),
 assigned_to uuid references public.cx_members(user_id), state text not null default 'BORRADOR',
 payload jsonb not null check(jsonb_typeof(payload)='object'), version integer not null default 1,
 created_by uuid not null references auth.users(id), updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(length(trim(payload->>'code'))>0), check(length(trim(payload->>'title'))>0)
);
create unique index cx_records_identity on public.cx_records(kind,lower(payload->>'code'),coalesce(payload->>'revision',''));
create index cx_records_specialty on public.cx_records(specialty);
create index cx_records_assignee on public.cx_records(assigned_to);
create table public.cx_files (
 id uuid primary key default gen_random_uuid(), record_id uuid not null references public.cx_records(id),
 path text not null unique, name text not null, mime text not null, bytes bigint not null check(bytes between 1 and 20971520),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'), created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create index cx_files_record on public.cx_files(record_id);
create table public.cx_events (
 id bigint generated always as identity primary key, record_id uuid, actor uuid,
 action text not null, before_value jsonb, after_value jsonb, at timestamptz not null default now()
);
create index cx_events_record on public.cx_events(record_id);

create function cx_private.member() returns public.cx_members language sql stable security definer set search_path='' as $$
 select m from public.cx_members m where m.user_id=auth.uid() and m.active
$$;
create function cx_private.can_read(p_specialty text,p_assignee uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cx_members m where m.user_id=auth.uid() and m.active and
 (m.role in ('admin','gp','kp1','auditor') or (m.specialty is not null and m.specialty=p_specialty) or m.user_id=p_assignee))
$$;
create function cx_private.can_write(p_specialty text,p_assignee uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cx_members m where m.user_id=auth.uid() and m.active and
 (m.role in ('admin','kp1','gp') or (m.role in ('especialista_anin','especialista_supervision','ssoma','riesgos') and m.specialty=p_specialty and m.user_id=p_assignee)))
$$;
create function public.cx_can_write_record(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cx_records r where r.id=p_id and r.state not in ('ACEPTADO','PUBLICADO','CERRADO','ACEPTADO_CON_EVIDENCIA','REVOCADO','ARCHIVADO') and cx_private.can_write(r.specialty,r.assigned_to))
$$;

create function cx_private.audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.cx_events(record_id,actor,action,before_value,after_value)
 values(case when tg_table_name='cx_records' then coalesce(new.id,old.id) else null end,auth.uid(),tg_table_name||':'||tg_op,
 case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old);
end $$;
create trigger cx_audit_records after insert or update or delete on public.cx_records for each row execute function cx_private.audit();
create trigger cx_audit_members after insert or update or delete on public.cx_members for each row execute function cx_private.audit();
create trigger cx_audit_settings after update on public.cx_settings for each row execute function cx_private.audit();
create trigger cx_audit_files after insert or update or delete on public.cx_files for each row execute function cx_private.audit();

create function public.cx_bootstrap_admin() returns public.cx_members language plpgsql security definer set search_path='' as $$
declare m public.cx_members;
begin
 if auth.uid() is null or not exists(select 1 from auth.users u where u.id=auth.uid() and lower(u.email)='jose.zena.p@uni.pe' and u.email_confirmed_at is not null) then
  raise exception 'Se requiere el correo administrador designado, autenticado y confirmado';
 end if;
 -- No reactiva miembros revocados ni cambia roles existentes.
 insert into public.cx_members(user_id,email,full_name,role) values(auth.uid(),'jose.zena.p@uni.pe','Ing. José Rafael Zeña Peche','admin') on conflict(user_id) do nothing;
 select * into m from public.cx_members where user_id=auth.uid();
 return m;
end $$;

create function public.cx_authorize_custody(p_reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if (cx_private.member()).role is distinct from 'admin' or length(trim(p_reference))<12 then raise exception 'Administrador y referencia de autorización institucional requeridos'; end if;
 update public.cx_settings set custody_authorized=true,custody_reference=p_reference,authorized_by=auth.uid(),authorized_at=now() where id=true;
end $$;

create function cx_private.date_valid(s text) returns boolean language plpgsql immutable set search_path='' as $$
begin
 return s ~ '^\d{4}-\d{2}-\d{2}$' and to_char(s::date,'YYYY-MM-DD')=s;
exception when others then return false;
end $$;
create function cx_private.validate_schedule(p jsonb) returns void language plpgsql set search_path='' as $$
declare a jsonb; code text; dep text; cycle_found boolean;
begin
 if coalesce(p->>'revision','')='' or coalesce(p->>'source_ref','')='' or jsonb_typeof(p->'activities') is distinct from 'array' or jsonb_array_length(p->'activities')=0 then raise exception 'Cronograma requiere revisión, fuente y actividades'; end if;
 if p->>'timezone' is distinct from 'America/Lima' then raise exception 'Zona requerida: America/Lima'; end if;
 if jsonb_typeof(p->'calendar'->'work_days') is distinct from 'array' or jsonb_array_length(p->'calendar'->'work_days')=0 then raise exception 'Calendario laboral requerido'; end if;
 if exists(select 1 from jsonb_array_elements_text(p->'calendar'->'work_days') w where w !~ '^[1-7]$') then raise exception 'Días laborales inválidos (1=lunes, 7=domingo)'; end if;
 if jsonb_typeof(p->'calendar'->'holidays') is distinct from 'array' or exists(select 1 from jsonb_array_elements_text(p->'calendar'->'holidays') h where not cx_private.date_valid(h)) then raise exception 'Feriados inválidos'; end if;
 if exists(select 1 from jsonb_array_elements(p->'activities') x group by x->>'code' having count(*)>1) then raise exception 'IDs de actividad duplicados'; end if;
 for a in select value from jsonb_array_elements(p->'activities') loop
  code:=a->>'code';
  if coalesce(code,'')='' or coalesce(a->>'title','')='' or coalesce(a->>'specialty','') not in ('IIEE','IISS','IIMM','TIC','EM') or coalesce(a->>'stage','') not in ('PRECOMISIONAMIENTO','PRUEBAS FUNCIONALES','PRUEBAS INTEGRADAS','PUESTA EN MARCHA','O&M','CAPACITACION','CIERRE') then raise exception 'Actividad %, título/disciplina/etapa inválidos',code; end if;
  if not coalesce(cx_private.date_valid(a->>'planned_start'),false) or not coalesce(cx_private.date_valid(a->>'planned_finish'),false) or a->>'planned_finish'<a->>'planned_start' then raise exception 'Actividad %: fechas inválidas',code; end if;
  if coalesce(a->>'system_code','')='' or coalesce(a->>'equipment_tag','')='' or coalesce(a->>'responsible','')='' then raise exception 'Actividad %: faltan sistema, TAG/alcance o responsable',code; end if;
  if jsonb_typeof(a->'predecessors') is distinct from 'array' then raise exception 'Actividad %: predecesoras requeridas (array)',code; end if;
  for dep in select value from jsonb_array_elements_text(a->'predecessors') loop
   if dep=code or not exists(select 1 from jsonb_array_elements(p->'activities') x where x->>'code'=dep) then raise exception 'Actividad %: dependencia inválida %',code,dep; end if;
  end loop;
 end loop;
 if jsonb_array_length(p->'activities')>500 then raise exception 'Máximo 500 actividades por revisión'; end if;
 with recursive edges as (select a->>'code' child,d.value parent from jsonb_array_elements(p->'activities') a cross join lateral jsonb_array_elements_text(a->'predecessors') d),
 walk(child,parent) as (select child,parent from edges union select w.child,e.parent from walk w join edges e on e.child=w.parent)
 select exists(select 1 from walk where child=parent) into cycle_found;
 if cycle_found then raise exception 'Ciclo en dependencias'; end if;
end $$;

create function public.cx_save_record(p_id uuid,p_kind text,p_specialty text,p_assigned_to uuid,p_state text,p_payload jsonb,p_expected_version integer)
returns public.cx_records language plpgsql security definer set search_path='' as $$
declare m public.cx_members; old public.cx_records; result public.cx_records; source public.cx_records; doc public.cx_records; ins public.cx_records; link jsonb; desired text; cnt integer;
begin
 m:=cx_private.member();
 if m.user_id is null or not cx_private.can_write(p_specialty,p_assigned_to) then raise exception 'Sin permiso de escritura para disciplina/asignación'; end if;
 if coalesce(p_payload->>'code','')='' or coalesce(p_payload->>'title','')='' then raise exception 'Código y título requeridos'; end if;
 if length(p_payload::text)>1500000 then raise exception 'Registro demasiado grande'; end if;
 if p_assigned_to is not null and not exists(select 1 from public.cx_members where user_id=p_assigned_to and active and (specialty=p_specialty or role in ('admin','gp','kp1'))) then raise exception 'Responsable no activo o de otra disciplina'; end if;
 select * into old from public.cx_records where id=p_id for update;
 if old.id is not null then
  if not cx_private.can_write(old.specialty,old.assigned_to) or old.kind<>p_kind or old.version<>p_expected_version then raise exception 'Sin permiso o conflicto de versión; recargue antes de guardar'; end if;
  if (old.specialty is distinct from p_specialty or old.assigned_to is distinct from p_assigned_to) and m.role not in ('admin','kp1') then raise exception 'Reasignación reservada a coordinación'; end if;
  if old.state in ('ACEPTADO','PUBLICADO','CERRADO','ACEPTADO_CON_EVIDENCIA','REVOCADO','ARCHIVADO') then
   if p_state<>'REVOCADO' or old.state in ('REVOCADO','ARCHIVADO') or p_payload is distinct from old.payload then raise exception 'Versión inmutable; crear nueva revisión o revocar conservando el contenido'; end if;
  end if;
 else
  if p_expected_version<>0 then raise exception 'Registro no encontrado'; end if;
 end if;
 if p_state not in ('BORRADOR','NO INICIADO','EN PROCESO','BLOQUEADO','EN REVISION','OBSERVADO','REPORTADO','PUBLICADO','ACEPTADO','CERRADO','ACEPTADO_CON_EVIDENCIA','REVOCADO','ARCHIVADO') then raise exception 'Estado inválido'; end if;
 if p_state='REVOCADO' and (m.role not in ('admin','gp','kp1') or old.id is null) then raise exception 'Revocación reservada a coordinación'; end if;
 if p_kind in ('document','protocol','schedule','system') and m.role not in ('admin','gp','kp1') then raise exception 'Objeto reservado a coordinación'; end if;
 if (p_payload ? 'created_by') or (p_payload ? 'verified_by') or (p_payload ? 'performed_by') or (p_payload ? 'accepted_by') then raise exception 'La identidad se establece en servidor'; end if;
 if p_state in ('ACEPTADO','PUBLICADO','CERRADO','ACEPTADO_CON_EVIDENCIA') then
  if old.id is not null and (old.payload-array['review_evidence','authority','official_ref','decision_date','next_action']) is distinct from (p_payload-array['review_evidence','authority','official_ref','decision_date','next_action']) then raise exception 'El revisor no modifica el contenido que aprueba; devolver observado o crear nueva revisión'; end if;
  if old.id is null or old.created_by=auth.uid() or old.updated_by=auth.uid() then raise exception 'Se requiere revisión independiente del autor y del último ejecutor'; end if;
  if m.role not in ('admin','gp','kp1','especialista_supervision') then raise exception 'Rol sin facultad de revisión'; end if;
  if coalesce(p_payload->>'review_evidence','')='' then raise exception 'Evidencia de revisión requerida'; end if;
 end if;
 if p_kind='document' and p_state='ACEPTADO' then
  if m.role not in ('gp','kp1') or coalesce(p_payload->>'authority','')='' or coalesce(p_payload->>'official_ref','')='' or not coalesce(cx_private.date_valid(p_payload->>'decision_date'),false) then raise exception 'Autoridad, fecha y referencia formal requeridas'; end if;
  if not exists(select 1 from public.cx_files where record_id=p_id) then raise exception 'Archivo fuente requerido'; end if;
 end if;
 if p_kind='protocol' and p_state='PUBLICADO' then
  select * into doc from public.cx_records where id=(p_payload->>'document_id')::uuid and kind='document' and state='ACEPTADO';
  if doc.id is null or (doc.specialty is not null and doc.specialty is distinct from p_specialty) or coalesce(p_payload->>'revision','')='' or jsonb_typeof(p_payload->'fields') is distinct from 'array' or jsonb_array_length(p_payload->'fields')=0 then raise exception 'Documento aceptado de disciplina aplicable, revisión y campos requeridos'; end if;
  for link in select value from jsonb_array_elements(p_payload->'fields') loop
   if coalesce(link->>'key','')='' or coalesce(link->>'label','')='' or coalesce(link->>'criterion','')='' or coalesce(link->>'source','')='' then raise exception 'Cada campo requiere clave, etiqueta, criterio y fuente'; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_payload->'fields') x group by x->>'key' having count(*)>1) then raise exception 'Claves de medición duplicadas'; end if;
 end if;
 if p_kind='schedule' and p_state<>'REVOCADO' then
  perform cx_private.validate_schedule(p_payload);
  if p_state='ACEPTADO_CON_EVIDENCIA' then
   if m.role<>'gp' or coalesce(p_payload->>'authority','')='' or coalesce(p_payload->>'official_ref','')='' or not coalesce(cx_private.date_valid(p_payload->>'decision_date'),false) or not exists(select 1 from public.cx_files where record_id=p_id) then raise exception 'Cronograma requiere decisión GP, fecha y archivo exacto'; end if;
  elsif p_state not in ('BORRADOR','EN REVISION','OBSERVADO') then raise exception 'Estado de cronograma inválido'; end if;
 end if;
 if p_kind='proposal' then
  if coalesce(p_payload->>'cause','')='' or coalesce(p_payload->>'impact','')='' or not coalesce(cx_private.date_valid(p_payload->>'proposed_finish'),false) then raise exception 'Causa, impacto y fecha propuesta requeridos'; end if;
  if p_state='ACEPTADO' then raise exception 'Una propuesta no se activa; registrar una nueva revisión aceptada del cronograma'; end if;
 end if;
 if p_kind='activity' then
  if coalesce(p_payload->>'stage','') not in ('PRECOMISIONAMIENTO','PRUEBAS FUNCIONALES','PRUEBAS INTEGRADAS','PUESTA EN MARCHA','O&M','CAPACITACION','CIERRE') then raise exception 'Etapa inválida'; end if;
  if old.id is not null and (old.payload->>'schedule_id' is distinct from p_payload->>'schedule_id' or old.payload->>'source_activity_code' is distinct from p_payload->>'source_activity_code' or old.payload->>'planned_start' is distinct from p_payload->>'planned_start' or old.payload->>'planned_finish' is distinct from p_payload->>'planned_finish') then raise exception 'Fechas y vínculo de origen inmutables; registrar propuesta o nueva revisión'; end if;
  if p_state='CERRADO' then raise exception 'El cierre se acredita mediante prueba/entrega independiente, no por estado de actividad'; end if;
 end if;
 if p_kind='test' and p_state in ('EN PROCESO','EN REVISION','OBSERVADO','REPORTADO','CERRADO') then
  select * into source from public.cx_records where id=(p_payload->>'protocol_id')::uuid and kind='protocol' and state='PUBLICADO';
  if source.id is null or source.specialty is distinct from p_specialty then raise exception 'Protocolo no publicado o de otra disciplina'; end if;
  select * into doc from public.cx_records where id=(source.payload->>'document_id')::uuid and state='ACEPTADO' and kind='document';
  if doc.id is null then raise exception 'Documento fuente revocado o no aceptado'; end if;
  if coalesce(p_payload->>'equipment_tag','')='' or not coalesce(cx_private.date_valid(p_payload->>'performed_on'),false) then raise exception 'TAG y fecha real requeridos'; end if;
  if (p_payload->>'performed_on')::date>(now() at time zone 'America/Lima')::date then raise exception 'Fecha real futura no permitida'; end if;
  if p_payload->'ssoma'->>'permit' is distinct from 'true' or p_payload->'ssoma'->>'isolation' is distinct from 'true' or p_payload->'ssoma'->>'services' is distinct from 'true' or p_payload->'ssoma'->>'personnel' is distinct from 'true' or coalesce(p_payload->'ssoma'->>'release_ref','')='' then raise exception 'Prerrequisitos SSOMA, servicios, competencia y liberación requeridos'; end if;
  if jsonb_typeof(p_payload->'instrument_ids') is distinct from 'array' or (jsonb_array_length(p_payload->'instrument_ids')=0 and coalesce(p_payload->>'instrument_not_required_ref','')='') then raise exception 'Instrumentos o sustento de no aplicación requeridos'; end if;
  for desired in select value from jsonb_array_elements_text(p_payload->'instrument_ids') loop
   select * into ins from public.cx_records where id=desired::uuid and kind='instrument' and state='ACEPTADO' and cx_private.can_read(specialty,assigned_to);
   if ins.id is null or not coalesce(cx_private.date_valid(ins.payload->>'valid_until'),false) or (ins.payload->>'valid_until')::date<(p_payload->>'performed_on')::date or coalesce(ins.payload->>'certificate_ref','')='' then raise exception 'Instrumento no vigente o no verificado'; end if;
  end loop;
  if p_state in ('EN REVISION','REPORTADO','CERRADO') then
   for link in select value from jsonb_array_elements(source.payload->'fields') loop
    if coalesce(p_payload->'measurements'->(link->>'key')->>'value','')='' or coalesce(p_payload->'measurements'->(link->>'key')->>'result','') not in ('CONFORME','NO CONFORME','NO MEDIDO','NO VERIFICABLE') then raise exception 'Resultado faltante para %',link->>'key'; end if;
   end loop;
   if not exists(select 1 from public.cx_files where record_id=p_id) then raise exception 'Evidencia adjunta requerida'; end if;
  end if;
  if p_state='CERRADO' then
   if old.payload-'review_evidence' is distinct from p_payload-'review_evidence' then raise exception 'El revisor no modifica mediciones ni condiciones; devolver observado'; end if;
   if old.state<>'EN REVISION' or p_payload->>'scope' is distinct from 'DEFINITIVO' then raise exception 'Cierre requiere revisión y alcance definitivo; suministro provisional conserva repetición pendiente'; end if;
   for link in select value from jsonb_array_elements(source.payload->'fields') loop
    if p_payload->'measurements'->(link->>'key')->>'result' is distinct from 'CONFORME' then raise exception 'No se cierra un resultado no conforme, no medido o no verificable'; end if;
   end loop;
  end if;
 end if;
 if p_kind in ('om','training','handover','instrument','restriction') and p_state in ('ACEPTADO','CERRADO') then
  if not exists(select 1 from public.cx_files where record_id=p_id) then raise exception 'Evidencia adjunta requerida para cierre/verificación'; end if;
  if p_kind='training' and (coalesce(p_payload->>'attendees','')='' or not coalesce(cx_private.date_valid(p_payload->>'held_on'),false)) then raise exception 'Fecha real y asistentes requeridos'; end if;
 end if;
 if p_state in ('PUBLICADO','ACEPTADO','CERRADO','ACEPTADO_CON_EVIDENCIA') and p_kind not in ('document','protocol','schedule','test','om','training','handover','instrument','restriction') then raise exception 'Estado final no aplicable'; end if;
 if old.id is null then
  insert into public.cx_records(id,kind,specialty,assigned_to,state,payload,created_by,updated_by) values(p_id,p_kind,p_specialty,p_assigned_to,p_state,p_payload,auth.uid(),auth.uid()) returning * into result;
 else
  update public.cx_records set specialty=p_specialty,assigned_to=p_assigned_to,state=p_state,payload=p_payload,version=version+1,updated_by=auth.uid(),updated_at=now() where id=p_id returning * into result;
 end if;
 return result;
end $$;

-- Lectura limitada; las escrituras de datos, identidad y auditoría solo pasan por servidor.
alter table public.cx_members enable row level security;
alter table public.cx_settings enable row level security;
alter table public.cx_records enable row level security;
alter table public.cx_files enable row level security;
alter table public.cx_events enable row level security;
create policy members_select on public.cx_members for select to authenticated using(user_id=(select auth.uid()) or (cx_private.member()).role in ('admin','gp','kp1') or ((cx_private.member()).specialty is not null and specialty=(cx_private.member()).specialty));
create policy settings_select on public.cx_settings for select to authenticated using((cx_private.member()).user_id is not null);
create policy records_select on public.cx_records for select to authenticated using(cx_private.can_read(specialty,assigned_to));
create policy files_select on public.cx_files for select to authenticated using(exists(select 1 from public.cx_records r where r.id=record_id and cx_private.can_read(r.specialty,r.assigned_to)));
create policy events_select on public.cx_events for select to authenticated using((cx_private.member()).role in ('admin','gp','kp1','auditor') or exists(select 1 from public.cx_records r where r.id=record_id and cx_private.can_read(r.specialty,r.assigned_to)));
revoke all on public.cx_members,public.cx_settings,public.cx_records,public.cx_files,public.cx_events from anon,authenticated;
grant select on public.cx_members,public.cx_settings,public.cx_records,public.cx_files,public.cx_events to authenticated;
revoke all on schema cx_private from public,anon;
grant usage on schema cx_private to authenticated;
revoke execute on all functions in schema cx_private from public,anon,authenticated;
grant execute on function cx_private.member(),cx_private.can_read(text,uuid),cx_private.can_write(text,uuid) to authenticated;
revoke execute on function public.cx_can_write_record(uuid),public.cx_bootstrap_admin(),public.cx_authorize_custody(text),public.cx_save_record(uuid,text,text,uuid,text,jsonb,integer) from public,anon;
grant execute on function public.cx_can_write_record(uuid),public.cx_bootstrap_admin(),public.cx_authorize_custody(text),public.cx_save_record(uuid,text,text,uuid,text,jsonb,integer) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('cx360-private','cx360-private',false,20971520,array['application/pdf','image/jpeg','image/png']);
create policy cx_files_read on storage.objects for select to authenticated using(bucket_id='cx360-private' and exists(select 1 from public.cx_files f join public.cx_records r on r.id=f.record_id where f.path=name and cx_private.can_read(r.specialty,r.assigned_to)));
-- Carga solo por Edge Function con identidad verificada; sin escrituras directas de clientes.
commit;
