const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../site/assets/sustenta-revision-20261114.html'),'utf8');
const code=html.slice(html.lastIndexOf('<script>')+8,html.lastIndexOf('</script>'));
class Element{
 constructor(tag='div'){this.tagName=tag;this.value='';this.textContent='';this.children=[];this.dataset={};this.attributes={};this.events={};this.disabled=false;this.checked=false;this.classes=new Set();this.classList={add:(...v)=>v.forEach(x=>this.classes.add(x)),remove:(...v)=>v.forEach(x=>this.classes.delete(x)),contains:v=>this.classes.has(v),toggle:(v,force)=>{const on=force??!this.classes.has(v);on?this.classes.add(v):this.classes.delete(v);return on;}};}
 set className(value){this.classes=new Set(value.split(/\s+/));} get className(){return [...this.classes].join(' ');}
 append(...items){this.children.push(...items);} replaceChildren(...items){this.children=items;}
 get lastElementChild(){return this.children.at(-1);}
 setAttribute(k,v){this.attributes[k]=v;} removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 async emit(k,event={}){for(const fn of this.events[k]||[])await fn({preventDefault(){},...event});}
 querySelector(){return this.submit??=new Element('button');}
 querySelectorAll(selector){return this.children.filter(e=>e.tagName===selector);}
 focus(){} scrollIntoView(){} click(){return this.emit('click');} remove(){}
}
function fixture(fetchImpl=async()=>{throw Error('Unexpected network request');}){
 const elements={};for(const m of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const e=new Element();e.className=m[0].match(/class="([^"]*)"/)?.[1]||'';elements[m[1]]=e;}
 const filters=['all','critica','mayor','menor'].map(v=>{const e=new Element('button');e.dataset.severity=v;return e;});
 const steps=['stepUpload','stepReview','stepEdit'].map(id=>elements[id]);
 const skip=new Element('a');
 const document={getElementById:id=>elements[id],querySelector:()=>skip,querySelectorAll:selector=>selector==='[data-severity]'?filters:steps,createElement:tag=>new Element(tag),body:new Element('body')};
 const ctx=vm.createContext({document,window:{addEventListener(){}},fetch:fetchImpl,console,AbortController,setTimeout,clearTimeout,Blob,URL,confirm:()=>true,navigator:{clipboard:{writeText:async()=>{}}}});
 vm.runInContext(code.replace(/\}\)\(\);\s*$/, 'globalThis.app={S,AI,UX,start,aiRequest,checkAI,analyzeWithAI,chatWithAI,fileSelected,leaveWorkspace,updateDraftState,showStructuredReview,filterFindings};})();'),ctx);
 return {app:ctx.app,el:elements,filters,ctx};
}
const response=(body,status=200)=>({ok:status<400,status,text:async()=>JSON.stringify(body)});
const original='Señor responsable: Solicito la constancia de prestación de servicios. Atentamente, Profesional.';
function load(f){f.app.start({name:'Carta.txt'},original);}

