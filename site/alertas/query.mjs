import {norm,opened,electrical,pending,failed,compare,today,addDays} from './domain.mjs';

const stop=new Set('hay tiene tienen tengo tenemos existe existen cuales cual cuantas cuantos que de del la las el los un una unos unas en al para por con sobre y o me mi mis tus tu su sus se es son esta estan estas estos como va van ver muestra mostrar muestrame dime dame listar lista listado consulta consultar buscar busca necesito quiero saber puedes podrias favor porfavor alerta alertas temprana tempranas nat asunto asuntos estado estados abierta abiertas abierto abiertos cerrada cerradas cerrado cerrados pendiente pendientes anin jys electrica electricas electrico electricos electricidad instalaciones instalacion iiee iee especialidad area actualmente actual proyecto iren sur hola buenas buen dia dias tardes total todos todas relacionadas relacionado relacionadas relacionado relacionado'.split(' '));
for(const word of ['siguen','sigue','continuan','continua','aun','todavia','riesgo','riesgos','existen','existe','registradas','registrados','cuentame','respecto','alguna','algunas','alguno','algunos','vinculada','vinculadas','vinculado','vinculados','numero','cantidad'])stop.add(word);
const text=a=>norm([a.title,a.specialty,...a.actions.map(x=>x.text+' '+x.owner)].join(' '));
const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d+'T12:00Z').toISOString().slice(0,10)===d;
const unique=items=>[...new Set(items)];

export function parseQuery(question,{reference=today(),context={}}={}){
 const q=norm(question).replace(/[¿?¡!,;:]/g,' ').replace(/\s+/g,' ').trim();
 const follow=/^(y\b|esas\b|esos\b|de esas\b|de esos\b)/.test(q);
 const filter={status:'open',issuer:'',electrical:false,component:'',...(follow?context.filter||{}:{})};
 if(/electric|electrc|electir|\biiee\b|\biee\b/.test(q))filter.electrical=true;
 if(/todas las especialidades|cualquier especialidad|sin filtro de especialidad/.test(q))filter.electrical=false;
 const anin=/\banin\b/.test(q),jys=/\bjys\b|\bcontratista\b/.test(q);
 if(anin||jys)filter.issuer=anin&&jys?'':anin?'ANIN':'JYS';
 const isOpen=/abiert|pendient|activa/.test(q),isClosed=/cerrad/.test(q);
 if(isClosed)filter.status=isOpen?'all':'closed';else if(isOpen)filter.status='open';
 else if(/inclu.*cerrad|todos los estados|todas las alertas|en total/.test(q))filter.status='all';
 const temp=/contingen|temporal/.test(q),permanent=/definitiv|permanente|obra principal/.test(q);
 if(temp||permanent)filter.component=temp&&permanent?'':temp?'contingencia':'definitivo';
 const code=q.match(/\b(?:anin|jys)-ec-(?:res)?ewn-\d+\b/)?.[0]||q.match(/\bewn-\d+\b/)?.[0];
 const number=code?null:q.match(/(?:\bnat\s*(?:n[°º.]?\s*)?|\bla\s+|\balerta(?:\s+temprana)?\s*(?:n[°º.]?\s*)?|\bcomo va\s+)(\d+)\b/)?.[1]||(/^\d+$/.test(q)?q:null);
 if(code||number)return {kind:'detail',q,filter,code,number};
 if(/cambio|cambiaron|nuevas|nueva alerta|compar/.test(q))return {kind:'changes',q,filter};
 if(/corresponde|emitir|clausula|contrato|anexo|instrumento/.test(q))return {kind:'contract',q,filter};
 const overdue=/vencid|atrasad|fecha[s]? pasada|fuera de plazo/.test(q);
 const failures=/incumpl|\bno\b.*registr|no cumpli|no cumplio/.test(q);
 if(failures)return {kind:'failures',q,filter};
 if(overdue||/vence|vencen|vencim|agenda|martes|semana|hoy|manana|proximos.*(?:dias|compromisos)|compromisos/.test(q)){
  let from=reference,until=addDays(reference,7);
  if(/manana/.test(q))from=until=addDays(reference,1);
  else if(/hoy/.test(q))until=reference;
  else if(/semana/.test(q)){const dow=new Date(reference+'T12:00Z').getUTCDay();from=addDays(reference,-((dow+6)%7));if(/proxima|siguiente|viene/.test(q))from=addDays(from,7);until=addDays(from,6)}
  else if(/martes/.test(q)){const day=new Date(reference+'T12:00Z').getUTCDay();until=addDays(reference,(2-day+7)%7||7)}
  const match=q.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?\b/);
  if(match){const date=`${match[3]||reference.slice(0,4)}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`;if(!validDate(date))return {kind:'invalid-date',q,filter};from=until=date}
  return {kind:'agenda',q,filter,overdue,from,until};
 }
 if(/quien|responsable/.test(q))return {kind:'owners',q,filter};
 const tokens=unique(q.split(/[^a-z0-9]+/).filter(w=>w.length>2&&!stop.has(w)));
 return {kind:'list',q,filter,tokens};
}

export function selectAlerts(alerts,filter){return alerts.filter(a=>
 (filter.status==='all'||(filter.status==='closed'?!opened(a):opened(a)))&&
 (!filter.issuer||a.issuer===filter.issuer)&&(!filter.electrical||electrical(a))&&
 (!filter.component||norm(a.component)==='ambos'||(filter.component==='contingencia'?norm(a.component)==='contingencia':norm(a.component)==='obra principal'||norm(a.component).includes('definitiv'))));}

export function queryRegister(question,data,{previous=null,reference=today(),context={}}={}){
 const p=parseQuery(question,{reference,context});let alerts=selectAlerts(data.alerts,p.filter);
 const result={...p,alerts,cutoff:data.cutoff,reference,source:data.source,sheet:data.sheet};
 if(p.kind==='detail'){
  result.alerts=data.alerts.filter(a=>(!p.filter.issuer||a.issuer===p.filter.issuer)&&(p.code?norm(a.code)===p.code||(!/^(anin|jys)-/.test(p.code)&&norm(a.code).endsWith('-'+p.code)):Number(a.number)===Number(p.number)));
  return result;
 }
 if(p.kind==='changes'){result.delta=compare(data,previous);return result}
 if(p.kind==='list'){
  if(p.tokens.length)result.alerts=alerts.filter(a=>p.tokens.every(t=>text(a).includes(t)));
  result.alerts.sort((a,b)=>b.sourceRow-a.sourceRow);return result;
 }
 if(p.kind==='agenda'||p.kind==='owners'){
  result.tasks=alerts.flatMap(alert=>pending(alert).map(action=>({...action,alert}))).filter(x=>validDate(x.due||''));
  if(p.kind==='agenda')result.tasks=result.tasks.filter(x=>p.overdue?x.due<reference:x.due>=p.from&&x.due<=p.until);
  result.tasks.sort((a,b)=>a.due.localeCompare(b.due)||a.row-b.row);return result;
 }
 if(p.kind==='failures')result.failures=alerts.flatMap(alert=>failed(alert).map(action=>({...action,alert})));
 return result;
}
