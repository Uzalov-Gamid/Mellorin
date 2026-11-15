#!/usr/bin/env node
import {chromium} from 'playwright';
import pixelmatch from 'pixelmatch';
import {PNG} from 'pngjs';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {renderMockup} from './qa/mockup.mjs';
import {audit} from './qa/audit.mjs';
import {snapshot,reading,wordLesson,listeningLesson} from './qa/fixture.mjs';
const args=process.argv.slice(2);
const option=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
if(args.includes('--help')) {
  console.log('node scripts/visual-qa.mjs [--mockups DIR] [--out docs/qa] [--screen Main] [--widths 1100,1440,1680] [--url http://127.0.0.1:1420] [--strict] [--max-diff 0]');process.exit(0);
}
const mockups=resolve(option('--mockups',process.env.MELLORIN_MOCKUPS || 'design/mockups'));
const out=resolve(option('--out','docs/qa'));
const widths=option('--widths','1100,1440,1680').split(',').map(Number);
if(widths.some(n=>!Number.isInteger(n)||n<800||n>4000))throw Error('Widths must be integers from 800 to 4000');
const names=(await readdir(mockups)).filter(n=>n.endsWith('.dc.html'));
const sources=Object.fromEntries(await Promise.all(names.map(async n=>[n.replace('.dc.html',''),await readFile(join(mockups,n),'utf8')])));
const routes={Home:'home',Main:'english/reading',ReadingCollapsed:'english/reading',Words:'english/words',Listening:'english/listening',Settings:'home'};
const seedFormats=Object.fromEntries(await Promise.all((await readdir('formats')).filter(n=>n.endsWith('.json')).map(async n=>['formats/'+n,await readFile(join('formats',n),'utf8')])));
const selected=option('--screen','').split(',').filter(Boolean);
for(const name of selected)if(!sources[name])throw Error(`Unknown mockup ${name}`);
await mkdir(out,{recursive:true});
let server,browser;
const url=option('--url','http://127.0.0.1:1420');
const report={generatedAt:new Date().toISOString(),mode:'synthetic browser bridge; native regressions required separately',screens:[],unimplemented:[]};
try {
  if(!args.includes('--url')) {
    server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','1420','--strictPort'],{stdio:['ignore','pipe','pipe']});
    await new Promise((ok,fail)=>{server.once('error',fail);server.once('exit',code=>fail(Error(`Vite exited ${code}; use --url for an existing server`)));const timer=setTimeout(()=>fail(Error('Vite startup timeout')),15000);server.stdout.on('data',chunk=>{if(String(chunk).includes('http://127.0.0.1:1420')){clearTimeout(timer);ok();}});});
  }
  browser=await chromium.launch({headless:true});
  for(const name of Object.keys(sources).filter(n=>!selected.length||selected.includes(n))) {
    for(const width of widths) for(const collapsed of [false,true]) {
      const key=`${name}-${width}-${collapsed?'collapsed':'expanded'}`;
      const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,timezoneId:'Europe/Moscow'});
      const mock=await context.newPage();
      await mock.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
      await mock.evaluate(renderMockup,{sources,name,collapsed});
      await mock.evaluate(()=>document.fonts.ready);
      const expected=await mock.screenshot({path:join(out,`${key}-mockup.png`)});
      if(!routes[name]) {report.unimplemented.push({name,width,collapsed,reason:'No corresponding implemented screen adapter yet; mockup rendered only'});await context.close();continue;}
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',async route=>{
        const request=new URL(route.request().url());
        if(request.origin!==new URL(url).origin)return route.abort();
        if(request.pathname!=='/')return route.continue();
        const response=await route.fetch();
        const html=(await response.text()).replace('<script type="module" src="/src/main.tsx"></script>',`<script type="module">
          import {mockIPC} from '/node_modules/@tauri-apps/api/mocks.js';
          const snapshot=${JSON.stringify(snapshot)};
          const files=${JSON.stringify({...seedFormats,'.mellorin/english-words.json':JSON.stringify(wordLesson),'.mellorin/english-listening.json':JSON.stringify(listeningLesson),'Learning/English/listening/2026-11-15-qa.md':'---\npractice: true\n---\n# A quiet morning'})};
          mockIPC(async(cmd,args)=>{
            if(cmd==='config_get')return {vault_path:'/synthetic/qa-vault',claude_path:'synthetic',theme:'light',jery_can_edit_vault:true,jery_ticktick:'full'};
            if(cmd==='learning_snapshot')return snapshot;
            if(cmd==='vault_subjects')return snapshot.state.subjects.map(s=>({name:({english:'English',devops:'DevOps',arabic:'Arabic',c:'C',sql:'SQL'})[s.id],skills:s.trail.map(t=>t.id)}));
            if(cmd==='vault_read_text'){if(files[args.relPath])return files[args.relPath];throw Error('Synthetic file absent: '+args.relPath);}
            if(cmd==='vault_list')return [{name:'2026-11-15-qa.md',is_dir:false}];
            if(cmd==='requests_snapshot')return {open:[]};
            if(cmd==='change_history')return [];
            if(cmd==='subprocess_status')return false;
            if(cmd==='settings_diagnostics')return {data_directory:'/synthetic/config',vault_found:true,learning_found:true,cli_available:true};
            if(cmd==='ticktick_status')return 'connected';
            if(['learning_init','format_seed','format_request_block','subprocess_stop'].includes(cmd))return;
            throw Error('Unexpected synthetic QA command: '+cmd);
          },{shouldMockEvents:true});
          localStorage.setItem('sidebar_collapsed',${JSON.stringify(String(collapsed))});
          await import('/src/main.tsx');
        </script>`);
        await route.fulfill({response,body:html});
      });
      await page.goto(`${url}/#${routes[name]}`);
      await page.getByRole('textbox',{name:'Ответ JERY',exact:true}).waitFor();
      if(['Main','ReadingCollapsed'].includes(name)) {await page.getByRole('textbox',{name:'Текст для чтения',exact:true}).fill(reading);await page.getByRole('button',{name:'Читать →',exact:true}).click();}
      if(name==='Settings')await page.getByRole('button',{name:'Настройки',exact:true}).click();
      await page.evaluate(()=>document.fonts.ready);
      const actual=await page.screenshot({path:join(out,`${key}-app.png`)});
      const a=PNG.sync.read(expected),b=PNG.sync.read(actual),diff=new PNG({width,height:900});
      const pixels=pixelmatch(a.data,b.data,diff.data,width,900,{threshold:0.1});
      await writeFile(join(out,`${key}-diff.png`),PNG.sync.write(diff));
      const side=new PNG({width:width*2,height:900});PNG.bitblt(a,side,0,0,width,900,0,0);PNG.bitblt(b,side,0,0,width,900,width,0);
      await writeFile(join(out,`${key}-side-by-side.png`),PNG.sync.write(side));
      const findings=await page.evaluate(audit);
      report.screens.push({name,width,collapsed,differentPixels:pixels,differencePercent:100*pixels/(width*900),findings,errors});
      await context.close();
    }
  }
} finally {
  await browser?.close();server?.kill();
  await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}
const findings=report.screens.reduce((n,s)=>n+s.findings.length,0);
console.log(JSON.stringify({comparisons:report.screens.length,mockupOnly:report.unimplemented.length,findings,report:join(out,'report.json')}));
if(args.includes('--strict')&&(report.unimplemented.length||report.screens.some(s=>s.findings.length||s.errors.length||s.differencePercent>Number(option('--max-diff','0')))))process.exitCode=1;
