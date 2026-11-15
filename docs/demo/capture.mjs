// Run with Playwright installed outside the repository; see README.md here.
import { createRequire } from 'node:module';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const vault = await mkdtemp(join(tmpdir(), 'mellorin-demo-'));
await writeFile(join(vault, 'CLAUDE.md'), '# Synthetic demo vault\nUse only synthetic study content.\n');
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname !== '/') return route.continue();
    const response = await route.fetch();
    const html = (await response.text()).replace('<script type="module" src="/src/main.tsx"></script>', `<script type="module">
      import { mockIPC } from '/node_modules/@tauri-apps/api/mocks.js';
      import { emit } from '/node_modules/@tauri-apps/api/event.js';
      let running = false;
      mockIPC(async (cmd, args) => {
        switch (cmd) {
          case 'config_get': return {vault_path:'/tmp/mellorin-demo-vault (synthetic)', claude_path:'mock', theme:'dark'};
          case 'subprocess_status': return running;
          case 'subprocess_start': running = true; return;
          case 'subprocess_stop': running = false; return;
          case 'subprocess_send': setTimeout(async () => {
            await emit('chat-delta', {text:'Observation means watching carefully and recording what you notice.\\n\\nTry this: write one sentence about the weather each evening, then compare your notes after a week.'});
            await emit('chat-done', {});
          }, 50); return;
          case 'translate': return 'наблюдение';
          case 'vocab_add': return;
          default: throw new Error('Unexpected demo command: ' + cmd);
        }
      }, {shouldMockEvents:true});
      await import('/src/main.tsx');
    </script>`);
    await route.fulfill({ response, body: html });
  });
  await page.goto(process.env.DEMO_URL || 'http://127.0.0.1:1420');
  await page.getByRole('button', { name: 'Подключиться', exact: true }).click();
  await page.getByRole('textbox', { name: 'Сообщение', exact: true }).fill('What does observation mean? Give me a small study exercise.');
  await page.getByRole('button', { name: 'Отправить', exact: true }).click();
  await page.getByText('Observation means watching carefully', { exact: false }).waitFor();
  await page.screenshot({ path: new URL('./chat.png', import.meta.url).pathname });
  await page.getByRole('button', { name: 'Чтение текста', exact: true }).click();
  await page.getByRole('textbox', { name: 'Текст для чтения', exact: true }).fill((await readFile(new URL('./reading.txt', import.meta.url), 'utf8')).trim());
  await page.getByRole('button', { name: 'Читать →', exact: true }).click();
  await page.getByRole('button', { name: 'Patient', exact: true }).click();
  await page.getByRole('button', { name: 'Отметить как незнакомое', exact: true }).click();
  await page.getByText('Незнакомых слов: 1', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'observation', exact: true }).click();
  await page.getByText('наблюдение', { exact: true }).waitFor();
  await page.screenshot({ path: new URL('./reading.png', import.meta.url).pathname });
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log('Captured actual React UI: chat and reading; mock bridge; synthetic content only.');
} finally {
  await browser?.close();
  await rm(vault, {recursive:true, force:true});
}
