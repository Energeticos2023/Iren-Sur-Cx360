'use strict';
const processes=[
 {key:'scope',label:'Alcance e inventario',kinds:['system'],stages:[]},
 {key:'pre',label:'Precomisionamiento',kinds:['activity','protocol','test'],stages:['PRECOMISIONAMIENTO']},
 {key:'cx',label:'Comisionamiento',kinds:['activity','protocol','test'],stages:['PRUEBAS FUNCIONALES']},
 {key:'integrated',label:'Pruebas integradas',kinds:['activity','protocol','test'],stages:['PRUEBAS INTEGRADAS']},
 {key:'startup',label:'Puesta en marcha',kinds:['activity','protocol','test'],stages:['PUESTA EN MARCHA']},
 {key:'om',label:'Manual de operación y mantenimiento',kinds:['om'],stages:['O&M']},
 {key:'training',label:'Capacitaciones',kinds:['training'],stages:['CAPACITACION']},
 {key:'close',label:'Cierre y entrega',kinds:['handover','coverage'],stages:['CIERRE']},
 {key:'protocols',label:'Protocolos del sistema',kinds:['protocol'],stages:[]}
];
const assetTypes=[['EQUIPO','Equipo'],['POZO_TIERRA','Pozo a tierra'],['MALLA_TIERRA','Malla / red de tierra'],['BARRA_EQUIPOTENCIAL','Barra equipotencial'],['CIRCUITO','Circuito'],['TRAMO','Tramo / red'],['ACCESORIO','Material / accesorio']];
const normalized=s=>String(s||'').normalize('NFKC').trim().toUpperCase();
function validateAssets(assets){
 if(!Array.isArray(assets))return ['El inventario debe ser una lista'];
 const errors=[],ids=new Set(),tags=new Set();
 for(const a of assets){if(!a.id||ids.has(a.id))errors.push('Identificador de activo vacío o duplicado');ids.add(a.id);const tag=normalized(a.tag);if(!tag||tags.has(tag))errors.push('TAG vacío o duplicado: '+(a.tag||'PENDIENTE'));tags.add(tag);if(!assetTypes.some(([type])=>type===a.type))errors.push('Tipo de activo inválido: '+a.tag);if(a.connections&&!Array.isArray(a.connections))errors.push('Conexiones deben ser una lista: '+a.tag);}
 return errors;
}
function assetGaps(a){const gaps=[];for(const [key,label]of [['tag','TAG'],['location','ubicación'],['source_ref','plano/fuente y revisión']])if(!String(a?.[key]||'').trim())gaps.push(label);if(a?.type==='POZO_TIERRA'){if(!String(a.network_code||'').trim())gaps.push('red/malla a la que pertenece');if(!Array.isArray(a.connections)||!a.connections.some(c=>['destination','circuit','busbar'].some(k=>String(c[k]||'').trim())))gaps.push('barra, circuito o equipo de destino');if(!String(a.inspection_access||'').trim())gaps.push('acceso y punto de inspección');}return gaps;}
function inventory(system){const p=system.payload||{},assets=p.assets||[];return {assets,registered:assets.length,registeredWells:assets.filter(a=>a.type==='POZO_TIERRA').length,designCount:p.design_count??null,fieldCount:p.field_count??null,complete:p.inventory_complete===true,unknown:!assets.length&&!p.inventory_complete};}
function belongs(record,system,all,seen=new Set()){
 if(!record||seen.has(record.id))return false;seen.add(record.id);const p=record.payload||{};
 if(record.id===system.id)return true;
 if(p.system_id)return p.system_id===system.id&&record.specialty===system.specialty;
 if(record.specialty!==system.specialty)return false;
 if(p.system_code&&normalized(p.system_code)===normalized(system.payload.code))return true;
 for(const key of ['protocol_id','activity_id','test_id'])if(p[key]&&belongs(all.find(r=>r.id===p[key]),system,all,seen))return true;
 return false;
}
function processRecords(all,system,key){const process=processes.find(p=>p.key===key);if(!process)return [];return all.filter(r=>r.id!==system.id&&process.kinds.includes(r.kind)&&belongs(r,system,all)).filter(r=>{if(!process.stages.length||['om','training','handover','coverage'].includes(r.kind))return true;const protocol=all.find(x=>x.id===r.payload.protocol_id),activity=all.find(x=>x.id===r.payload.activity_id);return process.stages.includes(r.payload.stage||protocol?.payload.stage||activity?.payload.stage)});}
function bindingGaps(test,system,protocol){const gaps=[];if(!system||test.payload.system_id!==system.id)return ['Sistema concreto no identificado'];const asset=(system.payload.assets||[]).find(a=>a.id===test.payload.asset_id);if(!asset)return ['Equipo/TAG concreto no identificado'];gaps.push(...assetGaps(asset));if(normalized(test.payload.equipment_tag)!==normalized(asset.tag))gaps.push('TAG no coincide con el inventario');if(protocol?.payload.system_id&&protocol.payload.system_id!==system.id)gaps.push('Protocolo de otro sistema');return gaps;}
function validateScopePack(pack){const errors=[];if(pack?.format!=='cx360-scope-pack-v1')return ['Formato de paquete no reconocido'];if(!Array.isArray(pack.systems)||!Array.isArray(pack.protocols)||!Array.isArray(pack.documents))return ['Se requieren documentos, sistemas y protocolos'];const ids=new Set();for(const r of [...pack.documents,...pack.systems,...pack.protocols]){if(!r.id||ids.has(r.id))errors.push('ID vacío o duplicado');ids.add(r.id);if(r.state!=='BORRADOR')errors.push('La carga de alcance solo admite borradores');if(!r.payload?.code||!r.payload?.title)errors.push('Código y título requeridos');if(r.kind==='protocol'&&r.payload.form_schema?.review_state!=='PENDIENTE_DE_REVISION')errors.push('Formato fuente debe ingresar pendiente de revisión');}return errors;}
module.exports={processes,assetTypes,validateAssets,assetGaps,inventory,belongs,processRecords,bindingGaps,validateScopePack};
