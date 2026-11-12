const {test}=require('node:test'),assert=require('node:assert/strict'),esbuild=require('esbuild'),vm=require('node:vm');
const ac=require('../site/assistant-core.cjs');
const code=esbuild.buildSync({entryPoints:['site/assistant-ui.js'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text;
const box={module:{exports:{}},exports:{}};vm.runInNewContext(code,box);const ui=box.module.exports;
const options=(rows,selected)=>rows.map(([v,label])=>`<option value="${ac.escapeHtml(v)}" ${v===selected?'selected':''}>${ac.escapeHtml(label)}</option>`).join('');
test('Pantalla de soporte conserva un contexto sin registros y escapa títulos',()=>{
 const html=ui.assistantScreen({h:ac.escapeHtml,button:()=>'',options,disciplines:{IIEE:'Eléctricas'},S:{chat:{system:'EL-01',phase:'pre',specialty:'IIEE',messages:[]}},records:()=>[]});
 assert.match(html,/value="EL-01" selected/);assert.match(html,/value="pre" selected/);
 assert.match(html,/no acreditan que todo el expediente/);
});
test('Selector solo presenta sistemas de la disciplina y bloquea cambios durante consulta',()=>{
 const html=ui.assistantScreen({h:ac.escapeHtml,button:()=>'',options,disciplines:{IIEE:'Eléctricas'},S:{chat:{specialty:'IIEE',asking:true,messages:[]}},records:()=>[{kind:'system',specialty:'IIEE',payload:{code:'EL-01',title:'<script>x</script>'}},{kind:'system',specialty:'IISS',payload:{code:'SA-01'}}]});
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('SA-01'));assert.match(html,/id="f-ask-phase" disabled/);
});
