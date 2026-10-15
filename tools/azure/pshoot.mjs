import {chromium} from 'playwright'; import fs from 'fs';
const [q,list,out,cols]=process.argv.slice(2);
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}); const p=await b.newPage();
p.on('pageerror',e=>console.log('PAGEERR',e.message)); p.on('console',m=>{if(m.type()!=='log')console.log(m.type(),m.text())});
await p.goto('http://127.0.0.1:'+(process.env.PORT||8765)+'/pose.html?'+q); console.log('bones',await p.evaluate(()=>ready));
const d=await p.evaluate(([l,c])=>shoot(JSON.parse(l),c?+c:0),[list,cols]);
fs.writeFileSync(out,Buffer.from(d.split(',')[1],'base64')); await b.close(); console.log('ok',out);
