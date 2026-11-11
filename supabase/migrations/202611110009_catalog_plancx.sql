-- CX360 v2.1: catálogo provisional por lotes (Plan Cx) y bloqueo de criterios sin valor.
-- Los datos del lote se cargan aparte en cx_private.catalog_seed (no expuesto por la API) y NO se versionan en Git.
begin;

create table if not exists cx_private.catalog_seed (
 id uuid primary key,
 batch text not null,
 ord integer not null,
 kind text not null,
 specialty text check (specialty in ('IIEE','IISS','IIMM','TIC','EM')),
 state text not null,
 payload jsonb not null check (jsonb_typeof(payload)='object' and length(trim(payload->>'code'))>0 and length(trim(payload->>'title'))>0)
);
create index if not exists catalog_seed_batch on cx_private.catalog_seed(batch, ord);
revoke all on table cx_private.catalog_seed from public, anon, authenticated;

-- Estado de lotes disponibles: solo coordinación (admin, GP, KP1).
create or replace function public.cx_catalog_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select case when (cx_private.member()).role in ('admin','gp','kp1') then
  jsonb_build_object('batches', coalesce((
   select jsonb_agg(jsonb_build_object('batch',b.batch,'available',b.available,'loaded',b.loaded) order by b.batch)
   from (select s.batch, count(*) available, count(r.id) loaded
         from cx_private.catalog_seed s left join public.cx_records r on r.id=s.id group by s.batch) b), '[]'::jsonb))
 else jsonb_build_object('batches','[]'::jsonb) end
$$;

-- Carga atómica e idempotente de un lote, con la identidad del administrador autenticado (autoría y auditoría reales).
create or replace function public.cx_load_catalog(p_batch text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.cx_members; n integer; pending integer;
begin
 m:=cx_private.member();
 if m.user_id is null or m.role<>'admin' then raise exception 'Carga de catálogo reservada al administrador'; end if;
 if not exists(select 1 from cx_private.catalog_seed where batch=p_batch) then raise exception 'Lote de catálogo inexistente'; end if;
 insert into public.cx_records(id,kind,specialty,assigned_to,state,payload,created_by,updated_by)
 select s.id,s.kind,s.specialty,null,s.state,
        s.payload||jsonb_build_object('catalog_batch',s.batch,'loaded_at',to_char(now() at time zone 'America/Lima','YYYY-MM-DD"T"HH24:MI')),
        auth.uid(),auth.uid()
 from cx_private.catalog_seed s
 where s.batch=p_batch
   and not exists(select 1 from public.cx_records r where r.id=s.id)
   and not exists(select 1 from public.cx_records r where r.kind=s.kind and lower(r.payload->>'code')=lower(s.payload->>'code') and coalesce(r.payload->>'revision','')=coalesce(s.payload->>'revision',''))
 order by s.ord;
 get diagnostics n=row_count;
 select count(*) into pending from cx_private.catalog_seed s where s.batch=p_batch and not exists(select 1 from public.cx_records r where r.id=s.id);
 return jsonb_build_object('batch',p_batch,'inserted',n,'not_loaded',pending);
end $$;

revoke execute on function public.cx_catalog_status(), public.cx_load_catalog(text) from public, anon;
grant execute on function public.cx_catalog_status(), public.cx_load_catalog(text) to authenticated;

-- Un protocolo con criterios "POR FIJAR" no puede publicarse (Plan Cx Apéndice V: ninguna prueba con criterio sin valor).
create or replace function cx_private.block_unfixed_criteria() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.kind='protocol' and new.state='PUBLICADO'
    and exists(select 1 from jsonb_array_elements(coalesce(new.payload->'fields','[]'::jsonb)) f where upper(coalesce(f->>'criterion','')) like '%POR FIJAR%') then
  raise exception 'Protocolo con criterios POR FIJAR: fije el valor y su fuente antes de publicar';
 end if;
 return new;
end $$;
drop trigger if exists cx_block_unfixed_criteria on public.cx_records;
create trigger cx_block_unfixed_criteria before insert or update on public.cx_records
 for each row execute function cx_private.block_unfixed_criteria();

commit;
