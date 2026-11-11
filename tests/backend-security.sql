-- Casos sintéticos, transacción revertida. No crea integrantes operativos.
begin;
create temp table cx_checks(name text primary key);
grant insert,select on cx_checks to authenticated;
create function pg_temp.ok(p boolean,n text) returns void language plpgsql as $$begin if not coalesce(p,false) then raise exception 'FALLO: %',n;end if;insert into cx_checks values(n);end$$;
create function pg_temp.reject(q text,n text) returns void language plpgsql as $$declare rejected boolean:=false;begin begin execute q;exception when others then rejected:=true;end;if not rejected then raise exception 'No se rechazó: %',n;end if;insert into cx_checks values(n);end$$;
insert into auth.users(id,email,email_confirmed_at,created_at,updated_at) values
 ('10000000-0000-4000-8000-000000000001','synthetic-admin@cx360.invalid',now(),now(),now()),
 ('10000000-0000-4000-8000-000000000002','synthetic-elec@cx360.invalid',now(),now(),now()),
 ('10000000-0000-4000-8000-000000000003','synthetic-san@cx360.invalid',now(),now(),now()),
 ('10000000-0000-4000-8000-000000000004','synthetic-gp@cx360.invalid',now(),now(),now());
insert into public.cx_members(user_id,email,full_name,role,specialty) values
 ('10000000-0000-4000-8000-000000000001','synthetic-admin@cx360.invalid','SINTETICO administrador','admin',null),
 ('10000000-0000-4000-8000-000000000002','synthetic-elec@cx360.invalid','SINTETICO IIEE','especialista_anin','IIEE'),
 ('10000000-0000-4000-8000-000000000003','synthetic-san@cx360.invalid','SINTETICO IISS','especialista_anin','IISS'),
 ('10000000-0000-4000-8000-000000000004','synthetic-gp@cx360.invalid','SINTETICO GP','gp',null);
