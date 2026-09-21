import {test,expect} from '@playwright/test';

const sections=['services','veranda','jardin','realisations','cedric','contact'];
async function fullyFramed(page,id){
  await expect.poll(()=>page.locator(`#${id} .chapter-copy`).evaluate(el=>{
    const r=el.getBoundingClientRect(),header=document.querySelector('.site-header').getBoundingClientRect();
    return r.top>=header.bottom+4 && r.bottom<=innerHeight-12;
  }),{message:`${id}: complete text, action and photo must fit below the header`}).toBe(true);
}

test('Every chapter opens fully framed at desktop zoom',async({page})=>{
  test.setTimeout(90000);
  await page.goto('/');await page.locator('#cookie-decline').click();
  for(const [width,height] of [[1520,696],[1280,720],[1440,900]]){
    await page.setViewportSize({width,height});
    for(const id of sections){
      await page.locator(`.journey-nav a[href="#${id}"]`).click();
      await fullyFramed(page,id);
    }
  }
});

test('Scene label, direct hash, menu and detail return share the same framing',async({page})=>{
  await page.setViewportSize({width:1520,height:696});
  await page.goto('/');await page.locator('#cookie-decline').click();
  await page.locator('.scene-label[href="#services"]').click();await fullyFramed(page,'services');
  await page.locator('#services .button').click();await expect(page).toHaveURL(/nettoyage-toiture.html$/);
  await page.locator('.detail-return').click();await fullyFramed(page,'services');
  await page.goto('/#veranda');await fullyFramed(page,'veranda');
  await page.locator('.nav a[href="index.html#cedric"]').click();await fullyFramed(page,'cedric');
});
