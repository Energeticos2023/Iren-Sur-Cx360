'use strict';
const STAGES = [
 ['PRECOMISIONAMIENTO','Precomisionamiento','protocol'],
 ['PRUEBAS FUNCIONALES','Comisionamiento','protocol'],
 ['PRUEBAS INTEGRADAS','Pruebas integradas','protocol'],
 ['PUESTA EN MARCHA','Puesta en marcha','protocol'],
 ['O&M','Manual de operación y mantenimiento','om'],
 ['CAPACITACION','Capacitaciones','training'],
 ['CIERRE','Entrega y cierre','handover']
];
function stageOf(r, records) {
 const p=r.payload||{};
 if(p.stage)return p.stage;
 if(r.kind==='om')return 'O&M';
 if(r.kind==='training')return 'CAPACITACION';
 if(r.kind==='handover')return 'CIERRE';
 if(r.kind==='test'&&p.protocol_id){const pr=records.find(x=>x.id===p.protocol_id);if(pr?.payload.stage)return pr.payload.stage;}
 return ({L2:'PRECOMISIONAMIENTO',L3:'PUESTA EN MARCHA',L4:'PRUEBAS FUNCIONALES',L5:'PRUEBAS INTEGRADAS'})[p.level]||'SIN CLASIFICAR';
}
function inSystem(r, sys, includes) {
 if(['REVOCADO','ARCHIVADO'].includes(r.state))return false;
 if(r.specialty && r.specialty!==sys.specialty)return false;
 return r.payload?.system_id ? r.payload.system_id===sys.id : includes(r.payload?.system_code,sys.payload.code);
}
const ASSET_KEYS=['tag','type','subsystem','location','drawing_ref','circuits','connections','source_ref'];
function parseAssets(text){
 const rows=String(text||'').split('\n').filter(x=>x.trim()).map((line,i)=>{
  const v=line.split('|').map(x=>x.trim());
  if(v.length!==8||!v[0]||!v[1]||!v[3])throw Error('Inventario, fila '+(i+1)+': completar 8 columnas, TAG, tipo y ubicación.');
  return Object.fromEntries(ASSET_KEYS.map((k,i)=>[k,v[i]]));
 });
 if(new Set(rows.map(x=>x.tag.toUpperCase())).size!==rows.length)throw Error('Hay TAG duplicados en el inventario.');
 return rows;
}
function assetsText(rows){return (rows||[]).map(r=>ASSET_KEYS.map(k=>r[k]||'').join(' | ')).join('\n');}
module.exports={STAGES,stageOf,inSystem,parseAssets,assetsText};
