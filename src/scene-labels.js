// HTML links follow real 3D points: mouse, touch, keyboard and native anchors
// share the same navigation, without making the decorative canvas interactive.
export function createSceneLabels(world, canvas) {
  const layer=document.createElement('nav');
  layer.className='scene-labels';
  layer.setAttribute('aria-label','Explorer la scène 3D');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('scene-connectors');svg.setAttribute('aria-hidden','true');layer.append(svg);
  const entries=world.markers.map(marker=>{
    const link=document.createElement('a');link.className='scene-label';link.href=`#${marker.id}`;
    const number=document.createElement('span');number.className='scene-label-number';number.textContent=marker.number;
    const name=document.createElement('span');name.textContent=marker.label;
    link.append(number,name);link.setAttribute('aria-label',`${marker.number} ${marker.label}`);layer.append(link);
    const line=document.createElementNS(svg.namespaceURI,'path');svg.append(line);
    const dot=document.createElementNS(svg.namespaceURI,'circle');dot.setAttribute('r','2.5');svg.append(dot);
    return {marker,link,line,dot};
  });
  document.body.append(layer);
  const projected=world.markers[0].position.clone();
  const readingAreas=[...document.querySelectorAll('.chapter-copy, .scroll-invite, .site-header, .motion-toggle, #cookie-banner, .mobile-menu nav')];
  function update() {
    const rect=canvas.getBoundingClientRect(), mobile=innerWidth<=760;
    const active=document.querySelector('.journey-nav [aria-current="step"]')?.hash;
    const copy=active?document.querySelector(`${active} .chapter-copy`):null;
    const copyRect=copy?.getBoundingClientRect();
    const reviewRect=document.querySelector('#avis').getBoundingClientRect();
    const behindReviews=reviewRect.top<innerHeight*.8 && reviewRect.bottom>innerHeight*.3;
    const afterJourney=document.querySelector('.site-footer').getBoundingClientRect().top<innerHeight*.7;
    const left=mobile?20:Math.max(rect.left+16,(copyRect?.right||innerWidth*.43)+18);
    const right=innerWidth-(mobile?28:62);
    const top=mobile?Math.max(rect.top+8,innerHeight*.57):115;
    const bottom=innerHeight-(mobile?64:115);
    // Protect every visible section, including the next section entering the
    // viewport. The active navigation item alone is insufficient mid-scroll.
    const protectedRects=mobile?readingAreas.map(el=>el.getBoundingClientRect())
      .filter(b=>b.width>0&&b.height>0&&b.bottom>0&&b.top<innerHeight)
      .map(b=>({left:b.left-12,right:b.right+12,top:b.top-12,bottom:b.bottom+12})):[];
    const coversReadingArea=(x,y,w,h)=>protectedRects.some(b=>
      x<b.right&&x+w>b.left&&y<b.bottom&&y+h>b.top);
    // Keep these two labels in one screen-space layout as the camera moves.
    const pair=entries.filter(({marker})=>marker.id==='cedric'||marker.id==='contact');
    const pairBoxes=new Map();
    pair.forEach(({link})=>{link.hidden=false;});
    const pairWidth=pair.reduce((sum,{link})=>sum+link.offsetWidth,0)+16;
    const pairHeight=Math.max(...pair.map(({link},i)=>link.offsetHeight+i*18));
    let centerX=0,centerY=0;
    pair.forEach(({marker})=>{
      projected.copy(marker.labelPosition).project(world.camera);
      centerX+=rect.left+(projected.x+1)*rect.width/2+(marker.labelOffsetX??0);
      centerY+=rect.top+(1-projected.y)*rect.height/2+30+(marker.labelOffsetY??0);
    });
    let pairX=Math.max(left,Math.min(right-pairWidth,centerX/2-pairWidth/2));
    const pairY=Math.max(top,Math.min(bottom-pairHeight,centerY/2-pairHeight/2));
    pair.forEach(({marker,link},i)=>{
      pairBoxes.set(marker.id,{x:pairX,y:pairY+i*18,w:link.offsetWidth,h:link.offsetHeight});
      pairX+=link.offsetWidth+16;
    });
    const placed=[];
    entries.forEach(({marker,link,line,dot})=>{
      projected.copy(marker.position).project(world.camera);
      const ax=rect.left+(projected.x+1)*rect.width/2, ay=rect.top+(1-projected.y)*rect.height/2;
      const inView=projected.z>-1&&projected.z<1&&ax>rect.left&&ax<innerWidth&&ay>80&&ay<innerHeight;
      link.hidden=behindReviews||afterJourney||!inView;
      line.style.display=dot.style.display=link.hidden?'none':'';
      if(link.hidden)return;
      const w=link.offsetWidth,h=link.offsetHeight;
      const labelPoint=marker.labelPosition?projected.copy(marker.labelPosition).project(world.camera):null;
      const labelX=labelPoint?rect.left+(labelPoint.x+1)*rect.width/2:ax;
      const labelY=labelPoint?rect.top+(1-labelPoint.y)*rect.height/2:ay;
      const desiredX=labelX+(marker.labelOffsetX??(!mobile&&marker.id==='realisations'?-65:0));
      const desiredY=(labelPoint?labelY+30:ay-30)+(marker.labelOffsetY??0);
      const fixed=!mobile&&pairBoxes.get(marker.id);
      let best=fixed&&pairWidth<=right-left&&pairHeight<=bottom-top
        &&!coversReadingArea(fixed.x,fixed.y,fixed.w,fixed.h)
        &&!placed.some(b=>fixed.x<b.x+b.w+8&&fixed.x+fixed.w+8>b.x&&fixed.y<b.y+b.h+8&&fixed.y+fixed.h+8>b.y)
        ?fixed:null;
      // Find the nearest free slot, keeping names apart on small screens.
      const xs=[desiredX-w/2,desiredX-w-16,desiredX+16,left,right-w];
      const ys=[...Array.from({length:15},(_,i)=>Math.max(top,Math.min(bottom-h,desiredY-h/2+(i-7)*(h+8)))),
        ...protectedRects.flatMap(b=>[b.bottom,b.top-h])];
      for(const y of fixed?[]:ys){
        if(y<top||y+h>bottom||w>right-left)continue;
        for(const candidate of xs){
          const x=Math.max(left,Math.min(right-w,candidate));
          if(coversReadingArea(x,y,w,h))continue;
          if(placed.some(b=>x<b.x+b.w+8&&x+w+8>b.x&&y<b.y+b.h+8&&y+h+8>b.y))continue;
          const score=(x+w/2-desiredX)**2+(y+h/2-desiredY)**2;
          if(!best||score<best.score)best={x,y,w,h,score};
        }
      }
      if(!best){link.hidden=true;line.style.display=dot.style.display='none';return;}
      placed.push(best);
      link.style.transform=`translate3d(${Math.round(best.x)}px,${Math.round(best.y)}px,0)`;
      if(active===link.hash)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');
      const endX=Math.max(best.x+10,Math.min(best.x+w-10,ax));
      const endY=ay>best.y+h/2?best.y+h:best.y;
      line.setAttribute('d',`M${ax.toFixed(1)},${ay.toFixed(1)} L${endX.toFixed(1)},${endY.toFixed(1)}`);
      dot.setAttribute('cx',ax.toFixed(1));dot.setAttribute('cy',ay.toFixed(1));
      // A label may fit in free space while its leader crosses a paragraph.
      // Suppress that leader and its dot rather than drawing over the copy.
      const crossesCopy=coversReadingArea(Math.min(ax,endX)-3,Math.min(ay,endY)-3,
        Math.abs(ax-endX)+6,Math.abs(ay-endY)+6);
      line.style.display=dot.style.display=crossesCopy?'none':'';
    });
  }
  return {update,dispose(){layer.remove();}};
}
