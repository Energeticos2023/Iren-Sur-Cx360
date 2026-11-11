// Navegador real con API simulada: pantalla Asistente Cx (IA con citas, modo documental, cuota y respaldo por búsqueda directa).
// No crea cuentas ni toca la base. Datos SINTÉTICOS.
// Uso: npm run build && (node scripts/preview.cjs &) && node tests/browser-assistant.cjs
const fs = require('node:fs'), assert = require('node:assert/strict'), ac = require('../site/assistant-core.cjs');
const pwPath = process.env.PLAYWRIGHT_PATH || ['/opt/npm-tools/node_modules/playwright', 'playwright'].find(p => { try { require.resolve(p); return true; } catch { return false; } });
const {chromium} = require(pwPath);
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const uid = '10000000-0000-4000-8000-000000000001', now = new Date().toISOString();
const user = {id: uid, aud: 'authenticated', role: 'authenticated', email: 'synthetic-admin@cx360.invalid', email_confirmed_at: now, app_metadata: {provider: 'email'}, user_metadata: {}};
const member = {user_id: uid, email: user.email, full_name: 'SINTÉTICO · Administrador', role: 'admin', active: true, specialty: null};
const snapshot = {cut: now, members: [member], records: [], files: [], events: [], settings: {custody_authorized: false, current_schedule: null}};
const src = (n, extra = {}) => ({n, id: 'SYN-000' + n, doc: 'AN1', doc_title: 'SINTÉTICO Anexo eléctrico', nature: 'cliente', sec: '1.11.' + n, title: 'Sección sintética ' + n, page_from: 10 + n, page_to: 10 + n, systems: ['EL-03'], snippet: 'Texto con «banco» resistivo sintético ' + n, body: 'Cuerpo completo sintético ' + n + '\n• Pértiga\n• Multímetro', score: 1 - n / 10, ...extra});
let mode = 'ia', used = 0;
const calls = [];
(async () => {
  const browser = await chromium.launch({executablePath: chrome, headless: true});
  try {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block'});
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {origin: 'http://127.0.0.1:4173'});
    const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated'})).toString('base64url'), 'synthetic'].join('.');
    await context.addInitScript(({jwt, user}) => { localStorage.setItem('sb-azajuquqksrjyfbtcujq-auth-token', JSON.stringify({access_token: jwt, refresh_token: 'synthetic', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user})); }, {jwt, user});
    await context.route('https://azajuquqksrjyfbtcujq.supabase.co/**', async route => {
      const req = route.request(), p = new URL(req.url()).pathname; let body = {}, status = 200;
      if (req.method() === 'OPTIONS') return route.fulfill({status: 204, headers: {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*'}});
      calls.push({path: p, body: req.postData()});
      if (p === '/auth/v1/user') body = user;
      else if (p === '/rest/v1/cx_members') body = [member];
      else if (p === '/rest/v1/rpc/cx_snapshot') body = snapshot;
      else if (p === '/rest/v1/rpc/cx_catalog_status') body = {batches: []};
      else if (p === '/rest/v1/rpc/cx_kb_glossary') body = [{sec: 'GLO-1', title: 'Siglas de especialidades', body: '- IIEE = Instalaciones Eléctricas.\n- IISS = Instalaciones Sanitarias.'}];
      else if (p === '/rest/v1/rpc/cx_kb_search') body = [src(1), src(2)].map(({n, ...s}) => s);
      else if (p === '/rest/v1/rpc/cx_assistant_configure') { const q = req.postDataJSON(); body = {enabled: q.p_enabled, daily_limit: q.p_daily_limit}; }
      else if (p === '/functions/v1/cx360-asistente') {
        const q = req.postDataJSON();
        if (q.action === 'status') body = {docs: [{code: 'AN1', title: 'SINTÉTICO Anexo eléctrico', nature: 'cliente', chunks: 76}, {code: 'PV3', title: 'SINTÉTICO Plan V3', nature: 'propuesta', chunks: 210}], enabled: true, daily_limit: 80, used_today: used, ai: true};
        else if (mode === 'quota') { status = 429; body = {error: 'Cuota diaria del asistente agotada (80 consultas). Se renueva a medianoche, hora de Lima.'}; }
        else if (mode === 'down') { status = 500; body = {error: 'fallo simulado'}; }
        else if (mode === 'doc2') { used++; body = {mode: 'documental', answer: '**Guía sintética** [F1]\n- Actividad uno\n\n### Fragmentos originales relacionados\n**Anexo 1 – num. 1.8** [F2]\n- Extracto literal', notice: 'Respuesta documental (sin IA): síntesis y extractos literales de las fuentes.', sources: [src(1, {doc: 'GUIA', nature: 'guia'}), src(2)], used, limit: 80}; }
        else if (mode === 'doc') { used++; body = {mode: 'documental', answer: null, notice: 'Modo documental: se muestran los fragmentos más pertinentes.', sources: [src(1), src(2), src(3)], used, limit: 80}; }
        else { used++; body = {mode: 'ia', answer: 'El grupo electrógeno se prueba en vacío y con banco resistivo [F1].\n- **Equipos:** pértiga y multímetro [F2]\n- Cita inexistente [F7]\n<img src=x onerror=alert(1)>', sources: [src(1), src(2), src(3, {nature: 'propuesta', doc: 'PV3'})], used, limit: 80, truncated: false, history: q.history}; }
      } else { body = {message: 'Solicitud no simulada: ' + p}; status = 400; }
      await route.fulfill({status, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: JSON.stringify(body)});
    });
    const page = await context.newPage(), errors = [], dialogs = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    await page.goto('http://127.0.0.1:4173'); await page.getByRole('heading', {name: 'Control de hoy', exact: true}).waitFor();
    // Botón flotante abre el asistente y se consulta el estado
    await page.locator('button.fab').click(); await page.getByRole('heading', {name: 'Asistente Cx', exact: true}).waitFor();
    await page.getByText('IA con citas').waitFor();
    assert.equal(await page.locator('button.fab').count(), 0, 'Sin botón flotante dentro del asistente');
    // Sugerencia → respuesta con citas
    await page.locator('.chipbtn').first().click();
    await page.locator('.msg.bot .answer').waitFor();
    assert.equal(await page.locator('.msg.user .bubble').first().innerText(), ac.SUGGESTIONS[0]);
    assert.match(await page.locator('.modeline').first().innerText(), /IA/i);
    await page.locator('details.glossary').waitFor({state: 'attached'}); assert.match(await page.locator('details.glossary').innerText(), /Siglas/);
    assert.equal(await page.locator('.msg.bot .answer img').count(), 0, 'HTML de la respuesta no se interpreta');
    assert.equal(await page.locator('.msg.bot .answer button.cite').count(), 2, 'Solo citas existentes se enlazan');
    assert.ok((await page.locator('.msg.bot .answer').first().innerText()).includes('[F7]'));
    assert.equal(await page.locator('.src.cited').count(), 2, 'Fuentes citadas destacadas');
    assert.equal(await page.locator('.src .chip.orange').count(), 1, 'Fuente del Plan V3 marcada como borrador');
    await page.locator('.msg.bot .answer button.cite').nth(1).click();
    assert.equal(await page.locator('.src').nth(1).evaluate(e => e.open), true, 'La cita abre su fuente');
    await page.locator('.src').nth(1).getByRole('button', {name: 'Ver fragmento completo'}).click();
    await page.locator('pre.srcbody').waitFor(); assert.match(await page.locator('pre.srcbody').innerText(), /Cuerpo completo sintético 2/);
    await page.getByRole('button', {name: 'Cerrar', exact: true}).click();
    await page.getByRole('button', {name: 'Copiar'}).first().click(); await page.getByText('Respuesta copiada con sus fuentes.').waitFor();
    const clip = await page.evaluate(() => navigator.clipboard.readText()); assert.match(clip, /\[F1\] SINTÉTICO Anexo eléctrico – num\. 1\.11\.1/); assert.ok(!clip.includes('[F3]'), 'Solo fuentes citadas al copiar');
    await page.getByText('Consultas hoy: 1/80').waitFor();
    fs.mkdirSync('tmp/browser', {recursive: true}); await page.screenshot({path: 'tmp/browser/asistente-390.png', fullPage: true});
    // Repregunta: envía historial con la respuesta previa
    await page.locator('#f-question').fill('¿Y el tiempo de prueba con banco resistivo?'); await page.getByRole('button', {name: 'Consultar', exact: true}).click();
    await page.locator('.msg.bot .answer').nth(1).waitFor();
    const second = calls.filter(c => c.path === '/functions/v1/cx360-asistente').map(c => JSON.parse(c.body)).filter(b => b.question).at(-1);
    assert.equal(second.history.length, 2); assert.equal(second.history[1].role, 'assistant');
    // Persistencia de la conversación al navegar
    await page.getByRole('button', {name: 'Hoy', exact: true}).click(); await page.locator('button.fab').click();
    assert.equal(await page.locator('.msg.user').count(), 2, 'La conversación se conserva al navegar');
    // Modo documental
    mode = 'doc'; await page.locator('#f-question').fill('EPP para maniobras de media tensión'); await page.locator('#f-question').press('Enter');
    await page.getByText('Modo documental: se muestran los fragmentos más pertinentes.').waitFor();
    assert.equal(await page.locator('.msg.bot').last().locator('details.src[open]').count(), 3, 'En modo documental se despliegan los primeros fragmentos');
    // Modo documental con respuesta compuesta (guía + extractos)
    mode = 'doc2'; await page.locator('#f-question').fill('precomisionamiento IIEE'); await page.getByRole('button', {name: 'Consultar', exact: true}).click();
    await page.getByText('Respuesta documental (sin IA) · síntesis y extractos literales de las fuentes').last().waitFor();
    assert.equal(await page.locator('.msg.bot').last().locator('.answer button.cite').count(), 2);
    assert.equal(await page.locator('.msg.bot').last().locator('.chip.blue').count(), 1, 'Guía marcada como síntesis CX360');
    // Cuota agotada
    mode = 'quota'; await page.locator('#f-question').fill('Otra consulta'); await page.getByRole('button', {name: 'Consultar', exact: true}).click();
    await page.getByText(/Cuota diaria del asistente agotada/).waitFor();
    // Servicio caído → búsqueda directa en la base documental
    mode = 'down'; await page.locator('#f-question').fill('Consulta con servicio caído'); await page.getByRole('button', {name: 'Consultar', exact: true}).click();
    await page.getByText(/No se pudo contactar al servicio del asistente/).waitFor();
    assert.ok(calls.some(c => c.path === '/rest/v1/rpc/cx_kb_search'), 'Respaldo por búsqueda directa');
    for (const w of [360, 430, 1440]) { await page.setViewportSize({width: w, height: 900}); assert.equal(await page.locator('body').evaluate(e => e.scrollWidth <= window.innerWidth), true, 'Sin desbordamiento en ' + w); }
    await page.screenshot({path: 'tmp/browser/asistente-1440.png', fullPage: false});
    // Nueva conversación
    await page.getByRole('button', {name: 'Nueva conversación'}).click(); assert.equal(await page.locator('.msg').count(), 0);
    // Administración: configuración del asistente
    await page.getByRole('button', {name: 'Administración', exact: true}).click(); await page.getByRole('heading', {name: 'Asistente Cx', exact: true}).waitFor();
    await page.locator('#assistant-config-form input[name=daily_limit]').fill('40'); await page.locator('#assistant-config-form').getByRole('button', {name: 'Guardar'}).click();
    await page.getByText('Configuración del asistente guardada en servidor.').waitFor();
    const cfg = calls.filter(c => c.path.endsWith('cx_assistant_configure')).map(c => JSON.parse(c.body)).at(-1); assert.deepEqual(cfg, {p_enabled: true, p_daily_limit: 40});
    assert.deepEqual(dialogs, [], 'Sin diálogos inyectados'); assert.deepEqual(errors, [], 'Sin errores JavaScript');
    console.log(JSON.stringify({passed: true, api: 'SIMULADA', consultas: used}));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
