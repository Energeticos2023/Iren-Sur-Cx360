// Navegador real con API simulada: Plan Cx, seguimiento, protocolos de campo y carga de catálogo.
// No crea cuentas ni toca la base. Datos SINTÉTICOS salvo que CX360_SEED apunte a un lote local privado (no versionado).
// Uso: npm run build && (node scripts/preview.cjs &) && node tests/browser-plan.cjs
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const pwPath=process.env.PLAYWRIGHT_PATH||['/opt/npm-tools/node_modules/playwright','playwright'].find(p=>{try{require.resolve(p);return true}catch{return false}});
const {chromium}=require(pwPath);
const chrome=process.env.CHROME_PATH||'/usr/bin/google-chrome';
const uid='10000000-0000-4000-8000-000000000001',now=new Date().toISOString();
const user={id:uid,aud:'authenticated',role:'authenticated',email:'synthetic-admin@cx360.invalid',email_confirmed_at:now,app_metadata:{provider:'email'},user_metadata:{}};
const member={user_id:uid,email:user.email,full_name:'SINTÉTICO · Administrador',role:'admin',active:true,specialty:null};
function synthetic(){
 const S=(kind,code,state,payload,specialty='IIEE')=>({id:require('node:crypto').randomUUID(),batch:'PLANCX-V3',kind,specialty,state,payload:{code,title:'SINTÉTICO '+code,provisional:true,...payload}});
 const prot=S('protocol','PT-SYN-01','BORRADOR',{system_code:'SYN-01',level:'L4',witness:'HP',package:'P1',fields:[{key:'a',label:'Verificación sintética',criterion:'Conforme',source:'SINTÉTICO',type:'check',section:'Pruebas'},{key:'b',label:'Medición sintética',unit:'min',criterion:'POR FIJAR (V-00)',source:'SINTÉTICO',type:'measure',section:'Mediciones'}]});
 return [S('system','SYN-01','BORRADOR',{leader_support:'IIEE',sectors:'ZE'}),prot,
  S('test','T-SYN-HP','NO INICIADO',{system_code:'SYN-01',level:'L4',witness:'HP',protocol_code:'PT-SYN-01',protocol_id:prot.id,planned_start:'2099-01-20',aconex_notice_by:'2000-01-01'}),
  S('activity','H-SYN','NO INICIADO',{milestone:true,stage:'CIERRE',planned_start:'2099-02-20',planned_finish:'2099-02-20',total_float_days:0,critical:true}),
  S('restriction','D-SYN','EN PROCESO',{type:'DECISIÓN GP',due_date:'2000-01-01'},null),
  S('document','PKG-SYN','BORRADOR',{planned_submit:'2000-01-01',planned_start:'2000-01-01',planned_finish:'2000-01-15',planned_response:'2000-01-15'},null)];
}
const seed=process.env.CX360_SEED?JSON.parse(fs.readFileSync(process.env.CX360_SEED,'utf8')).map(r=>({...r,batch:'PLANCX-V3'})):synthetic();
const asRecord=r=>({id:r.id,kind:r.kind,specialty:r.specialty,assigned_to:null,state:r.state,payload:{...r.payload,catalog_batch:'PLANCX-V3'},version:1,created_by:uid,updated_by:uid,created_at:now,updated_at:now});
let snapshot={cut:now,members:[member],records:[],files:[],events:[],settings:{custody_authorized:false,current_schedule:null}};
const calls=[];
async function go(page,name){const b=page.getByRole('button',{name,exact:true});if(!(await b.count())){await page.getByRole('button',{name:'Menú'}).click();await page.locator('.menu-open .side').waitFor();}await page.getByRole('button',{name,exact:true}).first().click();}

