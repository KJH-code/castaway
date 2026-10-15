import {chromium} from 'playwright'; import fs from 'fs';
const [q,out]=process.argv.slice(2);
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}); const p=await b.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message));
await p.goto('http://127.0.0.1:'+(process.env.PORT||8765)+'/bake.html?'+q); const d=await p.evaluate(()=>window.bake);
fs.writeFileSync(out,Buffer.from(d.split(',')[1],'base64')); await b.close(); console.log('ok',out);
