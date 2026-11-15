import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {renderMockup} from './mockup.mjs';
import {audit} from './audit.mjs';
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage();
  await page.setContent('<body></body>');
  await page.evaluate(renderMockup,{name:'Test',collapsed:false,sources:{Test:`<x-dc><sc-if value="{{show}}"><sc-for list="{{items}}" as="it"><button>{{it.label}}</button></sc-for></sc-if><sc-if value="{{hide}}">hidden</sc-if></x-dc><script data-dc-script>class Component extends DCLogic {renderVals(){return {show:true,hide:false,items:[{label:'one'},{label:'two'}]}}}</script>`}});
  assert.deepEqual(await page.locator('button').allTextContents(),['one','two']);
  assert.equal(await page.locator('sc-if,sc-for,x-dc').count(),0);
  await page.setContent('<button style="width:25px;white-space:nowrap">Deliberately too long</button><div hidden><button style="width:1px">Hidden text</button></div>');
  const findings=await page.evaluate(audit);
  assert(findings.some(f=>f.kind==='horizontal-overflow'));
  assert(!findings.some(f=>f.text.includes('Hidden')));
  console.log('Visual QA renderer and overflow audit self-test passed.');
} finally {await browser.close();}
