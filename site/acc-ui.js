// Registro de revisiones ACC. CX360 no publica ni modifica Autodesk ACC.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const field=(name,label,value='',type='text',extra='')=>'<label class="label" for="acc-'+name+'">'+esc(label)+'</label><input class="input" id="acc-'+name+'" name="'+name+'" type="'+type+'" value="'+esc(value)+'" '+extra+'>';
const area=(name,label,value='',limit=6000)=>'<label class="label" for="acc-'+name+'">'+esc(label)+'</label><textarea class="input" id="acc-'+name+'" name="'+name+'" rows="3" maxlength="'+limit+'">'+esc(value)+'</textarea>';
const sel=(name,label,values,v)=>'<label class="label" for="acc-'+name+'">'+esc(label)+'</label><select class="input" id="acc-'+name+'" name="'+name+'">'+Object.entries(values).map(([k,s])=>'<option value="'+esc(k)+'" '+(k===v?'selected':'')+'>'+esc(s)+'</option>').join('')+'</select>';
const btn=(t,a)=>'<button type="button" class="btn ghost" data-action="'+esc(a)+'">'+esc(t)+'</button>';
const STATES={NO_VERIFICADO:'No verificado',ABIERTO:'Abierto',EN_REVISION:'En revisión',DEVUELTO:'Devuelto',CERRADO:'Cerrado',OTRO:'Otro estado oficial'};
const OP={NO_VERIFICADA:'Sin decisión final verificada',ACEPTADO:'Aceptado',ACEPTADO_CON_COMENTARIOS:'Aceptado con comentarios',RECHAZADO:'Rechazado',OTRO:'Otra decisión oficial'};
const TYPES={COMENTARIO_ESPECIALISTA:'Comentario de especialista',INCIDENCIA_ACC:'Incidencia ACC',RESPUESTA_CONTRATISTA:'Respuesta de contratista',SUBSANACION:'Subsanación presentada',RECOMENDACION:'Recomendación técnica',DECISION_FINAL:'Decisión final documentada',RECTIFICACION:'Rectificación de un registro',OTRO:'Otra actuación'};
const SPEC={NONE:'Multidisciplinario',IIEE:'Instalaciones Eléctricas',IISS:'Instalaciones Sanitarias',IIMM:'Instalaciones Mecánicas',TIC:'TIC',EM:'Equipamiento Médico'};
const PHASE={COMISIONAMIENTO:'Comisionamiento',PRECOMISIONAMIENTO:'Precomisionamiento',PRUEBAS_INTEGRADAS:'Pruebas integradas',PUESTA_EN_MARCHA:'Puesta en marcha',OYM:'Manual O&M',CAPACITACION:'Capacitación',CIERRE:'Cierre'};
const short=x=>String(x||'').slice(0,160);
export function accScreen({S}){
 const rows=S.accRows||[], entries=S.accEntries||[],q=(S.accQuery||'').trim().toLowerCase(),sp=S.accSpec||'',st=S.accStatus||'';
 const shown=rows.filter(r=>(!sp||r.specialty===sp)&&(!st||r.workflow_state===st)&&(!q||[r.acc_review_number,r.document_code,r.title,r.system_code,r.aconex_code,r.official_ref].join(' ').toLowerCase().includes(q)));
 return '<h2>Revisiones ACC – Comisionamiento</h2><p class="notice">Fuente oficial: Autodesk ACC. CX360 conserva una copia de seguimiento manual; no consulta ni publica en ACC automáticamente. La opinión especializada, el estado del flujo, el código del documento y la decisión final son conceptos distintos.</p>'+
 '<div class="panel"><div class="row spread"><h3>Control documental interdisciplinario</h3>'+((S.member?.role!=='auditor')?btn('Registrar revisión','acc-new'):'')+'</div><p class="small muted">Fichas: '+rows.length+' · Cotejadas: '+rows.filter(r=>r.verification_status==='COTEJADA').length+' · Actuaciones documentadas: '+entries.length+'</p>'+
 '<div class="filterbar">'+field('search','Buscar ACC, expediente o Aconex',S.accQuery||'','search','placeholder="2641 o código de procedimiento"')+
 sel('specialty','Especialidad',{ALL:'Todas',...SPEC},sp||'ALL')+
 sel('status','Estado del flujo',{ALL:'Todos',...STATES},st||'ALL')+
 '</div><div class="btnrow">'+btn('Filtrar','acc-filter')+btn('Limpiar','acc-clear')+btn('Exportar CSV','acc-csv')+'</div></div>'+
 (S.accError?'<p class="notice error">'+esc(S.accError)+'</p>':'')+
 '<div class="panel section"><h3>Revisiones visibles: '+shown.length+'</h3>'+
 (shown.map(r=>{const n=entries.filter(e=>e.review_id===r.id).length;const who=(S.snapshot?.members||[]).find(m=>m.user_id===r.created_by)?.full_name||'Miembro identificado';const author=r.created_by===S.member?.user_id;
 return '<article class="listitem"><div class="row spread"><strong>ACC #'+esc(r.acc_review_number)+' · '+esc(r.document_code)+'</strong><span class="chip '+(r.verification_status==='COTEJADA'?'green':'orange')+'">'+(r.verification_status==='COTEJADA'?'Fuente cotejada':'Por cotejar')+'</span></div>'+
 '<p>'+esc(r.title)+'</p><small>Rev. '+esc(r.document_revision)+' · '+esc(STATES[r.workflow_state]||r.workflow_state)+' · Código documental '+esc(r.document_status_code||'No verificado')+' · '+esc(r.specialty||'Multidisciplinario')+' / '+esc(r.system_code||'Sin sistema')+'</small>'+
 '<small>Decisión final: '+esc(OP[r.final_decision]||r.final_decision)+' · '+n+' actuaciones · Registrada por '+esc(who)+'</small>'+
 (r.aconex_code?'<small>Vínculo Aconex: '+esc(r.aconex_code)+'</small>':'')+
 (r.next_action?'<p class="small">Acción: '+esc(short(r.next_action))+'</p>':'')+
 '<div class="btnrow">'+btn('Ver trazabilidad','acc-detail:'+r.id)+btn('Registrar actuación','acc-entry:'+r.id)+
 (author&&r.verification_status!=='COTEJADA'?btn('Editar ficha','acc-edit:'+r.id):'')+
 (r.verification_status==='POR_COTEJAR'&&!author&&['admin','gp'].includes(S.member?.role)?btn('Cotejar con ACC','acc-verify:'+r.id):'')+
 (r.official_url?btn('Abrir fuente ACC','acc-open:'+r.id):'')+'</div></article>'}).join('')||'<p class="muted">No existen revisiones ACC registradas con estos filtros. La ausencia de datos NO acredita que no existan revisiones oficiales.</p>')+'</div>';
}
export function reviewForm(r,member){
 const v=r||{};
 return '<form id="acc-review-form" data-id="'+esc(v.id||'')+'"><p class="notice">La ficha es un índice interno. Cotejar antes de considerar un estado o aceptación como verificado.</p>'+
 field('acc_review_number','N.º de revisión ACC',v.acc_review_number||'','text','required pattern="[0-9]{1,12}"')+
 field('document_code','Código completo del procedimiento',v.document_code||'','text','required minlength="6" maxlength="200"')+
 field('document_revision','Revisión documental exacta',v.document_revision||'C01','','required maxlength="40"')+
 field('file_version','Versión de archivo ACC',v.file_version||'','text','maxlength="50"')+
 field('title','Asunto / título',v.title||'','text','required minlength="8" maxlength="500"')+
 sel('specialty','Especialidad',{...SPEC},v.specialty||member.specialty||'NONE')+
 field('system_code','Sistema / TAG',v.system_code||'','text','maxlength="100"')+
 sel('stage','Etapa',PHASE,v.stage||'COMISIONAMIENTO')+
 field('document_status_code','Código de estado documental mostrado (S4, etc.)',v.document_status_code||'','text','maxlength="80"')+
 sel('workflow_state','Estado oficial del flujo al corte',STATES,v.workflow_state||'NO_VERIFICADO')+
 field('workflow_step','Paso actual / destinatario',v.workflow_step||'','text','maxlength="200"')+
 field('received_on','Fecha de inicio/recepción',v.received_on||'','date')+
 field('review_due_on','Vencimiento oficial mostrado',v.review_due_on||'','date')+
 field('source_captured_on','Fecha de corte de la captura',v.source_captured_on||'','date')+
 field('official_ref','Referencia o URL de captura institucional',v.official_ref||'','text','maxlength="500"')+
 field('official_url','Enlace HTTPS oficial ACC',v.official_url||'','url','maxlength="2200"')+
 field('aconex_code','Comunicación Aconex vinculada (si existe)',v.aconex_code||'','text','maxlength="120"')+
 area('specialist_summary','Síntesis de opiniones y alcance de la revisión',v.specialist_summary||'',3000)+
 area('next_action','Corrección exigida, responsable, evidencia de cierre o seguimiento',v.next_action||'',3000)+
 sel('final_decision','Decisión FINAL del flujo (no opinión individual)',OP,v.final_decision||'NO_VERIFICADA')+
 field('final_decision_ref','Referencia de decisión final, solo si existe',v.final_decision_ref||'','text','maxlength="500"')+
 field('final_decision_on','Fecha de decisión final',v.final_decision_on||'','date')+
 '<p class="small muted">Rechazo, aceptación o comentario de un especialista no se trasladan automáticamente a la decisión final. Identidad y revisión son inmutables después de registrar.</p>'+
 '<button class="btn" type="submit">Guardar ficha ACC</button></form>';
}
export function entryForm(r){
 return '<form id="acc-entry-form" data-id="'+esc(r.id)+'"><p><b>ACC #'+esc(r.acc_review_number)+' · '+esc(r.document_code)+' / '+esc(r.document_revision)+'</b></p>'+
 '<p class="notice">Cada comentario o incidencia se registra por separado, con número oficial si existe. No se generan incidencias en Autodesk.</p>'+
 sel('event_type','Tipo de actuación',TYPES,'COMENTARIO_ESPECIALISTA')+
 field('source_revision','Revisión citada',r.document_revision||'','text','maxlength="60"')+
 sel('specialty','Especialidad',SPEC,r.specialty||'NONE')+
 field('official_author','Autor oficial visible en ACC', '', 'text','maxlength="200"')+
 field('acc_issue_number','N.º incidencia ACC (si corresponde)', '', 'text','maxlength="100"')+
 sel('opinion','Opinión individual (no decisión final)',{NONE:'No corresponde',...OP,PENDIENTE:'Pendiente',NO_APLICA:'No aplica'},'NONE')+
 field('entry_date','Fecha oficial de la actuación','', 'date')+
 area('summary','Comentario / hallazgo / decisión original o síntesis fiel','',6000)+
 area('required_action','Corrección, evidencia y condición de cierre','',3000)+
 field('official_ref','Referencia de fuente o evidencia', '', 'text','maxlength="500"')+
 field('official_url','Enlace oficial HTTPS','', 'url','maxlength="2200"')+
 '<p class="small muted">Registro inmutable: una rectificación se añade como nueva actuación, sin borrar la anterior.</p>'+
 '<button class="btn" type="submit">Registrar actuación</button></form>';
}
export function reviewDetail(r,entries,members){
 const member=id=>members.find(m=>m.user_id===id)?.full_name||'Miembro autenticado';
 return '<p><b>ACC #'+esc(r.acc_review_number)+' · '+esc(r.document_code)+' / '+esc(r.document_revision)+'</b></p>'+
 '<p>'+esc(r.title)+'</p><p>Estado flujo: '+esc(STATES[r.workflow_state]||r.workflow_state)+' · Código documental: '+esc(r.document_status_code||'NO VERIFICADO')+'</p>'+
 '<p>Paso: '+esc(r.workflow_step||'No registrado')+' · Captura: '+esc(r.source_captured_on||'Sin fecha')+' · Vencimiento: '+esc(r.review_due_on||'No verificado')+'</p>'+
 '<p>Decisión final: '+esc(OP[r.final_decision]||r.final_decision)+' · Referencia: '+esc(r.final_decision_ref||'NO ACREDITADA')+'</p>'+
 '<p>Resumen: '+esc(r.specialist_summary||'Sin síntesis')+'</p><p>Siguiente acción: '+esc(r.next_action||'No registrada')+'</p>'+
 '<p>Aconex relacionado: '+esc(r.aconex_code||'No vinculado')+' · Cotejo: '+esc(r.verification_status)+' · Por '+esc(r.verified_by?member(r.verified_by):'Pendiente')+'</p>'+
 '<h3>Historial de actuaciones ('+entries.length+')</h3>'+
 (entries.map(e=>'<div class="listitem"><b>'+esc(TYPES[e.event_type]||e.event_type)+'</b> · '+esc(e.entry_date||'Fecha no registrada')+
 '<small>Rev. '+esc(e.source_revision||'No identificada')+' · '+esc(e.specialty||'Transversal')+' · Autor oficial: '+esc(e.official_author||'No informado')+' · Incidencia: '+esc(e.acc_issue_number||'No aplica')+'</small>'+
 '<small>Opinión: '+esc(OP[e.opinion]||e.opinion||'No aplica')+' · Registrado por: '+esc(member(e.entered_by))+'</small>'+
 '<p>'+esc(e.summary)+'</p><p class="small">Acción/evidencia: '+esc(e.required_action||'No registrada')+'</p>'+
 '<small>Fuente: '+esc(e.official_ref||e.official_url||'No cotejada')+'</small></div>').join('')||'<p>Sin actuaciones registradas. No confundir con cero comentarios en ACC.</p>');
}
export function verifyForm(r){
 return '<form id="acc-verify-form" data-id="'+esc(r.id)+'"><p><b>ACC #'+esc(r.acc_review_number)+'</b> / '+esc(r.document_code)+' · '+esc(r.document_revision)+'</p>'+
 '<p class="notice">Cotejo independiente de la ficha contra el ACC original. No significa aceptar el procedimiento ni liberar pruebas.</p>'+
 field('official_ref','Referencia institucional cotejada',r.official_ref||'','text','required minlength="6" maxlength="500"')+
 field('official_url','URL oficial HTTPS de ACC',r.official_url||'','url','required maxlength="2200"')+
 '<label class="check"><input type="checkbox" name="confirmed" required> Revisé el estado, versión, comentarios, vínculos y decisión documentada contra la fuente ACC. No soy el autor de esta ficha.</label>'+
 '<button type="submit" class="btn">Confirmar cotejo documental</button></form>';
}
