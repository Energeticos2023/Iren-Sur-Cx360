// Navegador real con API simulada: no crea cuentas ni remite documentos.
const {chromium}=require('C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1110-778-0_26.1110.778.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const uid='10000000-0000-4000-8000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'synthetic-admin@cx360.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}};
const member={user_id:uid,email:user.email,full_name:'SINTÉTICO · Prueba de interfaz',role:'admin',active:true,specialty:null};
const now=new Date().toISOString();
let snapshot={cut:now,members:[member],records:[],files:[],events:[],settings:{custody_authorized:false,current_schedule:null}};
let failSnapshot=false;const calls=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const cold=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});const page=await cold.newPage();
  await page.goto('http://127.0.0.1:4173');await page.getByRole('button',{name:'Ingresar',exact:true}).waitFor();
  assert.equal(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth),true,'Login sin desbordamiento');
  await cold.close();
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',acceptDownloads:true});
  const jwt=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:uid,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url'),'synthetic'].join('.');
  await context.addInitScript(({jwt,user})=>localStorage.setItem('sb-azajuquqksrjyfbtcujq-auth-token',JSON.stringify({access_token:jwt,refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{jwt,user});
  await context.route('https://azajuquqksrjyfbtcujq.supabase.co/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;let body={},status=200;calls.push({path,method:req.method(),body:req.postData()});
   if(path==='/auth/v1/user')body=user;
   else if(path==='/rest/v1/cx_members')body=[member];
   else if(path==='/rest/v1/rpc/cx_snapshot'){body=snapshot;if(failSnapshot){body={message:'red sintética no disponible'};status=503}}
   else if(path==='/rest/v1/rpc/cx_save_record'){const p=req.postDataJSON();body={id:p.p_id,kind:p.p_kind,specialty:p.p_specialty,assigned_to:p.p_assigned_to,state:p.p_state,payload:p.p_payload,version:p.p_expected_version+1,created_by:uid,updated_by:uid,created_at:now,updated_at:now};snapshot.records=snapshot.records.filter(r=>r.id!==body.id).concat(body)}
   else if(path==='/rest/v1/rpc/cx_import_schedule'){const p=req.postDataJSON();body={id:p.p_id,kind:'schedule',specialty:null,assigned_to:null,state:'BORRADOR',payload:p.p_payload,version:1,created_by:uid,updated_by:uid,created_at:now,updated_at:now};snapshot.records.push(body)}
   else {body={message:'Solicitud no simulada: '+path};status=400}
   await route.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(body)});
  });
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:4173');await p.getByRole('heading',{name:'Control de hoy',exact:true}).waitFor();
  assert.equal(await p.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth),true,'Panel sin desbordamiento');
  for(const name of ['Actividades','Cronogramas','Sistemas','Documentos','Protocolos','Pruebas','Restricciones','Instrumentos','O&M','Capacitación','Entrega y cierre','Reprogramaciones','Cobertura de avance','Historial','Administración']){
   await p.getByRole('button',{name,exact:true}).click();await p.getByRole('heading',{name:name==='Administración'?'Administración y seguridad':name==='Historial'?'Historial y trazabilidad':name,exact:true}).waitFor();
  }
  await p.getByRole('button',{name:'Actividades',exact:true}).click();await p.getByRole('button',{name:'Nuevo registro',exact:true}).click();
  await p.locator('#f-code').fill('SYN-A');await p.locator('#f-title').fill('SINTÉTICO · actividad móvil');await p.locator('#f-specialty').selectOption('IIEE');
  await p.getByRole('button',{name:'Guardar y comprobar'}).click();await p.getByText('SYN-A · SINTÉTICO · actividad móvil',{exact:true}).waitFor();
  assert.ok(calls.some(c=>c.path.endsWith('cx_save_record')&&JSON.parse(c.body).p_expected_version===0),'Formulario escribe por RPC');
  await p.getByRole('button',{name:'Cronogramas',exact:true}).click();await p.getByRole('button',{name:'Importar a revisión'}).click();
  const csv='code,title,specialty,stage,system_code,equipment_tag,responsible,planned_start,planned_finish,predecessors\r\n01,SINTETICO,IIEE,PRECOMISIONAMIENTO,SYN,SYN-TAG,SINTETICO,2026-11-01,2026-11-02,\r\n';
  await p.locator('#f-file').setInputFiles({name:'SINTETICO.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  for(const [name,value]of Object.entries({code:'SYN-S',title:'SINTETICO',revision:'R1',source_ref:'SINTETICO',work_days:'1,2,3,4,5'}))await p.locator('#f-'+name).fill(value);
  await p.getByRole('button',{name:'Validar y comparar'}).click();await p.getByRole('heading',{name:'Validación estructural satisfactoria'}).waitFor();
  await p.getByRole('button',{name:'Guardar BORRADOR sin activar'}).click();await p.getByText('SYN-S · SINTETICO',{exact:true}).waitFor();
  assert.ok(calls.some(c=>c.path.endsWith('cx_import_schedule')),'Importación pasa por transacción de servidor');
  await p.getByRole('button',{name:'Reporte',exact:true}).click();const downloadPromise=p.waitForEvent('download');await p.getByRole('button',{name:'Descargar XLSX'}).click();const download=await downloadPromise;
  fs.mkdirSync('tmp/browser',{recursive:true});await download.saveAs('tmp/browser/SINTETICO.xlsx');assert.ok(fs.statSync('tmp/browser/SINTETICO.xlsx').size>1000,'XLSX descargado');
  await p.getByRole('button',{name:'Cerrar',exact:true}).click();await p.getByRole('button',{name:'Hoy',exact:true}).click();
  await p.screenshot({path:'tmp/browser/mobile-390.png',fullPage:true});
  for(const width of [360,430,1440]){await p.setViewportSize({width,height:900});assert.equal(await p.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth),true,'Sin desbordamiento en '+width)}
  failSnapshot=true;await p.getByRole('button',{name:'Actualizar',exact:true}).click();await p.getByRole('heading',{name:'Consulta no disponible'}).waitFor();assert.equal(await p.getByRole('heading',{name:'Control de hoy',exact:true}).count(),0,'No hay datos viejos ante fallo');
  failSnapshot=false;await p.getByRole('button',{name:'Reintentar',exact:true}).click();await p.getByRole('heading',{name:'Control de hoy',exact:true}).waitFor();
  assert.deepEqual(errors,[],'Sin errores JavaScript en navegador');console.log(JSON.stringify({passed:true,modules:15,viewports:[360,390,430,1440],rpcCreate:true,scheduleImport:true,xlsxDownload:true,failedQueryClearsUI:true,api:'SIMULADA; backend probado por separado en SQL'}));
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
