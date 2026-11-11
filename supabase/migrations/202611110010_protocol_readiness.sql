begin;
create or replace function cx_private.guard_system_scope() returns trigger language plpgsql security definer set search_path='' as $$
declare asset jsonb; sys public.cx_records; protocol public.cx_records; previous_asset jsonb;
begin
 if new.kind='protocol' and new.state='PUBLICADO' then
  if not exists(select 1 from public.cx_records s where s.id=(new.payload->>'system_id')::uuid and s.kind='system' and s.specialty=new.specialty and s.state not in ('REVOCADO','ARCHIVADO')) then raise exception 'Protocolo operativo requiere sistema concreto'; end if;
  if exists(select 1 from jsonb_array_elements(coalesce(new.payload->'fields','[]'::jsonb)) f where upper(coalesce(f->>'criterion','')) ~ '(PENDIENTE|POR FIJAR|POR DEFINIR|POR CONFIRMAR|POR PRESENTAR)' or upper(coalesce(f->>'source','')) ~ '(PENDIENTE|POR FIJAR|POR DEFINIR|POR CONFIRMAR|POR PRESENTAR)') then raise exception 'Criterios y fuentes pendientes: protocolo no publicable'; end if;
 end if;
 if new.kind='system' and new.payload ? 'assets' then
  if jsonb_typeof(new.payload->'assets')<>'array' then raise exception 'Inventario debe ser una lista'; end if;
  if exists(select 1 from jsonb_array_elements(new.payload->'assets') a group by a->>'id' having count(*)>1) or exists(select 1 from jsonb_array_elements(new.payload->'assets') a group by upper(trim(a->>'tag')) having count(*)>1) then raise exception 'ID o TAG duplicado en inventario'; end if;
  for asset in select value from jsonb_array_elements(new.payload->'assets') loop
   if coalesce(asset->>'id','')='' or coalesce(trim(asset->>'tag'),'')='' then raise exception 'Activo sin ID o TAG'; end if;
   if coalesce(asset->>'type','') not in ('EQUIPO','POZO_TIERRA','MALLA_TIERRA','BARRA_EQUIPOTENCIAL','CIRCUITO','TRAMO','ACCESORIO') then raise exception 'Tipo de activo inválido'; end if;
   if asset ? 'connections' and jsonb_typeof(asset->'connections')<>'array' then raise exception 'Conexiones deben ser una lista'; end if;
  end loop;
  if tg_op='UPDATE' then
   for previous_asset in select value from jsonb_array_elements(coalesce(old.payload->'assets','[]'::jsonb)) loop
    if not exists(select 1 from jsonb_array_elements(new.payload->'assets') a where a=previous_asset) and exists(select 1 from public.cx_records t where t.kind='test' and t.state<>'BORRADOR' and t.payload->>'system_id'=old.id::text and t.payload->>'asset_id'=previous_asset->>'id') then raise exception 'Activo ya intervenido: conservar identidad y conexiones; preparar nueva revisión de inventario'; end if;
   end loop;
  end if;
 end if;
 if new.kind='protocol' and new.state='PUBLICADO' and new.payload ? 'form_schema' then
  if new.payload->'form_schema'->>'review_state' is distinct from 'VERIFICADO' then raise exception 'Formato fuente pendiente de cotejo y clasificación; no publicable'; end if;
  if exists(select 1 from jsonb_array_elements(new.payload->'fields') f where coalesce(f->>'role','') in ('','PENDIENTE_DE_CLASIFICAR')) then raise exception 'Clasificar cada campo del protocolo antes de publicar'; end if;
  if not exists(select 1 from public.cx_files f where f.record_id=(new.payload->>'document_id')::uuid and f.sha256=new.payload->>'source_pdf_sha256') then raise exception 'El archivo aceptado no corresponde a la huella del formato fuente'; end if;
 end if;
 if new.kind='test' and new.state in ('EN PROCESO','EN REVISION','OBSERVADO','REPORTADO','CERRADO') then
  select * into sys from public.cx_records where id=(new.payload->>'system_id')::uuid and kind='system' and specialty=new.specialty and state not in ('REVOCADO','ARCHIVADO');
  if sys.id is null then raise exception 'Sistema concreto no identificado o revocado'; end if;
  select value into asset from jsonb_array_elements(coalesce(sys.payload->'assets','[]'::jsonb)) where value->>'id'=new.payload->>'asset_id';
  if asset is null or coalesce(trim(asset->>'location'),'')='' or coalesce(trim(asset->>'source_ref'),'')='' or asset->>'tag' is distinct from new.payload->>'equipment_tag' then raise exception 'Equipo/TAG, ubicación y plano/revisión de origen requeridos'; end if;
  if asset->>'type'='POZO_TIERRA' and (coalesce(trim(asset->>'network_code'),'')='' or coalesce(trim(asset->>'inspection_access'),'')='' or not exists(select 1 from jsonb_array_elements(coalesce(asset->'connections','[]'::jsonb)) c where coalesce(trim(c->>'destination'),'')<>'' or coalesce(trim(c->>'circuit'),'')<>'' or coalesce(trim(c->>'busbar'),'')<>'')) then raise exception 'Pozo sin red/malla, acceso o conexiones de destino identificadas'; end if;
  select * into protocol from public.cx_records where id=(new.payload->>'protocol_id')::uuid and kind='protocol';
  if protocol.payload->>'system_id' is distinct from sys.id::text then raise exception 'Protocolo no vinculado al sistema concreto'; end if;
  if tg_op='UPDATE' and old.state<>'BORRADOR' then
   if old.payload->>'system_id' is distinct from new.payload->>'system_id' or old.payload->>'asset_id' is distinct from new.payload->>'asset_id' then raise exception 'No cambiar el objeto de una intervención registrada'; end if;
   new.payload:=jsonb_set(new.payload,'{asset_snapshot}',coalesce(old.payload->'asset_snapshot',asset||jsonb_build_object('system_id',sys.id,'system_version',sys.version)));
  else new.payload:=jsonb_set(new.payload,'{asset_snapshot}',asset||jsonb_build_object('system_id',sys.id,'system_version',sys.version));
  end if;
 end if;
 return new;
