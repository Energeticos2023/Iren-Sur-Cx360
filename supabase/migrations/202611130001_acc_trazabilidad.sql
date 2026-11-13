-- CX360: registro interno de revisiones y comentarios Autodesk ACC, sin sincronizacion ni aprobacion contractual
create table if not exists public.cx_acc_reviews (
 id uuid primary key default gen_random_uuid(),
 acc_review_number text not null check (acc_review_number ~ '^[0-9]{1,12}$'),
 document_code text not null check (length(trim(document_code)) between 6 and 200),
 document_revision text not null check (length(trim(document_revision)) between 1 and 40),
 file_version text,
 title text not null check (length(trim(title)) between 8 and 500),
 specialty text,
 system_code text,
 stage text not null default 'COMISIONAMIENTO',
 document_status_code text,
 workflow_state text not null default 'NO_VERIFICADO',
 workflow_step text,
 received_on date,
 review_due_on date,
 source_captured_on date,
 source_type text not null default 'CAPTURA',
 official_ref text,
 official_url text,
 aconex_code text,
 specialist_summary text,
 next_action text,
 final_decision text not null default 'NO_VERIFICADA'
   check (final_decision in ('NO_VERIFICADA','ACEPTADO','ACEPTADO_CON_COMENTARIOS','RECHAZADO','OTRO')),
 final_decision_ref text,
 final_decision_on date,
 verification_status text not null default 'POR_COTEJAR'
   check (verification_status in ('POR_COTEJAR','COTEJADA')),
 created_by uuid not null default auth.uid(),
 updated_by uuid,
 verified_by uuid,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint cx_acc_review_identity unique (acc_review_number, document_code, document_revision),
 constraint cx_acc_review_https check (official_url is null or official_url ~ '^https://[^[:space:]@]+'),
 constraint cx_acc_review_verify_consistency check (
   (verification_status='POR_COTEJAR' and verified_by is null and verified_at is null)
   or (verification_status='COTEJADA' and verified_by is not null and verified_at is not null)
 )
);

create table if not exists public.cx_acc_entries (
 id uuid primary key default gen_random_uuid(),
 review_id uuid not null references public.cx_acc_reviews(id) on delete restrict,
 event_type text not null check (event_type in (
  'COMENTARIO_ESPECIALISTA','INCIDENCIA_ACC','RESPUESTA_CONTRATISTA',
  'SUBSANACION','RECOMENDACION','DECISION_FINAL','RECTIFICACION','OTRO')),
 source_revision text,
 specialty text,
 official_author text,
 acc_issue_number text,
 opinion text check (opinion is null or opinion in (
  'ACEPTADO','ACEPTADO_CON_COMENTARIOS','RECHAZADO','PENDIENTE','NO_APLICA','OTRO')),
 entry_date date,
 summary text not null check (length(trim(summary)) between 8 and 6000),
 required_action text,
 official_ref text,
 official_url text,
 entered_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 constraint cx_acc_entries_https check (official_url is null or official_url ~ '^https://[^[:space:]@]+')
);
create index if not exists cx_acc_entries_review_date on public.cx_acc_entries(review_id,created_at);

create table if not exists public.cx_acc_history (
 id bigint generated always as identity primary key,
 review_id uuid not null references public.cx_acc_reviews(id) on delete restrict,
 actor uuid,
 action text not null,
 before_value jsonb,
 after_value jsonb,
 at timestamptz not null default now()
);
create index if not exists cx_acc_history_review_at on public.cx_acc_history(review_id,at);

alter table public.cx_acc_reviews enable row level security;
alter table public.cx_acc_entries enable row level security;
alter table public.cx_acc_history enable row level security;
revoke all on public.cx_acc_reviews, public.cx_acc_entries, public.cx_acc_history from public, anon, authenticated;
grant select, insert, update on public.cx_acc_reviews to authenticated;
grant select, insert on public.cx_acc_entries to authenticated;
grant select on public.cx_acc_history to authenticated;
revoke all on sequence public.cx_acc_history_id_seq from public, anon, authenticated;

create policy cx_acc_reviews_read on public.cx_acc_reviews for select to authenticated
using (exists (select 1 from public.cx_members m where m.user_id=(select auth.uid()) and m.active));
create policy cx_acc_reviews_author_create on public.cx_acc_reviews for insert to authenticated
with check (created_by=(select auth.uid()) and verification_status='POR_COTEJAR'
 and exists (select 1 from public.cx_members m where m.user_id=(select auth.uid()) and m.active and m.role<>'auditor'));
create policy cx_acc_reviews_author_edit on public.cx_acc_reviews for update to authenticated
using (created_by=(select auth.uid()) and verification_status='POR_COTEJAR')
with check (created_by=(select auth.uid())
 and exists (select 1 from public.cx_members m where m.user_id=(select auth.uid()) and m.active and m.role<>'auditor'));
create policy cx_acc_reviews_verifier on public.cx_acc_reviews for update to authenticated
using (verification_status='POR_COTEJAR' and exists (
 select 1 from public.cx_members m where m.user_id=(select auth.uid()) and m.active and m.role in ('admin','gp')
) and (select auth.jwt()->>'aal')='aal2')
with check (exists (select 1 from public.cx_members m where m.user_id=(select auth.uid())
 and m.active and m.role in ('admin','gp')) and (select auth.jwt()->>'aal')='aal2');
