// CX360 – pantallas por especialidad (IIEE, IISS, IIMM, TIC, EM) con una pestaña por sistema.
import sc from './specialty-core.cjs';
import pc from './plan-core.cjs';
import processCore from './system-process.cjs';
import {icons} from './ui-icons.js';
const {SPECS, STATUS_LABEL, systemsOf, related, levelTrack, specStats} = sc;
const LEVEL_NAMES = {L1: 'Recepción y FAT', L2: 'Precomisionamiento', L3: 'Arranque', L4: 'Prueba funcional', L5: 'Prueba integrada'};
const fmt = iso => { if (!iso) return '—'; const [y, m, d] = String(iso).split('-'); return `${d}/${m}/${y}`; };
const askAction = (q, spec) => 'ask-q:' + encodeURIComponent(spec + '|' + q);
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;

export function specBadge(spec, withName = '') {
  return `<span class="sbadge tone-${SPECS[spec].tone}">${icons[spec]}<b>${spec}</b></span>${withName ? `<span class="slabel">${withName}</span>` : ''}`;
}

// Tarjetas de acceso para la pantalla Hoy.
export function specialtyTiles(c) {
  const {records, h, today} = c, all = records();
  return `<div class="esp-tiles">${Object.keys(SPECS).map(k => {
    const st = specStats(all, k, today);
    const line = st.systems ? `${n(st.systems, 'sistema', 'sistemas')}, ${st.closed} de ${n(st.tests, 'prueba cerrada', 'pruebas cerradas')}` : 'Sin sistemas cargados';
    return `<button type="button" class="esp-tile tone-${SPECS[k].tone}" data-nav="esp:${k}"><span class="sbadge tone-${SPECS[k].tone}">${icons[k]}<b>${k}</b></span><strong>${h(SPECS[k].name)}</strong><small>${h(line)}</small>${st.overdueNotices ? `<em class="flag">${st.overdueNotices} avisos ACONEX vencidos</em>` : ''}</button>`;
  }).join('')}</div>`;
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
    return `<button type="button" class="sysrow" data-action="systab:${spec}:${h(p.code)}"><span class="scode">${h(p.code)}</span><span class="stitle"><strong>${h(p.title)}</strong><small>${h(p.leader_support || 'Responsable por confirmar')}${p.sectors ? ', sectores ' + h(p.sectors) : ''}</small></span>${trackHtml(c, rel.tests, true)}<span class="scount">${n(rel.protocols.length, 'protocolo', 'protocolos')}<br>${n(rel.tests.length, 'prueba', 'pruebas')}</span>${icons.arrow}</button>`;
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
   ${p.provisional ? '<p class="small muted">Datos del catálogo provisional del Plan Cx C01 V3 (borrador no emitido). No acreditan ejecución ni aceptación.</p>' : ''}</section>
  <section class="block"><h3>Qué se va a intervenir</h3><p><b>Condición del alcance:</b> ${h(p.scope_status||'PENDIENTE DE CONTRASTE CONTRACTUAL')}</p><p>${h(p.boundary||'Pendiente definir límites, subsistemas e interfaces con planos y alcance vigentes.')}</p><p class="preserve">${h(p.requirements||'Pendiente registrar por etapa: intervención, requisito, documento/revisión/página, criterio y aceptación. El catálogo por sí solo no acredita el alcance.')}</p>${button('Definir alcance e inventario','edit:'+sys.id,'btn ghost')}
  <h4>Inventario identificado: ${assets.length} elementos registrados</h4><p class="small">Este conteo no acredita que el inventario esté completo. Diferenciar cada pozo/electrodo del sistema de puesta a tierra interconectado. Las conexiones deben identificar TAG y circuitos reales.</p>${assets.length?`<div class="tablewrap"><table><thead><tr>${['TAG','Tipo','Subsistema','Ubicación','Plano / revisión','Circuitos','Conexiones TAG','Fuente'].map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${assets.map(a=>`<tr>${['tag','type','subsystem','location','drawing_ref','circuits','connections','source_ref'].map(k=>`<td>${h(a[k]||'PENDIENTE')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:'<p class="muted">Sin elementos identificados. No se infieren cantidades ni ubicaciones.</p>'}</section>
  <section class="block"><h3>Procesos de ${h(p.code)}</h3><div class="btnrow" role="tablist" aria-label="Etapas del sistema">${processCore.STAGES.map(([key,label])=>`<button type="button" role="tab" aria-selected="${key===stage}" class="btn ${key===stage?'':'ghost'}" data-action="sysstage:${h(sys.id)}:${encodeURIComponent(key)}">${label}</button>`).join('')}</div>
  <div role="tabpanel"><h4>${h(def[1])}</h4><p class="small">${stage==='PRECOMISIONAMIENTO'?'Revisión documental y verificación física de instalaciones, equipos, materiales y accesorios contra planos y especificaciones vigentes, antes de las pruebas de funcionamiento.':'Registrar los entregables y resultados conforme al procedimiento y al alcance aceptados.'} Cada protocolo debe identificar el objeto intervenido y su fuente. Crear un borrador no habilita la ejecución.</p>${button(def[2]==='protocol'?'Preparar protocolo de esta etapa':'Registrar entregable de esta etapa','sysnew:'+sys.id+':'+encodeURIComponent(stage),'btn ghost')}${selected.length?selected.map(tableRow).join(''):'<p class="muted">Sin registros vinculados a esta etapa.</p>'}</div></section>
  ${unclassified.length?group('Registros sin etapa clasificada',unclassified,''):''}
  ${rel.restrictions.length ? group('Restricciones, decisiones e inconsistencias', rel.restrictions, '') : ''}
  <section class="block"><h3>Consultar al asistente sobre ${h(p.code)}</h3><div class="suggest">${qs.map(q => `<button type="button" class="chipbtn" data-action="${h(askAction(q, spec))}">${h(q)}</button>`).join('')}</div></section>`;
}

export function specialtyScreen(c) {
  const {records, h, button, today, S} = c, spec = S.esp, meta = SPECS[spec], all = records();
  const systems = systemsOf(all, spec), st = specStats(all, spec, today);
  const tab = (S.espTab || {})[spec] || 'resumen', current = systems.find(s => s.payload.code === tab);
  const stat = (label, value, hint, alert = false) => `<div class="stat${alert ? ' alert' : ''}"><dt>${label}</dt><dd>${value}</dd><small>${hint}</small></div>`;
  const tabs = [['resumen', 'Resumen', ''], ...systems.map(s => [s.payload.code, s.payload.code, s.payload.title])];
  return `<section class="esp-head tone-${meta.tone}"><div class="esp-id">${specBadge(spec)}<div><h2>${h(meta.name)}</h2><p>${meta.annex} del Plan de Comisionamiento, ${n(systems.length, "sistema", "sistemas")}</p></div></div>
   <div class="esp-actions">${button('Preguntar al asistente', 'ask-esp:' + spec)}${button('Protocolos', 'list-esp:protocol:' + spec, 'btn ghost')}${button('Pruebas', 'list-esp:test:' + spec, 'btn ghost')}</div>
   <dl class="stats">${stat('Protocolos publicados', `${st.published} de ${st.protocols}`, st.pendingCriteria ? `${st.pendingCriteria} con criterios por fijar` : 'Criterios con valor')}${stat('Pruebas cerradas', `${st.closed} de ${st.tests}`, `${st.hp} presenciadas (HP)`)}${stat('Avisos ACONEX vencidos', st.overdueNotices, 'Pruebas presenciadas sin aviso registrado', st.overdueNotices > 0)}${stat('Próxima prueba', st.nextTest ? h(st.nextTest.payload.code) : '—', st.nextTest ? fmt(st.nextTest.payload.planned_start) : 'Sin pruebas futuras')}</dl></section>
  ${systems.length ? `<div class="systabs tone-${meta.tone}" role="tablist" aria-label="Sistemas de ${h(meta.name)}">${tabs.map(([k, label, title]) => `<button type="button" role="tab" aria-selected="${k === (current ? tab : 'resumen')}" class="systab${k === (current ? tab : 'resumen') ? ' on' : ''}" data-action="systab:${spec}:${h(k)}" ${title ? `title="${h(title)}"` : ''}><b>${h(label)}</b>${title ? `<span>${h(title)}</span>` : ''}</button>`).join('')}</div>
  <div class="esp-body tone-${meta.tone}" role="tabpanel">${current ? systemPanel(c, spec, current) : overview(c, spec, systems)}</div>` : emptyCatalog(c, spec)}`;
}

