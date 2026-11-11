begin;
create or replace function cx_private.audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.cx_events(record_id,actor,action,before_value,after_value)
 values(case when tg_table_name='cx_records' then (coalesce(to_jsonb(new),to_jsonb(old))->>'id')::uuid else null end,auth.uid(),tg_table_name||':'||tg_op,
 case when tg_op='INSERT' then null else to_jsonb(old) end,case when tg_op='DELETE' then null else to_jsonb(new) end);
 return coalesce(new,old);
end $$;
alter table public.cx_settings add column original_schedule uuid references public.cx_records(id), add column current_schedule uuid references public.cx_records(id),add column current_reference text;
create function public.cx_set_current_schedule(p_id uuid,p_reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if (cx_private.member()).role is distinct from 'gp' or coalesce(length(trim(p_reference)),0)<8 or not exists(select 1 from public.cx_records where id=p_id and kind='schedule' and state='ACEPTADO_CON_EVIDENCIA') then raise exception 'GP, revisión aceptada y evidencia formal de vigencia requeridos'; end if;
 update public.cx_settings set original_schedule=coalesce(original_schedule,p_id),current_schedule=p_id,current_reference=p_reference where id;
end $$;
create function public.cx_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('cut',now(),'records',coalesce((select jsonb_agg(r order by r.updated_at desc) from public.cx_records r),'[]'::jsonb),
 'members',coalesce((select jsonb_agg(m) from public.cx_members m),'[]'::jsonb),
 'files',coalesce((select jsonb_agg(f) from public.cx_files f),'[]'::jsonb),
 'settings',(select to_jsonb(s) from public.cx_settings s where id),
 'events',coalesce((select jsonb_agg(e) from (select * from public.cx_events order by id desc limit 200) e),'[]'::jsonb))
$$;
revoke execute on function public.cx_set_current_schedule(uuid,text),public.cx_snapshot() from public,anon;
grant execute on function public.cx_set_current_schedule(uuid,text),public.cx_snapshot() to authenticated;
commit;
