// Biblioteca documental controlada: índice y referencias, nunca almacena PDF ni enlaces privados en GitHub.
// Los vínculos se registran exclusivamente en la base privada y se abren sólo por acción explícita.
export const categories = {
 ALCANCE:'Alcance contractual', ANEXO:'Anexos del Alcance',
 PLAN_CX:'Plan de Comisionamiento', PLANO:'Planos y esquemas',
 EETT:'Especificaciones técnicas', PROCEDIMIENTO:'Procedimientos',
 PROTOCOLO:'Protocolos', CRONOGRAMA:'Cronogramas',
 PRUEBAS:'Ensayos y resultados', OYM:'Operación y mantenimiento', OTRO:'Otros expedientes'
};
export const statuses = {
 REFERENCIA:'Referencia por acreditar', BORRADOR:'Borrador',
 EN_REVISION:'En revisión', OBSERVADO:'Observado',
 ACREDITADO:'Aceptación acreditada', REEMPLAZADO:'Reemplazado', ANULADO:'Anulado'
};
const esc = x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(title,action)=>'<button type="button" class="btn ghost" data-action="'+esc(action)+'">'+esc(title)+'</button>';
const options=(obj,value)=>Object.entries(obj).map(([k,v])=>'<option value="'+esc(k)+'" '+(k===value?'selected':'')+'>'+esc(v)+'</option>').join('');
const canOpen=(r)=>Boolean(r.source_url&&/^https:\/\/[^\s<>]+$/i.test(r.source_url));
const row=r=>'<article class="listitem"><div class="row spread"><strong>'+esc(r.document_code)+' · '+esc(r.title)+'</strong><span class="chip '+(r.review_status==='ACREDITADO'?'green':r.review_status==='ANULADO'?'red':'orange')+'">'+esc(statuses[r.review_status]||r.review_status)+'</span></div>'+
 '<small>'+esc(categories[r.category]||r.category)+' · '+esc(r.specialty||'Multidisciplinario')+' · Revisión '+esc(r.revision)+' · Sistema '+esc(r.system_code||'General')+'</small>'+
 '<small>Origen: '+esc(r.source_platform)+' · Referencia: '+esc(r.source_ref||'NO REGISTRADA')+'</small>'+
 (r.review_status==='ACREDITADO'?'<small>Decisión: '+esc(r.decision_ref)+' · '+esc(r.decision_authority)+' · '+esc(r.decision_on)+'</small>':'<small>La revisión no acredita aceptación contractual</small>')+
 (r.notes?'<p class="small">'+esc(r.notes)+'</p>':'')+
 '<div class="btnrow">'+(canOpen(r)?btn('Abrir fuente oficial','library-open:'+r.id):'<span class="small muted">Archivo original / enlace oficial no cargado</span>')+btn('Ficha y trazabilidad','library-detail:'+r.id)+'</div></article>';

export const CONTINGENCIA_DRIVE_FOLDER="https://drive.google.com/drive/folders/1yofNbD1dfxfpDPRr54BaR1LeuXByTQzg?usp=drive_link";
// Enlace externo directo: la autorización y la vigencia de los archivos las controla Google Drive.
export const driveLink=(label='Abrir expedientes en Google Drive')=>
 '<a class="btn" href="'+esc(CONTINGENCIA_DRIVE_FOLDER)+'" target="_blank" rel="noopener noreferrer" aria-label="'+esc(label)+' (se abre en Google Drive)">'+esc(label)+' ↗</a>';
