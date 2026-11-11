const {test} = require('node:test'), assert = require('node:assert/strict');
const sc = require('../site/specialty-core.cjs');
const R = (kind, code, state, payload = {}, specialty = 'IIEE') => ({id: kind + '-' + code, kind, state, specialty, payload: {code, title: 'SINTÉTICO ' + code, ...payload}});

test('Referencias de sistema: código, lista y rango', () => {
  assert.equal(sc.refIncludes('EL-03', 'EL-03'), true);
  assert.equal(sc.refIncludes('EL-02,EL-03, TI-00', 'TI-00'), true);
  assert.equal(sc.refIncludes('EL-01..EL-07', 'EL-05'), true);
  assert.equal(sc.refIncludes('EL-01..EL-07', 'EL-08'), false);
  assert.equal(sc.refIncludes('EL-01..EL-07', 'ME-03'), false);
  assert.equal(sc.refIncludes('', 'EL-01'), false);
  assert.equal(sc.refIncludes('EL-010', 'EL-01'), false);
});

test('Sistemas de la especialidad ordenados y sin revocados', () => {
  const rs = [R('system', 'EL-10', 'BORRADOR'), R('system', 'EL-02', 'BORRADOR'), R('system', 'EL-03', 'REVOCADO'), R('system', 'SA-01', 'BORRADOR', {}, 'IISS')];
  assert.deepEqual(sc.systemsOf(rs, 'IIEE').map(s => s.payload.code), ['EL-02', 'EL-10']);
});

test('Registros vinculados a un sistema y avance por nivel', () => {
  const rs = [
    R('protocol', 'PT-EL-03', 'BORRADOR', {system_code: 'EL-03'}), R('protocol', 'PI01', 'BORRADOR', {system_code: 'EL-02,EL-03'}),
    R('test', 'T2', 'CERRADO', {system_code: 'EL-03', level: 'L2'}), R('test', 'T4a', 'EN PROCESO', {system_code: 'EL-03', level: 'L4'}),
    R('test', 'T4b', 'NO INICIADO', {system_code: 'EL-03', level: 'L4'}), R('test', 'T5', 'OBSERVADO', {system_code: 'EL-03', level: 'L5'}),
    R('test', 'TX', 'REVOCADO', {system_code: 'EL-03', level: 'L1'}), R('training', 'CAP-01', 'NO INICIADO', {system_code: 'EL-01..EL-07'}),
    R('restriction', 'V-04', 'EN PROCESO', {title: 'SINTÉTICO referida a EL-03'}, null), R('restriction', 'D-01', 'EN PROCESO', {title: 'SINTÉTICO general'}, null),
  ];
  const rel = sc.related(rs, 'EL-03');
  assert.deepEqual(rel.protocols.map(x => x.payload.code), ['PI01', 'PT-EL-03']);
  assert.deepEqual(rel.tests.map(x => x.payload.code), ['T2', 'T4a', 'T4b', 'T5']);
  assert.deepEqual(rel.trainings.map(x => x.payload.code), ['CAP-01']);
  assert.deepEqual(rel.restrictions.map(x => x.payload.code), ['V-04']);
  assert.deepEqual(sc.levelTrack(rel.tests).map(x => x.status), ['none', 'done', 'none', 'active', 'issue']);
});

test('Indicadores de la especialidad', () => {
  const rs = [
    R('system', 'EL-03', 'BORRADOR'), R('protocol', 'PT-EL-03', 'PUBLICADO', {system_code: 'EL-03', fields: [{criterion: '≥ 10'}]}),
    R('protocol', 'PT-EL-04', 'BORRADOR', {system_code: 'EL-04', fields: [{criterion: 'POR FIJAR (V-01)'}]}),
    R('test', 'F1', 'NO INICIADO', {system_code: 'EL-03', witness: 'HP', aconex_notice_by: '2026-11-01', planned_start: '2026-11-20'}),
    R('test', 'F2', 'CERRADO', {system_code: 'EL-03', witness: 'WP/IP', planned_start: '2026-10-01'}),
  ];
  const st = sc.specStats(rs, 'IIEE', '2026-11-11');
  assert.equal(st.systems, 1); assert.equal(st.protocols, 2); assert.equal(st.published, 1); assert.equal(st.pendingCriteria, 1);
  assert.equal(st.tests, 2); assert.equal(st.closed, 1); assert.equal(st.hp, 1); assert.equal(st.overdueNotices, 1);
  assert.equal(st.nextTest.payload.code, 'F1');
});

test('Cinco especialidades con nombre y anexo', () => {
  assert.deepEqual(Object.keys(sc.SPECS), ['IIEE', 'IISS', 'IIMM', 'TIC', 'EM']);
  for (const v of Object.values(sc.SPECS)) { assert.ok(v.name && v.annex && v.tone); }
});
