'use strict';
// CX360: cobertura de actividades por sistema. No equivale a avance fisico ponderado.
// Solo una revision de cronograma formalmente vigente y coberturas cerradas/acreditadas
// permiten calcular porcentajes. Los datos de prueba sueltos no otorgan avance.
const PHASES = Object.freeze([
  {key:'pre',label:'Precomisionamiento',stages:['PRECOMISIONAMIENTO']},
  {key:'pru',label:'Comisionamiento / pruebas funcionales',stages:['PRUEBAS FUNCIONALES']},
  {key:'pem',label:'Pruebas integradas y puesta en marcha',stages:['PRUEBAS INTEGRADAS','PUESTA EN MARCHA']},
  {key:'om',label:'Manual O&M y entrega',stages:['O&M','CIERRE']},
  {key:'cap',label:'Capacitaciones',stages:['CAPACITACION']},
]);
const norm = s => String(s||'').trim().toUpperCase();
function includesSystem(ref,code){
  const c=norm(code),m=c.match(/^([A-Z]{2})-(\d{2})$/);
  if(!c)return false;
  for(const part of norm(ref).split(/[,;/]/).map(x=>x.trim()).filter(Boolean)){
    if(part===c)return true;
    const x=part.match(/^([A-Z]{2})-(\d{2})\s*(?:\.\.|–|-|A)\s*(?:([A-Z]{2})-)?(\d{2})$/);
    if(x&&m&&x[1]===m[1]&&(!x[3]||x[3]===m[1])&&Number(m[2])>=Number(x[2])&&Number(m[2])<=Number(x[4]))return true;
  }
  return false;
}
const isLive = r => !['REVOCADO','ARCHIVADO'].includes(r?.state);
function unavailable(reason,cut,revision=null){
  return {calculable:false,label:'NO CALCULABLE',percent:null,numerator:null,denominator:null,accepted:0,
    cut,revision,reason,phases:[],status:'PENDIENTE DE UNIVERSO ACEPTADO'};
}
function acceptedSchedule(records,currentId){
  if(!currentId)return {reason:'Sin revision de cronograma formalmente vigente'};
  const schedule=records.find(r=>r.id===currentId&&r.kind==='schedule'&&r.state==='ACEPTADO_CON_EVIDENCIA');
  if(!schedule)return {reason:'La revision vigente no esta visible o su aceptacion no esta acreditada'};
  const acts=schedule.payload?.activities;
  if(!Array.isArray(acts)||!acts.length)return {reason:'La revision vigente no tiene universo de actividades disponible',revision:schedule.payload?.revision};
  return {schedule,revision:schedule.payload?.revision||'PENDIENTE'};
}
function bySystem(records,system,currentId,cut=''){
  const gate=acceptedSchedule(records,currentId);
  if(!gate.schedule)return unavailable(gate.reason,cut,gate.revision||null);
  const schedule=gate.schedule,code=norm(system?.payload?.code),spec=system?.specialty;
  if(!code||!spec)return unavailable('El sistema no tiene codigo o especialidad validos',cut,gate.revision);
  const universe=schedule.payload.activities.filter(a=>a.specialty===spec&&includesSystem(a.system_code,code));
  if(!universe.length)return unavailable('Sin actividades de este sistema en la revision vigente',cut,gate.revision);
  const ids=universe.map(a=>norm(a.code));
  if(ids.some(x=>!x)||new Set(ids).size!==ids.length)return unavailable('El universo del sistema contiene codigos vacios o duplicados',cut,gate.revision);
  const validCodes=new Set(ids), activityCodeById=new Map();
  for(const r of records){
    const p=r.payload||{};
    if(r.kind==='activity'&&isLive(r)&&p.schedule_id===schedule.id&&r.specialty===spec&&
       validCodes.has(norm(p.source_activity_code))&&includesSystem(p.system_code,code))
      activityCodeById.set(r.id,norm(p.source_activity_code));
  }
  const done=new Set(),accepted=new Set();
  for(const r of records){
    if(r.kind!=='coverage'||!isLive(r)||!['CERRADO','ACEPTADO'].includes(r.state))continue;
    const code=activityCodeById.get(r.payload?.activity_id);
    if(!code)continue;
    done.add(code);
    if(r.state==='ACEPTADO')accepted.add(code);
  }
  const stages=PHASES.map(ph=>{
    const matches=universe.filter(a=>ph.stages.includes(a.stage));
    const total=matches.length,closed=matches.filter(a=>done.has(norm(a.code))).length;
    return {key:ph.key,label:ph.label,numerator:closed,denominator:total,
      percent:total?Math.round(closed/total*1000)/10:null};
  });
  const numerator=universe.filter(a=>done.has(norm(a.code))).length;
  const denominator=universe.length;
  const percent=Math.round(numerator/denominator*1000)/10;
  return {calculable:true,label:percent.toFixed(1)+'%',percent,numerator,denominator,
    accepted:accepted.size,cut,revision:gate.revision,schedule_code:schedule.payload?.code||'',
    phases:stages,status:'COBERTURA VERIFICADA',
    reason:'Actividades con cobertura cerrada por revision independiente / actividades del sistema en el cronograma vigente. No es avance fisico ponderado ni aprobacion contractual.'};
}
module.exports={PHASES,includesSystem,acceptedSchedule,bySystem};
