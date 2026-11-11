const {test}=require('node:test');
const assert=require('node:assert/strict');
const p=require('../site/system-process.cjs');
const sc=require('../site/specialty-core.cjs');
test('Un sistema no mezcla especialidades, IDs explícitos ni registros revocados',()=>{
 const sys={id:'s',specialty:'IIEE',payload:{code:'EL-01'}};
 const r={specialty:'IIEE',state:'BORRADOR',payload:{system_code:'EL-01'}};
 assert.equal(p.inSystem(r,sys,sc.refIncludes),true);
 assert.equal(p.inSystem({...r,specialty:'TIC'},sys,sc.refIncludes),false);
 assert.equal(p.inSystem({...r,payload:{...r.payload,system_id:'otro'}},sys,sc.refIncludes),false);
 assert.equal(p.inSystem({...r,state:'REVOCADO'},sys,sc.refIncludes),false);
});
test('Las pruebas heredan etapa del protocolo; sin sustento quedan sin clasificar',()=>{
 const protocol={id:'p',payload:{stage:'PRECOMISIONAMIENTO'}};
 assert.equal(p.stageOf({kind:'test',payload:{protocol_id:'p'}},[protocol]),'PRECOMISIONAMIENTO');
 assert.equal(p.stageOf({kind:'test',payload:{}},[]),'SIN CLASIFICAR');
 assert.equal(p.stageOf({kind:'test',payload:{level:'L3'}},[]),'PUESTA EN MARCHA');
 assert.equal(p.stageOf({kind:'om'},[]),'O&M');
});
test('Inventario conserva conexiones y exige identidad única y ubicación',()=>{
 const text='PT-01 | pozo | SPAT-A | patio norte | PL-R2 | C-01,C-02 | PT-02 | DOC-1';
 const rows=p.parseAssets(text);assert.equal(rows[0].connections,'PT-02');
 assert.deepEqual(p.parseAssets(p.assetsText(rows)),rows);
 assert.throws(()=>p.parseAssets(text+'\n'+text),/duplicados/);
 assert.throws(()=>p.parseAssets('PT-1 | pozo | A | | PL | C | PT-2 | DOC'),/ubicación/);
 assert.deepEqual(p.parseAssets(''),[]);
});
test('Cada sistema presenta siete etapas y solo sus registros, escapando datos',()=>{
 const esbuild=require('esbuild'),vm=require('node:vm'),path=require('node:path');
 const code=esbuild.buildSync({entryPoints:[path.join(__dirname,'../site/specialty-ui.js')],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text;
 const sandbox={module:{exports:{}},exports:{}};sandbox.exports=sandbox.module.exports;vm.runInNewContext(code,sandbox);
 const h=require('../site/control-core.cjs').escapeHtml;
 const records=[{id:'s',kind:'system',specialty:'IIEE',state:'BORRADOR',payload:{code:'EL-01',title:'Sistema',assets:[]}},{id:'p',kind:'protocol',specialty:'IIEE',state:'BORRADOR',payload:{code:'P',system_id:'s',system_code:'EL-01',stage:'PRECOMISIONAMIENTO',title:'Propio <script>'}},{id:'q',kind:'protocol',specialty:'TIC',state:'BORRADOR',payload:{code:'Q',system_code:'EL-01',stage:'PRECOMISIONAMIENTO',title:'AJENO'}}];
 const html=sandbox.module.exports.specialtyScreen({S:{esp:'IIEE',espTab:{IIEE:'EL-01'}},records:()=>records,h,today:'2026-11-11',button:(label,action)=>`<button data-action="${h(action)}">${h(label)}</button>`,tableRow:r=>h(r.payload.title)});
 for(const [,label]of p.STAGES)assert.ok(html.includes(label));
 assert.match(html,/Propio &lt;script&gt;/);assert.doesNotMatch(html,/AJENO/);assert.match(html,/sysnew:s:PRECOMISIONAMIENTO/);
});
