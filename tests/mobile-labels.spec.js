import { test, expect } from '@playwright/test';

for(const width of [320,390,590,760])test(`Static mobile journey: no 3D, readable flow and native links at ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:844},hasTouch:true});
 const page=await context.newPage();const scripts=[];const errors=[];
 page.on('request',r=>{if(r.resourceType()==='script')scripts.push(r.url());});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('#cookie-decline').click();
 await expect(page.locator('.mobile-house img')).toBeVisible();
 await expect.poll(()=>page.locator('.mobile-house img').evaluate(el=>el.complete&&el.naturalWidth>1&&el.currentSrc.includes('maison-mobile'))).toBe(true);
 await expect(page.locator('.scene-shell')).toBeHidden();
 await expect(page.locator('.scene-labels')).toHaveCount(0);
 await expect(page.locator('body')).not.toHaveClass(/webgl-ready/);
 expect(scripts.filter(url=>/three|desktop-journey|world\.js|scene-labels/.test(new URL(url).pathname))).toEqual([]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const id of ['services','veranda','jardin','realisations','cedric','contact']){
  await page.goto('/?section='+id+'#'+id);
  const copy=page.locator(`#${id} .chapter-copy`);
  await expect(copy).toHaveCSS('opacity','1');
  await expect(copy).toHaveCSS('transform','none');
  await expect(page.locator(`#${id} .chapter-sticky`)).toHaveCSS('position','static');
  await expect.poll(()=>copy.evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('.site-header').getBoundingClientRect().bottom&&el.getBoundingClientRect().top<innerHeight-100)).toBe(true);
 }
 await page.goto('/');await page.locator('.mobile-services a[href="#veranda"]').click();
 await expect(page).toHaveURL(/#veranda$/);
 await expect(page.locator('#veranda h2')).toBeInViewport();
 await page.locator('#veranda .button').click();await expect(page).toHaveURL(/nettoyage-veranda.html$/);
 await page.locator('.detail-return').click();await expect(page).toHaveURL(/#veranda$/);
 expect(errors).toEqual([]);await context.close();
});

test('Mobile HTML remains readable without JavaScript',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
 const page=await context.newPage();await page.goto('/');
 await expect(page.locator('h1')).toContainText('Nettoyage de toiture');
 await expect(page.locator('.mobile-house img')).toBeVisible();
 await expect(page.locator('.quote')).toHaveCount(4);
 await page.locator('.mobile-services a[href="#jardin"]').click();
 await expect(page.locator('#jardin h2')).toBeInViewport();await context.close();
});

test('Changing viewport activates desktop and keeps mobile static',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await expect(page.locator('body')).not.toHaveClass(/webgl-ready/);
 await page.setViewportSize({width:1440,height:900});await expect(page.locator('body')).toHaveClass(/webgl-ready/);
 await expect(page.locator('.scene-labels')).toBeVisible();
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.scene-labels')).toBeHidden();
 await expect(page.locator('.mobile-house')).toBeVisible();
});
