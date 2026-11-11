const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../site/app.js'),'utf8').split('\nstart().catch')[0];
function context(){const el={innerHTML:''};const ctx=vm.createContext({console,Intl,Date,setTimeout,document:{querySelector:()=>el,addEventListener:()=>{}}});vm.runInContext(source,ctx);return {ctx,el};}
test('Una consulta fallida no produce ceros ni conserva datos anteriores',async()=>{const {ctx,el}=context();vm.runInContext("state.records={activities:[{code:'anterior'}]};fetchTable=async()=>{throw new Error('red')}",ctx);await assert.rejects(vm.runInContext('loadAll()',ctx),/red/);assert.equal(vm.runInContext('Object.keys(state.records).length',ctx),0);vm.runInContext('render()',ctx);assert.match(el.innerHTML,/Consulta no disponible/);assert.doesNotMatch(el.innerHTML,/Actividades de hoy/);});
test('Una recuperación completa restaura datos e indicadores',async()=>{const {ctx}=context();vm.runInContext("state.loadError='red';fetchTable=async table=>[{table}]",ctx);await vm.runInContext('loadAll()',ctx);assert.equal(vm.runInContext('state.loadError',ctx),null);assert.equal(vm.runInContext('Object.keys(state.records).length',ctx),9);});
test('El catálogo filtra actividades por sistema',()=>{const {ctx}=context();const html=vm.runInContext("state.selectedSystem='a';state.records={activities:[{system_id:'a',title:'Incluida'},{system_id:'b',title:'Ajena'}]};screenCronograma()",ctx);assert.match(html,/Incluida/);assert.doesNotMatch(html,/Ajena/);});
test('Los textos registrados escapan HTML',()=>{const {ctx}=context();assert.equal(vm.runInContext(`safe('<img onerror="alert(1)">')`,ctx),'&lt;img onerror=&quot;alert(1)&quot;&gt;');});
