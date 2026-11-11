begin;
create unique index cx_files_content on public.cx_files(record_id,sha256);
create function public.cx_import_schedule(p_id uuid,p_payload jsonb) returns public.cx_records language plpgsql security definer set search_path='' as $$
declare r public.cx_records; a jsonb; payload jsonb;
begin
 r:=public.cx_save_record(p_id,'schedule',null,null,'BORRADOR',p_payload,0);
 for a in select value from jsonb_array_elements(p_payload->'activities') loop
  payload:=a||jsonb_build_object('code',(p_payload->>'code')||':'||(a->>'code'),'revision',p_payload->>'revision','source_activity_code',a->>'code','schedule_id',p_id);
  perform public.cx_save_record(gen_random_uuid(),'activity',a->>'specialty',null,'NO INICIADO',payload,0);
 end loop;
 return r;
end $$;
revoke execute on function public.cx_import_schedule(uuid,jsonb) from public,anon;
grant execute on function public.cx_import_schedule(uuid,jsonb) to authenticated;
commit;
