'use strict';
// CX360 – pestañas por fase dentro de cada especialidad (Precomisionamiento, Pruebas, Puesta en marcha,
// Manual O&M, Capacitaciones). Funciones puras: ordenan la matriz de alcance privada (RPC cx_scope_matrix)
// y los registros del sistema por fase. Sin red ni DOM.
const sc = require('./specialty-core.cjs');

const PHASES = [
  {key: 'pre', n: 1, label: 'Precomisionamiento', what: 'Sin energía. Revisión documental (planos aceptados, fichas técnicas, protocolos de liberación) y verificación física: lo construido está según el plano y ubicado según el plano.'},
  {key: 'pru', n: 2, label: 'Pruebas', what: 'Mediciones y ensayos con instrumento calibrado y criterio con fuente: primero sin tensión (continuidad, aislamiento, resistencia) y luego con energía (arranque y funcionales).'},
  {key: 'pem', n: 3, label: 'Puesta en marcha', what: 'Sistema conectado, con su carga real y funcionando en operación continua; alimenta o sirve a las demás especialidades (pruebas integradas).'},
  {key: 'om', n: 4, label: 'Manual O&M', what: 'Lo que debe traer el Manual de Operación y Mantenimiento del sistema (Anexo 16) y la documentación de entrega.'},
  {key: 'cap', n: 5, label: 'Capacitaciones', what: 'Qué se capacita y a quién, después de las pruebas satisfactorias; registro y verificación del entrenamiento.'},
];
const PHASE_KEYS = PHASES.map(p => p.key);
const ORIGINS = {A: 'Alcance ANIN', C: 'Propuesta del Contratista (Plan Cx C01 V3, no aceptado)', D: 'Diseño del Contratista (planos C01 en aprobación)'};
const LIVE = r => !['REVOCADO', 'ARCHIVADO'].includes(r.state);
const list = v => (Array.isArray(v) ? v : []).filter(x => x && x.t);

// Grupos de requisitos de una fase. «d» es la ficha del sistema o el bloque común.
function groupsFor(d, key) {
  if (!d) return [];
  const pre = d.pre || {};
  const g = {
    pre: [['Revisión documental', pre.documental], ['Verificación física (según plano)', pre.fisica], ['Para pasar a pruebas', pre.liberacion]],
    pru: [['Sin tensión', pre.estaticas], ['Con energía (arranque y funcionales)', d.cx], ['Instrumentos', d.instr]],
    pem: [['En operación', d.pem]],
    om: [['Contenido del Manual de OyM', d.om], ['Entrega (dossier)', d.ent]],
    cap: [['Capacitación', d.cap]],
  }[key] || [];
  return g.map(([name, items]) => ({name, items: list(items)})).filter(x => x.items.length);
}

// Protocolos de la fase: los PC- son listas de precomisionamiento; los demás de «pre» son mediciones (Pruebas).
function protocolCodes(d, key) {
  const p = d?.protocolos || {}, pc = c => /^PC-/i.test(c);
  if (key === 'pre') return (p.pre || []).filter(pc);
  if (key === 'pru') return [...(p.pre || []).filter(c => !pc(c)), ...(p.cx || [])];
  if (key === 'pem') return p.pem || [];
  return [];
}

const STAGE_PHASE = {'PRECOMISIONAMIENTO': 'pre', 'PRUEBAS FUNCIONALES': 'pru', 'PRUEBAS INTEGRADAS': 'pem', 'PUESTA EN MARCHA': 'pem', 'O&M': 'om', 'CIERRE': 'om', 'CAPACITACION': 'cap'};
// Fase de un registro. Pruebas y protocolos por nivel: L1 y listas PC- son precomisionamiento; L2–L4, pruebas; L5, puesta en marcha.
function recordPhase(r) {
  const p = r.payload || {};
  if (r.kind === 'training') return 'cap';
  if (r.kind === 'om' || r.kind === 'handover') return 'om';
  if (r.kind === 'test' || r.kind === 'protocol') {
    const code = String(r.kind === 'test' ? (p.protocol_code || p.code) : p.code);
    if (/^PC-/i.test(code) || p.level === 'L1') return 'pre';
    if (p.level === 'L5') return 'pem';
    if (['L2', 'L3', 'L4'].includes(p.level)) return 'pru';
  }
  if (r.kind === 'activity' || r.kind === 'test' || r.kind === 'protocol') return STAGE_PHASE[p.stage] || null;
  return null;
}

function inSystem(r, code, sysId) {
  return r.payload?.system_id ? r.payload.system_id === sysId : sc.refIncludes(r.payload?.system_code, code);
}
const byDate = (a, b) => String(a.payload?.planned_start || a.payload?.performed_on || '9999').localeCompare(String(b.payload?.planned_start || b.payload?.performed_on || '9999')) || String(a.payload?.code).localeCompare(String(b.payload?.code), 'es', {numeric: true});

// Contenido de una fase para los sistemas de una especialidad (o uno solo).
function phaseView(scope, records, spec, key, only = '') {
  const systems = sc.systemsOf(records, spec).filter(s => !only || s.payload.code === only);
  const protocolsByCode = new Map(records.filter(r => r.kind === 'protocol' && LIVE(r)).map(r => [String(r.payload.code).toUpperCase(), r]));
  const sm = scope?.systems || {};
  const out = systems.map(sys => {
    const code = sys.payload.code, d = sm[code] || null;
    const recs = records.filter(r => LIVE(r) && ['activity', 'test', 'training', 'om', 'handover'].includes(r.kind) && inSystem(r, code, sys.id) && recordPhase(r) === key).sort(byDate);
    const comps = (d?.componentes || []).filter(c => c && c.g);
    return {
      code, id: sys.id, title: d?.title || sys.payload.title, leader: d?.leader || sys.payload.leader_support || '', resumen: d?.resumen || '',
      groups: groupsFor(d, key),
      components: key === 'pre' ? comps : [],
      criteria: key === 'pru' ? comps.filter(c => c.crit) : [],
      protocols: protocolCodes(d, key).map(c => ({code: c, record: protocolsByCode.get(String(c).toUpperCase()) || null})),
      records: recs,
      pending: ['pre', 'pru'].includes(key) ? (d?.pendientes || []) : [],
      interfaces: key === 'pem' ? (d?.interfaces || []) : [],
      hasScope: Boolean(d),
    };
  });
  return {phase: PHASES.find(p => p.key === key), common: groupsFor(scope?.common?.common, key), systems: out, count: out.reduce((a, s) => a + s.groups.reduce((b, g) => b + g.items.length, 0), 0)};
}

// Texto plano breve de una fase de un sistema (para copiar, imprimir o para la base del asistente).
function phaseText(s, phase) {
  const lines = [`${s.code} ${s.title} – ${phase.label}`];
  for (const c of s.components) lines.push(`• ${c.g}: ${c.tags?.length ? c.tags.join(', ') : c.n || ''}${c.k && c.k !== '—' ? ' → ' + c.k : ''}`);
  for (const g of s.groups) { lines.push(g.name + ':'); for (const i of g.items) lines.push(`• ${i.t}${i.s ? ' (' + i.s + ')' : ''}`); }
  for (const c of s.criteria) lines.push(`• Criterio ${c.g}: ${c.crit}`);
  if (s.pending.length) lines.push('Por confirmar: ' + s.pending.join('; '));
  return lines.join('\n');
}

module.exports = {PHASES, PHASE_KEYS, ORIGINS, groupsFor, protocolCodes, recordPhase, phaseView, phaseText};
