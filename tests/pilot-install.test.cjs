const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const read=x=>fs.readFileSync(require('node:path').join(__dirname,'..',x),'utf8');
test('PWA instalable en iOS y Android',()=>{
 const index=read('site/index.html'),manifest=JSON.parse(read('site/manifest.webmanifest')),ui=read('site/pilot-ui.js');
 assert.match(index,/apple-touch-icon/);assert.match(index,/apple-mobile-web-app-title/);
 assert.equal(manifest.display,'standalone');assert.ok(manifest.icons.some(x=>x.sizes==='192x192'));
 assert.match(ui,/iPhone \(Safari\)/);assert.match(ui,/Android \(Chrome\)/);
 assert.match(ui,/No hay captura de pruebas sin conexión/);
});
test('Sugerencias e invitaciones no son públicas ni automáticas',()=>{
 const mobile=read('site/mobile.js'),ui=read('site/pilot-ui.js');
 assert.match(mobile,/cx_pilot_feedback/);assert.match(mobile,/cx_pilot_roster/);
 assert.match(mobile,/confirm_email_send/);assert.match(mobile,/invite-roster:/);
 assert.match(ui,/pilot-feedback-form/);
 assert.doesNotMatch(ui,/@gmail\.com|@hotmail\.com|@anin\.gob\.pe/);
});
