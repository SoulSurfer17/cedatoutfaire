import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
for(const width of [390,1440])test(`Accessibility at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();
 for(const file of ['index','nettoyage-toiture','nettoyage-veranda','entretien-espaces-verts','realisations','qui-suis-je','privacy']){
  await page.goto('/'+file+'.html');
  if(await page.locator('#cookie-banner').isVisible())await page.locator('#cookie-decline').click();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','best-practice']).analyze();
  expect(result.violations,`${file} at ${width}px`).toEqual([]);
 }
 await context.close();
});
test('Descriptive section headings are present in the public HTML',async({page})=>{
 await page.goto('/');await expect(page.locator('main h1')).toHaveCount(1);
 for(const [id,title] of [['services','Nettoyage et démoussage de toiture'],['veranda','Nettoyage de véranda'],['jardin','Entretien de jardin'],['cedric','Cédric Puygrenier']]){
  await expect(page.locator(`#${id} h2`)).toHaveText(title);
  await expect(page.locator(`#${id} p.chapter-display`)).toHaveCount(1);
 }
});

test('All seven pages have an ordered heading outline and independent contact sections',async({page})=>{
 for(const name of ['index','nettoyage-toiture','nettoyage-veranda','entretien-espaces-verts','realisations','qui-suis-je','privacy']){
  await page.goto('/'+name+'.html');
  const headings=await page.locator('main :is(h1,h2,h3,h4,h5,h6)').evaluateAll(elements=>elements.map(el=>({level:Number(el.tagName[1]),text:el.textContent.trim()})));
  expect(headings.filter(h=>h.level===1),name).toHaveLength(1);
  let previous=0;
  for(const heading of headings){expect(heading.text,name).not.toBe('');expect(heading.level,`${name}: ${heading.text}`).toBeLessThanOrEqual(previous+1);previous=heading.level;}
  if(['nettoyage-toiture','nettoyage-veranda','entretien-espaces-verts'].includes(name))await expect(page.locator('.service-cta h2')).toHaveCount(1);
 }
});
