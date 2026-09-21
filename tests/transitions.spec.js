import { test, expect } from '@playwright/test';

test('Short targeted departure, entry fade and return to the same section',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.addInitScript(()=>{
    window.entrySeen=false;
    new MutationObserver(()=>{
      if(document.documentElement?.classList.contains('page-entering'))window.entrySeen=true;
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['class']});
  });
  await page.goto('/#veranda');await page.locator('#cookie-decline').click();
  await expect(page.locator('body')).toHaveClass(/webgl-ready/);
  let requestedAt;
  page.on('request',request=>{if(request.isNavigationRequest()&&request.url().endsWith('nettoyage-veranda.html'))requestedAt=Date.now();});
  const clickedAt=Date.now();
  await page.locator('#veranda .button').evaluate(link=>link.click());
  await expect(page.locator('html')).toHaveClass(/page-leaving/);
  await expect(page).toHaveURL(/nettoyage-veranda.html$/);
  expect(requestedAt-clickedAt).toBeGreaterThanOrEqual(290);
  expect(requestedAt-clickedAt).toBeLessThan(850);
  expect(await page.evaluate(()=>window.entrySeen)).toBeTruthy();
  await expect(page.locator('html')).not.toHaveClass(/page-entering/);
  await page.locator('.detail-return').click();
  await expect(page).toHaveURL(/index.html#veranda$/);
  await expect(page.locator('.journey-nav a[href="#veranda"]')).toHaveAttribute('aria-current','step');
  await expect(page.locator('html')).not.toHaveClass(/page-entering|page-leaving/);
  await page.goBack();await expect(page).toHaveURL(/nettoyage-veranda.html$/);
  await expect(page.locator('html')).not.toHaveClass(/page-entering|page-leaving/);
  await expect(page.locator('.page-curtain')).toHaveCSS('opacity','0');
});

test('Reduced motion bypasses transitions; modified clicks and anchors remain native',async({browser})=>{
  const context=await browser.newContext({reducedMotion:'reduce'});const page=await context.newPage();
  await page.goto('/#services');await page.locator('#cookie-decline').click();
  await page.locator('#services .button').click();await expect(page).toHaveURL(/nettoyage-toiture.html$/);
  expect(await page.evaluate(()=>window.__catfPageEntry)).toBeUndefined();
  await context.close();
  const normal=await browser.newContext();const p=await normal.newPage();await p.goto('/');
  await p.locator('#cookie-decline').click();
  const native=await p.locator('#services .button').evaluate(link=>{
    const event=new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true,button:0});
    // Suppress the browser's action only AFTER the application has handled it.
    let appPrevented;
    document.addEventListener('click',e=>{appPrevented=e.defaultPrevented;e.preventDefault();},{once:true});
    link.dispatchEvent(event);return !appPrevented;
  });
  expect(native).toBeTruthy();await expect(p.locator('html')).not.toHaveClass(/page-leaving/);
  await p.locator('.journey-nav a[href="#jardin"]').click();
  await expect(p).toHaveURL(/#jardin$/);await expect(p.locator('html')).not.toHaveClass(/page-leaving/);
  await normal.close();
});
