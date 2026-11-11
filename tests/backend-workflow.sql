begin;
create temp table cx_flow_checks(name text primary key);
grant insert,select on cx_flow_checks to authenticated;
create function pg_temp.ok(p boolean,n text) returns void language plpgsql as $$begin if not coalesce(p,false) then raise exception 'FALLO: %',n;end if;insert into cx_flow_checks values(n);end$$;
create function pg_temp.reject(q text,n text,expected text) returns void language plpgsql as $$declare msg text;begin begin execute q;exception when others then msg:=sqlerrm;end;if msg is null or position(expected in msg)=0 then raise exception 'FALLO %: %',n,coalesce(msg,'sin rechazo');end if;insert into cx_flow_checks values(n);end$$;
insert into auth.users(id,email,email_confirmed_at,created_at,updated_at) values
 ('40000000-0000-4000-8000-000000000001','flow-admin@cx360.invalid',now(),now(),now()),
 ('40000000-0000-4000-8000-000000000002','flow-executor@cx360.invalid',now(),now(),now()),
 ('40000000-0000-4000-8000-000000000003','flow-review@cx360.invalid',now(),now(),now());
insert into public.cx_members(user_id,email,full_name,role,specialty) values
 ('40000000-0000-4000-8000-000000000001','flow-admin@cx360.invalid','SINTETICO admin','admin',null),
 ('40000000-0000-4000-8000-000000000002','flow-executor@cx360.invalid','SINTETICO ejecutor','especialista_anin','IIEE'),
 ('40000000-0000-4000-8000-000000000003','flow-review@cx360.invalid','SINTETICO revisor','gp',null);
