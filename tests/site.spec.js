import { test, expect } from '@playwright/test';
const pages=['index.html','nettoyage-toiture.html','nettoyage-veranda.html','entretien-espaces-verts.html','realisations.html','qui-suis-je.html','privacy.html'];
test('Seven pages: responsive layouts, images, links, JS and local consent',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const missing=[];page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  const requests=[];page.on('request',r=>requests.push(r.url()));
  for(const url of pages){
    await page.goto('/'+url);
    if(await page.locator('#cookie-banner').isVisible())await page.locator('#cookie-decline').click();
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${url} overflows at ${width}`).toBeTruthy();
    }
    for(const img of await page.locator('img[src]').all()){
      await img.evaluate(el=>{el.loading='eager';return el.decode();});
    }
    const broken=await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>a.hash&&!document.getElementById(decodeURIComponent(a.hash.slice(1)))).map(a=>a.hash));
    expect(broken,`${url} fragment links`).toEqual([]);
    await page.setViewportSize({width:390,height:844});
    await page.locator('.mobile-menu summary').click();
    await expect(page.locator('.mobile-menu')).toHaveAttribute('open','');
    await page.locator('.mobile-menu a').first().click();
    await expect(page.locator('.mobile-menu')).not.toHaveAttribute('open');
  }
  expect(errors).toEqual([]);expect(missing).toEqual([]);
  expect(requests.filter(url=>/google-analytics|googletagmanager/.test(url))).toEqual([]);
});
test('Camera journey, anchors, reduced motion and service return',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');await page.locator('#cookie-decline').click();
  await expect(page.locator('body')).toHaveClass(/webgl-ready/);
  const before=await page.locator('#world').screenshot();
  await page.locator('.journey-nav a[href="#veranda"]').click();
  await expect(page.locator('.journey-nav a[href="#veranda"]')).toHaveAttribute('aria-current','step');
  await page.waitForTimeout(1200);
  const after=await page.locator('#world').screenshot();expect(before.equals(after)).toBeFalsy();
  await page.locator('#veranda .button').click();await expect(page).toHaveURL(/nettoyage-veranda.html/);
  await page.locator('.detail-return').click();await expect(page).toHaveURL(/#veranda$/);
  await expect(page.locator('.journey-nav a[href="#veranda"]')).toHaveAttribute('aria-current','step');
  await page.locator('.motion-toggle').click();await expect(page.locator('body')).toHaveClass(/reduced-motion/);
  await page.reload();await expect(page.locator('.motion-toggle')).toHaveAttribute('aria-pressed','true');
  await page.locator('.journey-nav a[href="#contact"]').click();await expect(page.locator('#contact .phone')).toBeInViewport();
});
test('Gallery keyboard dialog and cookie preferences',async({page})=>{
  await page.goto('/realisations.html');await page.locator('#cookie-decline').click();
  await page.locator('.gallery-image-button').first().click();await expect(page.locator('dialog')).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
  await page.locator('#cookie-settings').click();await expect(page.locator('#cookie-banner')).toBeVisible();
  await page.locator('#cookie-accept').click();await page.reload();await expect(page.locator('#cookie-banner')).not.toBeVisible();
});
test('Reduced motion preference and unavailable WebGL preserve navigation',async({browser})=>{
  const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();
  await page.goto('/');await expect(page.locator('body')).toHaveClass(/reduced-motion/);
  await context.close();
  const fallback=await browser.newContext();const p=await fallback.newPage();
  await p.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type.includes('webgl'))return null;return original.call(this,type,...args);};});
  await p.goto('/');await expect(p.locator('body')).toHaveClass(/no-webgl/);
  await p.locator('#cookie-decline').click();await p.locator('.journey-nav a[href="#contact"]').click();
  await expect(p.locator('#contact .phone')).toBeInViewport();await fallback.close();
});
test('Content remains accessible without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('/');
  await expect(page.locator('h1')).toContainText('Nettoyage de toiture');await expect(page.locator('.quote')).toHaveCount(4);
  await page.locator('.journey-nav a[href="#contact"]').click();await expect(page.locator('#contact .phone')).toBeInViewport();await context.close();
});

for(const mobile of [false])test(`3D labels navigate to all six destinations (${mobile?'touch':'mouse'})`,async({browser})=>{
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile});
  const page=await context.newPage();
  const targets=[['services','01 Toiture'],['veranda','02 Véranda'],['jardin','03 Jardin'],['realisations','04 Réalisations'],['cedric','05 Qui suis-je ?'],['contact','07 Contact']];
  for(const [id,label] of targets){
    await page.goto('/');
    if(await page.locator('#cookie-banner').isVisible())await page.locator('#cookie-decline').click();
    const link=page.getByRole('navigation',{name:'Explorer la scène 3D'}).getByRole('link',{name:label,exact:true});
    await expect(link).toBeVisible();
    const overlaps=await page.locator('.scene-label:not([hidden])').evaluateAll(links=>{
      const boxes=links.map(a=>a.getBoundingClientRect());
      return boxes.some((a,i)=>boxes.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));
    });
    expect(overlaps).toBeFalsy();
    if(mobile)await link.tap();else await link.click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect(page.locator(`.journey-nav a[href="#${id}"]`)).toHaveAttribute('aria-current','step');
  }
  await context.close();
});

test('Scene labels support keyboard and reduced motion; disappear with lost WebGL',async({browser})=>{
  const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1000}});const page=await context.newPage();
  await page.goto('/');await page.locator('#cookie-decline').click();
  const label=page.locator('.scene-label[href="#cedric"]');await label.focus();await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#cedric$/);await expect(page.locator('.journey-nav a[href="#cedric"]')).toHaveAttribute('aria-current','step');
  await expect(page.locator('body')).toHaveClass(/reduced-motion/);
  await page.locator('#world').evaluate(canvas=>canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  await expect(page.locator('.scene-labels')).toHaveCount(0);await expect(page.locator('body')).toHaveClass(/no-webgl/);
  await context.close();
});
