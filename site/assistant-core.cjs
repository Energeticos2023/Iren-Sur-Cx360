// CX360 – Asistente Cx: funciones puras (sin DOM ni red) para renderizar respuestas y preparar el historial.
'use strict';

const SUGGESTIONS = [
  '¿Qué se hace en el precomisionamiento de los pozos a tierra?',
  '¿Qué pozos a tierra hay y a qué se conectan?',
  '¿Qué pruebas se hacen al alumbrado exterior?',
  '¿Qué actividades se desarrollan en el precomisionamiento de las instalaciones eléctricas (IIEE)?',
  '¿Qué pruebas se hacen al grupo electrógeno y con qué equipos?',
  '¿Qué EPP y equipos de bloqueo se requieren para maniobras en media tensión?',
  '¿Cuál es el alcance del comisionamiento de gases medicinales?',
  '¿Qué debe contener un protocolo de prueba (Apéndice L)?',
  '¿Con cuánta anticipación se avisa una prueba presenciada?',
  '¿Qué instrumentos se usan para certificar el cableado estructurado?',
  '¿Qué pruebas integradas se ejecutan y qué sistemas participan?',
  '¿Qué exige el Anexo 16 para el Manual de OyM?',
  '¿Cuál es la presión de la prueba hidrostática de la red contra incendio?',
  '¿Qué herramientas y equipos de medición se usan en sanitarias?',
  '¿Qué significan IIEE, IISS, IIMM, TIC y EM?',
  '¿Cómo se hace el precomisionamiento de TIC?',
];

const DOC_SHORT = {A12: 'Anexo 12', A16: 'Anexo 16', PCX: 'Plan Cx ANIN', AN1: 'Anexo 1 IIEE', AN2: 'Anexo 2 IISS', AN3: 'Anexo 3 IIMM', AN4: 'Anexo 4 TIC', AN5: 'Anexo 5 EM', PV3: 'Plan Cx V3 (borrador)', GLO: 'Glosario CX360', GUIA: 'Guía CX360', MAT: 'Matriz CX360'};

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}

// Referencia breve de la fuente: «Anexo 1 IIEE · num. 1.11.2 · pág. 14».
function sourceRef(s) {
  if (!s) return '';
  const pages = s.page_from ? ` · pág. ${s.page_from}${s.page_to && s.page_to !== s.page_from ? '–' + s.page_to : ''}` : '';
  return `${DOC_SHORT[s.doc] || s.doc}${s.sec && s.doc !== 'MAT' ? ' · num. ' + s.sec : ''}${pages}`;
}

// Marcadores del resaltado de la base («…») convertidos en <mark> sobre texto ya escapado.
function snippetHtml(snippet) {
  return escapeHtml(snippet).replace(/«([^«»]{1,80})»/g, '<mark>$1</mark>');
}

function inline(text, msgId, validRefs) {
  let t = escapeHtml(text);
  t = t.replace(/`([^`]{1,120})`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]{1,300})\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\[F(\d{1,2})\]/g, (m, n) => validRefs.has(Number(n))
    ? `<button type="button" class="cite" data-action="src:${escapeHtml(msgId)}:${n}" aria-label="Ver fuente F${n}">F${n}</button>`
    : m);
  return t;
}

// Markdown mínimo y seguro: párrafos, listas (- * • 1.), encabezados ###, negrita, código y citas [F#].
function renderAnswer(text, msgId, sources) {
  const valid = new Set((sources || []).map(s => Number(s.n)));
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let html = '', list = null, para = [];
  const flushPara = () => { if (para.length) { html += `<p>${para.map(x => inline(x, msgId, valid)).join('<br>')}</p>`; para = []; } };
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•])\s+(.*)$/), num = line.match(/^\s*\d{1,2}[.)]\s+(.*)$/), head = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (!line.trim()) { flushPara(); closeList(); continue; }
    if (head) { flushPara(); closeList(); html += `<h4>${inline(head[1], msgId, valid)}</h4>`; continue; }
    if (bullet || num) {
      flushPara();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { closeList(); html += `<${kind}>`; list = kind; }
      html += `<li>${inline((bullet || num)[1], msgId, valid)}</li>`;
      continue;
    }
    closeList(); para.push(line.trim());
  }
  flushPara(); closeList();
  return html;
}

// Números de fuente citados en la respuesta (para destacar las fuentes usadas).
function citedNumbers(text) {
  return [...new Set([...String(text || '').matchAll(/\[F(\d{1,2})\]/g)].map(m => Number(m[1])))];
}

// Historial para la siguiente consulta: últimos turnos con respuesta de IA (sin fuentes ni avisos).
function buildHistory(messages, maxTurns = 3) {
  const out = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i], next = messages[i + 1];
    if (m.role === 'user' && next && next.role === 'assistant' && next.answer && !next.pending) {
      out.push({role: 'user', content: m.content}, {role: 'assistant', content: next.answer});
    }
  }
  return out.slice(-maxTurns * 2);
}

// Texto plano para copiar: respuesta y fuentes con su referencia.
function plainExport(message) {
  const used = new Set(citedNumbers(message.answer));
  const srcs = (message.sources || []).filter(s => !message.answer || used.has(Number(s.n)) || used.size === 0);
  const lines = [];
  if (message.answer) lines.push(message.answer.trim(), '');
  else if (message.notice) lines.push(message.notice, '');
  if (srcs.length) {
    lines.push('Fuentes:');
    for (const s of srcs) lines.push(`[F${s.n}] ${s.doc_title}${s.sec ? ' – num. ' + s.sec : ''} – ${s.title}${s.page_from ? ' (pág. ' + s.page_from + (s.page_to && s.page_to !== s.page_from ? '–' + s.page_to : '') + ')' : ''}`);
  }
  lines.push('', 'Generado por el Asistente Cx de CX360. Verifique el documento fuente antes de usarlo en una comunicación contractual.');
  return lines.join('\n');
}

function validQuestion(q) {
  const t = String(q || '').replace(/\s+/g, ' ').trim();
  if (t.length < 3) return {ok: false, error: 'Escriba una pregunta un poco más completa.'};
  if (t.length > 1500) return {ok: false, error: 'La pregunta supera 1500 caracteres.'};
  return {ok: true, text: t};
}

const PHASE_LABELS = {pre:'Precomisionamiento',pru:'Pruebas',pem:'Puesta en marcha / servicio',om:'Manual O&M',cap:'Capacitaciones'};
function contextualQuestion(question, context = {}) {
  const parts = [context.system ? 'Sistema seleccionado: '+String(context.system).slice(0,100) : '', PHASE_LABELS[context.phase] ? 'Etapa: '+PHASE_LABELS[context.phase] : ''].filter(Boolean);
  return parts.length ? parts.join(' · ')+'\nConsulta: '+question : question;
}
function screenContext(S) {
  if (!S.screen?.startsWith('esp:')) return null;
  const specialty=S.screen.slice(4), phase=S.espPhase?.[specialty];
  return {specialty, phase:PHASE_LABELS[phase]?phase:'', system:(phase && phase!=='resumen'?S.espSys?.[specialty]:S.espTab?.[specialty])||''};
}
module.exports = {PHASE_LABELS, contextualQuestion, screenContext,SUGGESTIONS, DOC_SHORT, escapeHtml, sourceRef, snippetHtml, renderAnswer, citedNumbers, buildHistory, plainExport, validQuestion};
