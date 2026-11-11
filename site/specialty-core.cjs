'use strict';
// CX360 – vista por especialidad y por sistema. Funciones puras, sin red ni DOM.
const pc = require('./plan-core.cjs');

const SPECS = {
  IIEE: {name: 'Instalaciones Eléctricas', short: 'Eléctricas', annex: 'Anexo 1', tone: 'iiee'},
  IISS: {name: 'Instalaciones Sanitarias', short: 'Sanitarias', annex: 'Anexo 2', tone: 'iiss'},
  IIMM: {name: 'Instalaciones Mecánicas', short: 'Mecánicas', annex: 'Anexo 3', tone: 'iimm'},
  TIC: {name: 'Tecnologías de la Información y Comunicaciones', nav: 'Tecnologías de la información', short: 'TIC', annex: 'Anexo 4', tone: 'tic'},
  EM: {name: 'Equipamiento Médico', short: 'Equipamiento', annex: 'Anexo 5', tone: 'em'},
};
const LIVE = r => !['REVOCADO', 'ARCHIVADO'].includes(r.state);
const codeOrder = (a, b) => String(a.payload.code).localeCompare(String(b.payload.code), 'es', {numeric: true});

// ¿La referencia de sistema («EL-03», «EL-01, EL-02», «EL-01..EL-07») incluye el código?
function refIncludes(ref, code) {
  const text = String(ref || '').toUpperCase(), c = String(code || '').toUpperCase();
  if (!text || !c) return false;
  for (const part of text.split(/[,;/]/).map(s => s.trim()).filter(Boolean)) {
    if (part === c) return true;
    const m = part.match(/^([A-Z]{2})-(\d{2})\s*(?:\.\.|–|-|A)\s*(?:([A-Z]{2})-)?(\d{2})$/);
    const k = c.match(/^([A-Z]{2})-(\d{2})$/);
    if (m && k && m[1] === k[1] && (!m[3] || m[3] === k[1]) && Number(k[2]) >= Number(m[2]) && Number(k[2]) <= Number(m[4])) return true;
  }
  return false;
}

function systemsOf(records, spec) {
  return records.filter(r => r.kind === 'system' && LIVE(r) && r.specialty === spec).sort(codeOrder);
}

// Registros vinculados a un sistema: por system_code (o lista/rango) y, en restricciones, también por mención del código.
function related(records, code) {
  const by = kind => records.filter(r => r.kind === kind && LIVE(r) && refIncludes(r.payload?.system_code, code)).sort(codeOrder);
  const mention = new RegExp('\\b' + String(code).replace('-', '\\-') + '\\b', 'i');
  const restrictions = records.filter(r => r.kind === 'restriction' && LIVE(r) &&
    (refIncludes(r.payload?.system_code, code) || mention.test(`${r.payload?.title || ''} ${r.payload?.notes || ''} ${r.payload?.impact || ''}`))).sort(codeOrder);
  const tests = by('test').sort((a, b) => pc.LEVELS.indexOf(a.payload.level) - pc.LEVELS.indexOf(b.payload.level) || String(a.payload.planned_start || '').localeCompare(String(b.payload.planned_start || '')));
  const activities = by('activity').sort((a, b) => String(a.payload.planned_start || '').localeCompare(String(b.payload.planned_start || '')));
  return {protocols: by('protocol'), tests, activities, restrictions, trainings: by('training'), om: by('om'), handover: by('handover')};
}

// Avance por nivel L1–L5 de un sistema según sus pruebas.
function levelTrack(tests) {
  return pc.LEVELS.map(level => {
    const ts = tests.filter(t => t.payload?.level === level && LIVE(t));
    let status = 'none';
    if (ts.length) {
      if (ts.every(t => t.state === 'CERRADO')) status = 'done';
      else if (ts.some(t => ['OBSERVADO', 'BLOQUEADO'].includes(t.state))) status = 'issue';
      else if (ts.some(t => ['EN PROCESO', 'REPORTADO', 'EN REVISION'].includes(t.state))) status = 'active';
      else status = 'planned';
    }
    return {level, status, tests: ts};
  });
}

const STATUS_LABEL = {none: 'Sin prueba en catálogo', planned: 'Programada', active: 'En curso', issue: 'Observada o bloqueada', done: 'Cerrada'};

function specStats(records, spec, today) {
  const systems = systemsOf(records, spec), codes = systems.map(s => s.payload.code);
  const inSpec = r => r.specialty === spec || codes.some(c => refIncludes(r.payload?.system_code, c));
  const protocols = records.filter(r => r.kind === 'protocol' && LIVE(r) && inSpec(r));
  const tests = records.filter(r => r.kind === 'test' && LIVE(r) && inSpec(r));
  const hp = tests.filter(t => String(t.payload.witness || '').startsWith('HP'));
  const overdueNotices = hp.filter(t => !pc.isClosed(t.state) && pc.noticeStatus(t, today)?.status === 'VENCIDO');
  const nextTest = tests.filter(t => !pc.isClosed(t.state) && (t.payload.planned_start || '') >= today)
    .sort((a, b) => String(a.payload.planned_start).localeCompare(String(b.payload.planned_start)))[0] || null;
  const restrictions = records.filter(r => r.kind === 'restriction' && LIVE(r) && !pc.isClosed(r.state) && (r.specialty === spec || codes.some(c => related([r], c).restrictions.length)));
  return {
    systems: systems.length,
    protocols: protocols.length, published: protocols.filter(p => p.state === 'PUBLICADO').length,
    pendingCriteria: protocols.filter(p => pc.protocolStats(p).pending > 0).length,
    tests: tests.length, closed: tests.filter(t => t.state === 'CERRADO').length, hp: hp.length,
    overdueNotices: overdueNotices.length, nextTest, restrictions: restrictions.length,
  };
}

module.exports = {SPECS, STATUS_LABEL, refIncludes, systemsOf, related, levelTrack, specStats};