create policy cx_acc_entries_read on public.cx_acc_entries for select to authenticated
using (exists (select 1 from public.cx_members m where m.user_id=(select auth.uid()) and m.active));
create policy cx_acc_entries_create on public.cx_acc_entries for insert to authenticated
with check (entered_by=(select auth.uid()) and exists (
 select 1 from public.cx_members m where m.user_id=(select auth.uid()) and m.active and m.role<>'auditor'
) and exists (select 1 from public.cx_acc_reviews r where r.id=review_id));
create policy cx_acc_history_read on public.cx_acc_history for select to authenticated
using (exists (select 1 from public.cx_members m where m.user_id=(select auth.uid()) and m.active));

create or replace function public.cx_acc_review_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_member record;
begin
 if auth.uid() is null then raise exception 'Autenticacion requerida'; end if;
 select m.active,m.role,m.specialty into v_member from public.cx_members m where m.user_id=auth.uid();
 if not coalesce(v_member.active,false) then raise exception 'Membresia inactiva'; end if;
 if tg_op='INSERT' then
   if v_member.role='auditor' then raise exception 'Sin permisos de registro'; end if;
   if new.created_by is distinct from auth.uid() then raise exception 'Autor no coincide con la sesion'; end if;
   if new.verification_status<>'POR_COTEJAR' or new.verified_by is not null or new.verified_at is not null then
     raise exception 'No se permite crear revisiones ya verificadas';
   end if;
   new.updated_by:=auth.uid();
 else
   if old.verification_status='COTEJADA' then raise exception 'Revision cotejada: crear nueva revision, no sobrescribir'; end if;
   if new.id is distinct from old.id or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at
      or new.acc_review_number is distinct from old.acc_review_number
      or new.document_code is distinct from old.document_code or new.document_revision is distinct from old.document_revision then
     raise exception 'Identidad e historia del expediente inmutables';
   end if;
   if new.verification_status='COTEJADA' then
     if v_member.role not in ('admin','gp') or coalesce(auth.jwt()->>'aal','')<>'aal2'
        or old.created_by=auth.uid() then
       raise exception 'Cotejo independiente requiere autorizacion, MFA y revisor distinto';
     end if;
     if coalesce(length(trim(new.official_ref)),0)<6 or coalesce(length(trim(new.official_url)),0)<15 then
       raise exception 'Falta referencia y enlace ACC original para cotejar';
     end if;
     if new.final_decision<>'NO_VERIFICADA' and
       (coalesce(length(trim(new.final_decision_ref)),0)<6 or new.final_decision_on is null) then
       raise exception 'La decision final requiere evidencia y fecha oficiales';
     end if;
     new.verified_by:=auth.uid(); new.verified_at:=now();
   else
     if old.created_by<>auth.uid() or v_member.role='auditor' then raise exception 'Solo autor edita ficha sin verificar'; end if;
     new.verified_by:=null;new.verified_at:=null;
   end if;
   new.updated_by:=auth.uid();
 end if;
 new.updated_at:=now();
 return new;
end $$;
create or replace function public.cx_acc_entry_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_role text;
begin
 if auth.uid() is null then raise exception 'Autenticacion requerida'; end if;
 select m.role into v_role from public.cx_members m where m.user_id=auth.uid() and m.active;
 if v_role is null or v_role='auditor' then raise exception 'Sin autorizacion para registrar una actuacion'; end if;
 if new.entered_by is distinct from auth.uid() then raise exception 'El autor de registro debe ser la sesion autenticada'; end if;
 if not exists(select 1 from public.cx_acc_reviews r where r.id=new.review_id) then
   raise exception 'Revision ACC inexistente';
 end if;
 new.created_at:=now();
 return new;
end $$;
create or replace function public.cx_acc_audit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='cx_acc_reviews' then
   insert into public.cx_acc_history(review_id,actor,action,before_value,after_value)
   values(new.id,auth.uid(),case when tg_op='INSERT' then 'REVISION_CREADA'
               when new.verification_status='COTEJADA' then 'FUENTE_COTEJADA' else 'REVISION_ACTUALIZADA' end,
          case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 elsif tg_table_name='cx_acc_entries' then
   insert into public.cx_acc_history(review_id,actor,action,after_value)
   values(new.review_id,auth.uid(),'ACTUACION_REGISTRADA',to_jsonb(new));
 end if;
 return null;
end $$;
create trigger cx_acc_review_before before insert or update on public.cx_acc_reviews
for each row execute function public.cx_acc_review_guard();
create trigger cx_acc_entry_before before insert on public.cx_acc_entries
for each row execute function public.cx_acc_entry_guard();
create trigger cx_acc_review_audit after insert or update on public.cx_acc_reviews
for each row execute function public.cx_acc_audit();
create trigger cx_acc_entry_audit after insert on public.cx_acc_entries
for each row execute function public.cx_acc_audit();
revoke all on function public.cx_acc_review_guard(),public.cx_acc_entry_guard(),public.cx_acc_audit()
from public,anon,authenticated;
