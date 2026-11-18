// OOXML de solo lectura. Las macros nunca se ejecutan. Sin dependencias de red.
export async function unzip(buffer){
 const view=new DataView(buffer), bytes=new Uint8Array(buffer), decode=new TextDecoder(), files={};let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break}
 if(end<0)throw Error('El archivo no es un XLSX/XLSM válido.');
 let pos=view.getUint32(end+16,true),total=0;
 for(let i=0;i<view.getUint16(end+10,true);i++){
  if(view.getUint32(pos,true)!==0x02014b50)throw Error('Directorio ZIP inválido.');
  const method=view.getUint16(pos+10,true), compressed=view.getUint32(pos+20,true),size=view.getUint32(pos+24,true),nameLength=view.getUint16(pos+28,true),extra=view.getUint16(pos+30,true),comment=view.getUint16(pos+32,true),offset=view.getUint32(pos+42,true),name=decode.decode(bytes.slice(pos+46,pos+46+nameLength));pos+=46+nameLength+extra+comment;
  if(!name.endsWith('.xml')&&!name.endsWith('.rels'))continue;
  total+=size;if(size>40000000||total>100000000)throw Error('Contenido descomprimido demasiado grande.');
  const start=offset+30+view.getUint16(offset+26,true)+view.getUint16(offset+28,true), data=bytes.slice(start,start+compressed);
  if(method===0)files[name]=decode.decode(data);else if(method===8){try{files[name]=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text()}catch{throw Error('Este navegador no puede leer XLSM. Carga el JSON generado con importar.py.')}}else throw Error('Compresión ZIP no compatible.');
 }return files;
}
const xml=s=>{const doc=new DOMParser().parseFromString(s||'','application/xml');if(doc.querySelector('parsererror'))throw Error('XML inválido en el Registro.');return doc};
const date=v=>{if(!v)return '';if(!isNaN(Number(v)))return new Date(Date.UTC(1899,11,30)+Number(v)*86400000).toISOString().slice(0,10);const s=String(v).trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);const m=s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);const iso=m?`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:'';return iso&&!isNaN(Date.parse(iso))&&new Date(iso+'T12:00:00Z').toISOString().slice(0,10)===iso?iso:s};
export async function readWorkbook(file,cutoff){
 const buffer=await file.arrayBuffer(), files=await unzip(buffer), workbook=xml(files['xl/workbook.xml']);
 if(workbook.querySelector('workbookPr')?.getAttribute('date1904')==='1')throw Error('Calendario Excel 1904 no compatible. Usa el importador Python.');
 const sheets=[...workbook.getElementsByTagName('sheet')], sheet=sheets.find(x=>x.getAttribute('name').trim()==='IREN -SUR');if(!sheet)throw Error('No se encuentra la hoja IREN -SUR.');
 const relation=sheet.getAttribute('r:id'), rel=[...xml(files['xl/_rels/workbook.xml.rels']).getElementsByTagName('Relationship')].find(x=>x.getAttribute('Id')===relation),target=rel?.getAttribute('Target');if(!target)throw Error('No se encuentra la hoja del Registro.');const path=target.startsWith('/')?target.slice(1):'xl/'+target;
 const strings=files['xl/sharedStrings.xml']?[...xml(files['xl/sharedStrings.xml']).getElementsByTagName('si')].map(x=>[...x.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
 const alerts=[];let current;
 for(const row of xml(files[path]).getElementsByTagName('row')){const rownum=Number(row.getAttribute('r'));if(rownum<16)continue;const r=[];for(const cell of row.getElementsByTagName('c')){const col=cell.getAttribute('r').replace(/\d/g,'');let n=0;for(const ch of col)n=n*26+ch.charCodeAt(0)-64;const raw=cell.getElementsByTagName('v')[0]?.textContent||'';r[n-1]=cell.getAttribute('t')==='s'?strings[Number(raw)]||'':cell.getAttribute('t')==='inlineStr'?[...cell.getElementsByTagName('t')].map(x=>x.textContent).join(''):raw}const s=i=>String(r[i]||'').trim();
  if(r[9]&&r[4]&&r[12]){const title=s(12),code=s(4),match=title.match(/ALERTA\s*TEMPRANA\s*N[°º.\s]*([0-9]+)/i);current={id:`${code}|${rownum}`,index:Number(r[9]),code,number:match?.[1]||s(9),sourceRow:rownum,date:date(r[5]),issuer:s(6),component:s(7),option:s(8),title,status:s(16),specialty:s(17),actions:[]};alerts.push(current)}
  else if(current&&r[12]&&(r[13]||r[14]||r[16]))current.actions.push({row:rownum,number:s(10),text:s(12),owner:s(13),due:date(r[14]),compliance:s(15).toUpperCase(),status:s(16)})
 }
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(x=>x.toString(16).padStart(2,'0')).join('');return {schemaVersion:1,source:file.name,sheet:sheet.getAttribute('name'),cutoff,sha256:hash,importedAt:new Date().toISOString(),alerts};
}
