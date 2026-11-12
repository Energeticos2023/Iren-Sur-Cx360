// IREN Sur CX360 – Registro documental Aconex del Hospital de Contingencia
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATES={REGISTRADA:'Registrada',RESPUESTA_EN_PREPARACION:'En preparación',RESPUESTA_REPORTADA:'Respuesta reportada',EMISION_VERIFICADA:'Emisión verificada',ANULADA:'Anulada'};
const ISSUERS={CONTRATISTA:'Contratista',ANIN:'ANIN',SUPERVISION:'Supervisión',OTRO:'Otro emisor'};
const TYPES={APORTE_AL_GP:'Aporte técnico al GP',RESPUESTA_FORMAL:'Respuesta formal',OBSERVACION:'Observación',CONSULTA:'Consulta',SEGUIMIENTO:'Seguimiento',OTRO:'Otro'};
const STAGES={TRANSVERSAL:'Transversal',PRECOMISIONAMIENTO:'Precomisionamiento',COMISIONAMIENTO:'Comisionamiento',PRUEBAS_INTEGRADAS:'Pruebas integradas',PUESTA_EN_MARCHA:'Puesta en marcha',OYM:'O&M',CAPACITACION:'Capacitación',CIERRE:'Entrega y cierre'};
const SPECS={IIEE:'Eléctricas',IISS:'Sanitarias',IIMM:'Mecánicas',TIC:'TIC',EM:'Equipamiento Médico'};
const btn=(label,a)=>'<button type="button" class="btn ghost" data-action="'+esc(a)+'">'+esc(label)+'</button>';
const opts=(items,value)=>Object.entries(items).map(([v,t])=>'<option value="'+esc(v)+'" '+(v===value?'selected':'')+'>'+esc(t)+'</option>').join('');
const field=(k,label,v='',type='text',other='')=>'<label class="label" for="ax-'+k+'">'+esc(label)+'</label><input class="input" id="ax-'+k+'" name="'+k+'" type="'+type+'" value="'+esc(v)+'" '+other+'>';
const select=(k,label,items,v)=>'<label class="label" for="ax-'+k+'">'+esc(label)+'</label><select class="input" id="ax-'+k+'" name="'+k+'">'+opts(items,v)+'</select>';
const area=(k,label,v='',max=2500)=>'<label class="label" for="ax-'+k+'">'+esc(label)+'</label><textarea class="input" id="ax-'+k+'" name="'+k+'" rows="3" maxlength="'+max+'">'+esc(v)+'</textarea>';
export function aconexScreen(c){
 const S=c.S,rows=S.aconexRows||[],members=S.snapshot?.members||[];
 const query=(S.aconexQuery||'').trim().toLowerCase(),sp=S.aconexSpec||'',state=S.aconexState||'',owner=S.aconexOwner||'';
 const shown=rows.filter(r=>(!sp||r.specialty===sp)&&(!state||r.status===state)&&(!owner||r.created_by===owner)&&(!query||[r.received_code,r.response_code,r.subject,r.system_code,r.official_ref,r.summary].join(' ').toLowerCase().includes(query)));
 return '<h2>Comunicaciones Aconex – Comisionamiento</h2><p class="notice">Hospital de Contingencia IREN Sur. Cada especialista registra el código y su actuación. Una respuesta reportada NO acredita emisión oficial hasta que sea verificada.</p>'+
 '<div class="panel"><div class="row spread"><h3>Control compartido ANIN y Supervisión</h3>'+btn('Registrar comunicación','aconex-new')+'</div>'+
 '<p class="small muted">Registros: '+rows.length+' · Verificados: '+rows.filter(x=>x.status==='EMISION_VERIFICADA').length+'</p>'+
 '<div class="filterbar">'+field('query','Buscar código o asunto',S.aconexQuery||'','search','placeholder="ANIN-FB-013634"')+select('specialty','Especialidad',{ALL:'Todas',...SPECS},sp||'ALL')+select('status','Estado',{ALL:'Todos',...STATES},state||'ALL')+
 select('owner','Registrado por',{ALL:'Todos',...Object.fromEntries(members.map(m=>[m.user_id,m.full_name]))},owner||'ALL')+'</div><div class="btnrow">'+btn('Buscar','aconex-filter')+btn('Limpiar','aconex-reset')+btn('Exportar matriz CSV','aconex-csv')+'</div></div>'+
 (S.aconexError?'<p class="notice error">'+esc(S.aconexError)+'</p>':'')+'<div class="panel section"><h3>Resultados: '+shown.length+'</h3>'+
 (shown.map(r=>{const author=members.find(m=>m.user_id===r.created_by)?.full_name||'Usuario identificado',isAuthor=r.created_by===S.member?.user_id;
 const canVerify=['admin','gp'].includes(S.member?.role)&&!isAuthor&&r.status==='RESPUESTA_REPORTADA';
 return '<article class="listitem"><div class="row spread"><strong>'+esc(r.received_code)+'</strong><span class="chip '+(r.status==='EMISION_VERIFICADA'?'green':r.status==='ANULADA'?'red':'orange')+'">'+esc(STATES[r.status]||r.status)+'</span></div><p>'+esc(r.subject)+'</p>'+
 '<small>Emisor: '+esc(ISSUERS[r.issuer]||r.issuer||'Contratista')+' · Registrado por '+esc(r.organization)+' · '+esc(r.specialty||'Multidisciplinario')+' · '+esc(r.system_code||'Sin sistema')+' · '+esc(STAGES[r.stage]||r.stage)+'</small>'+
 '<small>Registrado por: '+esc(author)+' · '+esc(TYPES[r.action_type]||r.action_type)+'</small>'+
 '<small>Respuesta: '+esc(r.response_code||'Pendiente')+' · Fecha: '+esc(r.responded_on||'No acreditada')+'</small>'+
 (r.summary?'<p class="small">'+esc(r.summary)+'</p>':'')+
 (r.status==='EMISION_VERIFICADA'?'<small>Referencia verificada: '+esc(r.official_ref||'')+'</small>':'')+
 '<div class="btnrow">'+btn('Ver detalle','aconex-detail:'+r.id)+(isAuthor&&r.status!=='EMISION_VERIFICADA'?btn('Editar mi registro','aconex-edit:'+r.id):'')+
 (canVerify?btn('Verificar emisión','aconex-verify:'+r.id):'')+(r.official_url?btn('Abrir Aconex','aconex-open:'+r.id):'')+'</div></article>'}).join('')||'<p class="muted">Sin comunicaciones registradas con los filtros aplicados.</p>')+'</div>';
}
export function aconexForm(row,member){
 const r=row||{};
 return '<form id="aconex-form" data-id="'+esc(r.id||'')+'"><p class="notice">Registrar NO envía una comunicación mediante Oracle Aconex. Autor y organización proceden de la sesión autenticada.</p>'+
 field('received_code','Código de comunicación recibida',r.received_code||'','text','required minlength="6" maxlength="120"')+
 field('response_code','Código de respuesta, si se conoce',r.response_code||'','text','maxlength="120"')+
 field('subject','Asunto',r.subject||'','text','required minlength="8" maxlength="300"')+
 select('issuer','Emisor de la comunicación',ISSUERS,r.issuer||'CONTRATISTA')+
 select('action_type','Actuación',TYPES,r.action_type||'APORTE_AL_GP')+
 select('specialty','Especialidad',{NONE:'Multidisciplinario',...SPECS},r.specialty||member.specialty||'NONE')+
 field('system_code','Sistema / TAG',r.system_code||'','text','maxlength="80"')+
 select('stage','Etapa',STAGES,r.stage||'TRANSVERSAL')+
 select('status','Estado declarado',Object.fromEntries(Object.entries(STATES).filter(([k])=>k!=='EMISION_VERIFICADA')),r.status||'REGISTRADA')+
 field('received_on','Fecha de recepción',r.received_on||'','date')+
 field('responded_on','Fecha de respuesta reportada',r.responded_on||'','date')+
 field('official_ref','Referencia de evidencia',r.official_ref||'','text','maxlength="400"')+
 field('official_url','Enlace HTTPS oficial (opcional)',r.official_url||'','url','maxlength="2200"')+
 area('summary','Resumen técnico',r.summary||'',2500)+area('next_action','Pendientes o seguimiento',r.next_action||'',1200)+
 '<p class="small muted">Solo una persona autorizada distinta del autor puede verificar la emisión contra la comunicación oficial.</p>'+
 '<button class="btn" type="submit">'+(row?'Guardar actualización':'Registrar comunicación')+'</button></form>';
}
export function verificationForm(r){
 return '<form id="aconex-verify-form" data-id="'+esc(r.id)+'"><p><strong>'+esc(r.received_code)+'</strong> · '+esc(r.subject)+'</p>'+
 '<p class="notice">Cotejar la comunicación efectivamente emitida en Oracle Aconex antes de verificar.</p>'+
 field('response_code','Código de respuesta emitida',r.response_code||'','text','required minlength="6" maxlength="120"')+
 field('responded_on','Fecha real de emisión',r.responded_on||'','date','required')+
 field('official_ref','Referencia oficial verificada',r.official_ref||'','text','required minlength="6" maxlength="400"')+
 '<label class="check"><input type="checkbox" name="confirmed" required> Verifiqué estos datos en la fuente oficial y soy distinto al autor.</label>'+
 '<button class="btn" type="submit">Verificar emisión</button></form>';
}