export function driveScreen(){
 return '<h2>Drive de expedientes — Hospital de Contingencia</h2>'+
 '<div class="panel section"><h3>Repositorio compartido de expedientes</h3>'+
 '<p>Acceso directo a la carpeta de Google Drive indicada por la coordinación de comisionamiento. Los expedientes permanecen en Drive y no se publican en CX360.</p>'+
 '<div class="btnrow">'+driveLink('Abrir carpeta de expedientes')+'</div>'+
 '<p class="small muted">Se abrirá Google Drive en otra pestaña o en la aplicación de su celular. Ingrese con la cuenta Google que tenga autorización sobre esta carpeta.</p></div>'+
 '<div class="panel section"><h3>Si no puede acceder</h3>'+
 '<p>Si Google muestra «Solicitar acceso», solicite permiso al propietario o responsable de la carpeta utilizando su correo institucional autorizado. Si aparece 404, confirme que usa la cuenta Google correcta y que el enlace sigue vigente.</p>'+
 '<p class="notice">Un enlace en CX360 no concede permisos en Google Drive. No active «Cualquier persona con el enlace» para documentos técnicos reservados. La consulta de un archivo no acredita revisión ni aceptación contractual de planos.</p></div>';
}

export function libraryScreen(c) {
 const {S}=c;
 const docs=S.libraryDocs||[],query=(S.libraryQuery||'').toLowerCase(),sp=S.librarySpec||'',cat=S.libraryCategory||'',st=S.libraryStatus||'';
 const filtered=docs.filter(r=>(!sp||r.specialty===sp)&&(!cat||r.category===cat)&&(!st||r.review_status===st)&&(!query||[r.title,r.document_code,r.system_code,r.source_ref,r.revision].join(' ').toLowerCase().includes(query)));
 return '<h2>Biblioteca documental del Comisionamiento</h2>'+
 '<p class="notice">Contingencia IREN Sur exclusivamente. Las referencias del Asistente no equivalen al expediente original. Una aprobación solo es acreditada con revisión exacta, autoridad, fecha y referencia oficial. Los vínculos externos pueden solicitar credenciales de ACC o Aconex.</p>'+ '<div class="panel"><h3>Expedientes en Google Drive</h3><p>Carpeta de referencia del equipo de ANIN y Supervisión; acceso sujeto a los permisos concedidos en Google.</p><div class="btnrow">'+driveLink('Abrir Drive de expedientes')+'</div></div>'+
 '<div class="panel"><div class="row spread"><h3>Expedientes y planos</h3>'+(S.member?.role==='admin'?btn('Registrar / vincular documento','library-new'):'')+'</div>'+
 '<p class="small muted">Los archivos originales permanecen en sus repositorios institucionales autorizados. Este índice no copia ni publica planos reservados.</p>'+
 '<div class="filterbar"><label>Buscar código, nombre, revisión o sistema<input class="input" id="library-search" value="'+esc(S.libraryQuery||'')+'" placeholder="Ej.: EL-01, E4, Anexo 12"></label>'+
 '<label>Especialidad<select class="input" id="library-spec"><option value="">Todas las visibles</option>'+options({IIEE:'Eléctricas',IISS:'Sanitarias',IIMM:'Mecánicas',TIC:'TIC',EM:'Equipamiento médico'},sp)+'</select></label>'+
 '<label>Tipo<select class="input" id="library-category"><option value="">Todos</option>'+options(categories,cat)+'</select></label>'+
 '<label>Estado<select class="input" id="library-status"><option value="">Todos</option>'+options(statuses,st)+'</select></label></div>'+
 '<div class="btnrow">'+btn('Buscar','library-search')+btn('Limpiar filtros','library-clear')+'</div></div>'+
 '<div class="panel section"><h3>Documentos visibles: '+filtered.length+'</h3>'+
 (S.libraryError?'<p class="notice error">'+esc(S.libraryError)+'</p>':!docs.length?'<p class="notice">No hay documentos disponibles en esta consulta. No se presume que el repositorio esté completo.</p>':filtered.map(row).join('')||'<p class="muted">No hay registros con esos filtros.</p>')+'</div>';
}
export function librarySystemPanel(c,specialty,systemCode) {
 const docs=(c.S.libraryDocs||[]).filter(r=>(!r.specialty||r.specialty===specialty)&&
  (!r.system_code||r.system_code===systemCode));
 const count=docs.filter(r=>r.review_status==='ACREDITADO').length;
 return '<section class="block"><h3>Documentos del sistema · '+esc(systemCode)+'</h3>'+
 '<p class="small muted">Referencias generales y de especialidad visibles: '+docs.length+
 ' · Aceptaciones documentadas en este índice: '+count+'. No se consideran planos aceptados si no constan revisión y decisión oficial.</p>'+
 (docs.length?docs.slice(0,30).map(row).join(''):'<p class="muted">No hay documentos vinculados al sistema. Solicitar plano aceptado y alcance vigente antes de liberar una prueba.</p>')+
 '<div class="btnrow">'+btn('Abrir biblioteca completa','library-go:'+encodeURIComponent(specialty)+':'+encodeURIComponent(systemCode))+driveLink('Abrir Drive de expedientes')+'</div></section>';
}
export function libraryForm(r) {
 const selected=r||{};
 const f=(name,label,value='',type='text',extra='')=>'<label class="label" for="lib-'+name+'">'+esc(label)+'</label>'+
 (type==='textarea'?'<textarea id="lib-'+name+'" class="input" name="'+name+'" '+extra+'>'+esc(value)+'</textarea>':
 '<input id="lib-'+name+'" class="input" name="'+name+'" type="'+type+'" value="'+esc(value||'')+'" '+extra+'>');
 const sel=(name,label,opts,v)=>'<label class="label">'+esc(label)+'</label><select name="'+name+'" class="input">'+opts.map(([k,t])=>'<option value="'+esc(k)+'" '+(k===v?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select>';
 const statusOpts=Object.entries(statuses).filter(([k])=>k!=='ANULADO'||r);
 return '<form id="library-form" data-id="'+esc(r?.id||'')+'">'+
 '<p class="notice">Solo índice. No adjunte documentos reservados sin autorización institucional. La etiqueta ACEPTACIÓN ACREDITADA requiere decisión formal comprobable y revisión exacta.</p>'+
 f('document_code','Código documental',selected.document_code||'','text','required maxlength="120"')+
 f('title','Título completo',selected.title||'','text','required maxlength="400"')+
 sel('category','Tipo de documento',Object.entries(categories),selected.category||'PLANO')+
 f('revision','Revisión exacta',selected.revision||'POR_VERIFICAR','text','required maxlength="80"')+
 sel('specialty','Especialidad',[['','Multidisciplinario'],['IIEE','IIEE'],['IISS','IISS'],['IIMM','IIMM'],['TIC','TIC'],['EM','Equipamiento Médico']],selected.specialty||'')+
 f('system_code','Código de sistema (opcional)',selected.system_code||'')+
 f('stage','Fase (opcional)',selected.stage||'')+
 sel('source_platform','Repositorio',[['PENDIENTE','Por acreditar'],['ACC','Autodesk ACC'],['ACONEX','Oracle Aconex'],['ANIN','ANIN'],['DRIVE_INSTITUCIONAL','Drive institucional'],['SHAREPOINT_INSTITUCIONAL','SharePoint institucional'],['OTRO_OFICIAL','Otro oficial'],['BASE_ASISTENTE','Base del Asistente']],selected.source_platform||'PENDIENTE')+
 f('source_ref','Código / enlace de referencia oficial',selected.source_ref||'')+
 f('source_url','URL HTTPS oficial (solo si el acceso está autorizado)',selected.source_url||'','url','maxlength="2200" placeholder="https://..."')+
 sel('review_status','Estado verificado',statusOpts,selected.review_status||'REFERENCIA')+
 f('decision_ref','Código de aceptación / comunicación Aconex o ACC',selected.decision_ref||'')+
 f('decision_authority','Autoridad que decidió',selected.decision_authority||'')+
 f('decision_on','Fecha de la decisión',selected.decision_on||'','date')+
 f('notes','Alcance, limitaciones o pendientes',selected.notes||'','textarea','maxlength="1500"')+
 '<p class="small">Las revisiones anteriores se conservan como registros independientes. No sustituya una R01 con R02 usando el mismo registro; cree la revisión nueva.</p>'+
 '<div class="btnrow"><button class="btn" type="submit">Guardar metadatos verificables</button></div></form>';
}
