'use strict';
const disciplines={IIEE:'Instalaciones Eléctricas',IISS:'Instalaciones Sanitarias',IIMM:'Instalaciones Mecánicas',TIC:'Tecnologías y Comunicaciones',EM:'Equipamiento Médico'};
const stages=['PRECOMISIONAMIENTO','PRUEBAS FUNCIONALES','PRUEBAS INTEGRADAS','PUESTA EN MARCHA','O&M','CAPACITACION','CIERRE'];
const limaDate=(now=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s}
function validateSchedule(p){
 const errors=[];if(!p||typeof p!=='object')return ['Se requiere un objeto de cronograma'];
 if(!p.code||!p.title||!p.revision||!p.source_ref)errors.push('Código, título, revisión y fuente requeridos');
 if(p.timezone!=='America/Lima')errors.push('Zona requerida: America/Lima');
 if(!Array.isArray(p.calendar?.work_days)||!p.calendar.work_days.length||p.calendar.work_days.some(x=>!Number.isInteger(x)||x<1||x>7))errors.push('Calendario laboral inválido');
 if(!Array.isArray(p.calendar?.holidays)||p.calendar.holidays.some(d=>!validDate(d)))errors.push('Feriados inválidos');
 if(!Array.isArray(p.activities)||!p.activities.length)return [...errors,'Actividades requeridas'];
 if(p.activities.length>500)errors.push('Máximo 500 actividades');
 const byCode=new Map();for(const a of p.activities){if(byCode.has(a.code))errors.push(`ID duplicado: ${a.code}`);byCode.set(a.code,a);}
 for(const a of p.activities){
  if(!a.code||!a.title||!disciplines[a.specialty]||!stages.includes(a.stage))errors.push(`${a.code||'?'}: código, título, disciplina o etapa inválidos`);
  if(!validDate(a.planned_start)||!validDate(a.planned_finish)||a.planned_finish<a.planned_start)errors.push(`${a.code}: fechas inválidas`);
  if(!a.system_code||!a.equipment_tag||!a.responsible)errors.push(`${a.code}: faltan sistema, TAG/alcance o responsable`);
  if(!Array.isArray(a.predecessors))errors.push(`${a.code}: predecesoras requeridas`);
  else for(const dep of a.predecessors)if(dep===a.code||!byCode.has(dep))errors.push(`${a.code}: dependencia inválida ${dep}`);
 }
 const visiting=new Set(),visited=new Set();function visit(code){if(visiting.has(code)){errors.push(`Ciclo en ${code}`);return}if(visited.has(code))return;visiting.add(code);for(const d of byCode.get(code)?.predecessors||[])if(byCode.has(d))visit(d);visiting.delete(code);visited.add(code)}
 if(p.activities.length<=500)for(const code of byCode.keys())visit(code);
 return [...new Set(errors)];
}
// CSV RFC 4180: conserva IDs como texto; evita interpretar celdas como fórmulas.
function parseCsv(text){
 const rows=[];let row=[],cell='',quoted=false;
 text=String(text).replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}else if(c==='"'){if(cell)throw Error('Comillas CSV inválidas');quoted=true}else if(c===','){row.push(cell);cell=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))rows.push(row);row=[];cell=''}else cell+=c;}
 if(quoted)throw Error('CSV con comillas sin cerrar');if(cell||row.length){row.push(cell);rows.push(row)}return rows;
}
function rowsToActivities(rows){const [headers,...body]=rows;const required=['code','title','specialty','stage','system_code','equipment_tag','responsible','planned_start','planned_finish','predecessors'];if(!headers||required.some(h=>!headers.includes(h)))throw Error('Faltan columnas: '+required.join(', '));if(new Set(headers).size!==headers.length)throw Error('Cabeceras duplicadas');return body.filter(r=>r.some(v=>v!==null&&v!=='')).map(r=>{const a=Object.fromEntries(headers.map((h,i)=>[h,r[i] instanceof Date?r[i].toISOString().slice(0,10):String(r[i]??'').trim()]));a.predecessors=a.predecessors?a.predecessors.split('|').map(s=>s.trim()).filter(Boolean):[];return a})}
function csvCell(value){let s=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'}
function exportCsv(rows){return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')}
function progress(records,cut=limaDate(),currentId=null){
 const accepted=records.filter(r=>r.kind==='schedule'&&r.state==='ACEPTADO_CON_EVIDENCIA');
 if(!currentId&&accepted.length!==1)return {cut,revision:null,numerator:null,denominator:null,label:'NO CALCULABLE',reason:accepted.length?'Hay varias revisiones aceptadas; seleccionar vigencia formal':'No hay cronograma aceptado acreditado'};
 const schedule=currentId?accepted.find(s=>s.id===currentId):accepted[0];
 if(!schedule)return {cut,revision:null,numerator:null,denominator:null,label:'NO CALCULABLE',reason:'La revisión vigente no es visible o no está acreditada'};
 const universe=schedule.payload.activities||[];
 if(!currentId||!universe.length)return {cut,revision:schedule.payload.revision,numerator:null,denominator:universe.length||null,label:'NO CALCULABLE',reason:'Falta vigencia formal o universo definido'};
 const activities=new Map(records.filter(r=>r.kind==='activity'&&r.payload.schedule_id===schedule.id).map(r=>[r.id,r.payload.source_activity_code]));
 const covered=new Set(),formallyAccepted=new Set();
 for(const r of records.filter(r=>r.kind==='coverage'&&['CERRADO','ACEPTADO'].includes(r.state))){const code=activities.get(r.payload.activity_id);if(code&&universe.some(a=>a.code===code)){covered.add(code);if(r.state==='ACEPTADO')formallyAccepted.add(code)}}
 return {cut,revision:schedule.payload.revision,numerator:covered.size,denominator:universe.length,acceptedNumerator:formallyAccepted.size,label:(covered.size/universe.length*100).toFixed(1)+'%',reason:'Actividades con cobertura de requisitos cerrada por revisor independiente; aceptación formal: '+formallyAccepted.size+'/'+universe.length};
}
module.exports={disciplines,stages,limaDate,escapeHtml,validDate,validateSchedule,parseCsv,rowsToActivities,exportCsv,progress};
