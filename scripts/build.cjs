const fs=require('node:fs');const path=require('node:path');const esbuild=require('esbuild');
(async()=>{
 fs.mkdirSync('dist',{recursive:true});
 for(const name of ['index.html','styles.css','manifest.webmanifest','sw.js','robots.txt'])fs.copyFileSync(path.join('site',name),path.join('dist',name));
 fs.cpSync('site/assets','dist/assets',{recursive:true});
 fs.writeFileSync('dist/.nojekyll','');
 const config=JSON.parse(fs.readFileSync('site/public-config.json','utf8'));
 if(!config.publishableKey?.startsWith('sb_publishable_'))throw Error('Falta la clave pública del proyecto exclusivo');
 await esbuild.build({entryPoints:['site/mobile.js'],outfile:'dist/app.js',bundle:true,format:'esm',minify:true,target:['safari16','chrome110'],legalComments:'eof',define:{'process.env.NODE_ENV':'"production"','__CX360_PUBLISHABLE_KEY__':JSON.stringify(config.publishableKey)}});
 console.log('CX360 compilado. Sin expedientes ni credenciales secretas en dist/.');
})().catch(e=>{console.error(e);process.exitCode=1});
