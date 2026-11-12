// CX360 – Asistente Cx: pantalla de consulta. Recibe utilidades y estado por contexto.
import ac from './assistant-core.cjs';
const {SUGGESTIONS, sourceRef, snippetHtml, renderAnswer, citedNumbers} = ac;

export function statusLine(c) {
  const {h, S} = c, k = S.kb;
  if (!k) return `<span class="muted">Comprobando la base documental…</span>`;
  if (k.error) return `<span class="accent">${h(k.error)}</span>`;
  const chunks = (k.docs || []).reduce((a, d) => a + Number(d.chunks || 0), 0);
  const mode = k.ai ? '<span class="chip green">IA con citas</span>' : '<span class="chip orange">Modo documental</span>';
  return `${mode} <span class="small muted">${(k.docs || []).length} documentos · ${chunks} fragmentos · Consultas hoy: ${h(k.used_today ?? 0)}/${h(k.daily_limit ?? '—')}${k.enabled === false ? ' · <strong class="accent">deshabilitado</strong>' : ''}</span>`;
}

function sourcesHtml(c, m) {
  const {h, button} = c;
  if (!m.sources?.length) return '';
  const used = new Set(citedNumbers(m.answer));
  const list = m.sources.map(s => {
    const cited = used.has(Number(s.n));
    const open = !m.answer && s.n <= 3;
    return `<details class="src${cited ? ' cited' : ''}" id="src-${h(m.id)}-${h(s.n)}" ${open ? 'open' : ''}><summary><b>F${h(s.n)}</b> ${h(s.title)} <span class="small muted">· ${h(sourceRef(s))}</span>${s.nature === 'propuesta' ? ' <span class="chip orange">borrador</span>' : s.nature === 'guia' ? ' <span class="chip blue">síntesis CX360</span>' : ''}</summary><p class="snippet">${snippetHtml(s.snippet)}</p>${button('Ver fragmento completo', `srcfull:${m.id}:${s.n}`, 'btn ghost tinybtn')}</details>`;
  }).join('');
  return `<div class="sources"><div class="small strong">${m.answer ? 'Fuentes consultadas' : 'Fragmentos más pertinentes'}</div>${list}</div>`;
}

function messageHtml(c, m) {
  const {h, button} = c;
  if (m.role === 'user') return `<div class="msg user"><div class="bubble">${h(m.content)}</div></div>`;
  if (m.pending) return `<div class="msg bot"><div class="bubble"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span> Consultando los documentos del proyecto…</div></div>`;
  if (m.error) return `<div class="msg bot"><div class="bubble"><p class="notice error">${h(m.error)}</p></div></div>`;
  const label = m.answer ? `<div class="modeline">${m.mode === 'ia' ? 'Respuesta con IA · verificar sustento en las citas' : 'Respuesta documental (sin IA) · síntesis y extractos literales de las fuentes'}</div>` : '';
  const body = m.answer ? `<div class="answer">${renderAnswer(m.answer, m.id, m.sources)}</div>${m.truncated ? '<p class="small muted">Respuesta resumida por longitud; pida el detalle de un punto específico.</p>' : ''}` : '';
  const note = m.notice && !(m.answer && m.mode !== 'ia' && /^Respuesta documental/.test(m.notice)) ? `<p class="notice small">${h(m.notice)}</p>` : '';
  return `<div class="msg bot"><div class="bubble">${label}${body}${note}${sourcesHtml(c, m)}<div class="btnrow">${button('Copiar', 'chat-copy:' + m.id, 'btn ghost tinybtn')}</div></div></div>`;
}

export function chatLogHtml(c) {
  const {S} = c, msgs = S.chat?.messages || [];
  if (!msgs.length) return `<div class="chatempty"><p><strong>Pregunte sobre el comisionamiento.</strong></p><p class="small muted">Alcance de cada sistema, pruebas por nivel (L1 a L5), procedimientos, criterios de aceptación, equipos de medición, herramientas, EPP, protocolos, testificación, capacitación y Manual de OyM. Cada respuesta indica el documento y numeral de origen.</p></div>`;
  return msgs.map(m => messageHtml(c, m)).join('');
}

export function glossaryPanel(c) { return glossaryHtml(c); }
function glossaryHtml(c) {
  const {h, S} = c, g = S.kb?.glossary;
  if (!g?.length) return '';
  return `<details class="section glossary"><summary>Siglas y términos del comisionamiento (IIEE, IISS, IIMM, TIC, EM, L1–L5, HP…)</summary>${g.map(x => `<div class="glo"><h4>${h(x.title)}</h4><div class="answer">${renderAnswer(x.body, 'glo', [])}</div></div>`).join('')}</details>`;
}

