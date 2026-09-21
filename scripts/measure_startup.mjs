// Compare startup on the built site with the same local browser and viewport.
// This is an unthrottled long-task diagnostic, not a Lighthouse/PSI score.
import { chromium } from 'playwright';
const url=process.argv[2] || 'http://127.0.0.1:4184/';
const browser=await chromium.launch();
try {
  const results=[];
  for(let run=0;run<3;run++){
    const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
    await page.addInitScript(()=>{
      window.startupTasks=[];
      new PerformanceObserver(list=>window.startupTasks.push(...list.getEntries().map(({startTime,duration})=>({startTime,duration})))).observe({type:'longtask',buffered:true});
    });
    await page.goto(url);
    await page.waitForSelector('body.webgl-ready');
    await page.waitForTimeout(1800);
    results.push(await page.evaluate(()=>({
      blockingMs:window.startupTasks.reduce((sum,task)=>sum+Math.max(0,task.duration-50),0),
      longestTaskMs:Math.max(0,...window.startupTasks.map(task=>task.duration)),
      phases:performance.getEntriesByType('measure').filter(e=>e.name.startsWith('catf-')).map(({name,duration})=>({name,duration})),
      images:performance.getEntriesByType('resource').filter(e=>e.name.includes('.webp')).map(({name,encodedBodySize})=>({name,bytes:encodedBodySize})),
    })));
    await page.close();
  }
  console.log(JSON.stringify({url,results,medianBlockingMs:results.map(r=>r.blockingMs).sort((a,b)=>a-b)[1]},null,2));
} finally { await browser.close(); }
