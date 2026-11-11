begin;
alter table public.cx_records drop constraint cx_records_kind_check;
alter table public.cx_records add constraint cx_records_kind_check check(kind in ('system','activity','schedule','proposal','document','protocol','test','restriction','instrument','om','training','handover','coverage'));
create or replace function public.cx_save_record(p_id uuid,p_kind text,p_specialty text,p_assigned_to uuid,p_state text,p_payload jsonb,p_expected_version integer)
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
 if p_kind='coverage' then
  select * into source from public.cx_records where id=(p_payload->>'activity_id')::uuid and kind='activity' and specialty=p_specialty;
  if source.id is null or coalesce(p_payload->>'coverage_source','')='' then raise exception 'Actividad y fuente de requisitos de cobertura requeridas'; end if;
  select * into doc from public.cx_records where id=(source.payload->>'schedule_id')::uuid and kind='schedule' and state='ACEPTADO_CON_EVIDENCIA';
  if p_state in ('CERRADO','ACEPTADO') then
   if doc.id is null or jsonb_typeof(p_payload->'required_ids') is distinct from 'array' or jsonb_array_length(p_payload->'required_ids')=0 then raise exception 'Universo aceptado y matriz de requisitos requeridos'; end if;
   for desired in select value from jsonb_array_elements_text(p_payload->'required_ids') loop
    if not exists(select 1 from public.cx_records x where x.id=desired::uuid and x.kind in ('test','om','training','handover') and x.state in ('CERRADO','ACEPTADO') and x.payload->>'activity_id'=source.id::text) then raise exception 'Requisito no verificado o no vinculado a la actividad'; end if;
   end loop;
   if p_state='ACEPTADO' and (m.role<>'gp' or coalesce(p_payload->>'official_ref','')='' or not coalesce(cx_private.date_valid(p_payload->>'decision_date'),false)) then raise exception 'Aceptación requiere GP y evidencia formal'; end if;
  end if;
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
 if p_kind in ('om','training','handover','instrument','restriction','coverage') and p_state in ('ACEPTADO','CERRADO') then
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

commit;