export function historicSection(c){
 const S=c.S, query=(S.aconexQuery||'').trim().toLowerCase(),sp=S.aconexSpec||'';
 const active=(S.aconexHistorico||[]).filter(r=>r.estado_cotejo!=='DESCARTADO'&&r.relacion_cx==='DIRECTA_CX');
 const selected=active.filter(r=>(!sp||r.especialidad===sp||!r.especialidad)&&(!query||[r.codigo,r.asunto,r.concepto,(r.codigos_relacionados||[]).join(' ')].join(' ').toLowerCase().includes(query)));
 const renderRows=selected.map(r=>'<article class="listitem"><div class="row spread"><strong>'+esc(r.codigo)+'</strong><span class="chip orange">Por cotejar en Aconex</span></div>'+
 '<p><b>'+esc(r.asunto)+'</b></p><p class="small">'+esc(r.concepto)+'</p>'+
 '<small>Emisor: '+esc(r.emisor)+' · Especialidad: '+esc(r.especialidad||'Multidisciplinario')+
 ' · Fecha: '+esc(r.fecha_documento||'NO VERIFICADA')+' · Etapa: '+esc(r.etapa)+'</small>'+
 ((r.codigos_relacionados||[]).length?'<small>Códigos relacionados (no verificados): '+esc(r.codigos_relacionados.join(', '))+'</small>':'')+
 '<small>Fuente: conversaciones anteriores; documento original pendiente de cotejo. No acredita emisión ni aceptación.</small></article>').join('');
 return '<section class="panel section" aria-label="Histórico de comisionamiento">'+
 '<h3>Antecedentes específicos de comisionamiento</h3>'+
 '<p class="notice">Solo comunicaciones cuyo asunto identificado trata sobre planificación, responsabilidades, pruebas o ejecución del Cx. Se excluyeron asuntos de diseño, SPDA, sustitución de transformador, luminarias temporales y códigos sin concepto corroborado. Esta lista aún requiere cotejo en Oracle Aconex.</p>'+
 (S.aconexHistoricoError?'<p class="notice error">'+esc(S.aconexHistoricoError)+'</p>':'')+
 '<p class="small muted">Referencias pertinentes visibles: '+selected.length+'. No equivalen a comunicaciones oficialmente verificadas.</p>'+
 (renderRows||'<p class="muted">No se identificaron antecedentes de Cx con los filtros seleccionados.</p>')+'</section>';
}
