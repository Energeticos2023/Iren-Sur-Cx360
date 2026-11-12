// Navegador real con API simulada: pestañas por fase dentro de una especialidad (v2.5).
// Datos SINTÉTICOS (no son del proyecto). Uso: npm run build && (node scripts/preview.cjs &) && node tests/browser-phases.cjs
const fs = require('node:fs'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const pwPath = process.env.PLAYWRIGHT_PATH || ['/opt/npm-tools/node_modules/playwright', 'playwright'].find(p => { try { require.resolve(p); return true; } catch { return false; } });
const {chromium} = require(pwPath);
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const uid = '10000000-0000-4000-8000-000000000001', now = new Date().toISOString();
const user = {id: uid, aud: 'authenticated', role: 'authenticated', email: 'synthetic-admin@cx360.invalid', email_confirmed_at: now, app_metadata: {provider: 'email'}, user_metadata: {}};
const member = {user_id: uid, email: user.email, full_name: 'SINTÉTICO · Administrador', role: 'admin', active: true, specialty: null};
const R = (kind, code, state, payload, specialty = 'IIEE') => ({id: crypto.randomUUID(), kind, specialty, assigned_to: null, state, payload: {code, title: 'SINTÉTICO ' + code, ...payload}, version: 1, created_by: uid, updated_by: uid, created_at: now, updated_at: now});
const it = (t, o = 'A', extra = {}) => ({t, o, s: 'Fuente sintética num. 1.2.3', ...extra});
const many = (n, label, o) => Array.from({length: n}, (_, i) => it(`${label} sintético ${i + 1} con un texto de longitud realista para revisar el ajuste de línea en pantallas angostas`, o));
const sysData = (code, title) => ({code, title, leader: 'IIEE / Calidad', resumen: 'Resumen sintético',
  pre: {documental: many(4, 'Documento', 'A'), fisica: many(3, 'Verificación física', 'D'), estaticas: [it('Resistencia sintética de cada elemento frente al valor del diseño', 'C', {unit: 'Ω'}), it('Continuidad sintética', 'C')], liberacion: many(2, 'Liberación', 'C')},
  cx: many(3, 'Prueba con energía', 'A'), pem: many(2, 'Operación', 'A'), om: many(3, 'Manual', 'A'), ent: many(1, 'Entrega', 'A'), cap: many(2, 'Capacitación', 'A'), instr: many(2, 'Instrumento', 'C'),
  protocolos: {pre: ['PC-' + code, 'PT-' + code + '-A'], cx: ['PT-' + code], pem: ['PI-SYN']},
  componentes: [{g: 'Subsistema sintético A', tags: ['X-01', 'X-02', 'X-03', 'X-04'], k: 'Barra sintética A', u: 'Sector sintético', s: 'Plano sintético 000001 (C01)', e: 'SEGÚN PLANO', crit: 'POR FIJAR (V-00)'}, {g: 'Subsistema sintético B', tags: ['Y-01', 'Y-02'], k: 'Barra sintética B', u: 'Sector sintético', s: 'Plano sintético 000002', crit: '< 5 Ω (sintético)'}],
  pendientes: ['Pendiente sintético 1', 'Pendiente sintético 2'], interfaces: ['SYN-02']});
const scope = {updated_at: now, common: {common: {pre: {documental: many(3, 'Común documental', 'A'), fisica: many(2, 'Común físico', 'A'), liberacion: many(2, 'Común liberación', 'C')}, cx: many(2, 'Común prueba', 'A'), pem: many(1, 'Común operación', 'A'), om: many(2, 'Común manual', 'A'), cap: many(2, 'Común capacitación', 'A'), ent: many(1, 'Común entrega', 'A')}},
  systems: {'SYN-01': sysData('SYN-01', 'Sistema sintético uno'), 'SYN-02': sysData('SYN-02', 'Sistema sintético dos')}};
const records = [R('system', 'SYN-01', 'BORRADOR', {}), R('system', 'SYN-02', 'BORRADOR', {}), R('system', 'SYN-03', 'BORRADOR', {}),
  R('protocol', 'PT-SYN-01', 'BORRADOR', {system_code: 'SYN-01', level: 'L4'}),
  R('test', 'T-SYN-1', 'NO INICIADO', {system_code: 'SYN-01', level: 'L4', witness: 'HP', protocol_code: 'PT-SYN-01', planned_start: '2099-01-11'}),
  R('activity', 'H-SYN', 'NO INICIADO', {system_code: 'SYN-01', stage: 'PRECOMISIONAMIENTO', planned_start: '2099-01-02'}),
  R('training', 'CAP-SYN', 'NO INICIADO', {system_code: 'SYN-01,SYN-02,SYN-03', planned_start: '2099-01-20'})];
const snapshot = {cut: now, members: [member], records, files: [], events: [], settings: {custody_authorized: false, current_schedule: null}};

(async () => {
  const browser = await chromium.launch({executablePath: chrome, headless: true});
  try {
    for (const [w, h] of [[390, 844], [1440, 900]]) {
      const context = await browser.newContext({viewport: {width: w, height: h}, serviceWorkers: 'block'});
      const jwt = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({sub: uid, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated'})).toString('base64url'), 'synthetic'].join('.');
      await context.addInitScript(({jwt, user}) => { localStorage.setItem('sb-azajuquqksrjyfbtcujq-auth-token', JSON.stringify({access_token: jwt, refresh_token: 'synthetic', expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600, token_type: 'bearer', user})); window.print = () => { window.__printed = (window.__printed || 0) + 1; }; }, {jwt, user});
      await context.route('https://azajuquqksrjyfbtcujq.supabase.co/**', async route => {
        const p = new URL(route.request().url()).pathname; let body = {}, status = 200;
        if (p === '/auth/v1/user') body = user;
        else if (p === '/rest/v1/cx_members') body = member;
        else if (p === '/rest/v1/rpc/cx_snapshot') body = snapshot;
        else if (p === '/rest/v1/rpc/cx_catalog_status') body = {batches: []};
        else if (p === '/rest/v1/rpc/cx_scope_matrix') body = scope;
        else { body = {message: 'no simulada ' + p}; status = 400; }
        await route.fulfill({status, contentType: 'application/json', headers: {'Access-Control-Allow-Origin': '*'}, body: JSON.stringify(body)});
      });
      const page = await context.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto('http://127.0.0.1:4173'); await page.getByRole('heading', {name: 'Control de hoy', exact: true}).waitFor();
      await page.locator('.esp-tile[data-nav="esp:IIEE"]').click(); await page.getByRole('heading', {name: 'Instalaciones Eléctricas', exact: true}).waitFor();
      const tabs = await page.locator('.phasebar .ptab').allInnerTexts();
      assert.deepEqual(tabs.map(t => t.replace(/\s+/g, ' ').trim()), ['Resumen', '1 Precomisionamiento', '2 Pruebas', '3 Puesta en marcha', '4 Manual O&M', '5 Capacitaciones']);
      // Precomisionamiento
      await page.getByRole('tab', {name: /Precomisionamiento/}).click();
      await page.locator('.phase-what h3', {hasText: 'Precomisionamiento'}).waitFor();
      assert.equal(await page.locator('.phase-sys').count(), 3, 'Un bloque por sistema');
      const first = page.locator('.phase-sys').first();
      assert.ok((await first.textContent()).includes('Qué se interviene'));
      assert.equal(await first.locator('.comp').count(), 2);
      assert.ok(!(await first.innerText()).includes('Resistencia sintética'), 'Las mediciones van en Pruebas');
      assert.ok((await first.innerText()).includes('H-SYN'));
      assert.ok((await page.locator('.phase-sys').nth(2).innerText()).includes('Sin ficha de alcance'));
      assert.equal(await page.locator('body').evaluate(e => e.scrollWidth <= window.innerWidth), true, 'Sin desbordamiento ' + w);
      fs.mkdirSync('tmp/browser', {recursive: true}); await page.screenshot({path: `tmp/browser/fase-pre-${w}.png`, fullPage: true});
      // Pruebas con filtro de sistema
      await page.getByRole('tab', {name: /Pruebas/}).click();
      await page.locator('.fchip', {hasText: 'SYN-01'}).click();
      assert.equal(await page.locator('.phase-sys').count(), 1);
      const t = await page.locator('.phase-sys').textContent();
      for (const x of ['Resistencia sintética', 'Criterio por subsistema', 'POR FIJAR (V-00)', 'T-SYN-1', 'presenciada (HP)', 'Instrumento sintético 1']) assert.ok(t.includes(x), 'Pruebas incluye ' + x);
      assert.equal(await page.locator('body').evaluate(e => e.scrollWidth <= window.innerWidth), true, 'Pruebas sin desbordamiento ' + w);
      await page.screenshot({path: `tmp/browser/fase-pruebas-${w}.png`, fullPage: true});
      // Capacitaciones, impresión y apertura del sistema
      await page.getByRole('tab', {name: /Capacitaciones/}).click();
      assert.ok((await page.locator('.phase-sys').innerText()).includes('CAP-SYN'));
      await page.getByRole('button', {name: 'Imprimir', exact: true}).click();
      assert.equal(await page.evaluate(() => window.__printed), 1);
      await page.getByRole('button', {name: 'Abrir el sistema'}).click();
      await page.locator('.sysfile').waitFor();
      assert.equal(await page.getByRole('tab', {name: 'Resumen'}).first().getAttribute('aria-selected'), 'true');
      assert.deepEqual(errors, [], 'Sin errores JS');
      await context.close();
    }
    console.log('browser-phases: OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
