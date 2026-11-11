'use strict';
const {disciplines,stages}=require('./control-core.cjs');
function overview(records){
 const byId=new Map(records.map(r=>[r.id,r]));
 return Object.entries(disciplines).map(([specialty,name])=>{
  const own=records.filter(r=>r.specialty===specialty),systems=new Map();
  for(const s of own.filter(r=>r.kind==='system'))systems.set(s.payload.code,{code:s.payload.code,title:s.payload.title,tags:new Set()});
  for(const a of own.filter(r=>r.kind==='activity')){const code=a.payload.system_code||'PENDIENTE';if(!systems.has(code))systems.set(code,{code,title:code==='PENDIENTE'?'Sistema pendiente de identificar':code,tags:new Set()});if(a.payload.equipment_tag)systems.get(code).tags.add(a.payload.equipment_tag);}
  const tests=own.filter(r=>r.kind==='test');
  for(const t of tests){const activity=byId.get(t.payload.activity_id),code=activity?.payload.system_code||t.payload.system_code||'PENDIENTE';if(!systems.has(code))systems.set(code,{code,title:code==='PENDIENTE'?'Sistema pendiente de identificar':code,tags:new Set()});if(t.payload.equipment_tag)systems.get(code).tags.add(t.payload.equipment_tag);}
  return {specialty,name,systems:[...systems.values()].map(s=>({...s,tags:[...s.tags]})),stages:stages.map(stage=>{
   const activities=own.filter(r=>r.kind==='activity'&&r.payload.stage===stage);
   const stageTests=tests.filter(t=>(byId.get(t.payload.protocol_id)?.payload.stage||byId.get(t.payload.activity_id)?.payload.stage)===stage);
   const deliverables=own.filter(r=>['om','training','handover'].includes(r.kind)&&(r.payload.stage||(r.kind==='om'?'O&M':r.kind==='training'?'CAPACITACION':'CIERRE'))===stage);
   return {stage,activities:activities.length,tests:stageTests.length,review:stageTests.filter(t=>t.state==='EN REVISION').length,observed:stageTests.filter(t=>t.state==='OBSERVADO').length,closed:stageTests.filter(t=>t.state==='CERRADO').length,deliverables:deliverables.length,hasData:activities.length+stageTests.length+deliverables.length>0};
  })};
 });
}
function technicalReport(snapshot){
 const records=snapshot.records||[],byId=new Map(records.map(r=>[r.id,r]));
 const name=id=>(snapshot.members||[]).find(m=>m.user_id===id)?.full_name||id||'NO DISPONIBLE';
 const rows=[['REPORTE TÉCNICO DE COMISIONAMIENTO','Hospital de Contingencia IREN Sur'],['Corte de consulta UTC',snapshot.cut,'Zona','America/Lima'],['Alcance','Registros visibles para la cuenta; la fecha no libera pruebas ni autoriza energización']];
 for(const d of overview(records)){
  rows.push(['DISCIPLINA',d.specialty,d.name]);
  for(const s of d.systems)rows.push(['SISTEMA',s.code,s.title,'Equipos/TAG',s.tags.join('; ')||'PENDIENTE']);
  if(!d.systems.length)rows.push(['SISTEMAS / EQUIPOS','NO DISPONIBLES']);
  for(const s of d.stages)rows.push(['ETAPA',s.stage,'Actividades',s.hasData?s.activities:'NO DISPONIBLE','Pruebas registradas',s.hasData?s.tests:'NO DISPONIBLE','En revisión',s.hasData?s.review:'NO DISPONIBLE','Observadas',s.hasData?s.observed:'NO DISPONIBLE','Cierre independiente',s.hasData?s.closed:'NO DISPONIBLE','O&M/capacitación/entrega',s.hasData?s.deliverables:'NO DISPONIBLE']);
 }
 rows.push([],['REGISTROS DE CONTROL','Código','Título','Disciplina','Sistema','TAG','Etapa','Estado','Fecha origen inicio','Fecha origen fin','Inicio real reportado','Fin real reportado','Responsable','Acción pendiente']);
 for(const r of records.filter(r=>r.kind!=='test')){const p=r.payload;rows.push([r.kind,p.code,p.title,r.specialty||'Multidisciplinario',p.system_code||'PENDIENTE',p.equipment_tag||'PENDIENTE',p.stage||'PENDIENTE',r.state,p.planned_start||'PENDIENTE',p.planned_finish||'PENDIENTE',p.actual_start||'PENDIENTE',p.actual_finish||'PENDIENTE',r.assigned_to?name(r.assigned_to):p.responsible||p.owner||'PENDIENTE',p.next_action||'PENDIENTE']);}
 for(const t of records.filter(r=>r.kind==='test')){
  const p=t.payload,protocol=byId.get(p.protocol_id),doc=byId.get(protocol?.payload.document_id),activity=byId.get(p.activity_id);
  rows.push([],['PRUEBA',p.code,p.title,'Estado',t.state],['Disciplina',t.specialty,'Sistema',activity?.payload.system_code||p.system_code||'PENDIENTE','Equipo/TAG',p.equipment_tag||'PENDIENTE'],['Etapa',protocol?.payload.stage||activity?.payload.stage||'PENDIENTE','Fecha real reportada',p.performed_on||'PENDIENTE','Alcance',p.scope||'NO VERIFICADO'],['Protocolo',protocol?.payload.code||'PENDIENTE','Revisión',protocol?.payload.revision||'PENDIENTE','Estado',protocol?.state||'NO VERIFICADO'],['Documento fuente',doc?.payload.code||'PENDIENTE','Revisión',doc?.payload.revision||'PENDIENTE','Estado documental',doc?.state||'NO VERIFICADO'],['Procedimiento',protocol?.payload.procedure_ref||'PENDIENTE']);
  const asset=p.asset_snapshot;rows.push(['Identificación histórica del activo',p.asset_id||'PENDIENTE','Revisión de inventario',asset?.system_version??'PENDIENTE','Ubicación',asset?.location||'PENDIENTE','Red/malla',asset?.network_code||'PENDIENTE','Plano/revisión',asset?.source_ref||'PENDIENTE']);for(const connection of asset?.connections||[])rows.push(['CONEXIÓN',connection.destination||'PENDIENTE','Circuito',connection.circuit||'PENDIENTE','Barra',connection.busbar||'PENDIENTE','Fuente',connection.source_ref||'PENDIENTE']);
  for(const id of p.instrument_ids||[]){const i=byId.get(id);rows.push(['INSTRUMENTO',i?.payload.code||'NO DISPONIBLE','Serie/TAG',i?.payload.equipment_tag||'PENDIENTE','Certificado',i?.payload.certificate_ref||'PENDIENTE','Vigencia',i?.payload.valid_until||'NO VERIFICADA','Estado',i?.state||'NO VERIFICADO']);}
  if(!p.instrument_ids?.length)rows.push(['INSTRUMENTOS',p.instrument_not_required_ref||'NO DISPONIBLES; aplicabilidad no acreditada']);
  rows.push(['Liberación y controles declarados',p.ssoma?.release_ref||'NO DISPONIBLE']);
  for(const [key,label]of [['permit','Permisos / SSOMA'],['isolation','Aislamiento / LOTO'],['services','Servicios'],['personnel','Competencia / testigos']])rows.push(['PRERREQUISITO',label,p.ssoma?.[key]===true?'DECLARADO CUMPLIDO':'NO ACREDITADO']);
  rows.push(['MEDICIÓN','Valor real','Unidad','Resultado','Criterio','Fuente']);
  const fields=protocol?.payload.fields||[];
  const keys=new Set([...fields.map(f=>f.key),...Object.keys(p.measurements||{})]);
  for(const key of keys){const f=fields.find(f=>f.key===key),m=p.measurements?.[key];rows.push([f?.label||key,m?.value??'NO MEDIDO',m?.unit??f?.unit??'PENDIENTE',m?.result||'NO VERIFICABLE',f?.criterion||'NO DISPONIBLE',f?.source||'NO DISPONIBLE']);}
  const execution=(snapshot.events||[]).find(e=>e.record_id===t.id&&e.after_value&&['EN PROCESO','EN REVISION','REPORTADO'].includes(e.after_value.state));
  rows.push(['Ejecución reportada por',execution?name(execution.actor):'NO DISPONIBLE EN HISTORIAL CONSULTADO'],['Revisión independiente',t.state==='CERRADO'?name(t.updated_by):'PENDIENTE','Referencia',p.review_evidence||'NO DISPONIBLE'],['Aceptación documental','Se informa por separado en el documento fuente; el cierre de prueba no emite aceptación contractual']);
  const files=(snapshot.files||[]).filter(f=>f.record_id===t.id);
  for(const f of files)rows.push(['EVIDENCIA',f.name,'SHA-256',f.sha256,'Registrada',f.created_at||'NO DISPONIBLE']);
  if(!files.length)rows.push(['EVIDENCIA','NO DISPONIBLE']);
  rows.push(['Observaciones',p.notes||'NO DISPONIBLES'],['Acción pendiente',p.next_action||'NO DEFINIDA']);
 }
 return rows;
}
module.exports={overview,technicalReport};
