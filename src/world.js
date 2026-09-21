import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Give input and painting a turn between construction stages, including browsers
// without the Scheduling API. This does not postpone the scene until interaction.
const yieldToBrowser = () => globalThis.scheduler?.yield
  ? globalThis.scheduler.yield()
  : new Promise(resolve => setTimeout(resolve, 0));

const colors = { grass: '#5b8261', grassLight: '#78966e', earth: '#b2a085', wall: '#eee4cc', trim: '#f8f0dc', roof: '#b97556', wood: '#b18b61', leaf: '#3e7260', gold: '#e6cd83', teal: '#176670' };
export async function createWorld(canvas) {
  performance.mark('catf-scene-start');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 160);
  scene.add(new THREE.HemisphereLight('#fff1d4', '#3f6865', 3));
  const sun = new THREE.DirectionalLight('#fff1d6', 4.5);
  sun.position.set(-8, 18, 12); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .035;
  scene.add(sun);
  const root = new THREE.Group(); scene.add(root);
  const materials = new Map();
  const geometries = new Map();
  function geometry(key, create) {
    if (!geometries.has(key)) geometries.set(key, create());
    return geometries.get(key);
  }
  function mat(color, extra = {}) {
    const key = color + JSON.stringify(extra);
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .84, ...extra }));
    return materials.get(key);
  }
  function mesh(geometry, color, pos, parent = root, extra = {}) {
    const m = new THREE.Mesh(geometry, mat(color, extra));
    m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(w, h, d, color, x, y, z, parent = root, extra = {}) { return mesh(geometry(`box:${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d)), color, [x, y, z], parent, extra); }
  function sphere(r, color, x, y, z, parent = root) { return mesh(geometry(`sphere:${r}`, () => new THREE.IcosahedronGeometry(r, 1)), color, [x, y, z], parent); }
  function rod(a, b, radius, color, parent = root) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from);
    const m = mesh(geometry(`rod:${radius}:${delta.length()}`, () => new THREE.CylinderGeometry(radius, radius, delta.length(), 8)), color, from.clone().add(to).multiplyScalar(.5).toArray(), parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), delta.normalize()); return m;
  }
  await yieldToBrowser();
  // A small, crafted Charente-Maritime garden, on a floating slice of land.
  const base = mesh(new THREE.CylinderGeometry(10, 9.5, .85, 72), colors.earth, [0, -.52, 0]); base.scale.z = .79;
  const turf = mesh(new THREE.CylinderGeometry(10.02, 10.02, .16, 72), colors.grass, [0, -.02, 0]); turf.scale.z = .79;
  const rim = mesh(new THREE.TorusGeometry(9.87, .025, 6, 100), '#d1bc84', [0, -.08, 0]); rim.rotation.x = Math.PI/2; rim.scale.y = .79;
  // Lawn stripes, flower beds and stepping stones.
  for(let i=0;i<7;i++) box(.63,.018,5.4,i%2 ? '#71936b' : '#668b63',3.7+i*.65,.076,1.6);
  box(4.9,.13,1.25,'#b4a182',5.4,.12,-2.7);
  box(4.65,.1,1.02,'#4c5b40',5.4,.2,-2.7);
  for(let i=0;i<12;i++) {
    const x=3.3+i*.38;
    sphere(.23, i%3 ? '#638355' : '#8e9958', x,.43,-2.7);
    sphere(.07,i%2?'#e6cd83':'#f1d7b5',x,.65,-2.62);
  }
  const road = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.5,.09,3.4),new THREE.Vector3(-6.2,.09,4.1),new THREE.Vector3(-2.8,.09,5.1),new THREE.Vector3(.2,.09,4.5),new THREE.Vector3(2.2,.09,2.4),new THREE.Vector3(2.4,.09,-.8),new THREE.Vector3(4,.09,-4.3),new THREE.Vector3(7.2,.09,-4.8)
  ]);
  function ribbon(curve,width,color,y) {
    const vertices=[],indices=[];
    for(let i=0;i<=180;i++) {
      const t=i/180,p=curve.getPoint(t),v=curve.getTangent(t),nx=-v.z,nz=v.x;
      vertices.push(p.x+nx*width/2,y,p.z+nz*width/2,p.x-nx*width/2,y,p.z-nz*width/2);
      if(i<180){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    return mesh(g,color,[0,0,0],root,{side:THREE.DoubleSide});
  }
  ribbon(road,1.3,'#d0bd97',.11);
  const routeLine = new THREE.CatmullRomCurve3(road.getPoints(180).map(p=>p.setY(.135)));
  mesh(new THREE.TubeGeometry(routeLine,180,.025,5,false),colors.gold,[0,0,0],root,{emissive:colors.gold,emissiveIntensity:.25});
  const traveler = sphere(.105, '#fff2c5', -8.5,.25,3.4);
  const halo = mesh(new THREE.TorusGeometry(.22,.02,6,28), colors.gold, [0,0,0], traveler); halo.rotation.x=Math.PI/2;
  await yieldToBrowser();
  // House, tiled pitched roof and pale stone details.
  const house = new THREE.Group(); house.position.set(-2,0,-1.1); root.add(house);
  box(5.8,.23,4.5,'#c4bda3',0,.17,0,house);
  box(5.4,2.9,4.05,colors.wall,0,1.7,0,house);
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute('position',new THREE.Float32BufferAttribute([
    -3,3.12,-2.3, 3,3.12,-2.3, 3,4.75,0, -3,4.75,0,
    -3,4.75,0, 3,4.75,0, 3,3.12,2.3, -3,3.12,2.3,
    -2.7,3.12,-2.02,-2.7,4.68,0,-2.7,3.12,2.02,
    2.7,3.12,-2.02,2.7,3.12,2.02,2.7,4.68,0
  ],3));
  roofGeo.setIndex([0,2,1,0,3,2,4,6,5,4,7,6,8,9,10,11,12,13]); roofGeo.computeVertexNormals();
  mesh(roofGeo,colors.roof,[0,0,0],house,{side:THREE.DoubleSide});
  for(let side of [-1,1]) {
    for(let row=0;row<9;row++) {
      const z=side*(row+.5)*.255,y=4.75-Math.abs(z)*1.63/2.3;
      rod([-3,y+.02,z],[3,y+.02,z],.033,row%2?'#c58764':'#cb9171',house);
    }
    for(let i=0;i<24;i++) rod([-2.95+i*.255,4.78,0],[-2.95+i*.255,3.15,side*2.3],.031,'#a66b50',house);
  }
  rod([-3.08,4.78,0],[3.08,4.78,0],.11,'#ca8a64',house);
  rod([-3.04,3.1,2.3],[3.04,3.1,2.3],.06,colors.trim,house);
  box(.55,1.15,.62,'#dfccb0',1.65,4.43,-.65,house); box(.68,.15,.75,'#ad8164',1.65,5.04,-.65,house);
  box(.78,1.7,.08,colors.teal,0,1.24,2.07,house);
  box(.93,.1,.18,colors.trim,0,2.14,2.12,house);sphere(.035,colors.gold,.27,1.2,2.14,house);
  for (let x of [-1.72,1.72]) {
    box(1.02,1.22,.12,colors.trim,x,1.9,2.07,house);
    box(.82,1.02,.13,'#739e9d',x,1.9,2.14,house,{metalness:.15,roughness:.2});
    box(.045,1.07,.04,colors.trim,x,1.9,2.23,house);box(.86,.045,.04,colors.trim,x,1.9,2.23,house);
    for(let s of [-1,1]) {
      box(.36,1.25,.1,colors.teal,x+s*.72,1.9,2.09,house);
      for(let j=0;j<6;j++) box(.3,.025,.03,'#277b80',x+s*.72,1.46+j*.17,2.15,house);
    }
    box(1.2,.12,.26,colors.trim,x,1.25,2.15,house);
  }
  for(let i=0;i<5;i++)box(.9,.08,.4,'#e4d9bf',-2,.12,1.4+i*.54);
  await yieldToBrowser();
  // Glass veranda attached to the east facade.
  const veranda = new THREE.Group(); veranda.position.set(1.4,0,-1.45);root.add(veranda);
  box(2.4,.18,3.2,'#ddd3b7',0,.25,0,veranda);
  const glass=mat('#b5ded5',{transparent:true,opacity:.29,metalness:.2,roughness:.12,side:THREE.DoubleSide,depthWrite:false});
  function glassBox(w,h,d,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),glass);m.position.set(x,y,z);veranda.add(m);}
  glassBox(2.35,1.9,.035,0,1.3,1.55);glassBox(.035,1.9,3.1,1.17,1.3,0);
  const glassRoof=new THREE.Mesh(new THREE.BoxGeometry(2.6,.045,3.3),glass);glassRoof.position.set(0,2.4,0);glassRoof.rotation.z=-.12;veranda.add(glassRoof);
  for(let z of [-1.56,-.52,.52,1.56]){
    rod([1.2,.3,z],[1.2,2.25,z],.037,colors.trim,veranda);
    rod([-1.2,2.56,z],[1.3,2.25,z],.04,colors.trim,veranda);
  }
  for(let x of [-1.2,0,1.2])rod([x,.3,1.56],[x,2.4-x*.12,1.56],.037,colors.trim,veranda);
  for(let y of [.35,2.25])rod([1.2,y,-1.56],[1.2,y,1.56],.035,colors.trim,veranda);
  rod([-1.2,2.55,1.56],[1.2,2.25,1.56],.04,colors.trim,veranda);
  mesh(new THREE.CylinderGeometry(.42,.42,.07,20),colors.wood,[0,.95,.2],veranda);rod([0,.35,.2],[0,.92,.2],.07,colors.trim,veranda);
  await yieldToBrowser();
  // Trees and clipped hedges, with deterministic geometry.
  function tree(x,z,s=1) {
    const g=new THREE.Group();g.position.set(x,.07,z);g.scale.setScalar(s);root.add(g);
    rod([0,0,0],[.05,2.5,0],.12,colors.wood,g);
    rod([0,1.3,0],[-.6,2.6,.2],.065,colors.wood,g);
    sphere(1.03,colors.leaf,0,2.85,0,g);sphere(.8,'#64866a',-.52,2.7,.28,g);sphere(.72,'#7a9670',.33,3.38,-.1,g);
  }
  tree(-7,-1.2,1.1);tree(-6,-4.2,1.2);tree(-3.7,-5.6,.9);tree(5.8,-5.8,.85);tree(8,1,1.05);tree(6.4,4,.72);
  for(let i=0;i<9;i++) {
    sphere(.62,i%2?'#436f51':'#527958',-6.9+i*.9,.65,-5.7);
    box(.8,.72,.85,'#4f7655',-6.9+i*.9,.43,-5.7);
  }
  await yieldToBrowser();
  // Fence and a garden bench.
  for(let i=0;i<12;i++) box(.1,1,.1,'#e0d2ae',-7.6+i*.52,.6,1.8);
  box(5.9,.09,.08,'#e0d2ae',-4.73,.4,1.8);box(5.9,.09,.08,'#e0d2ae',-4.73,.9,1.8);
  const bench = new THREE.Group();bench.position.set(5.5,0,1.8);bench.rotation.y=-.4;root.add(bench);
  for(let i=0;i<3;i++)box(1.65,.08,.15,colors.wood,0,.6,i*.18,bench);
  for(let x of [-.65,.65]){box(.08,.6,.4,colors.teal,x,.3,.2,bench);box(.08,1.15,.08,colors.teal,x,.6,-.1,bench);}
  for(let y of [.87,1.08])box(1.65,.15,.07,colors.wood,0,y,-.1,bench);
  for(let [x,z] of [[-4,2.3],[.4,2.3],[4.7,-1.8]]) {
    mesh(new THREE.CylinderGeometry(.25,.18,.38,12),'#bd8664',[x,.3,z]);sphere(.35,'#789159',x,.65,z);sphere(.08,'#e7d7b3',x+.12,.9,z);
  }
  // Cédric: a small, friendly figure inspired by the original profile photos.
  // The face points along +Z; the cap's visor deliberately points backwards.
  const cedric = new THREE.Group();cedric.name='cedric';
  cedric.position.set(-1.35,.13,4.9);cedric.rotation.y=.35;root.add(cedric);
  const skin='#cfa17e', khaki='#7f8664', trousers='#444c49', beard='#8d9290';
  for(const x of [-.15,.15]) {
    box(.23,.17,.4,'#343b38',x,.085,.09,cedric);
    rod([x,.18,0],[x,.72,0],.115,trousers,cedric);
  }
  mesh(new THREE.CylinderGeometry(.28,.25,.62,10),khaki,[0,1.01,0],cedric);
  // Short sleeves and a relaxed, slightly bent pair of arms.
  for(const side of [-1,1]) {
    rod([side*.24,1.23,0],[side*.37,1.02,.02],.14,khaki,cedric);
    rod([side*.38,1.01,.02],[side*.42,.84,.08],.095,skin,cedric);
    rod([side*.42,.84,.08],[side*.29,.78,.23],.08,skin,cedric);
    sphere(.09,skin,side*.29,.78,.23,cedric);
  }
  mesh(new THREE.CylinderGeometry(.11,.12,.16,10),skin,[0,1.37,0],cedric);
  const head=mesh(new THREE.SphereGeometry(.25,16,12),skin,[0,1.65,0],cedric);head.scale.set(1,1.15,.94);
  for(const side of [-1,1]) {
    const ear=sphere(.066,skin,side*.245,1.63,0,cedric);ear.scale.set(.55,1,.8);
    rod([side*.08,1.72,.213],[side*.16,1.715,.18],.018,'#595c54',cedric);
    sphere(.019,'#303c39',side*.105,1.682,.217,cedric);
  }
  const nose=sphere(.054,skin,0,1.625,.244,cedric);nose.scale.set(.8,1.1,1);
  const chin=sphere(.18,beard,0,1.47,.13,cedric);chin.scale.set(1.03,.93,.66);
  for(const side of [-1,1]) {
    const cheek=sphere(.1,'#69716c',side*.15,1.54,.14,cedric);cheek.scale.set(.65,1.2,.75);
    rod([side*.015,1.57,.237],[side*.11,1.565,.204],.025,'#606960',cedric);
  }
  rod([-.065,1.529,.246],[.065,1.529,.246],.013,'#f2dcc4',cedric);
  for(let i=0;i<7;i++) rod([-.105+i*.035,1.465,.249],[(-.105+i*.035)*.7,1.365,.215],.009,i%2?'#bfc1b9':'#a5aaa2',cedric);
  mesh(new THREE.SphereGeometry(.26,16,10,0,Math.PI*2,0,Math.PI/2),'#262d2b',[0,1.79,0],cedric);
  const capBand=mesh(new THREE.TorusGeometry(.253,.025,6,24),'#252b29',[0,1.79,0],cedric);capBand.rotation.x=Math.PI/2;
  const visor=mesh(new THREE.SphereGeometry(.23,16,8),'#242a28',[0,1.79,-.24],cedric);visor.scale.set(1,.1,1.05);
  box(.18,.05,.018,'#545b52',0,1.79,.249,cedric);
  box(.04,.04,.023,'#acaa93',.045,1.79,.261,cedric);
  sphere(.035,'#343b35',0,2.05,0,cedric);

  await yieldToBrowser();
  // Rounded American mailbox, on the outer edge of the path, left of Cédric.
  const mailbox=new THREE.Group();mailbox.name='contact-mailbox';
  mailbox.position.set(.9,.1,4.6);mailbox.rotation.y=.35;root.add(mailbox);
  const mailboxRed='#a9564d',mailboxEdge='#85443f',postWood='#966d49';
  box(.18,1.22,.18,postWood,0,.61,0,mailbox);
  box(.68,.1,1.03,postWood,0,1.22,0,mailbox);
  rod([0,.85,0],[0,1.2,.36],.05,'#a67b51',mailbox);
  for(const [x,y,h] of [[-.045,.42,.34],[.035,.79,.27]])box(.014,h,.006,'#795337',x,y,.092,mailbox);
  function mailboxProfile(radius){
    const outline=new THREE.Shape();outline.moveTo(-radius,0);outline.lineTo(radius,0);
    outline.lineTo(radius,.25);outline.absarc(0,.25,radius,0,Math.PI,false);outline.lineTo(-radius,0);
    return outline;
  }
  mesh(new THREE.ExtrudeGeometry(mailboxProfile(.32),{depth:.94,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.015,bevelThickness:.015,curveSegments:16}),mailboxRed,[0,1.28,-.47],mailbox,{roughness:.65,metalness:.15});
  // Front door, subtle rim, pull handle and a cream envelope emblem.
  mesh(new THREE.ExtrudeGeometry(mailboxProfile(.325),{depth:.025,bevelEnabled:false,curveSegments:16}),mailboxEdge,[0,1.28,.482],mailbox);
  mesh(new THREE.ShapeGeometry(mailboxProfile(.296),16),mailboxRed,[0,1.295,.509],mailbox);
  box(.15,.045,.065,'#bdb49b',0,1.69,.54,mailbox);
  box(.24,.13,.016,'#e6dbc1',0,1.48,.526,mailbox);
  rod([-.112,1.535,.539],[0,1.46,.539],.009,mailboxEdge,mailbox);
  rod([0,1.46,.539],[.112,1.535,.539],.009,mailboxEdge,mailbox);
  rod([-.23,1.295,.523],[.23,1.295,.523],.016,mailboxEdge,mailbox);
  // Raised side flag, deliberately the same muted red as the box.
  box(.035,.4,.048,mailboxEdge,.352,1.68,-.04,mailbox);
  box(.035,.14,.21,mailboxRed,.352,1.87,.04,mailbox);
  sphere(.037,'#bdb49b',.378,1.51,-.04,mailbox);

  // Bake only the fixed opaque scenery. Vertex colors preserve each original
  // linear-space color while compatible surfaces share one draw call. Keep the
  // moving traveler and transparent glass separate for animation and sorting.
  await yieldToBrowser();
  root.updateMatrixWorld(true);
  const batches = new Map();
  const fixed = [];
  root.traverse(object => {
    if (!object.isMesh || object.material.transparent) return;
    for (let ancestor = object; ancestor; ancestor = ancestor.parent) {
      if (ancestor === traveler) return;
    }
    fixed.push(object);
  });
  let sliceStart = performance.now();
  for (const object of fixed) {
    const source = object.material;
    const key = JSON.stringify([source.roughness, source.metalness, source.side,
      source.emissive.getHex(), source.emissiveIntensity, object.castShadow, object.receiveShadow]);
    if (!batches.has(key)) {
      const material = source.clone();
      material.color.set(0xffffff); material.vertexColors = true;
      materials.set(`batch:${key}`, material);
      batches.set(key, { material, parts: [], castShadow: object.castShadow, receiveShadow: object.receiveShadow });
    }
    const part = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    part.applyMatrix4(object.matrixWorld);
    const count = part.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) source.color.toArray(colors, i * 3);
    part.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    batches.get(key).parts.push(part);
    object.removeFromParent();
    if (performance.now() - sliceStart > 8) {
      await yieldToBrowser(); sliceStart = performance.now();
    }
  }
  for (const batch of batches.values()) {
    const combined = mergeGeometries(batch.parts);
    if (!combined) throw new Error('Incompatible static scene geometry');
    const object = new THREE.Mesh(combined, batch.material);
    object.castShadow = batch.castShadow; object.receiveShadow = batch.receiveShadow;
    root.add(object);
    batch.parts.forEach(part => part.dispose());
    await yieldToBrowser();
  }
  performance.measure('catf-scene-construction', 'catf-scene-start');

  // Native links are projected onto these 3D anchors (readable at every zoom).
  const markers = [
    {id:'services',number:'01',label:'Toiture',position:new THREE.Vector3(-3.4,4.85,-.5)},
    {id:'veranda',number:'02',label:'Véranda',position:new THREE.Vector3(2.5,2.55,.3)},
    {id:'jardin',number:'03',label:'Jardin',position:new THREE.Vector3(6,1.2,3.8)},
    {id:'realisations',number:'04',label:'Réalisations',position:new THREE.Vector3(-4,.95,2.3)},
    {id:'cedric',number:'05',label:'Qui suis-je ?',position:new THREE.Vector3(-1.35,2.24,4.9),labelPosition:mailbox.position.clone().add(new THREE.Vector3(0,.9,0)),labelOffsetX:-70,labelOffsetY:12},
    {id:'contact',number:'07',label:'Contact',position:mailbox.position.clone().add(new THREE.Vector3(0,2.03,0)),labelPosition:cedric.position.clone(),labelOffsetX:100,labelOffsetY:30},
  ];
  const positions = [[19,17,24],[6,10,13],[10,5.8,9.8],[13,10,13],[-15,12,19],[5,4.6,13.8],[14,23,27],[5,7,16]];
  const targets = [[0,.6,0],[-2,3,-.8],[1.6,1.1,-.7],[4,.7,1.6],[0,1,0],[-1.35,1.1,4.9],[0,.5,0],[-.2,1,4.9]];
  const path = new THREE.CatmullRomCurve3(positions.map(p=>new THREE.Vector3(...p)),false,'catmullrom',.25);
  const aim = new THREE.CatmullRomCurve3(targets.map(p=>new THREE.Vector3(...p)),false,'catmullrom',.25);
  let width=0,height=0;
  function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  resize();
  const viewTarget = new THREE.Vector3();
  let transition;
  function prepareTransition(id) {
    const marker=markers.find(item=>item.id===id);
    if(!marker)return false;
    const focus=marker.position;
    transition={
      from:camera.position.clone(),
      to:camera.position.clone().lerp(focus,innerWidth<=760?.13:.25),
      fromLook:viewTarget.clone(),
      toLook:viewTarget.clone().lerp(focus,.6),
    };
    return true;
  }
  function renderTransition(amount) {
    if(!transition)return;
    const t=THREE.MathUtils.clamp(amount,0,1), eased=t*t*(3-2*t);
    camera.position.lerpVectors(transition.from,transition.to,eased);
    camera.lookAt(viewTarget.lerpVectors(transition.fromLook,transition.toLook,eased));
    renderer.render(scene,camera);
  }
  let directMove;
  const shadowTraveler = new THREE.Vector3(NaN, NaN, NaN);
  function prepareDirectMove() {
    directMove={position:camera.position.clone(),look:viewTarget.clone(),traveler:traveler.position.clone()};
  }
  function render(progress,pointer={x:0,y:0},directAmount=1) {
    const t=THREE.MathUtils.clamp(progress/7,0,1);
    camera.position.copy(path.getPoint(t));
    const mobile=innerWidth<=760;
    if(mobile)camera.position.multiplyScalar(1.13);
    camera.position.x+=pointer.x*.55;camera.position.y+=pointer.y*.3;
    viewTarget.copy(aim.getPoint(t));camera.lookAt(viewTarget);
    const p=road.getPoint(t);traveler.position.set(p.x,.27,p.z);
    if(directMove&&directAmount<1){
      const blend=THREE.MathUtils.smootherstep(directAmount,0,1);
      camera.position.lerpVectors(directMove.position,camera.position,blend);
      viewTarget.lerpVectors(directMove.look,viewTarget,blend);camera.lookAt(viewTarget);
      traveler.position.lerpVectors(directMove.traveler,traveler.position,blend);
    }
    // Camera/pointer movement does not change light-space shadows. Refresh
    // the map only when the one moving object has actually moved.
    if (!traveler.position.equals(shadowTraveler)) {
      sun.shadow.needsUpdate = true; shadowTraveler.copy(traveler.position);
    }
    renderer.render(scene,camera);
  }
  async function prepare() {
    performance.mark('catf-shaders-start');
    await yieldToBrowser();
    // compileAsync covers visible materials, not the shadow pass. Compile its
    // depth variants in render-target color space as well, before the first draw.
    const depthScene = new THREE.Scene();
    const depths = new Map();
    scene.traverse(object => {
      if (!object.isMesh || !object.castShadow) return;
      const side = object.material.side === THREE.FrontSide ? THREE.BackSide : object.material.side;
      if (!depths.has(side)) {
        const material = new THREE.MeshDepthMaterial({ side });
        depths.set(side, material); materials.set(`depth:${side}`, material);
        depthScene.add(new THREE.Mesh(object.geometry, material));
      }
      object.customDepthMaterial = depths.get(side);
    });
    const target = new THREE.WebGLRenderTarget(1, 1);
    try {
      renderer.setRenderTarget(target);
      await renderer.compileAsync(depthScene, sun.shadow.camera, scene);
    } finally {
      renderer.setRenderTarget(null); target.dispose();
    }
    await yieldToBrowser();
    await renderer.compileAsync(scene, camera);
    await yieldToBrowser();
    performance.measure('catf-shader-preparation', 'catf-shaders-start');
  }
  async function finishFirstFrame() {
    // Let the GPU finish the hidden first frame without forcing the compositor
    // to synchronously wait for it on the browser's main thread.
    const gl = renderer.getContext();
    const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!fence) return;
    gl.flush();
    const deadline = performance.now() + 10000;
    try {
      while (!gl.isContextLost()) {
        const status = gl.clientWaitSync(fence, 0, 0);
        if (status === gl.WAIT_FAILED) throw new Error('GPU preparation failed');
        if (status !== gl.TIMEOUT_EXPIRED) break;
        if (performance.now() > deadline) throw new Error('GPU preparation timed out');
        await new Promise(resolve => setTimeout(resolve, 8));
      }
      if (gl.isContextLost()) throw new Error('WebGL context lost during preparation');
    } finally {
      gl.deleteSync(fence);
    }
  }
  return { prepare, finishFirstFrame, render, resize, renderTransition, prepareTransition, prepareDirectMove, renderer, scene, camera, markers, dispose(){renderer.dispose();scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());} };
}
