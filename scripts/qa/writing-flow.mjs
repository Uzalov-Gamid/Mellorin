// Browser-only synthetic regression. No JERY messages or content writes.
export async function verifyWritingFlow(page) {
  const result = [];
  await page.getByRole('button', {name:'Дальше: переписать текст ↵',exact:true}).click();
  const input = page.getByRole('textbox', {name:'Исправленная версия',exact:true});
  const revised = 'Yesterday I used my phone. This is my synthetic rewrite.';
  await input.fill(revised);
  await page.evaluate(() => { location.hash = 'english/words'; });
  await page.getByRole('region', {name:'English Words',exact:true}).waitFor();
  await page.evaluate(() => { location.hash = 'english/writing'; });
  await input.waitFor();
  if (await input.inputValue() !== revised) throw Error('Writing draft lost on navigation');
  result.push('rewrite and typed draft retained across Words navigation');
  await page.getByRole('button', {name:'Вернуться к проверке текста',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Разбор относится к другой версии текста'}).waitFor();
  if (await page.locator('.writing-study mark').count()) throw Error('Stale highlights remained after draft change');
  await page.getByRole('button', {name:'Загрузить разбор JERY',exact:true}).click();
  if (await page.getByRole('textbox', {name:'Мой текст',exact:true}).inputValue() !== revised) throw Error('Reload replaced local draft');
  if (await page.locator('.writing-study mark').count()) throw Error('Reload restored stale highlights');
  result.push('old review reload keeps revised text and hides stale highlights');
  return result;
}
