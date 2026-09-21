import {test,expect} from '@playwright/test';

test('Label camera moves directly between framings and retargets without a jump',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const {createWorld}=await import('/src/world.js');
    const canvas=document.createElement('canvas');
    canvas.style.cssText='width:640px;height:480px';document.body.append(canvas);
    const world=createWorld(canvas);
    world.render(5);const end=world.camera.position.clone();
    world.render(1);const start=world.camera.position.clone();
    world.prepareDirectMove();
    let error=0;
    for(const amount of [.1,.25,.5,.75,.9,1]){
      world.render(5,{x:0,y:0},amount);
      const blend=amount**3*(amount*(amount*6-15)+10);
      error=Math.max(error,world.camera.position.distanceTo(start.clone().lerp(end,blend)));
    }
    world.prepareDirectMove();world.render(2,{x:0,y:0},.3);
    const before=world.camera.position.clone();
    world.prepareDirectMove();world.render(7,{x:0,y:0},0);
    const jump=before.distanceTo(world.camera.position);
    world.dispose();canvas.remove();return {error,jump};
  });
  expect(result.error).toBeLessThan(1e-9);
  expect(result.jump).toBeLessThan(1e-9);
});
