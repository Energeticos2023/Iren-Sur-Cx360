-- IREN SUR CX 360 - base exclusiva ANIN Contingencia
-- Ejecutar SOLO en un proyecto Supabase dedicado a ANIN.
-- Las aprobaciones contractuales se acreditan mediante referencia documental, NO se producen aquí.
create extension if not exists pgcrypto;
create schema if not exists cx_private;

create table if not exists public.cx_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null, full_name text not null default '',
 role text not null check (role in ('admin','gp','kp1','especialista_anin','especialista_supervision','riesgos','ssoma','auditor')),
 specialty text, active boolean not null default true, invited_by uuid,
 created_at timestamptz not null default now()
);
create table if not exists public.cx_systems (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
 specialty text not null check(specialty in ('IIEE','IISS','IIMM','TIC','EM')),
 source_ref text not null default 'PLAN ANIN CAP II - REFERENCIAL',
 validated boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists public.cx_baselines (
 id uuid primary key default gen_random_uuid(), code text not null, revision text not null,
 state text not null default 'PROPUESTA' check(state in ('PROPUESTA','ACEPTADO_CON_EVIDENCIA','SUPERADO')),
 evidence_ref text, created_by uuid references auth.users(id),created_at timestamptz not null default now(),
 unique(code,revision), check(state <> 'ACEPTADO_CON_EVIDENCIA' or length(trim(coalesce(evidence_ref,'')))>2)
);
create table if not exists public.cx_activities (
 id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
 system_id uuid references public.cx_systems(id), baseline_id uuid references public.cx_baselines(id),
 specialty text not null, stage text not null default 'PRECOMISIONAMIENTO',
 planned_on date, assigned_to text, equipment_tag text, tools_required text,
 ssoma_required text, status text not null default 'NO INICIADO'
 check(status in ('NO INICIADO','EN PROCESO','EN REVISION','BLOQUEADO','CERRADO')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.cx_activity_updates (
 id uuid primary key default gen_random_uuid(), activity_id uuid not null references public.cx_activities(id),
 proposed_on date, reason text not null, next_action text,
 state text not null default 'PROPUESTA' check(state in ('PROPUESTA','EN_REVISION','VERIFICADA','DESCARTADA')),
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 check(length(trim(reason))>=8)
);
create table if not exists public.cx_documents (
 id uuid primary key default gen_random_uuid(), code text not null, revision text not null,
 title text not null, specialty text, category text not null default 'OTRO',
 state text not null default 'NO VERIFICADO'
 check(state in ('NO VERIFICADO','EN REVISION','OBSERVADO','ACEPTADO CON EVIDENCIA','SUPERADO')),
 gp_evidence_ref text, storage_path text,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 unique(code,revision),
 check(state <> 'ACEPTADO CON EVIDENCIA' or length(trim(coalesce(gp_evidence_ref,'')))>2)
);
create table if not exists public.cx_protocols (
 id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
 specialty text not null, system_id uuid references public.cx_systems(id),
 doc_id uuid references public.cx_documents(id),
 stage text not null default 'PRECOMISIONAMIENTO',
 state text not null default 'BORRADOR NO APROBADO'
 check(state in ('BORRADOR NO APROBADO','EN REVISION','OPERATIVO','SUPERADO')),
 field_schema jsonb not null default '[]'::jsonb,
 created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.cx_tests (
 id uuid primary key default gen_random_uuid(), code text not null unique,
 activity_id uuid references public.cx_activities(id), protocol_id uuid not null references public.cx_protocols(id),
 equipment_tag text, status text not null default 'PREPARACION'
 check(status in ('PREPARACION','EN EJECUCION','EN REVISION','OBSERVADO','CERRADO')),
 measurements jsonb not null default '{}'::jsonb,
 ssoma_checks jsonb not null default '{}'::jsonb,
 notes text, performed_by uuid references auth.users(id), verified_by uuid references auth.users(id),
 verified_at timestamptz, created_at timestamptz not null default now(),
 check(status <> 'CERRADO' or (verified_by is not null and verified_at is not null))
);
create table if not exists public.cx_observations (
 id uuid primary key default gen_random_uuid(), description text not null, severity text not null default 'MEDIA',
 state text not null default 'ABIERTA',system_id uuid references public.cx_systems(id),
 activity_id uuid references public.cx_activities(id),test_id uuid references public.cx_tests(id),
 owner text,next_action text,evidence_ref text,
 created_by uuid references auth.users(id),created_at timestamptz not null default now()
);
create table if not exists public.cx_audit (
 id bigint generated always as identity primary key, table_name text not null, action text not null,
 record_id uuid, actor uuid, before_value jsonb, after_value jsonb, at timestamptz not null default now()
);

create or replace function cx_private.is_active() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cx_members m where m.user_id=auth.uid() and m.active=true)
$$;
create or replace function cx_private.has_role(roles text[]) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.cx_members m where m.user_id=auth.uid() and m.active=true and m.role=any(roles))
$$;
revoke all on function cx_private.is_active() from public,anon;
revoke all on function cx_private.has_role(text[]) from public,anon;
grant usage on schema cx_private to authenticated;
grant execute on function cx_private.is_active() to authenticated;
grant execute on function cx_private.has_role(text[]) to authenticated;

-- Invariante: no protocolo operativo sin documento con evidencia GP
create or replace function cx_private.check_protocol() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.state='OPERATIVO' and not exists (
  select 1 from public.cx_documents d where d.id=new.doc_id and d.state='ACEPTADO CON EVIDENCIA' and d.gp_evidence_ref is not null
 ) then raise exception 'Protocolo no operativo: documento no aceptado con evidencia'; end if;
 return new;
end $$;
drop trigger if exists cx_protocol_guard on public.cx_protocols;
create trigger cx_protocol_guard before insert or update on public.cx_protocols for each row execute function cx_private.check_protocol();
create or replace function cx_private.check_test() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('EN EJECUCION','EN REVISION','OBSERVADO','CERRADO') and not exists (
  select 1 from public.cx_protocols p where p.id=new.protocol_id and p.state='OPERATIVO'
 ) then raise exception 'Prueba no ejecutable: protocolo no operativo'; end if;
 return new;
end $$;
drop trigger if exists cx_test_guard on public.cx_tests;
create trigger cx_test_guard before insert or update on public.cx_tests for each row execute function cx_private.check_test();

-- Auditoría de los hechos en servidor, no editable por frontend.
create or replace function cx_private.audit_changes() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.cx_audit(table_name,action,record_id,actor,before_value,after_value)
 values (tg_table_name,tg_op,coalesce(new.id,old.id),auth.uid(),case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old);
end $$;
do $$ declare tbl text; begin
 foreach tbl in array array['cx_activities','cx_activity_updates','cx_documents','cx_protocols','cx_tests','cx_observations','cx_baselines'] loop
  execute format('drop trigger if exists cx_audit_change on public.%I',tbl);
  execute format('create trigger cx_audit_change after insert or update or delete on public.%I for each row execute function cx_private.audit_changes()',tbl);
 end loop;
end $$;

-- RLS: hasta el catálogo requiere membresía activa.
do $$ declare tbl text; begin
 foreach tbl in array array['cx_members','cx_systems','cx_baselines','cx_activities','cx_activity_updates','cx_documents','cx_protocols','cx_tests','cx_observations','cx_audit'] loop
  execute format('alter table public.%I enable row level security',tbl);
 end loop;
end $$;

create policy members_read on public.cx_members for select to authenticated using (user_id=auth.uid() or cx_private.has_role(array['admin','gp','kp1']));
-- Sin write en cx_members desde cliente: solo dashboard/Edge Function admin validada.
create policy systems_read on public.cx_systems for select to authenticated using (cx_private.is_active());
create policy systems_write on public.cx_systems for all to authenticated using (cx_private.has_role(array['admin'])) with check (cx_private.has_role(array['admin']));
create policy baselines_read on public.cx_baselines for select to authenticated using (cx_private.is_active());
create policy baselines_write on public.cx_baselines for insert to authenticated with check (cx_private.has_role(array['admin']));
create policy activities_read on public.cx_activities for select to authenticated using (cx_private.is_active());
create policy activities_insert on public.cx_activities for insert to authenticated with check (cx_private.has_role(array['admin','kp1']));
create policy activities_update on public.cx_activities for update to authenticated using (cx_private.has_role(array['admin','kp1','especialista_anin','especialista_supervision'])) with check (cx_private.has_role(array['admin','kp1','especialista_anin','especialista_supervision']));
create policy activity_updates_read on public.cx_activity_updates for select to authenticated using (cx_private.is_active());
create policy activity_updates_write on public.cx_activity_updates for insert to authenticated with check (cx_private.has_role(array['admin','kp1','especialista_anin','especialista_supervision','riesgos','ssoma']));
create policy documents_read on public.cx_documents for select to authenticated using (cx_private.is_active());
create policy documents_write on public.cx_documents for insert to authenticated with check (cx_private.has_role(array['admin']));
create policy documents_update on public.cx_documents for update to authenticated using (cx_private.has_role(array['admin'])) with check (cx_private.has_role(array['admin']));
create policy protocols_read on public.cx_protocols for select to authenticated using (cx_private.is_active());
create policy protocols_write on public.cx_protocols for insert to authenticated with check (cx_private.has_role(array['admin']));
create policy protocols_update on public.cx_protocols for update to authenticated using (cx_private.has_role(array['admin'])) with check (cx_private.has_role(array['admin']));
create policy tests_read on public.cx_tests for select to authenticated using (cx_private.is_active());
create policy tests_insert on public.cx_tests for insert to authenticated with check (cx_private.has_role(array['admin','kp1','especialista_anin','especialista_supervision']));
create policy tests_update on public.cx_tests for update to authenticated using (cx_private.has_role(array['admin','kp1','especialista_anin','especialista_supervision'])) with check (cx_private.has_role(array['admin','kp1','especialista_anin','especialista_supervision']));
create policy observations_read on public.cx_observations for select to authenticated using (cx_private.is_active());
create policy observations_insert on public.cx_observations for insert to authenticated with check (cx_private.has_role(array['admin','gp','kp1','especialista_anin','especialista_supervision','riesgos','ssoma']));
create policy observations_update on public.cx_observations for update to authenticated using (cx_private.has_role(array['admin','kp1'])) with check (cx_private.has_role(array['admin','kp1']));
create policy audit_read on public.cx_audit for select to authenticated using (cx_private.has_role(array['admin','gp','auditor']));

-- Nunca conceder escrituras directas en auditoría a clientes.
revoke all on public.cx_audit from anon,authenticated;
grant select on public.cx_audit to authenticated;
grant select,insert,update,delete on public.cx_members,public.cx_systems,public.cx_baselines,public.cx_activities,public.cx_activity_updates,public.cx_documents,public.cx_protocols,public.cx_tests,public.cx_observations to authenticated;
revoke all on public.cx_members from anon;
-- Auth JWT + RLS para archivos de evidencias; NO crear buckets públicos.
insert into storage.buckets(id,name,public) values ('cx-anin-privado','cx-anin-privado',false) on conflict(id) do update set public=false;
create policy cx_anin_docs_read on storage.objects for select to authenticated using(bucket_id='cx-anin-privado' and cx_private.is_active());
create policy cx_anin_docs_upload on storage.objects for insert to authenticated with check(bucket_id='cx-anin-privado' and cx_private.has_role(array['admin']));

-- Catálogo descriptivo del Plan ANIN: referencia, NO certificación de instalación.
-- Se importa después desde catalogo_anin.json, con 'validated=false'.