(async()=>{
 const browser=await chromium.launch({executablePath:chrome,headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const jwt=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'synthetic'].join('.');
  await context.addInitScript(({jwt,user})=>{localStorage.setItem('sb-azajuquqksrjyfbtcujq-auth-token',JSON.stringify({access_token:jwt,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));window.print=()=>{window.__printed=(window.__printed||0)+1}},{jwt,user});
  await context.route('https://azajuquqksrjyfbtcujq.supabase.co/**',async route=>{
   const req=route.request(),p=new URL(req.url()).pathname;let body={},status=200;calls.push({path:p,body:req.postData()});
   if(p==='/auth/v1/user')body=user;
   else if(p==='/rest/v1/cx_members')body=[member];
   else if(p==='/rest/v1/rpc/cx_snapshot')body=snapshot;
   else if(p==='/rest/v1/rpc/cx_catalog_status')body={batches:[{batch:'PLANCX-V3',available:seed.length,loaded:snapshot.records.filter(r=>r.payload.catalog_batch).length}]};
   else if(p==='/rest/v1/rpc/cx_load_catalog'){const add=seed.filter(s=>!snapshot.records.some(r=>r.id===s.id)).map(asRecord);snapshot.records.push(...add);body={batch:'PLANCX-V3',inserted:add.length,not_loaded:0}}
   else if(p==='/rest/v1/rpc/cx_save_record'){const q=req.postDataJSON();const old=snapshot.records.find(r=>r.id===q.p_id);if(old&&old.version!==q.p_expected_version){status=409;body={message:'conflicto de versión'}}else{body={...(old||{}),id:q.p_id,kind:q.p_kind,specialty:q.p_specialty,assigned_to:q.p_assigned_to,state:q.p_state,payload:q.p_payload,version:q.p_expected_version+1,created_by:uid,updated_by:uid,created_at:now,updated_at:now};snapshot.records=snapshot.records.filter(r=>r.id!==q.p_id).concat(body)}}
   else{body={message:'Solicitud no simulada: '+p};status=400}
   await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173');await page.getByRole('heading',{name:'Control de hoy',exact:true}).waitFor();
  // Carga de catálogo
  await page.getByRole('button',{name:'Plan Cx',exact:true}).click();await page.getByRole('heading',{name:'Plan Cx – línea base propuesta'}).waitFor();
  await page.getByRole('button',{name:'Cargar catálogo en CX360'}).first().click();
  await page.locator('#catalog-form input[type=checkbox]').check();await page.getByRole('button',{name:'Cargar catálogo',exact:true}).click();
  await page.getByText(/Catálogo cargado: \d+ registros nuevos/).waitFor();
  assert.ok(calls.some(c=>c.path.endsWith('cx_load_catalog')&&JSON.parse(c.body).p_batch==='PLANCX-V3'),'Carga por RPC con lote explícito');
  const systems=seed.filter(r=>r.kind==='system').length;
  assert.equal(await page.locator('table.matrix tbody tr').count(),systems,'Matriz con todos los sistemas');
  assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth),true,'Plan Cx sin desbordamiento a 390 px');
  fs.mkdirSync('tmp/browser',{recursive:true});await page.screenshot({path:'tmp/browser/plan-390.png',fullPage:true});
  // Especialidad con pestaña por sistema
  await page.getByRole('button',{name:'Eléctricas',exact:true}).click();await page.getByRole('heading',{name:'Instalaciones Eléctricas',exact:true}).waitFor();
  const sys=seed.find(r=>r.kind==='system'&&r.specialty==='IIEE');
  await page.getByRole('tab',{name:new RegExp(sys.payload.code)}).click();
  assert.equal(await page.getByRole('tab',{name:new RegExp(sys.payload.code)}).getAttribute('aria-selected'),'true','Pestaña del sistema activa');
  await page.locator('.sysfile').waitFor();assert.ok((await page.locator('.esp-body').innerText()).includes(sys.payload.code));
  assert.equal(await page.locator('ol.track li').count(),5,'Avance L1 a L5');
  assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth),true,'Especialidad sin desbordamiento a 390 px');
  await page.screenshot({path:'tmp/browser/especialidad-390.png',fullPage:true});
  // Seguimiento
  await page.getByRole('button',{name:'Seguimiento',exact:true}).click();await page.getByRole('heading',{name:'Seguimiento y alertas'}).waitFor();
  assert.ok(await page.locator('text=Avisos ACONEX de pruebas presenciadas').count()===1);
  await page.screenshot({path:'tmp/browser/seguimiento-390.png',fullPage:true});
  // Protocolo de campo: vista previa e impresión
  const hp=seed.find(r=>r.kind==='test'&&String(r.payload.witness).startsWith('HP')),prot=seed.find(r=>r.id===hp.payload.protocol_id);
  await go(page,'Protocolos');await page.locator('#search').fill(prot.payload.code);await page.getByRole('button',{name:'Buscar',exact:true}).click();
  await page.getByRole('button',{name:'Protocolo en blanco'}).first().click();
  const printed=await page.evaluate(()=>({n:window.__printed||0,rows:document.querySelectorAll('#print-report .pbody tbody tr:not(.psec)').length}));
  assert.equal(printed.n,1,'Se invoca impresión');assert.equal(printed.rows,prot.payload.fields.length,'Todos los campos en el protocolo impreso');
  await page.getByRole('button',{name:'Ver / revisar'}).first().click();await page.locator('.panel.tight').first().waitFor();
  assert.match(await page.locator('#f-fields_text').inputValue(),/\| (check|measure|text) \|/,'Tipo y sección se conservan al editar');
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  // Prueba HP: campos agrupados, SÍ→CONFORME y aviso ACONEX
  await go(page,'Pruebas');await page.locator('#search').fill(hp.payload.code);await page.getByRole('button',{name:'Buscar',exact:true}).click();
  await page.getByRole('button',{name:'Ver / revisar'}).first().click();await page.locator('fieldset.protosec').first().waitFor();
  assert.equal(await page.locator('#f-state').inputValue(),'NO INICIADO','El estado cargado no se altera al abrir');
  assert.notEqual(await page.locator('#f-protocol_id').inputValue(),'','El vínculo al protocolo en borrador se conserva');
  const chk=page.locator('select[data-check]').first();const key=await chk.getAttribute('data-check');await chk.selectOption('SÍ');
  assert.equal(await page.locator(`select[name="result:${key}"]`).inputValue(),'CONFORME','SÍ propone CONFORME');
  await page.getByRole('button',{name:'Cerrar',exact:true}).click();
  await page.getByRole('button',{name:/Registrar aviso ACONEX/}).first().click();
  await page.locator('#f-aconex_notice_ref').fill('SINTETICO-0001');await page.locator('#f-aconex_notice_on').fill('2026-11-10');await page.getByRole('button',{name:'Guardar referencia'}).click();
  await page.getByText('Referencia del aviso ACONEX registrada en servidor.').waitFor();
  const save=calls.filter(c=>c.path.endsWith('cx_save_record')).map(c=>JSON.parse(c.body)).at(-1);
  assert.equal(save.p_payload.aconex_notice_ref,'SINTETICO-0001');assert.equal(save.p_state,'NO INICIADO','El aviso no cambia el estado de la prueba');assert.equal(save.p_payload.protocol_id,hp.payload.protocol_id);
  await page.getByRole('button',{name:'Seguimiento',exact:true}).click();await page.getByText('SINTETICO-0001').first().waitFor();
  for(const w of [360,430,1440]){await page.setViewportSize({width:w,height:900});assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth),true,'Sin desbordamiento en '+w)}
  await page.getByRole('button',{name:'Plan Cx',exact:true}).click();await page.screenshot({path:'tmp/browser/plan-1440.png',fullPage:false});
  assert.deepEqual(errors,[],'Sin errores JavaScript');
  console.log(JSON.stringify({passed:true,records:seed.length,systems,source:process.env.CX360_SEED?'lote local privado':'sintético',api:'SIMULADA'}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
