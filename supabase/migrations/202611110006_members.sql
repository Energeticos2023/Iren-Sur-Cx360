begin;
alter table public.cx_members add column organization text check(organization in ('ANIN','SUPERVISION'));
create function public.cx_set_member_active(p_user uuid,p_active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if (cx_private.member()).role is distinct from 'admin' or auth.jwt()->>'aal' is distinct from 'aal2' or p_user=auth.uid() then raise exception 'Administrador con MFA requerido; no se modifica la propia cuenta'; end if;
 update public.cx_members set active=p_active where user_id=p_user;
 if not found then raise exception 'Miembro no encontrado'; end if;
end $$;
revoke execute on function public.cx_set_member_active(uuid,boolean) from public,anon;
grant execute on function public.cx_set_member_active(uuid,boolean) to authenticated;
create or replace function cx_private.audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.cx_events(record_id,actor,action,before_value,after_value)
 values(case when tg_table_name='cx_records' then (coalesce(to_jsonb(new),to_jsonb(old))->>'id')::uuid else null end,
 coalesce(auth.uid(),case when tg_table_name='cx_files' then (to_jsonb(new)->>'created_by')::uuid else null end),tg_table_name||':'||tg_op,
 case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old);
end $$;
commit;
