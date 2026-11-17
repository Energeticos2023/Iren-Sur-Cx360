// CX360 - Consulta protegida del cronograma de comisionamiento y reuniones de coordinación.
// Datos privados por RPC con membresía activa; nunca constituye programa aceptado.
const h=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const d=s=>{if(!s)return '—';const p=String(s).split('-');return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:String(s)};
const specs={IIEE:'Instalaciones eléctricas',IIMM:'Instalaciones mecánicas',IISS:'Instalaciones sanitarias',TIC:'Tecnologías de información',EM:'Equipamiento médico'};
function warnings(items){return '<div class="section panel"><h3>Observaciones de conciliación documental</h3>'+(items||[]).map(x=>'<p class="listitem"><strong>'+h(x.id)+' · '+h(x.severity)+'</strong> · '+h(x.description)+'</p>').join('')+'</div>'}
function table(activities){
 return Object.entries(specs).map(([key,title])=>{
  const items=(activities||[]).filter(a=>a.specialty===key);
  return '<details class="section panel" open><summary><strong>'+h(title)+' · '+items.length+' actividades</strong></summary><div class="tablewrap"><table class="rtable"><thead><tr><th>Código de JYS</th><th>Actividad / sistema</th><th>Inicio propuesto</th><th>Fin propuesto</th><th>Vinculación CX360</th></tr></thead><tbody>'+items.map(a=>'<tr><td><strong>'+h(a.source_code)+'</strong></td><td>'+h(a.title)+'</td><td>'+h(d(a.proposed_start))+'</td><td>'+h(d(a.proposed_finish))+'</td><td>'+h(a.catalog_system)+'<small class="muted"> · por cotejar</small></td></tr>').join('')+'</tbody></table></div></details>';
 }).join('');
}
function meeting(record){
 if(!record)return '';
 const p=record.payload||{};
 return '<section class="section panel"><h3>Hito de coordinación · '+h(d(p.meeting_date))+'</h3><p><strong>'+h(p.title)+'</strong></p><p>Programación de referencia: '+h(p.scheduled_start)+'–'+h(p.scheduled_end)+' · '+h(p.scheduled_location)+'. <strong>Realizada según confirmación del coordinador.</strong> No se dispone de acta ratificada.</p><p class="small muted">Evidencia: presentación de 15 diapositivas y fotografías aportadas en conversación; archivos originales no copiados a CX360 por autorización de custodia pendiente. Esta reunión no equivale a instrucción ni decisión contractual del GP.</p><h3>Compromisos A1–A7 · propuestas pendientes de ratificación</h3><div class="tablewrap"><table class="rtable"><thead><tr><th>N.º</th><th>Actividad propuesta</th><th>Responsable propuesto</th><th>Plazo propuesto</th></tr></thead><tbody>'+(p.actions||[]).map(a=>'<tr><td>'+h(a.code)+'</td><td>'+h(a.title)+'</td><td>'+h(a.proposed_owner)+'</td><td>'+h(d(a.proposed_due))+'</td></tr>').join('')+'</tbody></table></div><p class="small"><strong>Próximo hito propuesto:</strong> '+h(d(p.subsequent_meeting?.date))+' · '+h(p.subsequent_meeting?.time)+' — pendiente de confirmación.</p></section>';
}
function alarm(record){
 if(!record)return '';
 const p=record.payload||{};
 return '<section class="section panel"><h3>Seguimiento asociado · Detección y alarma de incendios (TI-07)</h3><p><strong>'+h(p.document_code)+' / '+h(p.revision)+'</strong> · comunicación ACONEX '+h(p.aconex_ref)+' · '+h(d(p.aconex_message_date))+'. Recepción no equivale a aceptación.</p><div class="tablewrap"><table class="rtable"><thead><tr><th>Incidencia ACC</th><th>Revisión</th><th>Estado de origen</th></tr></thead><tbody>'+(p.acc_issues||[]).map(x=>'<tr><td>#'+h(x.id)+'</td><td>'+h(x.subject)+'</td><td>'+h(x.state)+'</td></tr>').join('')+'</tbody></table></div><p class="small muted">Estados según reporte ACC aportado (corte 17/11/2026); verificar en ACC antes de decidir. No se autoriza liberación de pruebas por esta ficha.</p></section>';
}
export function screen(data,error){
 if(error)return '<h2>Cronograma V01 y reuniones</h2><p class="notice error">Registro privado no disponible: '+h(error)+'. No se muestran datos de caché ni se deduce aceptación.</p>';
 if(!data||!Array.isArray(data.records))return '<h2>Cronograma V01 y reuniones</h2><p class="notice">Consulta pendiente; no hay datos verificados de la fuente privada.</p>';
 const byType=t=>data.records.find(r=>r.type===t),schedule=byType('schedule_review')?.payload,meet=byType('coordination_meeting'),fire=byType('technical_reference');
 if(!schedule)return '<h2>Cronograma V01 y reuniones</h2><p class="notice">No existe el corte provisional en los registros autorizados.</p>';
 const acts=schedule.activities||[];
 return '<h2>Cronograma CMT V01 y reuniones</h2><p class="notice"><strong>PROPUESTA EN REVISIÓN · NO ES PROGRAMA ACEPTADO NEC4.</strong> Fuente '+h(schedule.code)+' / '+h(schedule.revision)+', emitida '+h(d(schedule.document_date))+'. Fechas propuestas '+h(d(schedule.proposed_start))+' al '+h(d(schedule.proposed_finish))+'. Se conserva sin alterar la línea base existente. No se liberan pruebas ni se calculan atrasos contractuales desde este documento.</p><div class="grid kpis"><div class="kpi">Actividades del cronograma<div class="num">'+acts.length+'</div><div class="hint">39 filas identificadas, sin aprobar</div></div><div class="kpi">Especialidades<div class="num">5</div><div class="hint">IIEE, IIMM, IISS, TIC y EM</div></div><div class="kpi">Reunión de coordinación<div class="num">16/11</div><div class="hint">Realizada según usuario; acta no aportada</div></div></div><div class="section panel"><h3>Inventario para conciliación · Fuente JYS</h3><p>Se respeta la especialidad, denominación y fecha del cronograma. Las equivalencias con el catálogo de 40 sistemas de CX360 son orientativas, no sustituyen ni eliminan sistemas contractuales.</p></div>'+table(acts)+warnings(schedule.issues)+meeting(meet)+alarm(fire)+'<p class="small muted">Corte de consulta privado; el acceso requiere sesión y membresía vigente en CX360. Documentos originales y fotografías no publicados en GitHub. Las decisiones formales se acreditan con sus referencias ACONEX/ACC y competencia respectiva.</p>';
}
