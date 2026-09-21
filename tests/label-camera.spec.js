import {test,expect} from '@playwright/test';

test('Label camera moves directly between framings and retargets without a jump',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    const {createWorld}=await import('/src/world.js');
    const canvas=document.createElement('canvas');
    canvas.style.cssText='width:640px;height:480px';document.body.append(canvas);
    const world=await createWorld(canvas);
    await world.prepare();
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

test('Prepared shaders and cached shadows preserve the rendered scene',async({page})=>{
  await page.goto('/privacy.html');
  const result=await page.evaluate(async()=>{
    const {createWorld}=await import('/src/world.js');
    const canvas=document.createElement('canvas');canvas.style.cssText='width:320px;height:240px';document.body.append(canvas);
    const world=await createWorld(canvas);await world.prepare();
    const programs=world.renderer.info.programs.length;
    const gl=world.renderer.getContext();
    const pixels=()=>{const data=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
    const light=world.scene.getObjectByProperty('isDirectionalLight',true);
    let differences=0, maxCalls=0;
    for(const step of [0,2,5]){
      world.render(step);
      maxCalls=Math.max(maxCalls,world.renderer.info.render.calls);
      world.render(step,{x:.25,y:-.1});
      const cached=pixels();
      light.shadow.needsUpdate=true;
      world.render(step,{x:.25,y:-.1});
      const refreshed=pixels();
      differences+=cached.reduce((sum,value,i)=>sum+(value!==refreshed[i]?1:0),0);
    }
    const result={differences,maxCalls,programsAdded:world.renderer.info.programs.length-programs};
    world.dispose();canvas.remove();return result;
  });
  expect(result.differences).toBe(0);
  expect(result.maxCalls).toBeLessThan(30);
  expect(result.programsAdded).toBe(0);
});