select pg_temp.ok(not has_table_privilege('anon','public.cx_records','select'),'Anónimo sin lectura');
select pg_temp.ok(not has_function_privilege('anon','public.cx_save_record(uuid,text,text,uuid,text,jsonb,integer)','execute'),'Anónimo sin RPC de escritura');
select pg_temp.ok(not (select public from storage.buckets where id='cx360-private'),'Bucket privado');
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select public.cx_save_record('20000000-0000-4000-8000-000000000001','activity','IIEE','10000000-0000-4000-8000-000000000002','NO INICIADO','{"code":"SYN-A","title":"SINTETICO","stage":"PRECOMISIONAMIENTO","planned_start":"2026-01-01","planned_finish":"2026-01-02"}',0);
select pg_temp.ok((select created_by=auth.uid() and version=1 from public.cx_records where payload->>'code'='SYN-A'),'Autor y versión de servidor');
select pg_temp.ok((select count(*)>0 from public.cx_events where record_id='20000000-0000-4000-8000-000000000001'),'Auditoría insertada');
select pg_temp.reject($q$select public.cx_save_record(gen_random_uuid(),'activity','IIEE',null,'NO INICIADO','{"code":"SYN-SPOOF","title":"SINTETICO","stage":"PRECOMISIONAMIENTO","created_by":"otro"}',0)$q$,'Suplantación rechazada');
select pg_temp.reject($q$select public.cx_save_record('20000000-0000-4000-8000-000000000001','activity','IIEE','10000000-0000-4000-8000-000000000002','REPORTADO','{"code":"SYN-A","title":"SINTETICO","stage":"PRECOMISIONAMIENTO"}',0)$q$,'Conflicto de versión rechazado');
select pg_temp.reject($q$select public.cx_save_record('20000000-0000-4000-8000-000000000001','activity','IIEE','10000000-0000-4000-8000-000000000002','REPORTADO','{"code":"SYN-A","title":"SINTETICO","stage":"PRECOMISIONAMIENTO","planned_start":"2026-12-01","planned_finish":"2026-12-02"}',1)$q$,'No se ocultan atrasos cambiando fechas');
select pg_temp.reject($q$select public.cx_save_record(gen_random_uuid(),'protocol','IIEE',null,'PUBLICADO','{"code":"SYN-P","title":"SINTETICO","revision":"R1"}',0)$q$,'No se publica protocolo sin fuente ni revisión independiente');
select public.cx_save_record('20000000-0000-4000-8000-000000000002','test','IIEE','10000000-0000-4000-8000-000000000002','BORRADOR','{"code":"SYN-T","title":"SINTETICO"}',0);
select pg_temp.reject($q$select public.cx_save_record('20000000-0000-4000-8000-000000000002','test','IIEE','10000000-0000-4000-8000-000000000002','EN PROCESO','{"code":"SYN-T","title":"SINTETICO"}',1)$q$,'No se ejecuta prueba sin protocolo');
select pg_temp.reject($q$select public.cx_save_record('20000000-0000-4000-8000-000000000002','test','IIEE','10000000-0000-4000-8000-000000000002','CERRADO','{"code":"SYN-T","title":"SINTETICO","review_evidence":"sintetico"}',1)$q$,'Autoaprobación rechazada');
select pg_temp.reject($q$select public.cx_import_schedule(gen_random_uuid(),'{"code":"SYN-S","title":"SINTETICO","revision":"R1","source_ref":"SINTETICO","timezone":"America/Lima","calendar":{"work_days":[1,2,3,4,5],"holidays":[]},"activities":[{"code":"A","title":"A","specialty":"IIEE","stage":"PRECOMISIONAMIENTO","system_code":"S","equipment_tag":"T","responsible":"POR DEFINIR","planned_start":"2026-01-01","planned_finish":"2026-01-02","predecessors":["B"]},{"code":"B","title":"B","specialty":"IIEE","stage":"PRECOMISIONAMIENTO","system_code":"S","equipment_tag":"T","responsible":"POR DEFINIR","planned_start":"2026-01-01","planned_finish":"2026-01-02","predecessors":["A"]}]}')$q$,'Ciclo de cronograma rechazado');
select pg_temp.ok(not exists(select 1 from public.cx_records where payload->>'code'='SYN-S'),'Importación fallida sin escrituras parciales');
select pg_temp.reject('update public.cx_members set role=''admin'' where user_id=auth.uid()','Autoedición de rol bloqueada');
select pg_temp.reject('delete from public.cx_events','Auditoría no borrable');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select pg_temp.ok((select count(*)=0 from public.cx_records where payload->>'code' like 'SYN-%'),'Especialidad ajena sin lectura');
select pg_temp.reject($q$select public.cx_save_record(gen_random_uuid(),'activity','IIEE','10000000-0000-4000-8000-000000000003','NO INICIADO','{"code":"SYN-X","title":"SINTETICO","stage":"PRECOMISIONAMIENTO"}',0)$q$,'Especialidad ajena sin escritura');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select pg_temp.ok((select count(*)=2 from public.cx_records where payload->>'code' like 'SYN-%'),'Especialista ve su disciplina');
select public.cx_save_record('20000000-0000-4000-8000-000000000001','activity','IIEE','10000000-0000-4000-8000-000000000002','REPORTADO','{"code":"SYN-A","title":"SINTETICO","stage":"PRECOMISIONAMIENTO","planned_start":"2026-01-01","planned_finish":"2026-01-02","notes":"hecho sintético"}',1);
select pg_temp.ok((select version=2 and updated_by=auth.uid() from public.cx_records where payload->>'code'='SYN-A'),'Ejecutor asignado puede reportar y queda auditado');
reset role;
update public.cx_members set active=false where user_id='10000000-0000-4000-8000-000000000002';
set local role authenticated;
select pg_temp.ok((select count(*)=0 from public.cx_records),'Revocación elimina lectura inmediatamente');
select pg_temp.reject($q$select public.cx_save_record(gen_random_uuid(),'activity','IIEE',null,'NO INICIADO','{"code":"SYN-R","title":"SINTETICO","stage":"PRECOMISIONAMIENTO"}',0)$q$,'Revocado sin escritura');
select jsonb_build_object('passed',count(*),'checks',jsonb_agg(name order by name)) as resultado from cx_checks;
rollback;
