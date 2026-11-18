export const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export const opened=a=>norm(a.status)==='abierto';
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const addDays=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
export const fmt=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')?d.split('-').reverse().join('/'):'Sin fecha';
export const key=a=>`${a.issuer}|${a.code}|${a.number}`;
export const electrical=a=>/electri|iiee|alimentador|bunker|alumbrado|comisionamiento|seal|transformador|puesta a tierra|grupo electrogeno/.test(norm([a.title,a.specialty,...a.actions.map(x=>x.text)].join(' ')));
export const failed=a=>a.actions.filter(x=>norm(x.compliance)==='no');
export const pending=a=>a.actions.filter(x=>opened(x)&&!['si','no'].includes(norm(x.compliance)));
export const next=(a,reference=today())=>pending(a).filter(x=>x.due&&x.due>=reference).sort((a,b)=>a.due.localeCompare(b.due))[0];
export const latest=a=>a.actions.filter(x=>['si','no'].includes(norm(x.compliance))).sort((a,b)=>(b.due||'').localeCompare(a.due||'')||b.row-a.row)[0];
export function repetitions(a){
 const groups=new Map();for(const x of a.actions){const k=norm(x.text);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)}
 let max=0;for(const actions of groups.values()){let count=0;for(const x of [...actions].sort((a,b)=>(a.due||'').localeCompare(b.due||'')||a.row-b.row)){if(norm(x.compliance)==='no')count++;else if(norm(x.compliance)==='si')count=0;max=Math.max(max,count)}}return max;
}
export function activeFailures(a){return a.actions.filter(x=>norm(x.compliance)==='no'&&opened(x)&&!a.actions.some(y=>y.row>x.row&&norm(y.text)===norm(x.text)))}
export function issues(data){
 const result=[],indices=new Map();
 for(const a of data.alerts){if(indices.has(String(a.index)))result.push({code:a.code,row:a.sourceRow,message:`Índice AT ${a.index} duplicado con fila ${indices.get(String(a.index))}. No usar AT N° como clave.`});else indices.set(String(a.index),a.sourceRow);
 if(opened(a)&&!pending(a).length)result.push({code:a.code,row:a.sourceRow,message:'Alerta abierta sin acción pendiente verificable.'});
 if(!['A','F','A y F'].includes(a.option))result.push({code:a.code,row:a.sourceRow,message:'Opción ausente o no reconocida.'});
 if((norm(a.title).includes('permanente')&&norm(a.component)==='contingencia')||(norm(a.title).includes('temporal')&&norm(a.component)==='obra principal'))result.push({code:a.code,row:a.sourceRow,message:'Posible diferencia entre componente y descripción; validar sin corregir automáticamente.'});
 for(const x of a.actions){if(x.due&&!/^\d{4}-\d{2}-\d{2}$/.test(x.due))result.push({code:a.code,row:x.row,message:'Fecha no válida.'});if(x.compliance&&!['si','no'].includes(norm(x.compliance)))result.push({code:a.code,row:x.row,message:'Cumplimiento distinto de SI/NO.'});if(opened(x)&&norm(x.compliance)==='si')result.push({code:a.code,row:x.row,message:'Acción SI que sigue abierta.'});if(opened(x)&&a.actions.some(y=>y.row>x.row&&norm(y.text)===norm(x.text)))result.push({code:a.code,row:x.row,message:'Posible reprogramación: misma descripción posterior y fila anterior abierta.'})}
 }return result;
}
export function response(a,cutoff){const last=latest(a), n=next(a),past=pending(a).filter(x=>x.due&&x.due<today()).length;return [
 `NAT ${a.number} (${a.issuer}) · ${a.code}: ${a.status.toLowerCase()}. Corte ${fmt(cutoff)}.`,
 last?`Última acción evaluada (${fmt(last.due)}): ${norm(last.compliance)==='si'?'cumplió':'no cumplió'}; ${failed(a).length} NO históricos en la alerta.`:'Sin acción evaluada: el Registro no acredita cumplimiento.',
 `${n?`Próximo compromiso: ${fmt(n.due)} (${n.owner}).`:'Sin próximo compromiso futuro registrado.'}${past?` ${past} fecha(s) pasada(s) sin evaluación.`:''} Recomendación: ${repetitions(a)>=3?'revisar reiteración con el GP y acordar medida verificable':n?'pedir evidencia y confirmar el estado en el siguiente Registro':'confirmar acción, responsable y fecha con Gestión de riesgos'}.`
].join('\n')}
export function compare(current,previous){if(!previous)return null;const old=new Map(previous.alerts.map(a=>[key(a),a]));const now=new Map(current.alerts.map(a=>[key(a),a]));return {added:current.alerts.filter(a=>!old.has(key(a))),closed:current.alerts.filter(a=>old.has(key(a))&&opened(old.get(key(a)))&&!opened(a)),missing:previous.alerts.filter(a=>!now.has(key(a))),newOverdue:current.alerts.filter(a=>pending(a).some(x=>x.due&&x.due<current.cutoff)&&!pending(old.get(key(a))||{actions:[]}).some(x=>x.due&&x.due<previous.cutoff))}}
export function validate(data){if(!data||data.schemaVersion!==1||!Array.isArray(data.alerts)||!data.alerts.length||!/^\d{4}-\d{2}-\d{2}$/.test(data.cutoff))throw Error('Archivo incompatible: se requiere un Registro con fecha de corte y alertas.');if(data.cutoff!==new Date(data.cutoff+'T12:00:00Z').toISOString().slice(0,10))throw Error('Fecha de corte inválida.');if(data.alerts.length>10000)throw Error('Registro demasiado grande.');const ids=new Set();for(const a of data.alerts){if(typeof a.code!=='string'||typeof a.title!=='string'||typeof a.status!=='string'||!Array.isArray(a.actions)||!a.id||ids.has(a.id))throw Error('Alerta incompleta o ID duplicado.');ids.add(a.id);for(const x of a.actions){if(typeof x.text!=='string'||typeof x.owner!=='string')throw Error('Acción incompleta.')}}return data}
