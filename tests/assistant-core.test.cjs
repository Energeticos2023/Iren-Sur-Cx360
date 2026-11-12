const {test} = require('node:test'), assert = require('node:assert/strict');
const ac = require('../site/assistant-core.cjs');
const S = n => ({n, id: 'AN1-00' + n, doc: 'AN1', doc_title: 'Anexo 1 – Comisionamiento de Instalaciones Eléctricas', nature: 'cliente', sec: '1.11.' + n, title: 'SINTÉTICO ' + n, page_from: 14, page_to: 15, snippet: 'Prueba con «banco» resistivo', body: 'Cuerpo'});

test('Respuesta: escapa HTML y convierte solo citas existentes en botones', () => {
  const html = ac.renderAnswer('Resultado <script>alert(1)</script> según [F1] y [F9].', 'a1', [S(1), S(2)]);
  assert.ok(!html.includes('<script>'), 'sin HTML inyectado');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.match(html, /data-action="src:a1:1"/);
  assert.ok(!html.includes('src:a1:9'), 'una cita inexistente queda como texto');
  assert.ok(html.includes('[F9]'));
});

test('Respuesta: listas, numeración, negrita y encabezados', () => {
  const html = ac.renderAnswer('Pruebas del GE:\n- **Vacío** [F1]\n- Banco resistivo\n\n1. Paso uno\n2. Paso dos\n### Equipos', 'a2', [S(1)]);
  assert.match(html, /<ul><li><strong>Vacío<\/strong> <button/);
  assert.match(html, /<ol><li>Paso uno<\/li><li>Paso dos<\/li><\/ol>/);
  assert.match(html, /<h4>Equipos<\/h4>/);
});

test('Fragmento: resalta coincidencias sin permitir HTML', () => {
  assert.equal(ac.snippetHtml('Uso de «pértiga» <b>x</b>'), 'Uso de <mark>pértiga</mark> &lt;b&gt;x&lt;/b&gt;');
});

test('Referencia breve de la fuente con numeral y páginas', () => {
  assert.equal(ac.sourceRef(S(2)), 'Anexo 1 IIEE · num. 1.11.2 · pág. 14–15');
  assert.equal(ac.sourceRef({doc: 'PV3', sec: '14', page_from: null}), 'Plan Cx V3 (borrador) · num. 14');
});

test('Historial: solo pares pregunta–respuesta de IA, sin pendientes ni modo documental', () => {
  const msgs = [
    {role: 'user', content: 'P1'}, {role: 'assistant', answer: 'R1'},
    {role: 'user', content: 'P2'}, {role: 'assistant', answer: null, notice: 'documental'},
    {role: 'user', content: 'P3'}, {role: 'assistant', answer: 'R3'},
    {role: 'user', content: 'P4'}, {role: 'assistant', pending: true},
  ];
  assert.deepEqual(ac.buildHistory(msgs), [{role: 'user', content: 'P1'}, {role: 'assistant', content: 'R1'}, {role: 'user', content: 'P3'}, {role: 'assistant', content: 'R3'}]);
  assert.equal(ac.buildHistory(msgs, 1).length, 2);
});

test('Exportación: respuesta, solo fuentes citadas y advertencia de verificación', () => {
  const txt = ac.plainExport({answer: 'Se usa banco resistivo [F2].', sources: [S(1), S(2)]});
  assert.match(txt, /\[F2\] Anexo 1/);
  assert.ok(!txt.includes('[F1] Anexo 1'), 'no lista fuentes no citadas');
  assert.match(txt, /Verifique el documento fuente/);
});

test('Validación de la pregunta', () => {
  assert.equal(ac.validQuestion('  ¿GE?  ').ok, true);
  assert.equal(ac.validQuestion('a').ok, false);
  assert.equal(ac.validQuestion('x'.repeat(1501)).ok, false);
  assert.equal(ac.validQuestion('  hola   mundo ').text, 'hola mundo');
});

test('Sugerencias en español y sin datos de personas', () => {
  assert.ok(ac.SUGGESTIONS.length >= 6);
  for (const q of ac.SUGGESTIONS) assert.match(q, /^¿.+\?$/);
});

test('Consulta contextual: conserva sistema y etapa sin alterar la pregunta',()=>{
 assert.equal(ac.contextualQuestion('¿Qué verifico?',{system:'EL-01',phase:'pre'}),'Sistema seleccionado: EL-01 · Etapa: Precomisionamiento\nConsulta: ¿Qué verifico?');
 assert.equal(ac.contextualQuestion('¿Qué verifico?',{}),'¿Qué verifico?');
 assert.equal(ac.contextualQuestion('Consulta',{phase:'<script>'}),'Consulta');
});
test('Contexto: usa filtro de fase y no un sistema anterior del resumen',()=>{
 const s={screen:'esp:IIEE',espPhase:{IIEE:'pru'},espSys:{IIEE:'EL-06'},espTab:{IIEE:'EL-01'}};
 assert.deepEqual(ac.screenContext(s),{specialty:'IIEE',system:'EL-06',phase:'pru'});
 s.espPhase.IIEE='resumen';assert.equal(ac.screenContext(s).system,'EL-01');
 s.screen='home';assert.equal(ac.screenContext(s),null);
});
