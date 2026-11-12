// CX360 – pantallas por especialidad (IIEE, IISS, IIMM, TIC, EM) con una pestaña por sistema.
import sc from './specialty-core.cjs';
import systemProgress from './system-progress.cjs';
import pc from './plan-core.cjs';
import processCore from './system-process.cjs';
import sp from './scope-core.cjs';
import {icons} from './ui-icons.js';
const {SPECS, STATUS_LABEL, systemsOf, related, levelTrack, specStats} = sc;
const LEVEL_NAMES = {L1: 'Recepción y FAT', L2: 'Precomisionamiento', L3: 'Arranque', L4: 'Prueba funcional', L5: 'Prueba integrada'};
const fmt = iso => { if (!iso) return '—'; const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
const askAction = (q, spec) => 'ask-q:' + encodeURIComponent(spec + '|' + q);
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;


function advanceOf(c,system) {
  return systemProgress.bySystem(c.records(),system,c.S?.snapshot?.settings?.current_schedule||null,c.S?.snapshot?.cut||'');
}
function advanceHtml(c,p) {
  const h=c.h;
  if(!p.calculable)return '<div class="cxprogress na" title="'+h(p.reason)+'"><strong>NO CALCULABLE</strong><small>'+h(p.reason)+'</small></div>';
  const pct=Number(p.percent).toFixed(1);
  return '<div class="cxprogress"><strong>'+h(p.label)+'</strong><div class="cxprogress-track" role="progressbar" aria-label="Cobertura verificada del sistema" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><i style="width:'+pct+'%"></i></div><small>'+p.numerator+' de '+p.denominator+' actividades verificadas · '+p.accepted+' con aceptación</small></div>';
}
function advanceMini(c,system) {
  return '<span class="cxprogress-mini">'+advanceHtml(c,advanceOf(c,system))+'</span>';
}
function advanceDetail(c,system) {
  const h=c.h,p=advanceOf(c,system);
  const stages=p.calculable?'<div class="cxprogress-phases">'+p.phases.map(ph=>
    '<div class="cxprogress-phase"><span>'+h(ph.label)+'</span><b>'+(ph.percent===null?'—':ph.percent.toFixed(1)+'%')+'</b><small>'+(ph.denominator?ph.numerator+' / '+ph.denominator:'Sin actividad')+'</small></div>'
  ).join('')+'</div>':'';
  return '<section class="cxprogress-full"><h4>Avance porcentual comprobado del sistema</h4>'+advanceHtml(c,p)+
    (p.calculable?'<p class="small muted">Base: '+h(p.schedule_code)+' / revisión '+h(p.revision)+' · corte '+h(p.cut||'sin corte')+'. Solo cobertura de actividades cerrada por revisión independiente; NO es avance físico ponderado ni aceptación de todo el sistema.</p>':
    '<p class="small muted">La contratista debe presentar el universo y cronograma compatibilizados. ANIN controla la revisión y vigencia. No se presume 0% ni se suman pruebas preliminares.</p>')+
    stages+'</section>';
}
function progressBoard(c) {
  const {h}=c,all=c.records(),systems=all.filter(r=>r.kind==='system'&&!['REVOCADO','ARCHIVADO'].includes(r.state));
  const groups=Object.keys(SPECS).map(spec=>{
    const rows=systemsOf(all,spec);
    if(!rows.length)return '';
    const ready=rows.filter(s=>advanceOf(c,s).calculable).length;
    return '<details class="cxprogress-group" open><summary>'+h(SPECS[spec].name)+' <span>'+ready+' de '+rows.length+' sistemas con avance calculable</span></summary>'+
      rows.map(s=>{
        const p=advanceOf(c,s);
        return '<div class="cxprogress-row"><span class="scode">'+h(s.payload.code)+'</span><div class="cxprogress-title">'+h(s.payload.title)+
          '<small>'+h(p.calculable?'Revisión '+p.revision+' · cobertura verificable':'Universo pendiente de aceptación o no visible')+'</small></div>'+advanceHtml(c,p)+'</div>';
      }).join('')+'</details>';
  }).join('');
  return '<section class="panel cxprogress-board" aria-label="Avance por sistema"><h3>Avance de comisionamiento por sistema</h3>'+
    '<p class="cxprogress-notice">Cobertura verificada: actividades con revisión independiente / actividades del sistema en el cronograma formalmente vigente. No promediar porcentajes entre sistemas: las actividades compartidas pueden tener interfaces. Sin universo aceptado se indica NO CALCULABLE, nunca 0% ficticio.</p>'+
    (groups||'<p class="muted">Sin sistemas cargados para esta cuenta; avance no disponible.</p>')+'</section>';
}

export function specBadge(spec, withName = '') {
  return `<span class="sbadge tone-${SPECS[spec].tone}">${icons[spec]}<b>${spec}</b></span>${withName ? `<span class="slabel">${withName}</span>` : ''}`;
}

// Tarjetas de acceso para la pantalla Hoy.
export function specialtyTiles(c) {
  const {records, h, today} = c, all = records();
  const tiles = `<div class="esp-tiles">${Object.keys(SPECS).map(k => {
    const st = specStats(all, k, today);
    const line = st.systems ? `${n(st.systems, 'sistema', 'sistemas')}, ${st.closed} de ${n(st.tests, 'prueba cerrada', 'pruebas cerradas')}` : 'Sin sistemas cargados';
    return `<button type="button" class="esp-tile tone-${SPECS[k].tone}" data-nav="esp:${k}"><span class="sbadge tone-${SPECS[k].tone}">${icons[k]}<b>${k}</b></span><strong>${h(SPECS[k].name)}</strong><small>${h(line)}</small>${st.overdueNotices ? `<em class="flag">${st.overdueNotices} avisos ACONEX vencidos</em>` : ''}</button>`;
  }).join('')}</div>`;
  return tiles + progressBoard(c);
}

function trackHtml(c, tests, compact = false) {
  const {h} = c;
  const track = levelTrack(tests);
  if (compact) return `<span class="mtrack" aria-label="Avance por nivel">${track.map(t => `<i class="lv ${t.status}" title="${h(t.level + ' ' + LEVEL_NAMES[t.level] + ': ' + STATUS_LABEL[t.status])}">${t.level.slice(1)}</i>`).join('')}</span>`;
  return `<ol class="track">${track.map(t => `<li class="lv ${t.status}"><span class="lvn">${t.level}</span><span class="lvt"><strong>${LEVEL_NAMES[t.level]}</strong><small>${STATUS_LABEL[t.status]}</small>${t.tests.map(x => `<button type="button" class="tchip" data-action="edit:${h(x.id)}" title="${h(x.payload.title)}">${h(x.payload.code)} <span>${h(x.state)}</span></button>`).join('')}</span></li>`).join('')}</ol>`;
}

function emptyCatalog(c, spec) {
  const {S, button} = c;
  const b = (S.catalog?.batches || []).find(x => x.batch === 'PLANCX-V3');
  const canLoad = S.member?.role === 'admin' && b && b.loaded < b.available;
  return `<div class="empty"><p>Aún no hay sistemas de ${SPECS[spec].name.toLowerCase()} en los registros visibles.</p>${canLoad ? button('Cargar catálogo en CX360', 'catalog-load:PLANCX-V3') : '<p class="small">El administrador carga el catálogo del Plan Cx desde Administración.</p>'}</div>`;
}

function overview(c, spec, systems) {
  const {records, h, button, chip, today} = c, all = records();
  const codes = systems.map(s => s.payload.code);
  const rows = systems.map(s => {
    const rel = related(all, s.payload.code), p = s.payload;
    return `<button type="button" class="sysrow" data-action="systab:${spec}:${h(p.code)}"><span class="scode">${h(p.code)}</span><span class="stitle"><strong>${h(p.title)}</strong><small>${h(p.leader_support || 'Responsable por confirmar')}${p.sectors ? ', sectores ' + h(p.sectors) : ''}</small>${advanceMini(c,s)}</span>${trackHtml(c, rel.tests, true)}<span class="scount">${n(rel.protocols.length, 'protocolo', 'protocolos')}<br>${n(rel.tests.length, 'prueba', 'pruebas')}</span>${icons.arrow}</button>`;
  }).join('');
  const f = pc.followup(all, today);
  const mine = r => r.specialty === spec || codes.some(code => sc.refIncludes(r.payload?.system_code, code));
  const upcoming = all.filter(r => r.kind === 'test' && mine(r) && !pc.isClosed(r.state) && r.payload.planned_start).sort((a, b) => a.payload.planned_start.localeCompare(b.payload.planned_start)).slice(0, 6);
  const restr = f.restrictions.filter(x => x.record.specialty === spec || codes.some(code => related([x.record], code).restrictions.length)).slice(0, 6);
  const name = SPECS[spec].name.toLowerCase();
  return `<section class="block"><h3>Sistemas</h3><p class="small muted">Cada sistema tiene su propia pestaña. La barra muestra el estado de las pruebas por nivel, de L1 (recepción) a L5 (prueba integrada).</p><div class="sysindex">${rows}</div><p class="legend"><i class="lv done"></i> cerrada <i class="lv active"></i> en curso <i class="lv planned"></i> programada <i class="lv issue"></i> observada <i class="lv none"></i> sin prueba</p></section>
  <div class="cols">
   <section class="block"><h3>Próximas pruebas</h3>${upcoming.map(t => `<div class="lineitem"><button type="button" class="linkbtn" data-action="edit:${h(t.id)}"><strong>${h(t.payload.code)}</strong></button> ${h(t.payload.title)} <small class="muted">${fmt(t.payload.planned_start)}${String(t.payload.witness || '').startsWith('HP') ? ', presenciada' : ''}</small> ${chip(t.state)}</div>`).join('') || '<p class="muted">Sin pruebas programadas en los registros visibles.</p>'}</section>
   <section class="block"><h3>Restricciones abiertas</h3>${restr.map(x => `<div class="lineitem"><button type="button" class="linkbtn" data-action="edit:${h(x.record.id)}"><strong>${h(x.record.payload.code)}</strong></button> ${h(x.record.payload.title)} ${x.overdue ? '<span class="chip red">vencida</span>' : ''}</div>`).join('') || '<p class="muted">Sin restricciones abiertas vinculadas.</p>'}</section>
  </div>
  <section class="block"><h3>Consultar al asistente</h3><div class="suggest">${[`¿Qué actividades se desarrollan en el precomisionamiento de ${name}?`, `¿Qué equipos, herramientas y EPP se usan en ${name}?`, `¿Qué formatos y protocolos se usan en ${name}?`].map(q => `<button type="button" class="chipbtn" data-action="${h(askAction(q, spec))}">${h(q)}</button>`).join('')}</div></section>`;
}

function systemPanel(c, spec, sys) {
  const {records, h, button, tableRow} = c, all = records(), p = sys.payload, rel = related(all.filter(r=>!r.specialty||r.specialty===spec), p.code);
  const linked=all.filter(r=>processCore.inSystem(r,sys,sc.refIncludes));
  const stage=c.S.systemStage?.[sys.id]||'PRECOMISIONAMIENTO';
  const def=processCore.STAGES.find(x=>x[0]===stage);
  const selected=linked.filter(r=>processCore.stageOf(r,all)===stage);
  const unclassified=linked.filter(r=>processCore.stageOf(r,all)==='SIN CLASIFICAR');
  const assets=p.assets||[];
  const meta = [['Líder y apoyo', p.leader_support], ['Sectores', p.sectors], ['Fuente en el Plan Cx', p.plan_source], ['Programa', p.program_ref], ['Equipo o TAG', p.equipment_tag]].filter(x => x[1]);
  const group = (title, list, empty) => `<section class="block"><h3>${title} <span class="count">${list.length}</span></h3>${list.length ? list.map(tableRow).join('') : `<p class="muted">${empty}</p>`}</section>`;
  const qs = [`¿Qué actividades de precomisionamiento corresponden a ${p.code} ${p.title}?`, `¿Qué pruebas y criterios de aceptación tiene ${p.code} ${p.title}?`, `¿Qué equipos de medición y herramientas se usan en ${p.code} ${p.title}?`];
  return `<section class="sysfile"><div class="sysfile-head"><span class="scode big">${h(p.code)}</span><div><h3>${h(p.title)}</h3>${p.notes ? `<p>${h(p.notes)}</p>` : ''}</div>${button('Ver ficha completa', 'edit:' + sys.id, 'btn ghost')}</div>
   <dl class="facts">${meta.map(([k, v]) => `<div><dt>${h(k)}</dt><dd>${h(v)}</dd></div>`).join('')}</dl>
   ${advanceDetail(c,sys)}
   ${p.provisional ? '<p class="small muted">Datos del catálogo provisional del Plan Cx C01 V3 (borrador no emitido). No acreditan ejecución ni aceptación.</p>' : ''}</section>
  <section class="block"><h3>Qué se va a intervenir</h3><p><b>Condición del alcance:</b> ${h(p.scope_status||'PENDIENTE DE CONTRASTE CONTRACTUAL')}</p><p>${h(p.boundary||'Pendiente definir límites, subsistemas e interfaces con planos y alcance vigentes.')}</p><p class="preserve">${h(p.requirements||'Pendiente registrar por etapa: intervención, requisito, documento/revisión/página, criterio y aceptación. El catálogo por sí solo no acredita el alcance.')}</p>${button('Definir alcance e inventario','edit:'+sys.id,'btn ghost')}
  <h4>Inventario identificado: ${assets.length} elementos registrados</h4><p class="small">Este conteo no acredita que el inventario esté completo. Diferenciar cada pozo/electrodo del sistema de puesta a tierra interconectado. Las conexiones deben identificar TAG y circuitos reales.</p>${assets.length?`<div class="tablewrap"><table><thead><tr>${['TAG','Tipo','Subsistema','Ubicación','Plano / revisión','Circuitos','Conexiones TAG','Fuente'].map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${assets.map(a=>`<tr>${['tag','type','subsystem','location','drawing_ref','circuits','connections','source_ref'].map(k=>`<td>${h(a[k]||'PENDIENTE')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p class="muted">Sin elementos identificados. No se infieren cantidades ni ubicaciones.</p>'}</section>
  <section class="block"><h3>Procesos de ${h(p.code)}</h3><div class="btnrow" role="tablist" aria-label="Etapas del sistema">${processCore.STAGES.map(([key,label])=>`<button type="button" role="tab" aria-selected="${key===stage}" class="btn ${key===stage?'':'ghost'}" data-action="sysstage:${h(sys.id)}:${encodeURIComponent(key)}">${label}</button>`).join('')}</div>
  <div role="tabpanel"><h4>${h(def[1])}</h4><p class="small">${stage==='PRECOMISIONAMIENTO'?'Revisión documental y verificación física de instalaciones, equipos, materiales y accesorios contra planos y especificaciones vigentes, antes de las pruebas de funcionamiento.':'Registrar los entregables y resultados conforme al procedimiento y al alcance aceptados.'} Cada protocolo debe identificar el objeto intervenido y su fuente. Crear un borrador no habilita la ejecución.</p>${button(def[2]==='protocol'?'Preparar protocolo de esta etapa':'Registrar entregable de esta etapa','sysnew:'+sys.id+':'+encodeURIComponent(stage),'btn ghost')}${selected.length?selected.map(tableRow).join(''):'<p class="muted">Sin registros vinculados a esta etapa.</p>'}</div></section>
  ${unclassified.length?group('Registros sin etapa clasificada',unclassified,''):''}
  ${rel.restrictions.length ? group('Restricciones, decisiones e inconsistencias', rel.restrictions, '') : ''}
  <section class="block"><h3>Consultar al asistente sobre ${h(p.code)}</h3><div class="suggest">${qs.map(q => `<button type="button" class="chipbtn" data-action="${h(askAction(q, spec))}">${h(q)}</button>`).join('')}</div></section>`;
}

// ---------- Pestañas por fase: Precomisionamiento, Pruebas, Puesta en marcha, Manual O&M, Capacitaciones ----------
const OG_TITLE = sp.ORIGINS;
const og = (c, o) => o ? `<span class="og og-${c.h(o)}" title="${c.h(OG_TITLE[o] || o)}">${c.h(o)}</span>` : '';
function reqList(c, items) {
  const {h} = c;
  return `<ul class="req">${items.map(i => `<li>${og(c, i.o)}<span>${h(i.t)}${i.unit ? ` <b class="unit">[${h(i.unit)}]</b>` : ''}${i.s ? `<small class="rsrc">${h(i.s)}</small>` : ''}</span></li>`).join('')}</ul>`;
}
function groupsHtml(c, groups) { return groups.map(g => `<h4>${c.h(g.name)} <span class="count">${g.items.length}</span></h4>${reqList(c, g.items)}`).join(''); }
function componentsHtml(c, comps) {
  const {h} = c;
  if (!comps.length) return '';
  return `<h4>Qué se interviene <span class="count">${comps.length}</span></h4><div class="comps">${comps.map(x => `<div class="comp"><b>${h(x.g)}</b><span class="ctags">${x.tags?.length ? x.tags.map(t => `<i>${h(t)}</i>`).join('') : h(x.n && x.n !== '—' ? x.n : '')}</span>${x.k && x.k !== '—' ? `<small>Se conecta a: ${h(x.k)}</small>` : ''}${x.u && x.u !== '—' ? `<small>Ubicación: ${h(x.u)}</small>` : ''}${x.s ? `<small class="rsrc">${h(x.s)}${x.e && x.e !== '—' ? ' · ' + h(x.e) : ''}</small>` : ''}</div>`).join('')}</div>`;
}
function criteriaHtml(c, crit) {
  const {h} = c;
  if (!crit.length) return '';
  return `<h4>Criterio por subsistema</h4><div class="tablewrap"><table class="crit"><thead><tr><th>Subsistema</th><th>Elementos</th><th>Criterio de aceptación</th></tr></thead><tbody>${crit.map(x => `<tr><td>${h(x.g)}</td><td>${h(x.tags?.length ? x.tags.join(', ') : x.n || '')}</td><td class="${/POR FIJAR|POR CONFIRMAR/i.test(x.crit) ? 'tbd' : ''}">${h(x.crit)}</td></tr>`).join('')}</tbody></table></div>`;
}
function recLine(c, r, print) {
  const {h, chip} = c, p = r.payload;
  const when = p.planned_start || p.performed_on;
  const label = `<strong>${h(p.code)}</strong>`;
  return `<div class="lineitem">${print ? label : `<button type="button" class="linkbtn" data-action="edit:${h(r.id)}">${label}</button>`} ${h(p.title || '')} <small class="muted">${when ? fmt(when) : 'sin fecha'}${String(p.witness || '').startsWith('HP') ? ', presenciada (HP)' : ''}</small> ${chip(r.state)}</div>`;
}
function phaseSystem(c, spec, s, phase, print) {
  const {h, button} = c;
  const protos = s.protocols.length ? `<p class="protos"><b>Protocolos:</b> ${s.protocols.map(p => p.record && !print ? `<button type="button" class="pchip" data-action="edit:${h(p.record.id)}">${h(p.code)} <span>${h(p.record.state)}</span></button>` : `<span class="pchip${p.record ? '' : ' off'}">${h(p.code)} <span>${p.record ? h(p.record.state) : 'por cargar'}</span></span>`).join('')}</p>` : '';
  const recs = s.records.length ? `<h4>Programado y registrado <span class="count">${s.records.length}</span></h4>${s.records.map(r => recLine(c, r, print)).join('')}` : '';
  const empty = !s.hasScope ? '<p class="muted">Sin ficha de alcance cargada para este sistema.</p>' : (!s.groups.length && !s.components.length ? '<p class="muted">Sin requisitos específicos en esta fase; aplican los comunes.</p>' : '');
  const q = `¿Qué corresponde en ${phase.label.toLowerCase()} de ${s.code} ${s.title}?`;
  return `<section class="block phase-sys"><div class="phase-sys-head"><span class="scode">${h(s.code)}</span><div><h3>${h(s.title)}</h3>${s.leader ? `<small class="muted">Líder: ${h(s.leader)}</small>` : ''}</div></div>
   ${componentsHtml(c, s.components)}${groupsHtml(c, s.groups)}${criteriaHtml(c, s.criteria)}${empty}
   ${s.interfaces.length ? `<p class="pend"><b>Interfaces:</b> ${h(s.interfaces.join('; '))}</p>` : ''}
   ${s.pending.length ? `<p class="pend"><b>Por confirmar:</b> ${h(s.pending.join('; '))}</p>` : ''}
   ${protos}${recs}
   ${print ? '' : `<div class="btnrow phase-actions">${button('Abrir el sistema', 'esp-open:' + spec + ':' + s.code, 'btn ghost small')}<button type="button" class="chipbtn" data-action="${h(askAction(q, spec))}">Preguntar al asistente</button></div>`}</section>`;
}
export function phaseBody(c, spec, key, print = false) {
  const {h, S} = c, all = c.records();
  const only = (S.espSys || {})[spec] || '';
  const v = sp.phaseView(S.scope, all, spec, key, only);
  const legend = `<p class="legend oglegend">${Object.entries({A: 'Alcance ANIN', C: 'Propuesta del Contratista (no aceptada)', D: 'Diseño C01 en aprobación'}).map(([k, t]) => `<span class="ogi">${og(c, k)}${h(t)}</span>`).join('')}</p>`;
  const head = `<div class="phase-what"><span class="pnum">${v.phase.n}</span><div><h3>${h(v.phase.label)}${print ? ' – ' + h(sc.SPECS[spec].name) : ''}</h3><p>${h(v.phase.what)}</p>${legend}</div></div>`;
  const noScope = !S.scope ? `<p class="notice">La matriz de alcance por sistema no está disponible en esta sesión. Se muestran solo los registros vinculados.</p>` : '';
  const common = v.common.length ? `<details class="block common"${print ? ' open' : ''}><summary>Aplica a todos los sistemas <span class="count">${v.common.reduce((a, g) => a + g.items.length, 0)}</span></summary>${groupsHtml(c, v.common)}</details>` : '';
  return head + noScope + v.systems.map(s => phaseSystem(c, spec, s, v.phase, print)).join('') + common
    + (S.scope?.updated_at ? `<p class="small muted">Matriz de alcance actualizada el ${h(new Date(S.scope.updated_at).toLocaleDateString('es-PE', {timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric'}))}. Los ítems C y D son propuestas o diseños aún no aceptados; no acreditan conformidad.</p>` : '');
}
function phaseScreen(c, spec, key, systems) {
  const {h, button, S} = c;
  const only = (S.espSys || {})[spec] || '';
  const filter = `<div class="sysfilter" role="group" aria-label="Filtrar por sistema">${[['', 'Todos'], ...systems.map(s => [s.payload.code, s.payload.code])].map(([k, label]) => `<button type="button" class="fchip${k === only ? ' on' : ''}" aria-pressed="${k === only}" data-action="espsys:${spec}:${h(k)}" ${k ? `title="${h(systems.find(s => s.payload.code === k)?.payload.title || '')}"` : ''}>${h(label)}</button>`).join('')}<span class="grow"></span>${button('Imprimir', 'print-phase:' + spec + ':' + key, 'btn ghost small')}</div>`;
  return filter + phaseBody(c, spec, key);
}
export function phasePrintHtml(c, spec, key) {
  return `<h1>IREN Sur CX360 – ${c.h(sc.SPECS[spec].name)}</h1>` + phaseBody(c, spec, key, true);
}

export function specialtyScreen(c) {
  const {records, h, button, today, S} = c, spec = S.esp, meta = SPECS[spec], all = records();
  const systems = systemsOf(all, spec), st = specStats(all, spec, today);
  const tab = (S.espTab || {})[spec] || 'resumen', current = systems.find(s => s.payload.code === tab);
  const stat = (label, value, hint, alert = false) => `<div class="stat${alert ? ' alert' : ''}"><dt>${label}</dt><dd>${value}</dd><small>${hint}</small></div>`;
  const tabs = [['resumen', 'Resumen', ''], ...systems.map(s => [s.payload.code, s.payload.code, s.payload.title])];
  const phase = (S.espPhase || {})[spec] || 'resumen';
  const phasebar = `<nav class="phasebar tone-${meta.tone}" role="tablist" aria-label="Fases del comisionamiento">${[['resumen', 'Resumen', ''], ...sp.PHASES.map(p => [p.key, p.label, p.n])].map(([k, label, num]) => `<button type="button" role="tab" aria-selected="${k === phase}" class="ptab${k === phase ? ' on' : ''}" data-action="espphase:${spec}:${k}">${num ? `<i>${num}</i>` : ''}<b>${h(label)}</b></button>`).join('')}</nav>`;
  return `<section class="esp-head tone-${meta.tone}"><div class="esp-id">${specBadge(spec)}<div><h2>${h(meta.name)}</h2><p>${meta.annex} del Plan de Comisionamiento, ${n(systems.length, "sistema", "sistemas")}</p></div></div>
   <div class="esp-actions">${button('Preguntar al asistente', 'ask-esp:' + spec)}${button('Protocolos', 'list-esp:protocol:' + spec, 'btn ghost')}${button('Pruebas', 'list-esp:test:' + spec, 'btn ghost')}</div>
   <dl class="stats">${stat('Protocolos publicados', `${st.published} de ${st.protocols}`, st.pendingCriteria ? `${st.pendingCriteria} con criterios por fijar` : 'Criterios con valor')}${stat('Pruebas cerradas', `${st.closed} de ${st.tests}`, `${st.hp} presenciadas (HP)`)}${stat('Avisos ACONEX vencidos', st.overdueNotices, 'Pruebas presenciadas sin aviso registrado', st.overdueNotices > 0)}${stat('Próxima prueba', st.nextTest ? h(st.nextTest.payload.code) : '—', st.nextTest ? fmt(st.nextTest.payload.planned_start) : 'Sin pruebas futuras')}</dl></section>
  ${systems.length ? phasebar : ''}
  ${systems.length && phase !== 'resumen' ? `<div class="esp-body tone-${meta.tone} phase-body" role="tabpanel">${phaseScreen(c, spec, phase, systems)}</div>` : systems.length ? `<div class="systabs tone-${meta.tone}" role="tablist" aria-label="Sistemas de ${h(meta.name)}">${tabs.map(([k, label, title]) => `<button type="button" role="tab" aria-selected="${k === (current ? tab : 'resumen')}" class="systab${k === (current ? tab : 'resumen') ? ' on' : ''}" data-action="systab:${spec}:${h(k)}" ${title ? `title="${h(title)}"` : ''}><b>${h(label)}</b>${title ? `<span>${h(title)}</span>` : ''}</button>`).join('')}</div>
  <div class="esp-body tone-${meta.tone}" role="tabpanel">${current ? systemPanel(c, spec, current) : overview(c, spec, systems)}</div>` : emptyCatalog(c, spec)}`;
}