export function assistantScreen(c) {
  const {h, button, options, disciplines, S} = c;
  const busy = Boolean(S.chat?.asking);
  const systems=(c.records?.()||[]).filter(r=>r.kind==='system'&&(!S.chat?.specialty||r.specialty===S.chat.specialty));
  if(S.chat?.system&&!systems.some(r=>r.payload.code===S.chat.system))systems.push({payload:{code:S.chat.system,title:'Contexto seleccionado'}});
  return `<div class="row spread"><h2>Asistente Cx</h2>${button('Nueva conversación', 'chat-new', 'btn ghost')}</div>
<p class="muted">Soporte técnico para los usuarios autorizados de CX360. Consulte el alcance, las pruebas, los equipos y herramientas, los criterios y la documentación del comisionamiento. Responde con los documentos del proyecto: Anexos 12 y 16, Plan de Comisionamiento ANIN con sus Anexos 1 a 5 y Plan Cx C01 V3 del Contratista (borrador).</p>
<div class="row" id="kb-status">${statusLine(c)}</div>
<div class="panel"><div class="row"><label class="small">Sistema <select class="input" id="f-ask-system" ${busy?'disabled':''}>${options([['','Sin sistema seleccionado'],...systems.map(r=>[r.payload.code,r.payload.code+' · '+(r.payload.title||r.payload.name||'')])],S.chat?.system||'')}</select></label><label class="small">Etapa <select class="input" id="f-ask-phase" ${busy?'disabled':''}>${options([['','Todas las etapas'],...Object.entries(ac.PHASE_LABELS)],S.chat?.phase||'')}</select></label></div><p class="small muted">Cambiar de contexto inicia una conversación nueva. Los documentos cargados no acreditan que todo el expediente esté incorporado o aceptado.</p></div>
<div class="panel chat"><div id="chat-log" class="chatlog" aria-live="polite">${chatLogHtml(c)}</div>
<form id="ask-form" class="askbar"><label class="label" for="f-question">Su pregunta</label><textarea id="f-question" name="question" class="input" rows="2" maxlength="1500" required placeholder="Ejemplo: ¿Qué pruebas se hacen al grupo electrógeno y con qué equipos?">${h(S.chat?.draft || '')}</textarea>
<div class="row spread"><label class="small">Disciplina de interés <select class="input compact" name="specialty" id="f-ask-specialty" ${busy?'disabled':''}>${options([['', 'Todas'], ...Object.entries(disciplines)], S.chat?.specialty || '')}</select></label><button class="btn" type="submit" ${busy ? 'disabled' : ''}>${busy ? 'Consultando…' : 'Consultar'}</button></div></form></div>
<div class="section"><div class="small strong">Preguntas frecuentes</div><div class="suggest">${SUGGESTIONS.map((q, i) => `<button type="button" class="chipbtn" data-action="ask-suggest:${i}">${h(q)}</button>`).join('')}</div></div>
${glossaryHtml(c)}<details class="section"><summary>Documentos consultables y reglas del asistente</summary><ul class="small">${(S.kb?.docs || []).map(d => `<li>${h(d.title)} — ${h(d.chunks)} fragmentos${d.nature === 'propuesta' ? ' (propuesta; no aceptada)' : ''}</li>`).join('') || '<li>Pendiente de comprobar.</li>'}</ul><ul class="small muted"><li>Responde solo con los documentos cargados y cita el documento y numeral.</li><li>La prevalencia documental debe verificarse en el contrato; una síntesis o propuesta no acredita aceptación.</li><li>No acredita resultados, aceptaciones ni remisiones ACONEX/ACC. Las decisiones contractuales corresponden al Gerente de Proyecto.</li><li>La conversación se borra al cerrar la sesión o la pestaña.</li></ul></details>
<p class="small muted">Las respuestas orientan y no sustituyen el documento fuente ni la revisión del especialista. Verifique el numeral citado antes de usarlo en una comunicación contractual.</p>`;
}

export function assistantAdminPanel(c) {
  const {h, S} = c;
  if (S.member?.role !== 'admin') return '';
  const k = S.kb || {};
  return `<div class="section panel"><h3>Asistente Cx</h3><p class="small">${k.docs ? `${k.docs.length} documentos cargados · modo ${k.ai ? 'IA con citas' : 'documental (sin clave de IA configurada)'}` : 'Abra la pantalla del asistente para comprobar el estado.'}</p><form id="assistant-config-form" class="row"><label class="check"><input type="checkbox" name="enabled" ${k.enabled === false ? '' : 'checked'}> Habilitado</label><label class="small">Consultas por persona y día <input class="input compact" type="number" name="daily_limit" min="0" max="1000" value="${h(k.daily_limit ?? 80)}"></label><button class="btn ghost" type="submit">Guardar</button></form><p class="small muted">El modo IA usa la clave ANTHROPIC_API_KEY guardada como secreto de la función en Supabase; nunca se guarda en el repositorio ni en el navegador.</p></div>`;
}
