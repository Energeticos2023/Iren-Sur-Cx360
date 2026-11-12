const {test} = require('node:test'), assert = require('node:assert/strict');
const sp = require('../site/scope-core.cjs');
const R = (kind, code, state, payload = {}, specialty = 'IIEE') => ({id: kind + '-' + code, kind, state, specialty, payload: {code, title: 'SINTÉTICO ' + code, ...payload}});
const it = (t, o = 'A') => ({t, o, s: 'FUENTE ' + t});

// Matriz sintética con la misma forma que cx_scope_matrix (sin datos del proyecto).
const scope = {
  common: {common: {pre: {documental: [it('Doc común')], fisica: [it('Física común')], liberacion: []}, cx: [it('Cx común')], pem: [], om: [it('OyM común')], cap: [it('Cap común')], ent: []}},
  systems: {
    'EL-01': {title: 'Sistema A', pre: {documental: [it('Plano aceptado'), it('Fichas técnicas')], fisica: [it('Ubicación según plano', 'D')], estaticas: [{...it('Resistencia', 'C'), unit: 'Ω'}], liberacion: [it('Liberación de Calidad', 'C')]},
      cx: [], pem: [it('Operación')], om: [it('Rutina')], ent: [it('As Built')], cap: [it('Medición')], instr: [it('Telurómetro', 'C')],
      protocolos: {pre: ['PC-EL-01', 'PT-EL-01-X'], cx: [], pem: ['PT-EL-07']},
      componentes: [{g: 'Subsistema X', tags: ['P-1', 'P-2'], k: 'Barra X', crit: '< 5 Ω'}, {g: 'Detalle', n: '—'}], pendientes: ['Confirmar Y'], interfaces: ['EL-02']},
  },
};
const records = [
  R('system', 'EL-01', 'BORRADOR'), R('system', 'EL-02', 'BORRADOR'), R('system', 'SA-01', 'BORRADOR', {}, 'IISS'),
  R('protocol', 'PT-EL-01-X', 'BORRADOR', {system_code: 'EL-01', level: 'L2'}),
  R('test', 'T-L2', 'NO INICIADO', {system_code: 'EL-01', level: 'L2', protocol_code: 'PT-EL-01-X', planned_start: '2026-12-10'}),
  R('test', 'T-PC', 'NO INICIADO', {system_code: 'EL-01', level: 'L2', protocol_code: 'PC-EL-01'}),
  R('test', 'T-L5', 'NO INICIADO', {system_code: 'EL-01,EL-02', level: 'L5'}),
  R('activity', 'H1', 'NO INICIADO', {system_code: 'EL-01', stage: 'PRECOMISIONAMIENTO', planned_start: '2026-12-02'}),
  R('training', 'CAP-1', 'NO INICIADO', {system_code: 'EL-01..EL-07'}),
  R('test', 'T-REV', 'REVOCADO', {system_code: 'EL-01', level: 'L4'}),
];

test('Cinco fases en el orden pedido', () => {
  assert.deepEqual(sp.PHASES.map(p => p.label), ['Precomisionamiento', 'Pruebas', 'Puesta en marcha', 'Manual O&M', 'Capacitaciones']);
});

test('Precomisionamiento: documentos, verificación física y liberación; sin mediciones', () => {
  const v = sp.phaseView(scope, records, 'IIEE', 'pre');
  assert.deepEqual(v.systems.map(s => s.code), ['EL-01', 'EL-02']);
  const s = v.systems[0];
  assert.deepEqual(s.groups.map(g => g.name), ['Revisión documental', 'Verificación física (según plano)', 'Para pasar a pruebas']);
  assert.equal(s.groups.flatMap(g => g.items).some(i => i.t === 'Resistencia'), false);
  assert.deepEqual(s.components.map(c => c.g), ['Subsistema X', 'Detalle']);
  assert.deepEqual(s.protocols.map(p => p.code), ['PC-EL-01']);
  assert.deepEqual(s.records.map(r => r.payload.code), ['H1', 'T-PC']);
  assert.deepEqual(s.pending, ['Confirmar Y']);
  assert.deepEqual(v.common.map(g => g.name), ['Revisión documental', 'Verificación física (según plano)']);
  assert.equal(v.systems[1].hasScope, false);
  assert.equal(v.systems[1].groups.length, 0);
});

test('Pruebas: mediciones sin tensión, instrumentos, criterio por subsistema y protocolos de medición', () => {
  const s = sp.phaseView(scope, records, 'IIEE', 'pru').systems[0];
  assert.deepEqual(s.groups.map(g => g.name), ['Sin tensión', 'Instrumentos']);
  assert.equal(s.groups[0].items[0].unit, 'Ω');
  assert.deepEqual(s.criteria.map(c => c.crit), ['< 5 Ω']);
  assert.deepEqual(s.protocols.map(p => [p.code, Boolean(p.record)]), [['PT-EL-01-X', true]]);
  assert.deepEqual(s.records.map(r => r.payload.code), ['T-L2'], 'excluye revocados, PC- y L5');
});

test('Puesta en marcha, Manual O&M y Capacitaciones', () => {
  const pem = sp.phaseView(scope, records, 'IIEE', 'pem').systems[0];
  assert.deepEqual(pem.records.map(r => r.payload.code), ['T-L5']);
  assert.deepEqual(pem.interfaces, ['EL-02']);
  assert.deepEqual(pem.protocols.map(p => p.code), ['PT-EL-07']);
  const om = sp.phaseView(scope, records, 'IIEE', 'om').systems[0];
  assert.deepEqual(om.groups.map(g => g.name), ['Contenido del Manual de OyM', 'Entrega (dossier)']);
  const cap = sp.phaseView(scope, records, 'IIEE', 'cap', 'EL-01');
  assert.equal(cap.systems.length, 1);
  assert.deepEqual(cap.systems[0].records.map(r => r.payload.code), ['CAP-1'], 'rango EL-01..EL-07');
});

test('Clasificación de registros por fase', () => {
  assert.equal(sp.recordPhase(R('protocol', 'PC-EL-02', 'BORRADOR', {level: 'L2', stage: 'PRECOMISIONAMIENTO'})), 'pre');
  assert.equal(sp.recordPhase(R('protocol', 'PT-EL-01', 'BORRADOR', {level: 'L2', stage: 'PRECOMISIONAMIENTO'})), 'pru');
  assert.equal(sp.recordPhase(R('test', 'X', 'NO INICIADO', {level: 'L3'})), 'pru');
  assert.equal(sp.recordPhase(R('test', 'X', 'NO INICIADO', {level: 'L1'})), 'pre');
  assert.equal(sp.recordPhase(R('activity', 'X', 'NO INICIADO', {stage: 'PUESTA EN MARCHA'})), 'pem');
  assert.equal(sp.recordPhase(R('handover', 'X', 'BORRADOR')), 'om');
  assert.equal(sp.recordPhase(R('restriction', 'X', 'EN PROCESO')), null);
});

test('Sin matriz cargada no se inventa contenido', () => {
  const v = sp.phaseView(null, records, 'IIEE', 'pre');
  assert.equal(v.count, 0);
  assert.equal(v.common.length, 0);
  assert.ok(v.systems.every(s => !s.hasScope && !s.groups.length));
});

test('Texto breve de la fase', () => {
  const v = sp.phaseView(scope, records, 'IIEE', 'pru');
  const t = sp.phaseText(v.systems[0], v.phase);
  assert.match(t, /^EL-01 Sistema A – Pruebas/);
  assert.match(t, /Criterio Subsistema X: < 5 Ω/);
  assert.match(t, /Por confirmar: Confirmar Y/);
});
