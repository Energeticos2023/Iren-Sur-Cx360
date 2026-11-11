'use strict';
// CX360 – lógica del tablero del Plan Cx, protocolos y seguimiento. Funciones puras, sin red ni DOM.
const LEVELS=['L1','L2','L3','L4','L5'];
const CLOSED=new Set(['CERRADO','ACEPTADO','ACEPTADO_CON_EVIDENCIA','REVOCADO','ARCHIVADO']);
const DONE_FOR_SCHEDULE=new Set(['REPORTADO','EN REVISION']);
const TIMED_KINDS=['activity','test','training','om','document'];
const isClosed=s=>CLOSED.has(s);
const isRevoked=s=>s==='REVOCADO'||s==='ARCHIVADO';
function addDays(iso,n){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function daysBetween(a,b){return Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/86400000)}
const actualDone=p=>Boolean(p.actual_finish||p.performed_on||p.held_on||p.delivered_on||p.submitted_on);
function span(r){const p=r.payload||{};const start=p.planned_start||p.planned_finish||'';const end=p.planned_finish||p.planned_start||'';return {start,end}}
function dueOf(r){const p=r.payload||{};if(r.kind==='document')return p.planned_submit||p.planned_start||'';return span(r).end}

function noticeStatus(r,today){
 const p=r.payload||{};if(!p.aconex_notice_by)return null;
 if(p.aconex_notice_ref)return {status:'REGISTRADO',days:daysBetween(today,p.aconex_notice_by)};
 const days=daysBetween(today,p.aconex_notice_by);
 return {status:days<0?'VENCIDO':days<=7?'POR VENCER':'PROGRAMADO',days};
}

function followup(records,today,horizon=14){
 const end=addDays(today,horizon),live=records.filter(r=>!isRevoked(r.state));
 const notices=live.filter(r=>r.kind==='test'&&String(r.payload?.witness||'').startsWith('HP')&&r.payload?.aconex_notice_by&&!isClosed(r.state))
  .map(r=>({record:r,due:r.payload.aconex_notice_by,...noticeStatus(r,today)}))
  .sort((a,b)=>a.due.localeCompare(b.due)||String(a.record.payload.code).localeCompare(b.record.payload.code));
 const lookahead=live.filter(r=>TIMED_KINDS.includes(r.kind)&&!isClosed(r.state)).map(r=>({record:r,...span(r)}))
  .filter(x=>x.start&&x.start<=end&&x.end>=today).sort((a,b)=>a.start.localeCompare(b.start)||String(a.record.payload.code).localeCompare(b.record.payload.code));
 const overdue=live.filter(r=>TIMED_KINDS.includes(r.kind)&&!isClosed(r.state)&&!DONE_FOR_SCHEDULE.has(r.state)&&!actualDone(r.payload||{}))
  .map(r=>({record:r,due:dueOf(r)})).filter(x=>x.due&&x.due<today)
  .map(x=>({...x,days:daysBetween(x.due,today),reason:x.record.kind==='document'?'Presentación prevista sin registro de presentación':'Fecha de origen superada sin ejecución reportada'}))
  .sort((a,b)=>a.due.localeCompare(b.due));
 const restrictions=live.filter(r=>r.kind==='restriction'&&!isClosed(r.state))
  .map(r=>({record:r,type:r.payload?.type||'RESTRICCIÓN',due:r.payload?.due_date||'',overdue:Boolean(r.payload?.due_date&&r.payload.due_date<today)}))
  .sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(a.due||'9999').localeCompare(b.due||'9999')||String(a.record.payload.code).localeCompare(b.record.payload.code));
 const count=(arr,f)=>arr.filter(f).length;
 return {today,end,horizon,notices,lookahead,overdue,restrictions,
  counts:{noticesOverdue:count(notices,n=>n.status==='VENCIDO'),noticesSoon:count(notices,n=>n.status==='POR VENCER'),noticesRegistered:count(notices,n=>n.status==='REGISTRADO'),
   lookahead:lookahead.length,overdue:overdue.length,restrictions:restrictions.length,restrictionsOverdue:count(restrictions,x=>x.overdue)}};
}