test('SUSTENTA: ambos accesos mantienen el mismo código y CSS local',()=>{
 assert.equal(fs.readFileSync(path.join(__dirname,'../site/assets/sustenta.html'),'utf8'),html);
 assert.ok(fs.existsSync(path.join(__dirname,'../site/assets/sustenta-ui.css')));
 new vm.Script(code);
});
test('SUSTENTA: el ejemplo nunca solicita IA ni permite cargar archivos',async()=>{
 const f=fixture();await f.el.openDemo.emit('click');
 assert.equal(f.app.UX.demo,true);assert.equal(f.app.AI.token,null);
 assert.equal(f.el.analyzeAI.disabled,true);assert.equal(f.el.file.disabled,true);
 await f.app.analyzeWithAI();await f.app.fileSelected({name:'privado.txt'});
 assert.equal(f.app.S.filename,'Carta_de_ejemplo.txt');assert.match(f.el.aiAnswer.textContent,/ni se envía contenido/i);
});
test('SUSTENTA: entrar requiere autenticación y autorización del servidor',async()=>{
 let calls=0;const f=fixture(async()=>++calls===1?response({access_token:'test-token'}):response({error:'Sin autorización'},403));
 f.el.mainApp.classList.add('hidden');f.el.authEmail.value='example@example.test';f.el.authPassword.value='dummy';
 await f.el.loginForm.emit('submit');
 assert.equal(f.app.AI.token,null);assert.equal(f.el.mainApp.classList.contains('hidden'),true);
 assert.match(f.el.authMessage.textContent,/no tiene autorización/);assert.equal(f.el.loginButton.disabled,false);
});
test('SUSTENTA: una cuenta autorizada entra aunque no haya clave IA configurada',async()=>{
 let calls=0;const f=fixture(async()=>++calls===1?response({access_token:'test-token'}):response({authorized:true,available:false}));
 f.el.mainApp.classList.add('hidden');f.el.authPassword.value='dummy';await f.el.loginForm.emit('submit');
 assert.equal(f.el.mainApp.classList.contains('hidden'),false);assert.equal(f.app.AI.available,false);assert.equal(f.el.authPassword.value,'');
});
test('SUSTENTA: analizar y conversar envían el texto editado',async()=>{
 const bodies=[];const f=fixture(async(url,options)=>{bodies.push(JSON.parse(options.body));return response({answer:'Resultado'});});load(f);f.app.AI.token='test';
 f.el.draft.value='Documento editado: '+original;await f.app.aiRequest('analyze');await f.app.aiRequest('chat','¿Qué debo corregir?');
 assert.equal(bodies.length,2);for(const body of bodies)assert.equal(body.document,f.el.draft.value);
});
test('SUSTENTA: revalidar conexión no dispara otro análisis de pago',async()=>{
 const actions=[];const f=fixture(async(url,options)=>{actions.push(JSON.parse(options.body).action);return response({available:true});});f.app.AI.token='test';load(f);
 await f.el.recheckAI.emit('click');assert.deepEqual(actions,['status']);
});
test('SUSTENTA: análisis y chat simultáneos no duplican consultas',async()=>{
 let finish,calls=0;const f=fixture(()=>{calls++;return new Promise(resolve=>finish=resolve);});load(f);f.app.AI.token='test';f.app.AI.available=true;
 const pending=f.app.analyzeWithAI();await f.app.analyzeWithAI();await f.app.chatWithAI('Consulta duplicada');
 assert.equal(calls,1);assert.equal(f.el.reply.disabled,true);
 finish(response({answer:'Revisión completada'}));await pending;
 assert.equal(f.app.UX.analyzing,false);assert.equal(f.el.reply.disabled,false);
});
test('SUSTENTA: cerrar sesión descarta respuestas tardías y limpia el documento',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>finish=resolve));load(f);f.app.AI.token='test';f.app.AI.available=true;
 const pending=f.app.analyzeWithAI();f.app.leaveWorkspace();finish(response({answer:'CONTENIDO ANTERIOR'}));await pending;
 assert.equal(f.app.AI.token,null);assert.equal(f.app.S.text,'');assert.equal(f.el.draft.value,'');assert.equal(f.el.aiAnswer.textContent,'');assert.equal(f.app.UX.controllers.size,0);
});
test('SUSTENTA: una carga fallida conserva el documento actual',async()=>{
 const f=fixture();load(f);f.app.AI.token='test';
 await f.app.fileSelected({name:'otro.exe',size:100});
 assert.equal(f.app.S.filename,'Carta.txt');assert.equal(f.el.draft.value,original);assert.match(f.el.loading.textContent,/Formato no compatible/);
 assert.equal(f.app.UX.loading,false);
});
test('SUSTENTA: Word no puede descargarse sin confirmación y PDF/TXT no se convierten a Word',async()=>{
 const f=fixture();load(f);assert.equal(f.el.download.disabled,true);assert.equal(f.el.draftDownload.disabled,true);
 f.el.checked.checked=true;await f.el.checked.emit('change');assert.equal(f.el.download.disabled,true);
 f.app.S.originalDocx={};f.app.S.originalLines=[original];load(f);assert.equal(f.el.download.disabled,true);
 f.el.checked.checked=true;await f.el.checked.emit('change');assert.equal(f.el.download.disabled,false);
 f.el.draft.value+=' Cambio';await f.el.draft.emit('input');assert.equal(f.el.checked.checked,false);assert.equal(f.el.download.disabled,true);
});
test('SUSTENTA: avisa cuando el texto ya no coincide con el análisis',async()=>{
 const f=fixture();load(f);f.app.UX.reviewText=original;f.el.draft.value+=' Corrección';await f.el.draft.emit('input');
 assert.equal(f.app.UX.dirty,true);assert.equal(f.el.staleReview.classList.contains('hidden'),false);
 await f.el.restoreDraft.emit('click');assert.equal(f.el.draft.value,original);assert.equal(f.el.staleReview.classList.contains('hidden'),true);
});
test('SUSTENTA: filtrar conserva las severidades y no interpreta HTML de IA',async()=>{
 const f=fixture();f.app.showStructuredReview({observaciones:[{id:'1',severidad:'critica',problema:'<img onerror=alert(1)>'},{id:'2',severidad:'menor',problema:'Redacción'}]});
 const cards=f.el.aiReviewFindings.querySelectorAll('article');assert.equal(cards.length,2);assert.match(cards[0].children[1].textContent,/<img/);
 await f.filters[1].emit('click');assert.equal(cards[0].classList.contains('hidden'),false);assert.equal(cards[1].classList.contains('hidden'),true);assert.match(f.el.filterCount.textContent,/1 de 2/);
});