insert into public.cx_records(id,kind,specialty,state,payload,created_by,updated_by) values ('50000000-0000-4000-8000-000000000008','system','IIEE','BORRADOR','{"code":"FLOW-SYS","title":"SINTETICO","assets":[{"id":"flow-asset","type":"EQUIPO","tag":"SINTETICO","location":"SINTETICO","source_ref":"SINTETICO R1"}]}','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001');
-- Fixtures verificadas exclusivamente para probar las transiciones de prueba y cobertura.
insert into public.cx_records(id,kind,specialty,assigned_to,state,payload,created_by,updated_by) values
 ('50000000-0000-4000-8000-000000000001','document','IIEE',null,'ACEPTADO','{"code":"FLOW-D","title":"SINTETICO","revision":"R1"}','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003'),
 ('50000000-0000-4000-8000-000000000002','protocol','IIEE',null,'PUBLICADO','{"system_id":"50000000-0000-4000-8000-000000000008","code":"FLOW-P","title":"SINTETICO","revision":"R1","document_id":"50000000-0000-4000-8000-000000000001","fields":[{"key":"reading","label":"SINTETICO","unit":"unidad sintética","criterion":"criterio sintético","source":"fuente sintética"}]}','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003'),
 ('50000000-0000-4000-8000-000000000003','instrument','IIEE',null,'ACEPTADO','{"code":"FLOW-I","title":"SINTETICO","certificate_ref":"SINTETICO","valid_until":"2027-12-31"}','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003'),
 ('50000000-0000-4000-8000-000000000004','schedule',null,null,'ACEPTADO_CON_EVIDENCIA','{"code":"FLOW-S","title":"SINTETICO","revision":"R1","activities":[{"code":"01"}]}','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000003'),
 ('50000000-0000-4000-8000-000000000005','activity','IIEE','40000000-0000-4000-8000-000000000002','NO INICIADO','{"code":"FLOW-A","title":"SINTETICO","stage":"PRUEBAS FUNCIONALES","source_activity_code":"01","schedule_id":"50000000-0000-4000-8000-000000000004"}','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
 ('50000000-0000-4000-8000-000000000006','test','IIEE','40000000-0000-4000-8000-000000000002','EN PROCESO','{"system_id":"50000000-0000-4000-8000-000000000008","asset_id":"flow-asset","code":"FLOW-T","title":"SINTETICO","protocol_id":"50000000-0000-4000-8000-000000000002","activity_id":"50000000-0000-4000-8000-000000000005","equipment_tag":"SINTETICO","performed_on":"2026-11-11","scope":"DEFINITIVO","instrument_ids":["50000000-0000-4000-8000-000000000003"],"ssoma":{"permit":true,"isolation":true,"services":true,"personnel":true,"release_ref":"SINTETICO"},"measurements":{"reading":{"value":"valor sintético","unit":"unidad sintética","result":"CONFORME"}}}','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002');
insert into public.cx_files(record_id,path,name,mime,bytes,sha256,created_by) values('50000000-0000-4000-8000-000000000006','synthetic/no-object','SINTETICO.pdf','application/pdf',10,repeat('a',64),'40000000-0000-4000-8000-000000000002');
select pg_temp.reject($q$update public.cx_records set payload=jsonb_set(payload,'{assets}','[{"id":"x","tag":"SYN","type":"EQUIPO"},{"id":"y","tag":" syn ","type":"EQUIPO"}]') where id='50000000-0000-4000-8000-000000000008'$q$,'Inventario rechaza TAG duplicado','TAG duplicado');
select pg_temp.reject($q$update public.cx_records set payload=payload-'system_id' where id='50000000-0000-4000-8000-000000000006'$q$,'Intervención requiere sistema concreto','Sistema concreto');
select pg_temp.reject($q$update public.cx_records set payload=jsonb_set(payload,'{asset_id}','"inexistente"') where id='50000000-0000-4000-8000-000000000006'$q$,'Intervención requiere activo concreto','Equipo/TAG');
select pg_temp.reject($q$update public.cx_records set payload=jsonb_set(payload,'{assets}','[{"id":"flow-asset","type":"POZO_TIERRA","tag":"SINTETICO","location":"SINTETICO","source_ref":"R1","connections":[{}]}]') where id='50000000-0000-4000-8000-000000000008'$q$,'Inventario usado conserva conexiones','Activo ya intervenido');
select pg_temp.reject($q$update public.cx_records set payload=payload||'{"form_schema":{"review_state":"PENDIENTE_DE_REVISION"}}' where id='50000000-0000-4000-8000-000000000002'$q$,'Fuente sin cotejo no se publica','Formato fuente pendiente');
select pg_temp.reject($q$update public.cx_records set payload=jsonb_set(payload,'{fields,0,criterion}','"POR FIJAR"') where id='50000000-0000-4000-8000-000000000002'$q$,'Criterio pendiente no se publica','POR FIJAR');
select pg_temp.ok((select payload->'asset_snapshot'->>'location'='SINTETICO' from public.cx_records where id='50000000-0000-4000-8000-000000000006'),'Servidor conserva ubicación del activo intervenido');
set local role authenticated;
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000002',true);
select public.cx_save_record(r.id,r.kind,r.specialty,r.assigned_to,'EN REVISION',r.payload,r.version) from public.cx_records r where id='50000000-0000-4000-8000-000000000006';
select pg_temp.ok((select state='EN REVISION' from public.cx_records where id='50000000-0000-4000-8000-000000000006'),'Ejecución completa pasa a revisión');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000003',true);
select pg_temp.reject($q$select public.cx_save_record(r.id,r.kind,r.specialty,r.assigned_to,'CERRADO',jsonb_set(r.payload,'{measurements,reading,value}','"valor cambiado"')||'{"review_evidence":"SINTETICO"}',r.version) from public.cx_records r where id='50000000-0000-4000-8000-000000000006'$q$,'Revisor no altera mediciones','El revisor no modifica');
select public.cx_save_record(r.id,r.kind,r.specialty,r.assigned_to,'CERRADO',r.payload||'{"review_evidence":"SINTETICO revisión independiente"}',r.version) from public.cx_records r where id='50000000-0000-4000-8000-000000000006';
select pg_temp.ok((select state='CERRADO' and updated_by=auth.uid() from public.cx_records where id='50000000-0000-4000-8000-000000000006'),'Prueba cerrada por identidad independiente');
select pg_temp.reject($q$select public.cx_save_record(r.id,r.kind,r.specialty,r.assigned_to,'EN PROCESO',r.payload,r.version) from public.cx_records r where id='50000000-0000-4000-8000-000000000006'$q$,'Cierre inmutable','Versión inmutable');
select public.cx_set_current_schedule('50000000-0000-4000-8000-000000000004','REFERENCIA SINTETICA');
select pg_temp.ok((select original_schedule=current_schedule and current_schedule='50000000-0000-4000-8000-000000000004' from public.cx_settings),'Línea base original y vigencia separadas');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select public.cx_save_record('50000000-0000-4000-8000-000000000007','coverage','IIEE',null,'EN REVISION','{"code":"FLOW-C","title":"SINTETICO","activity_id":"50000000-0000-4000-8000-000000000005","coverage_source":"MATRIZ SINTETICA","required_ids":["50000000-0000-4000-8000-000000000006"]}',0);
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000003',true);
reset role;
insert into public.cx_files(record_id,path,name,mime,bytes,sha256,created_by) values('50000000-0000-4000-8000-000000000007','synthetic/no-matrix-object','MATRIZ-SINTETICA.pdf','application/pdf',10,repeat('b',64),'40000000-0000-4000-8000-000000000001');
set local role authenticated;
select public.cx_save_record(r.id,r.kind,r.specialty,r.assigned_to,'CERRADO',r.payload||'{"review_evidence":"SINTETICO cobertura revisada"}',r.version) from public.cx_records r where id='50000000-0000-4000-8000-000000000007';
select pg_temp.ok((select state='CERRADO' from public.cx_records where id='50000000-0000-4000-8000-000000000007'),'Cobertura requiere entregables vinculados y cerrados');
select pg_temp.ok(not has_function_privilege('authenticated','public.cx_register_file(uuid,uuid,text,text,text,bigint,text)','execute'),'Cliente no falsifica hashes de archivos');
select set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000001',true);
select pg_temp.reject($q$select public.cx_authorize_custody('REFERENCIA SINTETICA')$q$,'Custodia requiere MFA','Verifique MFA');
select jsonb_build_object('passed',count(*),'checks',jsonb_agg(name order by name)) as resultado from cx_flow_checks;
rollback;