function protocolStats(protocol){
 const fields=protocol?.payload?.fields||[];const sections=[];
 for(const f of fields){const s=f.section||'Verificaciones';if(!sections.includes(s))sections.push(s)}
 const pending=fields.filter(f=>/POR FIJAR/i.test(String(f.criterion||'')));
 return {fields:fields.length,pending:pending.length,pendingFields:pending,sections,publishable:fields.length>0&&pending.length===0};
}

function groupFields(fields){const map=new Map();for(const f of fields||[]){const s=f.section||'Verificaciones';if(!map.has(s))map.set(s,[]);map.get(s).push(f)}return [...map.entries()]}

const CHECK_RESULT={'SÍ':'CONFORME','NO':'NO CONFORME','N.A.':'NO VERIFICABLE'};
function checkResult(value){return CHECK_RESULT[value]||''}

function testsBySystemLevel(records){
 const map=new Map();
 for(const t of records.filter(r=>r.kind==='test'&&!isRevoked(r.state))){
  const p=t.payload||{};const lvl=LEVELS.includes(p.level)?p.level:null;if(!lvl)continue;
  for(const sys of String(p.system_code||'').split(',').map(s=>s.trim()).filter(Boolean)){const k=sys+'|'+lvl;if(!map.has(k))map.set(k,[]);map.get(k).push(t)}
 }
 return map;
}

function matrix(records,specialty=''){
 const order=['EL','SA','CI','ME','TI','EQ'],rank=c=>{const i=order.indexOf(String(c).split('-')[0]);return i<0?99:i};
 const systems=records.filter(r=>r.kind==='system'&&!isRevoked(r.state)&&(!specialty||r.specialty===specialty)).sort((a,b)=>rank(a.payload.code)-rank(b.payload.code)||String(a.payload.code).localeCompare(String(b.payload.code)));
 const tests=testsBySystemLevel(records);
 const protocols=records.filter(r=>r.kind==='protocol'&&!isRevoked(r.state));
 let planned=0,closed=0;
 const rows=systems.map(s=>{
  const cells=LEVELS.map(l=>{const ts=tests.get(s.payload.code+'|'+l)||[];if(ts.length)planned++;if(ts.length&&ts.every(t=>t.state==='CERRADO'))closed++;return {level:l,tests:ts}});
  const prots=protocols.filter(p=>String(p.payload.system_code||'').split(',').includes(s.payload.code));
  return {system:s,cells,protocols:prots};
 });
 return {rows,planned,closed};
}

function milestones(records){return records.filter(r=>r.kind==='activity'&&r.payload?.milestone&&!isRevoked(r.state)).sort((a,b)=>String(a.payload.planned_start||'').localeCompare(String(b.payload.planned_start||''))||String(a.payload.code).localeCompare(String(b.payload.code)))}

function followupRows(f){
 const rows=[['Corte',f.today,'Horizonte hasta',f.end],['Sección','Código','Título','Tipo','Fecha','Estado','Detalle']];
 for(const n of f.notices)rows.push(['Aviso ACONEX',n.record.payload.code,n.record.payload.title,'Prueba presenciada',n.due,n.status,n.record.payload.aconex_notice_ref||('Prueba '+(n.record.payload.planned_start||'sin fecha'))]);
 for(const x of f.lookahead)rows.push(['Próximas',x.record.payload.code,x.record.payload.title,x.record.kind,x.start+(x.end&&x.end!==x.start?' → '+x.end:''),x.record.state,'']);
 for(const x of f.overdue)rows.push(['Vencidas',x.record.payload.code,x.record.payload.title,x.record.kind,x.due,x.record.state,x.reason+' ('+x.days+' d)']);
 for(const x of f.restrictions)rows.push(['Restricciones',x.record.payload.code,x.record.payload.title,x.type,x.due,x.record.state,x.overdue?'Vencida':'']);
 return rows;
}

module.exports={LEVELS,isClosed,addDays,daysBetween,noticeStatus,followup,protocolStats,groupFields,checkResult,matrix,milestones,followupRows};