end $$;

create or replace function public.cx_import_scope_pack(p_pack jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare category text; expected text; r jsonb; existing public.cx_records; created integer:=0; reused integer:=0; result public.cx_records;
begin
 if (cx_private.member()).role is distinct from 'admin' or auth.jwt()->>'aal' is distinct from 'aal2' then raise exception 'Administrador con MFA requerido'; end if;
 if not exists(select 1 from public.cx_settings where id and custody_authorized) then raise exception 'Referencia institucional de custodia requerida antes de cargar fuentes reales'; end if;
 if p_pack->>'format' is distinct from 'cx360-scope-pack-v1' or length(p_pack::text)>15728640 then raise exception 'Formato o tamaño de paquete inválido'; end if;
 foreach category in array array['documents','systems','protocols'] loop
  expected:=case category when 'documents' then 'document' when 'systems' then 'system' else 'protocol' end;
  if jsonb_typeof(p_pack->category) is distinct from 'array' or jsonb_array_length(p_pack->category)>200 then raise exception 'Categoría % inválida',category; end if;
  for r in select value from jsonb_array_elements(p_pack->category) loop
   if r->>'kind' is distinct from expected or r->>'state' is distinct from 'BORRADOR' then raise exception 'La carga solo admite borradores de %',expected; end if;
   if expected='protocol' and r->'payload'->'form_schema'->>'review_state' is distinct from 'PENDIENTE_DE_REVISION' then raise exception 'Formato fuente debe ingresar pendiente de revisión'; end if;
   if exists(select 1 from public.cx_records x where x.kind=expected and upper(trim(x.payload->>'code'))=upper(trim(r->'payload'->>'code')) and x.id<>(r->>'id')::uuid) then raise exception 'Código ya registrado con otro ID; conciliar catálogo antes de importar: %',r->'payload'->>'code'; end if;
   select * into existing from public.cx_records where id=(r->>'id')::uuid;
   if existing.id is not null then
    if existing.kind<>expected or existing.payload->>'code' is distinct from r->'payload'->>'code' then raise exception 'Colisión de ID de fuente'; end if;
    reused:=reused+1;
   else
    result:=public.cx_save_record((r->>'id')::uuid,expected,r->>'specialty',null,'BORRADOR',r->'payload',0);created:=created+1;
   end if;
  end loop;
 end loop;
 return jsonb_build_object('created',created,'reused_without_changes',reused,'status','BORRADOR_NO_ACEPTADO');
end $$;

commit;
