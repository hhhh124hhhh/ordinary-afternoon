/* The island is built from colored meshes and rendered directly with WebGL. */
(() => {
  const TAU = Math.PI * 2;
  const sub = (a, b) => a.map((value, axis) => value - b[axis]);
  const add = (a, b) => a.map((value, axis) => value + b[axis]);
  const scale = (a, factor) => a.map(value => value * factor);
  const dot = (a, b) => a.reduce((total, value, axis) => total + value * b[axis], 0);
  const cross = ([x, y, z], [a, b, c]) => [y * c - z * b, z * a - x * c, x * b - y * a];
  const unit = vector => scale(vector, 1 / (Math.hypot(...vector) || 1));
  const mix = (start, end, t) => start + (end - start) * t;
  const color = hex => [0, 2, 4].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const motion = Object.freeze({
    tree: 1, sapling: 2, grass: 3, water: 4, page: 5,
    record: 6, tonearm: 7, orange: 8, orangeHalf: 9, pencil: 11, ink: 12,
    leaf: 20, butterfly: 30, bird: 40, walker: 50,
    leftLeg: 51, rightLeg: 52, leftArm: 53, rightArm: 54, shadow: 55,
    leftShin: 56, rightShin: 57,
    cat: 60, catForelegs: 61, catHindlegs: 62, catTail: 63, catShadow: 64,
    landingRing: 65, landingSpark: 67
  });
  const terrainScale = [1.42,1.38];
  const material = {ground:1, canopy:2, grass:3, flower:4, roof:5};
  let seed = 4102;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  function buildIsland() {
    seed = 4102;
    const mesh = [];
    const motes = [];
    let part = 0, surface = 0;
    const moss = ['68794a', '748453', '61754c', '6f8050', '7d8552'];
    function animated(group, draw) {
      const previous = part;
      part = group;
      draw();
      part = previous;
    }
    function coated(style, draw) {
      const previous = surface;
      surface = style;
      draw();
      surface = previous;
    }
    function triangle(a, b, c, tint, glow = 0) {
      const normal = unit(cross(sub(b, a), sub(c, a)));
      const rgb = typeof tint === 'string' ? color(tint) : tint;
      for (const vertex of [a, b, c]) mesh.push(...vertex, ...normal, ...rgb, glow, part, surface);
    }
    function quad(a, b, c, d, tint, glow) {
      triangle(a, b, c, tint, glow);
      triangle(a, c, d, tint, glow);
    }
    function box(x, y, z, w, h, d, tint, angle = 0, glow = 0) {
      const cosine = Math.cos(angle), sine = Math.sin(angle);
      const points = [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]].map(([a,b,c]) =>
        [x + (a*w*cosine - c*d*sine)/2, y + b*h/2, z + (a*w*sine + c*d*cosine)/2]);
      const faces = [[0,1,2,3],[7,6,5,4],[0,4,5,1],[1,5,6,2],[2,6,7,3],[3,7,4,0]];
      for (const face of faces) quad(...face.map(index => points[index]), tint, glow);
    }
    function pole(from, to, bottom, top, tint, sides = 8) {
      const axis = unit(sub(to, from));
      const side = unit(cross(axis, Math.abs(axis[1]) > .85 ? [1,0,0] : [0,1,0]));
      const forward = cross(axis, side);
      const ring = (point, radius, index) => add(point, add(scale(side, radius * Math.cos(index*TAU/sides)), scale(forward, radius * Math.sin(index*TAU/sides))));
      for (let index = 0; index < sides; index++) {
        const a = ring(from, bottom, index), b = ring(from, bottom, index + 1);
        const c = ring(to, top, index + 1), d = ring(to, top, index);
        quad(a, b, c, d, tint);
        triangle(to, d, c, tint);
        triangle(from, b, a, tint);
      }
    }
    function stone(x, y, z, rx, ry, rz, tints, sides = 9) {
      const rings = [0, 1, 2, 3].map(layer => Array.from({length: sides}, (_, index) => {
        const angle = (index + (layer % 2) * .45) * TAU / sides;
        const width = [.32,.91,.9,.29][layer] * (.85 + random()*.28);
        return [x + rx*Math.cos(angle)*width, y + ry*([-.87,-.43,.36,.83][layer] + random()*.23), z + rz*Math.sin(angle)*width];
      }));
      const tint = () => tints[Math.floor(random()*tints.length)];
      for (let layer = 0; layer < 3; layer++) {
        for (let index = 0; index < sides; index++) {
          const next = (index + 1) % sides;
          triangle(rings[layer][index], rings[layer+1][index], rings[layer][next], tint());
          triangle(rings[layer][next], rings[layer+1][index], rings[layer+1][next], tint());
        }
      }
      for (let index = 0; index < sides; index++) triangle([x,y+ry*.94,z], rings[3][(index+1)%sides], rings[3][index], tint());
    }
    function groundRing(rx, rz, y, irregularity, sides = 40) {
      return Array.from({length: sides}, (_, index) => {
        const angle = index * TAU / sides;
        const edge = 1 + irregularity*(Math.sin(angle*3 + .7) + .5*Math.cos(angle*7) + random()*.7);
        return [Math.cos(angle)*rx*edge, y + (random()-.5)*irregularity, Math.sin(angle)*rz*edge];
      });
    }
    function connect(lower, upper, tints) {
      for (let index = 0; index < lower.length; index++) {
        const next = (index+1)%lower.length;
        triangle(lower[index], upper[index], lower[next], tints[index%tints.length]);
        triangle(lower[next], upper[index], upper[next], tints[(index+2)%tints.length]);
      }
    }
    const layers = [
      groundRing(3.42,2.64,-1.62,.085),
      groundRing(4.99,3.48,-1.21,.08),
      groundRing(5.36,3.71,-.83,.07),
      groundRing(5.48,3.78,-.63,.07),
      groundRing(5.19,3.52,-.23,.06),
      groundRing(5.18,3.55,0,.06)
    ].map(ring => ring.map(([x,y,z]) => [x*terrainScale[0],y,z*terrainScale[1]]));
    connect(layers[0], layers[1], ['493933','4d4238','50463b','3e4136']);
    connect(layers[1], layers[2], ['765743','644938','6b533e','5c5140']);
    connect(layers[2], layers[3], ['a27b56','806246','93704c','8b704e']);
    connect(layers[3], layers[4], ['8c6b4d','7a644a','947752','7d654b']);
    coated(material.ground, () => {
      connect(layers[4], layers[5], ['566842','61744a','67744a','697744']);
      const inner = groundRing(2.47,1.73,.01,.14);
      connect(layers[5], inner, moss);
      for (let index = 0; index < inner.length; index++) triangle([0,.01,0], inner[(index+1)%inner.length], inner[index], moss[index%moss.length]);
    });

    function ellipse(x, y, z, rx, rz, tints, wiggle = 0, count = 30, glow = 0) {
      const points = Array.from({length: count}, (_, index) => {
        const angle = index*TAU/count, radius = 1 + wiggle*Math.sin(angle*3 + 1);
        return [x+rx*radius*Math.cos(angle),y,z+rz*radius*Math.sin(angle)];
      });
      for (let index = 0; index < count; index++) triangle([x,y,z],points[(index+1)%count],points[index],tints[index%tints.length],glow);
    }
    function arc(x, y, z, rx, rz, start, stop, width, tint, count = 48, glow = 0) {
      const at = (angle, offset) => [x+Math.cos(angle)*(rx+offset),y,z+Math.sin(angle)*(rz+offset)];
      for (let step = 0; step < count; step++) {
        const from = mix(start,stop,step/count), to = mix(start,stop,(step+1)/count);
        quad(at(from,0),at(from,width),at(to,width),at(to,0),tint,glow);
      }
    }
    ellipse(0,-1.82,0,7.68,5.29,['212f29'],.05,42,.65);
    ellipse(0,-1.81,0,6.14,4.37,['192822'],.04,42,.65);
    arc(0,-1.84,0,8.52,6.20,0,TAU,.016,'3f5041',90,.8);
    arc(0,-1.84,0,8.91,6.53,.12,1.56,.023,'596550',36,.8);
    arc(0,-1.84,0,8.91,6.53,2.26,3.3,.023,'596550',30,.8);
    arc(0,-1.84,0,9.20,6.76,3.65,4.8,.02,'384b40',30,.8);
    for (let index = 0; index < 32; index++) {
      const angle = index*TAU/32;
      arc(0,-1.835,0,8.55,6.23,angle,angle+.004,index%4===0?.15:.07,'5a6350',1,.8);
    }

    const trail = [[-3.12,-.9],[-2.65,-.49],[-2,-.2],[-1.3,.04],[-.65,.25],[0,.4],[.72,.45],[1.38,.25],[2,-.25],[2.59,-.77],[3.05,-1.2]];
    const westTrail = [[-6.27,.60],[-5.65,.85],[-5.05,.71],[-4.50,.38],[-3.92,.08],[-3.30,.02],[-2.60,.08],[-1.96,-.19]];
    const eastTrail = [[2.05,-.28],[2.80,.12],[3.65,.19],[4.55,-.08],[5.21,-.48],[5.81,-1.02],[6.32,-1.25]];
    const southTrail = [[-4.95,.66],[-4.32,1.69],[-3.60,2.69],[-2.64,3.38],[-1.40,3.67],[.06,3.50],[1.38,3.44],[2.82,2.95],[4.01,2.41],[4.76,1.19],[5.09,.06]];
    const northTrail = [[-5.93,-.1],[-5.37,-1.30],[-4.52,-2.62],[-3.39,-3.46],[-1.91,-3.88],[-.34,-3.89],[1.24,-3.57],[2.79,-3.45],[4.31,-2.72],[5.81,-1.02]];
    function path(points, width, tint, y) {
      for (let index = 0; index < points.length - 1; index++) {
        const [x, z] = points[index], [nx, nz] = points[index+1];
        const offset = width*(.87+random()*.18);
        quad([x,y,z-offset],[x,y,z+offset],[nx,y,nz+offset],[nx,y,nz-offset],tint);
      }
    }
    path(trail,.32,'a69363',.038);
    for (const route of [westTrail,eastTrail,southTrail,northTrail]) path(route,.27,'9f8d60',.036);
    path([[-2.04,1.81],[-1.67,1.33],[-1.35,.68],[-1.13,.13]],.24,'a69363',.041);
    path([[.73,.45],[1.28,.8],[1.8,1.06],[2.5,1.39],[3.12,1.47]],.26,'a69363',.042);
    ellipse(.12,.045,2.08,1.83,.95,['a38c5f','aa9263','9d855b'],.09);
    animated(motion.water, () => {
      ellipse(.12,.05,2.08,1.67,.82,['547e73','5c897e','57877d','628e83'],.1);
      ellipse(.17,.054,1.99,1.2,.48,['66988b','679b8f','619386'],.15);
    });
    stone(-.32,.157,1.14,.42,.142,.19,['899077','a2a389','78846b','8c947a'],9);
    for (const [x,z] of [[-1.46,2.08],[-.9,2.7],[1.42,2.32],[1.63,2.01],[.75,2.82],[-.85,1.48]]) {
      stone(x,.06,z,.25,.15,.14,['747e65','899177','9b9c80'],6);
    }
    for (let index = 0; index < 10; index++) {
      const x = -.96+random()*2.02, z = 1.71+random()*.69;
      ellipse(x,.059,z,.07+random()*.05,.046,['617e4a','779058'],.14,7);
    }

    const wood = '77513c', dark = '49362b', yellow = 'ffc46b';
    function lantern(x, y, z) {
      box(x,y,z,.14,.19,.14,yellow,0,.88);
      box(x,y+.11,z,.20,.04,.20,dark);
      box(x,y-.11,z,.18,.04,.18,dark);
      for (const dx of [-.076,.076]) for (const dz of [-.076,.076]) box(x+dx,y,z+dz,.017,.20,.017,dark);
    }
    function books(x,y,z,count) {
      const covers = ['ac6249','cb9e59','617c6e','e3c48b','8b6b84'];
      for (let index = 0; index < count; index++) {
        const height = .16+random()*.19;
        box(x+index*.107,y+height/2,z,.088,height,.19,covers[index%5],(random()-.5)*.15);
      }
    }

    // Reading cabin and bookcase.
    const cabinX = -2.95, cabinZ = -1.76;
    ellipse(cabinX,.048,cabinZ,1.69,1.22,['5d6e44'],.1);
    box(cabinX,.14,cabinZ,2.53,.25,2.02,dark);
    for (let index = 0; index < 12; index++) box(cabinX-1.17+index*.212,.274,cabinZ,.202,.045,2.04,['a4774f','a97d54','986b49'][index%3]);
    box(cabinX,1.14,cabinZ-.79,2.32,1.75,.15,'a37853');
    box(cabinX-1.08,1.14,cabinZ-.22,.14,1.75,1.22,'916748');
    for (let index = 0; index < 10; index++) box(cabinX, .36+index*.17,cabinZ-.701,2.17,.018,.022,'815b43');
    for (const x of [-1.09,1.09]) {
      for (const z of [-.79,.8]) box(cabinX+x,1.19,cabinZ+z,.13,1.9,.13,wood);
    }
    for (const z of [-.8,.8]) box(cabinX,2.025,cabinZ+z,2.41,.15,.19,dark);
    const ridge = 2.84, eave = 2.07;
    for (const side of [-1,1]) {
      for (let index = 0; index < 13; index++) {
        const z = cabinZ - 1.07 + index * .169;
        const x = cabinX + side * 1.36;
        const panel = [[cabinX,ridge,z],[x,eave,z],[x,eave,z+.164],[cabinX,ridge,z+.164]];
        if (side === 1) panel.reverse();
        coated(material.roof, () => quad(...panel,['ac7548','b4804f','bf905b','a16b43'][index%4]));
        pole([cabinX,ridge+.02,z],[x,eave+.019,z],.021,.021,'cc9a60',5);
      }
      triangle([cabinX,ridge-.1,cabinZ-1.04],[cabinX+side*1.15,eave,cabinZ-1.04],[cabinX,eave,cabinZ-1.04],'895d40');
    }
    pole([cabinX,ridge+.026,cabinZ-1.1],[cabinX,ridge+.026,cabinZ+1.12],.052,.046,'d1a064',8);
    box(cabinX+.51,.96,cabinZ-.53,1.0,1.33,.14,'634735');
    for (const y of [.35,.79,1.19,1.59]) box(cabinX+.51,y,cabinZ-.40,1.07,.065,.39,wood);
    for (const y of [.39,.83,1.23]) books(cabinX+.08,y,cabinZ-.33,9);
    box(cabinX-.58,.66,cabinZ+.12,.59,.10,.56,'b08257');
    for (const x of [-.82,-.35]) for (const z of [-.11,.34]) box(cabinX+x,.46,cabinZ+z,.07,.37,.07,wood);
    box(cabinX-.58,.95,cabinZ-.15,.63,.51,.07,'956b48');
    lantern(cabinX+.87,1.71,cabinZ+.62);
    for (let index = 0; index < 3; index++) box(cabinX,.065+index*.055,cabinZ+1.39-index*.17,.98,.12,.32,['a9835a','b68a60','ad8155'][index]);
    const book = [-3.09,.99,-1.09];
    pole([book[0],.30,book[2]],[book[0],.89,book[2]],.078,.055,wood);
    box(book[0],.915,book[2],.87,.08,.59,'bb8a57');
    box(book[0],.97,book[2],.73,.028,.48,'8e533e');
    for (const side of [-1,1]) {
      box(book[0]+side*.174,.983,book[2],.342,.015,.446,'e4cda0');
      for (let line = 0; line < 5; line++) {
        box(book[0]+side*.175,.992,book[2]-.13+line*.058,.214,.002,.007,'a58b67');
      }
    }
    animated(motion.page, () => {
      const [x,y,z] = book;
      for (let strip = 0; strip < 12; strip++) {
        const start = strip*.028, end = start+.028;
        quad([x+start,y+.010,z-.217],[x+start,y+.010,z+.217],
          [x+end,y+.010,z+.217],[x+end,y+.010,z-.217],'f0dcb0');
        if (strip < 2 || strip > 9) continue;
        for (let line = 0; line < 5; line++) {
          const edge = z-.126+line*.057;
          quad([x+start,y+.012,edge],[x+start,y+.012,edge+.007],
            [x+end,y+.012,edge+.007],[x+end,y+.012,edge],'ac9169');
        }
      }
    });

    // Old tree, low roots and layered foliage.
    const tree = [-.12,0,-1.12];
    ellipse(tree[0],.047,tree[2],1.7,1.03,['617249'],.18);
    for (let index = 0; index < 9; index++) {
      const angle = index*TAU/9;
      const root = [tree[0]+Math.cos(angle)*(.67+random()*.43),.04,tree[2]+Math.sin(angle)*(.54+random()*.31)];
      pole([tree[0],.30,tree[2]],root,.18,.027,['795a40','6d4f3a','886648'][index%3],7);
    }
    part = motion.tree;
    pole(tree,[.03,1.15,-1.19],.35,.245,'76543d');
    pole([.03,1.15,-1.19],[-.12,2.5,-1.23],.246,.17,'8a6446');
    pole([-.12,2.5,-1.23],[.18,4.46,-1.27],.17,.065,'94704b');
    const crown = [[-1.22,3.17,-1.45,1.05],[-.76,3.88,-.62,1.23],[.76,3.65,-.57,1.24],[1.11,3.96,-1.61,1.17],[-.32,4.7,-1.43,1.34],[.52,4.98,-1.58,1.06],[-.83,4.18,-2.1,1.0],[.47,4.24,-2.22,1.15]];
    crown.forEach(([x,y,z,size], index) => {
      const start = [0,1.65+(index%4)*.42,-1.21];
      const end = [x*.72,y-.52,z];
      pole(start,end,.12,.038,index%2?'866149':'74533d',7);
      pole(end,[x,y+.16,z],.042,.018,'87644a',6);
      const tints = ['68804c','758c53','829658','8d9c5c','95a265','a2a66a'].slice(index%2, index%2+5);
      coated(material.canopy, () => {
        stone(x,y,z,size,size*.66,size*.76,tints,11);
        stone(x+(index%2?.40:-.4),y+.31,z+.18,size*.75,size*.47,size*.63,tints.slice(1),9);
      });
    });
    part = 0;
    for (let index = 0; index < 9; index++) {
      const x = -1.35+random()*2.84, z = -2.46+random()*2.05;
      stone(x,.015,z,.06,.025,.038,['a2a566','b9a36d','bbaa71'],5);
    }

    // Writing table with open notebook and mug.
    const deskX = -2.72, deskZ = 1.79;
    ellipse(deskX,.047,deskZ,1.08,.82,['68754a'],.15);
    for (const x of [-.62,.62]) for (const z of [-.36,.36]) box(deskX+x,.36,deskZ+z,.10,.72,.1,wood);
    box(deskX,.70,deskZ,1.53,.12,.91,'946646');
    for (let index = 0; index < 5; index++) box(deskX,.778,deskZ-.36+index*.18,1.62,.045,.172,['bd8a5a','b78354','c4915d'][index%3]);
    box(deskX-.09,.815,deskZ+.16,.61,.029,.43,'4e6a64',-.13);
    box(deskX-.235,.842,deskZ+.185,.281,.026,.4,'eee1b6',-.13);
    box(deskX+.055,.842,deskZ+.149,.281,.026,.4,'e6d6a5',-.13);
    for (let index = 0; index < 5; index++) box(deskX-.22,.857,deskZ+.045+index*.053,.178,.006,.009,'ac916b',-.13);
    const penTip = [-2.779,.867,1.96];
    animated(motion.pencil, () => {
      pole(add(penTip,[.032,.024,-.011]),add(penTip,[.24,.183,-.079]),.023,.023,'c47548',6);
      pole(penTip,add(penTip,[.032,.024,-.011]),.004,.023,'dbc298',6);
      pole(add(penTip,[.24,.183,-.079]),add(penTip,[.275,.205,-.090]),.023,.022,'d68a75',6);
    });
    animated(motion.ink, () => {
      for (let step = 0; step < 36; step++) {
        const from = step/36, to = (step+1)/36;
        const a = add(penTip,[from*.212,-.006,Math.sin(from*24)*.026]);
        const b = add(penTip,[to*.212,-.006,Math.sin(to*24)*.026]);
        quad(a,add(a,[0,0,.006]),add(b,[0,0,.006]),b,'554633');
      }
    });
    pole([deskX+.51,.803,deskZ-.19],[deskX+.51,.964,deskZ-.19],.066,.074,'cb885c',10);
    pole([deskX+.51,.962,deskZ-.19],[deskX+.51,.968,deskZ-.19],.051,.051,dark,10);
    lantern(deskX-.61,.913,deskZ-.30);
    for (const x of [-.21,.21]) for (const z of [-.16,.16]) box(deskX+.10+x,.19,deskZ+.73+z,.07,.38,.07,wood);
    box(deskX+.10,.389,deskZ+.73,.57,.08,.45,'ae8155');

    // Gramophone on a stone terrace.
    const gramX = 2.72, gramZ = -1.74;
    ellipse(gramX,.044,gramZ,1.37,.99,['939474','888b6c','959779'],.09);
    for (let index = 0; index < 10; index++) {
      const angle = index*TAU/10;
      stone(gramX+Math.cos(angle)*1.19,.07,gramZ+Math.sin(angle)*.82,.26,.13,.17,['8a9078','a2a38b','777f67'],7);
    }
    box(gramX,.34,gramZ,1.1,.56,.77,'76523b');
    box(gramX,.08,gramZ,1.17,.11,.83,dark);
    box(gramX,.63,gramZ,1.14,.095,.81,'b18454');
    box(gramX,.39,gramZ+.395,.65,.21,.032,'9e6e49');
    box(gramX,.39,gramZ+.424,.19,.033,.04,'d5a65f');
    animated(motion.record, () => {
      const [x,z] = [gramX-.12,gramZ+.092];
      pole([x,.679,z],[x,.701,z],.28,.28,'283733',36);
      for (const radius of [.107,.146,.185,.223,.263]) {
        arc(x,.703,z,radius,radius,0,TAU,.005,'56685d',46);
        arc(x,.704,z,radius,radius,.26,1.23,.012,'819382',12);
      }
      ellipse(x,.706,z,.093,.093,['d29f59'],0,20);
      arc(x,.708,z,.044,.044,.04,2.83,.026,'f1c679',16);
      pole([x,.707,z],[x,.729,z],.014,.014,'5d4b33',10);
    });
    const pivot = [3.12,.72,-1.99];
    pole([pivot[0],.67,pivot[2]],[pivot[0],.78,pivot[2]],.058,.04,'493e31',9);
    animated(motion.tonearm, () => {
      const elbow = add(pivot,[-.025,.076,.19]);
      const head = add(pivot,[-.108,.035,.37]);
      pole(add(pivot,[0,.062,0]),elbow,.021,.018,'bfa47a',8);
      pole(elbow,head,.018,.015,'d6bc8d',8);
      box(...head,.061,.035,.056,'574738');
      pole(head,add(head,[0,-.043,0]),.009,.003,'e5ca9a',6);
    });
    const bend = [[gramX+.35,.67,gramZ-.20],[gramX+.35,1.03,gramZ-.20],[gramX+.20,1.27,gramZ-.14],[gramX+.07,1.43,gramZ],[gramX-.06,1.60,gramZ+.13],[gramX-.23,1.73,gramZ+.37]];
    const radii = [.055,.066,.093,.14,.27,.48];
    for (let index = 0; index < bend.length - 1; index++) pole(bend[index],bend[index+1],radii[index],radii[index+1],['b27848','c69759','d4a96a','d9a258','e6b976'][index],16);
    const hornDirection = unit(sub(bend[5],bend[4]));
    const hornEdge = add(bend[5],scale(hornDirection,.018));
    pole(bend[5],hornEdge,.48,.49,'edc285',20);
    pole(hornEdge,add(hornEdge,scale(hornDirection,.003)),.425,.428,'795438',20);
    pole(add(hornEdge,scale(hornDirection,.006)),add(hornEdge,scale(hornDirection,.009)),.255,.257,'49392d',18);
    lantern(gramX+.77,.21,gramZ+.29);

    // Bench for two, under a smaller golden tree.
    const benchX = 3.18, benchZ = 1.51;
    ellipse(benchX,.046,benchZ,1.48,.91,['768055'],.11);
    for (const x of [-.73,.73]) {
      for (const z of [-.22,.22]) box(benchX+x,.27,benchZ+z,.085,.54,.092,dark);
      box(benchX+x,.70,benchZ-.25,.08,.70,.09,wood);
      box(benchX+x,.717,benchZ,.12,.078,.52,'ad7b50');
      box(benchX+x,.62,benchZ+.21,.07,.23,.07,wood);
    }
    for (let index = 0; index < 4; index++) box(benchX,.53,benchZ-.198+index*.13,1.65,.09,.119,['b88754','c3915a','bc8652','c39360'][index]);
    for (let index = 0; index < 3; index++) box(benchX,.73+index*.115,benchZ-.264,1.65,.1,.092,['a7784d','b28250','c69762'][index]);
    box(benchX-.39,.598,benchZ+.03,.36,.07,.31,'a86653',.09);
    box(benchX+.30,.596,benchZ-.04,.32,.06,.31,'d1ad70',-.14);
    const orange = [3.16,.738,1.59];
    animated(motion.orange, () => {
      stone(...orange,.102,.10,.102,['e0a54d','f9b856','ed9d42'],10);
      pole(add(orange,[0,.091,0]),add(orange,[.018,.123,0]),.012,.007,'726a45',5);
    });
    for (const direction of [-1,1]) {
      animated(motion.orangeHalf+(direction+1)/2, () => {
        const rind = [], edge = [];
        for (let index = 0; index <= 12; index++) {
          const angle = index*TAU/12;
          rind.push(add(orange,[0,Math.cos(angle)*.097,Math.sin(angle)*.097]));
          edge.push(add(orange,[.003*direction,Math.cos(angle)*.082,Math.sin(angle)*.082]));
        }
        for (let index = 0; index < 12; index++) {
          const tip = add(orange,[direction*.091,0,0]);
          triangle(tip,rind[index],rind[index+1],['e2a346','f8ac4c','f0b75b'][index%3]);
          quad(rind[index],rind[index+1],edge[index+1],edge[index],'ffcf7c');
          triangle(add(orange,[.006*direction,0,0]),edge[index+1],edge[index],['efb359','ffcb76'][index%2]);
        }
      });
    }
    const smallTree = [4.12,0,.55];
    part = motion.sapling;
    pole(smallTree,[4.15,1.86,.5],.13,.071,'8a6546');
    pole([4.15,1.06,.5],[4.65,2.11,.48],.067,.028,'91704e');
    pole([4.15,1.26,.5],[3.83,2.15,.73],.06,.024,'91704e');
    const ochre = ['a28f50','b29d56','bcab61','c4ab62','cbb171'];
    coated(material.canopy, () => {
      stone(4.16,2.38,.48,.68,.62,.60,ochre,10);
      stone(4.61,2.14,.47,.51,.47,.51,ochre,9);
      stone(3.83,2.14,.76,.5,.42,.44,ochre,9);
      stone(4.22,2.69,.39,.48,.47,.46,ochre,9);
    });
    part = 0;

    // The longer paths connect the stone lookout and a grove on the far side.
    ellipse(-5.96,.049,.68,.96,.70,['919174','a3a081','9a9d7d'],.13,24);
    for (let index = 0; index < 9; index++) {
      const angle = .68+index*.39;
      stone(-5.96+Math.cos(angle)*.80,.115,.68+Math.sin(angle)*.57,.18,.19,.15,['9e9780','838977','a5a28a'],7);
    }
    for (const x of [-6.32,-5.58]) {
      pole([x,.05,.42],[x,.68,.42],.061,.054,'78563e',7);
      lantern(x,.80,.42);
    }
    box(-5.95,.46,.42,.84,.085,.078,'a77855');
    for (const [x,z,size] of [[5.53,-2.20,1.14],[6.12,-1.66,.87],[4.90,-2.66,.92],[2.21,-4.00,.82],[-4.80,-2.96,1.04],[-5.35,1.90,.90],[3.7,3.27,.75]]) {
      animated(motion.sapling, () => {
        pole([x,.01,z],[x-.07,1.69*size,z],.11*size,.047*size,'886748',8);
        pole([x-.03,.83*size,z],[x+.41,1.48*size,z+.12],.065*size,.023*size,'8e6a4b',6);
        coated(material.canopy, () => {
          const colors = ['688256','76885a','85975f','9ba268'];
          stone(x-.09,1.91*size,z,.64*size,.70*size,.59*size,colors,10);
          stone(x+.43,1.60*size,z+.13,.49*size,.50*size,.46*size,colors,9);
          stone(x-.38,1.59*size,z-.18,.47*size,.46*size,.42*size,colors,9);
        });
      });
    }

    // Grass, wildflowers and pebbles are concentrated away from the paths.
    const clearings = [[0,2.07,1.8,1],[-2.95,-1.76,1.54,1.26],[2.72,-1.74,1.26,.95],[-2.72,1.79,1.05,.9],[3.18,1.51,1.22,.7],[-.12,-1.12,.67,.53]];
    const trailEdges = [...trail,...westTrail,...eastTrail,...southTrail,...northTrail];
    for (let index = 0; index < 1150; index++) {
      const angle = random()*TAU, radius = Math.sqrt(random())*.95;
      const x = Math.cos(angle)*7.08*radius, z = Math.sin(angle)*4.78*radius;
      if (clearings.some(([cx,cz,rx,rz]) => ((x-cx)/rx)**2+((z-cz)/rz)**2 < 1)) continue;
      if (trailEdges.some(([cx,cz]) => (x-cx)**2+(z-cz)**2 < .23)) continue;
      if (index%19 === 0) {
        stone(x,.066,z,.14+random()*.14,.10+random()*.12,.095+random()*.15,['7e856a','97947a','6f785f'],6);
        continue;
      }
      const size = .07+random()*.22;
      animated(motion.grass, () => {
        coated(material.grass, () => {
          for (let blade = 0; blade < 3; blade++) {
            const dx = (random()-.5)*size, dz = (random()-.5)*size;
            triangle([x+.029,.027,z],[x+dx,size,z+dz],[x-.029,.029,z+.04],['8d9a5e','9da865','708450','a3a66a'][(index+blade)%4]);
          }
        });
        if (index%9 === 0) {
          pole([x,.04,z],[x,.13+size,z],.012,.007,'778951',5);
          coated(material.flower, () => stone(x,.13+size,z,.043,.047,.043,['d9ae67','dfbb79','eee1a4','d19c76'],5));
        }
      });
    }
    for (const [x,y,z,w] of [[-4.63,-.43,1.0,.54],[-3.7,-.6,2.5,.52],[3.18,-.63,2.84,.47],[4.65,-.48,1.38,.54],[1.56,-.57,3.45,.42],[-1.57,-.79,3.4,.45]]) {
      stone(x,y,z,w,.52,w*.77,['8d7257','a38564','806950','947c5e'],7);
    }
    for (const [x,z] of [[-1.76,-2.75],[-4.17,.5],[-3.6,2.32],[3.83,-1.97],[2.45,2.58],[1.14,-2.78]]) {
      for (let index = 0; index < 4; index++) {
        stone(x+(random()-.5)*.58,.10+random()*.17,z+(random()-.5)*.47,.26,.23,.21,['778a52','84975c','667c4c'],7);
      }
    }
    for (let index = 0; index < 20; index++) {
      animated(motion.leaf+index*.1, () => {
        const tint = ['d1af60','e5ba6c','b7a65c','c59354'][index%4];
        const size = .050+random()*.047;
        const a = [-size,0,0], b = [0,0,size*.7], c = [size,0,0], d = [0,0,-size*.66];
        triangle(a,b,[0,.022,0],tint, .20);
        triangle(b,c,[0,.022,0],tint, .20);
        triangle(c,d,[0,.022,0],tint, .20);
        triangle(d,a,[0,.022,0],tint, .20);
      });
    }
    for (let index = 0; index < 4; index++) {
      animated(motion.butterfly+index, () => {
        const tint = ['ebbb6a','e6aa85','a9c3bb','e5d3a1'][index];
        for (const side of [-1,1]) {
          const hinge = [0,.008,0];
          triangle(hinge,[side*.17,.01,-.047],[side*.132,.018,.09],tint,.45);
          triangle(hinge,[side*.132,.018,.09],[side*.085,.013,.158],tint,.35);
          triangle(hinge,[side*.17,.010,-.047],[side*.116,.012,-.064],'eaddb3',.32);
        }
        pole([0,0,-.078],[0,0,.107],.012,.009,'68543b',5);
      });
    }
    for (let index = 0; index < 3; index++) {
      animated(motion.bird+index, () => {
        const tint = ['d1c4a0','b4ae91','dfc8a1'][index];
        stone(0,0,0,.062,.044,.192,[tint,'8d8c79'],7);
        triangle([-.046,.009,-.079],[.044,.009,-.079],[.02,.023,-.25],tint,.18);
        for (const side of [-1,1]) {
          const hinge = [side*.025,.02,.07], shoulder = [side*.153,.023,.047];
          const tip = [side*.379,.015,-.13], tail = [side*.134,.007,-.101];
          triangle(hinge,shoulder,tail,tint,.32);
          triangle(shoulder,tip,tail,'a7a088',.35);
        }
      });
    }
    animated(motion.shadow, () => {
      ellipse(0,.043,0,.26,.18,['596347'],.08,18,.22);
    });
    const coat = 'bc6750', scarf = 'e3bb7c', boots = '473828', skin = 'dca878', hair = '4c3b2f';
    animated(motion.walker, () => {
      box(0,.555,0,.315,.32,.195,coat);
      box(0,.40,0,.305,.058,.199,'98583f');
      box(0,.572,.102,.018,.245,.018,'915446');
      box(0,.695,.005,.272,.063,.214,scarf);
      box(.065,.614,.116,.086,.147,.028,scarf,-.12);
      pole([0,.665,0],[0,.744,0],.069,.077,skin,8);
      stone(0,.814,.015,.123,.144,.114,[skin,'e5b287','d5a277'],10);
      stone(0,.897,-.02,.130,.079,.115,[hair,'69513e','5b4735'],9);
      box(0,.84,-.074,.206,.135,.069,hair);
      for (const x of [-.042,.042]) box(x,.829,.108,.016,.016,.012,'4f4236');
      box(0,.801,.121,.033,.028,.029,'d5a277');
      box(-.077,.50,-.128,.183,.221,.083,'a38153');
      box(-.077,.588,-.177,.178,.054,.031,'c6a16b');
    });
    for (const side of [-1,1]) {
      const x = side*.082;
      animated(side === -1 ? motion.leftLeg : motion.rightLeg, () => {
        box(x,.31,-.012,.115,.165,.124,'4c5851');
      });
      animated(side === -1 ? motion.leftShin : motion.rightShin, () => {
        box(x,.157,-.012,.106,.171,.114,'4c5851');
        box(x,.082,.022,.124,.126,.199,boots);
      });
      animated(side === -1 ? motion.leftArm : motion.rightArm, () => {
        pole([side*.153,.657,-.002],[side*.210,.444,.027],.057,.045,coat,8);
        stone(side*.210,.418,.036,.046,.052,.046,[skin,'dfac80'],7);
      });
    }
    animated(motion.catShadow, () => ellipse(0,.043,0,.22,.28,['586349'],.06,16,.20));
    const fur = ['c78950','df9d5d','d39458'], cream = 'efd2a2', paws = 'd9a46f';
    animated(motion.cat, () => {
      stone(0,.217,-.047,.142,.143,.252,fur,9);
      stone(0,.274,.159,.129,.135,.117,fur,9);
      stone(0,.227,.226,.076,.066,.052,[cream,'e2bd8a'],7);
      box(0,.248,.264,.030,.021,.014,'875b50');
      for (const side of [-1,1]) {
        const x = side*.068;
        triangle([x-.048,.329,.102],[x+.048,.329,.113],[x+side*.026,.455,.128],fur[1]);
        triangle([x+.048,.329,.113],[x,.329,.066],[x+side*.026,.455,.128],fur[0]);
        triangle([x-.024,.347,.117],[x+.024,.347,.117],[x+side*.018,.422,.128],'ce8979',.22);
        box(x,.288,.239,.023,.022,.012,'514836');
      }
    });
    for (const side of [-1,1]) {
      const x = side*.081;
      animated(motion.catForelegs, () => pole([x,.216,.120],[x,.045,.156],.039,.032,paws,6));
      animated(motion.catHindlegs, () => pole([x,.184,-.168],[x,.047,-.134],.052,.032,paws,6));
    }
    animated(motion.catTail, () => {
      const tail = [[0,.237,-.24],[.017,.302,-.349],[.047,.426,-.415],[.087,.506,-.397],[.106,.528,-.347]];
      for (let index = 0; index < tail.length-1; index++) {
        pole(tail[index],tail[index+1],.037-index*.006,.032-index*.006,fur[index%3],7);
      }
    });
    for (let ring = 0; ring < 2; ring++) {
      animated(motion.landingRing+ring, () => arc(0,.056+ring*.003,0,1,1,0,TAU,.021,'eac589',52,.88));
    }
    for (let index = 0; index < 26; index++) {
      animated(motion.landingSpark+index*.1, () => {
        const size = .025+random()*.033;
        const tint = ['f3d692','edd097','dca563'][index%3];
        triangle([-size,0,0],[0,size*1.7,0],[size,0,0],tint,.86);
        triangle([0,-size*.4,-size],[0,size*1.7,0],[0,-size*.4,size],tint,.86);
      });
    }
    for (let index = 0; index < 136; index++) {
      const angle = random()*TAU, radius = .36+random()*.91;
      motes.push([Math.cos(angle)*8.15*radius, .16+random()*5.4, Math.sin(angle)*6.3*radius, random()*TAU, index < 66 ? .7+random()*1.6 : 3.1+random()*.95]);
    }
    return {mesh: new Float32Array(mesh), motes, shoreline: layers[5].map(([x,,z]) => [x,z])};
  }

  const vertexSource = `
    attribute vec3 position, normal, pigment;
    attribute float emission, groupId, surfaceId;
    uniform vec3 right, up, forward, target, light, ambient, direct;
    uniform vec2 zoom, shift;
    uniform mediump float elapsed;
    uniform mediump vec4 actionAge;
    uniform mediump vec4 seasonMix;
    uniform vec4 walker;
    uniform vec3 stride;
    uniform vec4 cat;
    uniform mediump vec4 pose;
    uniform vec3 catStride;
    uniform vec3 arrival;
    varying vec3 shade, world;
    varying float group, visiblePart;

    vec2 turn(vec2 point, float angle) {
      float c = cos(angle), s = sin(angle);
      return vec2(c*point.x-s*point.y,s*point.x+c*point.y);
    }
    float writing(float age) { return smoothstep(.36,2.08,age); }
    void main() {
      vec3 p = position, n = normal;
      float id = groupId;
      float t = elapsed;
      float emit = emission;
      group = id;
      visiblePart = 1.;
      bool thin = false;
      if (id == ${motion.tree}.) {
        float bend = max(0.,p.y-.16);
        vec2 wind = vec2(sin(t*1.38)+.43*sin(t*3.17),cos(t*1.19));
        p.xz += vec2(.014,.010)*wind*bend*bend;
        n.xy = turn(n.xy,-wind.x*bend*.022);
      } else if (id == ${motion.sapling}.) {
        float bend = max(0.,p.y-.06);
        vec2 wind = vec2(sin(t*1.63+.83),cos(t*1.40+.43));
        p.xz += vec2(.032,.025)*wind*bend*bend;
        n.xy = turn(n.xy,-wind.x*bend*.045);
      } else if (id == ${motion.grass}.) {
        float sway = sin(t*2.7-p.x*.93+p.z*.71);
        p.xz += vec2(sway,cos(t*2.3+p.z)) * max(0.,p.y-.028)*.42;
      } else if (id == ${motion.page}.) {
        float reach = p.x+3.09;
        float phase = smoothstep(.03,1.49,actionAge.x);
        float curl = sin(phase*3.14159)*reach*2.2;
        float angle = phase*3.14159-curl;
        p.x = -3.09+cos(angle)*reach;
        p.y += sin(angle)*reach;
        n.xy = turn(n.xy,angle);
        thin = true;
      } else if (id == ${motion.record}.) {
        float playing = clamp(actionAge.y-.16,0.,5.95);
        float spin = 4.6*playing-.64*(1.-exp(-playing*4.));
        p.xz = turn(p.xz-vec2(2.60,-1.648),spin)+vec2(2.60,-1.648);
        n.xz = turn(n.xz,spin);
      } else if (id == ${motion.tonearm}.) {
        float age = actionAge.y;
        float onRecord = smoothstep(0.,.56,age)*(1.-smoothstep(5.55,6.14,age));
        float angle = .93*onRecord;
        p.xz = turn(p.xz-vec2(3.12,-1.99),angle)+vec2(3.12,-1.99);
        p.y -= .027*onRecord*clamp(length(p.xz-vec2(3.12,-1.99))*3.,0.,1.);
        n.xz = turn(n.xz,angle);
      } else if (id >= ${motion.orange}. && id < ${motion.pencil}.) {
        float age = actionAge.z;
        float lift = smoothstep(0.,.45,age);
        float lay = smoothstep(.79,2.36,age);
        p.y += .32*lift*(1.-lay);
        if (id == ${motion.orange}.) {
          visiblePart = 1.-step(.45,age);
        } else {
          visiblePart = step(.45,age);
          float side = id == ${motion.orangeHalf}. ? -1. : 1.;
          float slide = smoothstep(.45,2.36,age);
          float angle = side*slide*.93;
          p.xz = turn(p.xz-vec2(3.16,1.59),angle)+vec2(3.16,1.59);
          p.xz += vec2(side*.43*slide,side*.095*slide);
          n.xz = turn(n.xz,angle);
        }
      } else if (id == ${motion.pencil}.) {
        float age = actionAge.w;
        float progress = writing(age);
        float writingNow = smoothstep(0.,.33,age)*(1.-smoothstep(2.10,2.73,age));
        float pitch = mix(-.66,0.,writingNow);
        float xy = smoothstep(2.14,2.73,age);
        p.xy = turn(p.xy-vec2(-2.779,.867),pitch)+vec2(-2.779,.867);
        p += vec3(.212*progress-.090*(1.-writingNow),.115*sin(xy*3.14159)+.026*(1.-writingNow),.026*sin(progress*24.)+.148*(1.-writingNow));
        n.xy = turn(n.xy,pitch);
      } else if (id >= ${motion.leaf}. && id < ${motion.butterfly}.) {
        float key = (id-${motion.leaf}.)*10.;
        float fall = fract(t*(.092+fract(key*.52)*.062)+key*.381966);
        float branch = key*2.4;
        float small = step(12.,key);
        float tumble = fall*(8.+mod(key,4.))*3.14159;
        p.xy = turn(p.xy,tumble);
        p.xz = turn(p.xz,branch+fall*5.);
        float top = mix(3.65+fract(key*.41)*.96,2.40+fract(key*.42)*.40,small);
        float x = mix(.96*cos(branch),4.03+.48*cos(branch),small);
        float z = mix(-1.07+.62*sin(branch),.59+.43*sin(branch),small);
        p += vec3(x+fall*(.18+sin(branch))+.47*sin(fall*6.7+branch)*fall,
          top*(1.-fall)+.08,
          z+fall*(.75+.47*cos(branch))+.34*sin(fall*8.+branch)*fall);
        visiblePart = 1.-step(.69,seasonMix.w);
        thin = true;
      } else if (id >= ${motion.landingRing}.) {
        float age = arrival.z;
        if (id < ${motion.landingSpark}.) {
          float delay = (id-${motion.landingRing}.)*.09;
          float progress = clamp((age-delay)/.43,0.,1.);
          visiblePart = step(delay,age)*(1.-step(.96,progress));
          p.xz = p.xz*(.08+1.11*progress)+walker.xy;
        } else {
          float key = (id-${motion.landingSpark}.)*10.;
          float angle = key*2.39996;
          float life = .37+fract(key*.71)*.34;
          float progress = clamp(age/life,0.,1.);
          float radius = (.43+fract(key*.41)*.90)*(1.-(1.-progress)*(1.-progress));
          vec2 drift = vec2(cos(angle),sin(angle))*radius;
          p *= max(.03,1.-progress);
          p.xz += walker.xy+drift;
          p.y += sin(progress*3.14159)*(.16+fract(key*.47)*.57)+.064;
          visiblePart = step(0.,age)*(1.-step(.99,progress));
        }
        p.y += stride.z;
        thin = true;
      } else if (id >= ${motion.cat}.) {
        visiblePart = cat.w;
        if (id == ${motion.catShadow}.) {
          p.xz = turn(p.xz,cat.z)+cat.xy;
          p.y += catStride.z;
        } else {
          if (id == ${motion.catForelegs}. || id == ${motion.catHindlegs}.) {
            float front = id == ${motion.catForelegs}. ? 1. : -1.;
            vec2 joint = vec2(.202,front*.142);
            float kick = sin(catStride.x+sign(p.x)*front*1.5708)*catStride.y*.58;
            p.yz = turn(p.yz-joint,kick)+joint;
            n.yz = turn(n.yz,kick);
          } else if (id == ${motion.catTail}.) {
            p.x += (1.-smoothstep(-.44,-.24,p.z))*sin(t*3.7+catStride.x*.62)*.105;
          }
          p.y += catStride.z+catStride.y*.026*abs(sin(catStride.x));
          p.xz = turn(p.xz,cat.z)+cat.xy;
          n.xz = turn(n.xz,cat.z);
        }
      } else if (id >= ${motion.walker}.) {
        visiblePart = walker.w;
        if (id == ${motion.shadow}.) {
          p.xz += walker.xy;
          p.y += stride.z;
        } else {
          float stepSwing = sin(stride.x)*stride.y;
          float bench = max(0.,pose.w);
          bool pondSeat = pose.w < -1.5;
          bool shin = id == ${motion.leftShin}. || id == ${motion.rightShin}.;
          bool leg = shin || id == ${motion.leftLeg}. || id == ${motion.rightLeg}.;
          bool arm = id == ${motion.leftArm}. || id == ${motion.rightArm}.;
          if (leg || arm) {
            bool left = id == ${motion.leftLeg}. || id == ${motion.leftShin}. || id == ${motion.leftArm}.;
            float side = left ? -1. : 1.;
            float anchor = leg ? .39 : .657;
            float swing = stepSwing*side*(leg ? .58 : -.43);
            if (leg) swing -= pose.y*(pondSeat ? 1.43 : mix(.99,1.40,bench));
            if (shin && pondSeat) {
              vec2 knee = vec2(.235,-.012);
              float bend = pose.y*(1.39+.35*sin(t*2.4+side*1.570796));
              p.yz = turn(p.yz-knee,bend)+knee;
              n.yz = turn(n.yz,bend);
            }
            if (arm) {
              swing -= pose.x*(side > 0. ? 1.75 : .51)+pose.y*.31;
              p.x += pose.z*(side > 0. ? .041 : .012);
            }
            p.yz = turn(p.yz-vec2(anchor,0.),swing)+vec2(anchor,0.);
            if (arm && side > 0. && pose.w == -1.) {
              p.z += clamp((anchor-position.y)*4.1,0.,1.)*.22*smoothstep(.24,1.,pose.x);
            }
            n.yz = turn(n.yz,swing);
          }
          p.y += pose.y*(pondSeat ? -.12 : mix(-.252,.173,bench));
          p.y = max(.035,p.y)*(1.-arrival.y*.24);
          p.xz *= 1.+arrival.y*.19;
          p.y += stride.z+arrival.x+stride.y*(.013+.031*abs(sin(stride.x)));
          p.xz = turn(p.xz,walker.z)+walker.xy;
          n.xz = turn(n.xz,walker.z);
        }
      } else if (id >= ${motion.butterfly}.) {
        bool bird = id >= ${motion.bird}.;
        float key = bird ? id-${motion.bird}. : id-${motion.butterfly}.;
        float phase = t*(bird ? .29 : .64)+key*(bird ? .43 : 2.65);
        float flap = sin(t*(bird ? 11.3 : 22.6)+key*1.66);
        float wing = bird ? flap*(.45+.31*sin(t*1.64+key)) : flap*.87;
        p.xy = turn(p.xy,wing*sign(p.x));
        n.xy = turn(n.xy,wing*sign(position.x));
        vec2 radius = bird ? vec2(4.92,2.98)+key*.20 : vec2(1.12,.68)+mod(key,2.)*.36;
        vec2 center = bird ? vec2(.12,-.48) : vec2(cos(key*2.35)*2.8,sin(key*1.8)*1.84+.46);
        vec2 velocity = vec2(-sin(phase),cos(phase))*radius;
        float heading = atan(-velocity.x,velocity.y);
        p.xz = turn(p.xz,heading)+center+vec2(cos(phase),sin(phase))*radius;
        p.y += bird ? 3.24+key*.40+.36*sin(phase*2.) : .58+.27*sin(phase*2.7+key)+key*.13;
        n.xz = turn(n.xz,heading);
        thin = true;
      }
      if (emit > .8) emit *= .91+.085*sin(t*6.3+p.x*4.8)*sin(t*3.7+p.z*2.);
      vec3 localColor = pigment;
      if (surfaceId > .5) {
        vec3 spring = pigment, fall = pigment, winter = pigment;
        float variance = clamp((pigment.g-.32)*3.4,0.,1.);
        if (surfaceId == ${material.ground}.) {
          spring = pigment*vec3(.93,1.17,.98);
          fall = pigment*vec3(1.26,1.00,.75);
          winter = mix(pigment,vec3(.85,.91,.94),.88);
        } else if (surfaceId == ${material.canopy}.) {
          bool flowering = p.x > 3.45 || p.x < -4.4;
          spring = flowering ? mix(vec3(.55,.27,.33),vec3(.96,.70,.72),variance) : pigment*vec3(1.02,1.23,.89);
          fall = mix(vec3(.52,.21,.10),vec3(.91,.61,.23),variance);
          winter = mix(pigment*.73,vec3(.86,.91,.93),clamp(n.y*.69+.46,.16,.95));
        } else if (surfaceId == ${material.grass}.) {
          spring = pigment*vec3(.90,1.17,.92);
          fall = pigment*vec3(1.26,.94,.68);
          winter = mix(pigment,vec3(.73,.79,.78),.73);
          p.y *= 1.-seasonMix.w*.59;
        } else if (surfaceId == ${material.flower}.) {
          spring = mix(vec3(.78,.38,.54),vec3(1.,.82,.84),variance);
          fall = pigment*vec3(1.09,.78,.76);
          visiblePart = 1.-step(.67,seasonMix.w);
        } else if (surfaceId == ${material.roof}.) {
          winter = mix(pigment,vec3(.82,.87,.91),.9);
        }
        localColor = spring*seasonMix.x+pigment*seasonMix.y+fall*seasonMix.z+winter*seasonMix.w;
      }
      world = p;
      vec3 local = p - target;
      gl_Position = vec4(dot(local,right)*zoom.x+shift.x, dot(local,up)*zoom.y+shift.y, -dot(local,forward)*.055, 1.);
      float lit = dot(n,light);
      float diffuse = thin ? .34+abs(lit)*.61 : max(0.,lit);
      float bounce = max(0.,n.y)*.09;
      shade = localColor * mix(ambient + direct*diffuse + bounce, vec3(1.09), emit);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    uniform mediump float elapsed;
    uniform mediump vec4 actionAge;
    uniform mediump vec4 seasonMix;
    uniform mediump vec4 pose;
    uniform float restAge, dusk;
    varying vec3 shade, world;
    varying float group, visiblePart;
    float toeRipple(float side) {
      // A ring starts when this foot reaches the low point of its swing.
      float cycle = fract((elapsed*2.4+(side-1.)*1.570796)/6.283185);
      vec2 toe = vec2(-.32+side*.082,1.48);
      float radius = length((world.xz-toe)*vec2(1.,1.17));
      float front = .025+cycle*.32;
      return (1.-smoothstep(.006,.024,abs(radius-front)))*(1.-smoothstep(.08,.48,cycle));
    }
    vec3 water(vec3 base) {
      vec2 p = world.xz-vec2(.12,2.08);
      float t = elapsed;
      float waveA = sin(p.y*33.+p.x*3.3+sin(p.x*9.+t*.65)*.87-t*1.83);
      float waveB = sin(p.y*51.-p.x*8.7+sin(p.x*11.5-t*.82)*.86+t*1.24);
      float speckle = .66+.34*sin(p.x*11.4+p.y*8.+t*1.33);
      float shine = smoothstep(.85,1.66,waveA*.81+waveB*.89)*speckle;
      vec3 tint = base + (waveA*.018+waveB*.014)*vec3(.45,.9,1.);
      for (int index=0; index<5; index++) {
        float key = float(index);
        float a = t*(.39+.29*cos(key*1.57))+key*2.4;
        vec2 orbit = mix(vec2(1.08,.43),vec2(.53,.23),key*.25);
        vec2 center = vec2(cos(a),sin(a))*orbit;
        vec2 tangent = normalize(vec2(-sin(a),cos(a))*orbit);
        vec2 offset = p-center;
        vec2 local = vec2(dot(offset,tangent),dot(offset,vec2(-tangent.y,tangent.x)));
        local /= 1.12-key*.065;
        float body = 1.-smoothstep(.55,1.,length(local/vec2(.10,.036)));
        vec2 tail = vec2(local.x+.115,local.y+sin(t*10.3+key)*.020);
        float fin = 1.-smoothstep(.45,1.,length(tail/vec2(.048,.026)));
        vec3 fish = mix(vec3(.91,.53,.27),vec3(.86,.85,.68),mod(key,2.));
        tint = mix(tint,fish,(body*.70+fin*.40)*(1.-dusk*.60));
      }
      float radius = length((p-vec2(.09,-.04))*vec2(1.,1.33));
      float waveRadius = restAge*.47;
      float ring = 0.;
      for (int index=0; index<4; index++) {
        float distance = waveRadius-float(index)*.22;
        ring += (1.-smoothstep(.010,.042,abs(radius-distance)))*smoothstep(0.,.095,distance);
      }
      float fade = (1.-smoothstep(1.65,3.54,restAge))*step(0.,restAge);
      tint += (shine*.19+ring*fade*.23)*mix(vec3(.70,.89,.76),vec3(.57,.73,1.),dusk);
      if (pose.w < -1.5) {
        tint += (toeRipple(-1.)+toeRipple(1.))*smoothstep(.81,1.,pose.y)*vec3(.15,.24,.23);
      }
      vec3 ice = mix(tint,vec3(.58,.73,.79),.35+smoothstep(.6,1.31,radius)*.23);
      return mix(tint,ice,seasonMix.w);
    }
    void main() {
      if (visiblePart < .5) discard;
      if (abs(group-${motion.ink}.) < .25 && world.x > -2.780+.214*smoothstep(.36,2.08,actionAge.w)) discard;
      vec3 tint = abs(group-${motion.water}.) < .25 ? water(shade) : shade;
      gl_FragColor = vec4(tint,1.);
    }
  `;
  const particleVertex = `
    attribute vec3 position;
    attribute vec2 sparkle;
    uniform vec3 right, up, forward, target;
    uniform vec2 zoom, shift;
    uniform float time, density, dusk, snow;
    varying float strength, hue, flake;
    void main() {
      vec3 p = position-target;
      float phase = time*.75+sparkle.x;
      p += vec3(sin(phase)*.45,cos(phase*1.3)*.24,sin(phase*.7)*.26);
      flake = step(3.,sparkle.y);
      if (flake > .5) {
        p.y = mod(position.y-time*(.43+sparkle.y*.077)+sparkle.x,5.8)-target.y-.05;
        p.x += sin(phase*.6)*.43;
      }
      gl_Position = vec4(dot(p,right)*zoom.x+shift.x,dot(p,up)*zoom.y+shift.y,-dot(p,forward)*.055,1.);
      gl_PointSize = mix(sparkle.y+2.6+dusk,sparkle.y*.80+1.5,flake)*density;
      strength = mix((.37+.28*cos(time*2.25+sparkle.x))*(.76+dusk*.55)*(1.-snow*.87),snow*.73,flake);
      hue = dusk;
    }
  `;
  const particleFragment = `
    precision mediump float;
    varying float strength, hue, flake;
    void main() {
      float d = length(gl_PointCoord-.5);
      float a = (1.-smoothstep(.05,.5,d))*strength;
      vec3 tint = mix(vec3(1.,.78,.42),vec3(.78,.95,.69),hue);
      gl_FragColor = vec4(mix(tint,vec3(.89,.95,1.),flake),a);
    }
  `;
  const moods = [
    {light:[-.53,.75,.39], ambient:[.65,.72,.66], direct:[.76,.60,.40]},
    {light:[-.83,.41,.38], ambient:[.59,.57,.57], direct:[.99,.57,.28]},
    {light:[.38,.67,-.52], ambient:[.45,.57,.68], direct:[.42,.49,.66]},
    {light:[.81,.46,-.45], ambient:[.48,.56,.62], direct:[.90,.58,.42]},
    {light:[.57,.68,-.37], ambient:[.33,.42,.53], direct:[.32,.39,.57]},
    {light:[.28,.91,-.26], ambient:[.63,.71,.67], direct:[.73,.68,.54]}
  ];
  const dayCurve = [[0,4,1],[312,4,1],[390,3,.46],[505,5,0],[715,5,0],[980,0,0],[1091,1,.24],[1170,2,.82],[1280,4,1],[1440,4,1]];
  const overview = {angle:.27, zoom:1, target:[0,1.15,0]};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compactFrame = matchMedia('(max-width: 720px)');
  const obstacles = [
    [-2.95,-2.55,1.17,.10],[-4.03,-1.98,.10,.64],[-2.44,-2.15,.54,.25],
    [-3.53,-1.66,.33,.33],[-3.09,-1.09,.43,.27],[-2.72,1.79,.76,.43],
    [-2.62,2.52,.28,.22],[2.72,-1.74,.57,.42],[3.18,1.5,.83,.27],
    [-.12,-1.12,.32,.32],[4.12,.55,.14,.14],[-.32,1.14,.30,.12],
    [5.53,-2.20,.16,.16],[6.12,-1.66,.13,.13],[4.90,-2.66,.14,.14],
    [2.21,-4,.13,.13],[-4.8,-2.96,.15,.15],[-5.35,1.90,.14,.14],[3.7,3.27,.12,.12],
    [-5.95,.42,.42,.07]
  ];

  function walkable(x,z,shoreline,padding = .15) {
    // Inset the playable area by the character's width at the shoreline.
    const edgeX = x*1.045, edgeZ = z*1.07;
    let inside = false;
    for (let i = 0, j = shoreline.length-1; i < shoreline.length; j=i++) {
      const [ax,az] = shoreline[i], [bx,bz] = shoreline[j];
      if ((az > edgeZ) !== (bz > edgeZ) && edgeX < ax+(bx-ax)*(edgeZ-az)/(bz-az)) inside = !inside;
    }
    if (!inside || ((x-.12)/1.78)**2+((z-2.08)/.94)**2 < 1) return false;
    return !obstacles.some(([cx,cz,rx,rz]) => Math.abs(x-cx) < rx+padding && Math.abs(z-cz) < rz+padding);
  }

  function groundAt(x,z) {
    if (Math.abs(x+2.95) < 1.26 && Math.abs(z+1.76) < 1.02) return .31;
    if (Math.abs(x+2.95) < .5 && z > -.79 && z < -.22) return .12+(-z-.22)*.22;
    return .015;
  }

  function ease(start,end,value) {
    const t = Math.max(0,Math.min(1,(value-start)/(end-start)));
    return t*t*(3-2*t);
  }

  function turnToward(actor,dx,dz,easing) {
    const heading = Math.atan2(-dx,dz);
    const angle = heading-actor.heading;
    actor.heading += Math.atan2(Math.sin(angle),Math.cos(angle))*easing;
  }

  function actingPose(name,age) {
    const gesture = (start,peak,hold,end) => ease(start,peak,age)*(1-ease(hold,end,age));
    switch (name) {
      case 'read': return [gesture(0,.56,1.02,1.68)*1.22,0,Math.sin(age*5)*gesture(.42,.74,1.11,1.54),0];
      case 'listen': return [gesture(0,.51,.61,1.28),0,0,0];
      case 'together': return [gesture(.45,.86,1.29,1.95)*.68,ease(.06,.82,age),0,1];
      case 'create': {
        const reach = gesture(.02,.35,2.03,2.72);
        return [reach*1.22,0,Math.sin(age*13)*reach,-1];
      }
      case 'rest': return [0,ease(.06,.98,age),0,-2];
      default: return [0,0,0,0];
    }
  }

  function makeProgram(gl, vertex, fragment) {
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    const uniforms = {};
    for (let index = 0; index < gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS); index++) {
      const {name} = gl.getActiveUniform(program,index);
      uniforms[name] = gl.getUniformLocation(program,name);
    }
    return {program, uniforms};
  }

  window.createIsland = function createIsland(canvas, positionMarkers, positionWalker) {
    const gl = canvas.getContext('webgl', {alpha:true, antialias:true});
    if (!gl) throw new Error('WebGL is unavailable');
    const {mesh, motes, shoreline} = buildIsland();
    const terrain = makeProgram(gl,vertexSource,fragmentSource);
    const particles = makeProgram(gl,particleVertex,particleFragment);
    const solidBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,solidBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);
    const moteBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,moteBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(motes.flat()),gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST);
    const camera = {...overview};
    let destination = {...overview};
    const actions = {read:null, listen:null, together:null, create:null, rest:null};
    const finishTime = {read:1.55, listen:6.2, together:2.4, create:2.8, rest:1.68};
    let moodValue = moods[0], brightTarget = moods[0], dusk = 0, duskTarget = 0;
    let seasonIndex = 1, seasons = [0,1,0,0];
    let width = 1, height = 1, density = 1, frameId;
    let paused = false, elapsed = 0, previousTime = performance.now();
    const actor = {x:-1.56,z:.64,y:.015,heading:-2.3,phase:0,strength:0};
    const companion = {x:-2.12,z:.88,y:.015,heading:-1.9,phase:0,strength:0};
    const trail = [[actor.x,actor.z]];
    let performer = null, entryStarted = null;
    let walking = false, walkAngle = overview.angle;
    let horizontal = 0, vertical = 0;
    let right, up, forward, zoomX, zoomY, shiftX, shiftY, framing;

    function setView(shader) {
      const {program,uniforms:u} = shader;
      gl.useProgram(program);
      gl.uniform3fv(u.right,right);
      gl.uniform3fv(u.up,up);
      gl.uniform3fv(u.forward,forward);
      gl.uniform3fv(u.target,camera.target);
      gl.uniform2f(u.zoom,zoomX,zoomY);
      gl.uniform2f(u.shift,shiftX,shiftY);
      return u;
    }
    function attributes(shader, buffer, stride, layout) {
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      for (const [name,size,offset] of layout) {
        const index = gl.getAttribLocation(shader.program,name);
        gl.enableVertexAttribArray(index);
        gl.vertexAttribPointer(index,size,gl.FLOAT,false,stride*4,offset*4);
      }
    }
    function project(point) {
      const offset = sub(point,camera.target);
      return [(dot(offset,right)*zoomX+shiftX+1)*width/2, (1-dot(offset,up)*zoomY-shiftY)*height/2, dot(offset,forward)];
    }
    function render(now) {
      const delta = Math.min(.075, Math.max(0,(now-previousTime)/1000));
      previousTime = now;
      const reduceMotion = reduced.matches;
      const compact = compactFrame.matches;
      const entryAge = entryStarted === null ? -1 : (now-entryStarted)/1000;
      const arriving = entryAge >= 0 && !reduceMotion;
      const fall = arriving ? Math.min(1,entryAge/.91) : 1;
      const impact = arriving ? entryAge-.91 : -1;
      const bounce = impact > 0 && impact < .27 ? .21*Math.sin(impact/.27*Math.PI) : 0;
      const landing = [4.4*(1-fall*fall)+bounce,
        Math.max(0,1-Math.abs(impact-.065)/.11),impact];
      if (!paused && !reduceMotion) elapsed += delta;
      const easing = reduceMotion ? 1 : 1-Math.exp(-delta*5.1);
      const actionAge = name => {
        if (actions[name] === null) return -1;
        const seconds = Math.max(0,(now-actions[name])/1000);
        if (!reduceMotion) return Math.min(seconds,10);
        if (name === 'rest' && seconds > .8) return 10;
        return finishTime[name];
      };
      camera.angle = mix(camera.angle,destination.angle,easing);
      if (walking) {
        const angle = camera.angle;
        const speed = arriving ? 0 : delta*1.92;
        const dx = (horizontal*Math.cos(angle)-vertical*Math.sin(angle))*speed;
        const dz = (-horizontal*Math.sin(angle)-vertical*Math.cos(angle))*speed;
        const priorX = actor.x, priorZ = actor.z;
        if (dx && walkable(actor.x+dx,actor.z,shoreline)) actor.x += dx;
        if (dz && walkable(actor.x,actor.z+dz,shoreline)) actor.z += dz;
        const step = Math.hypot(actor.x-priorX,actor.z-priorZ);
        if (dx || dz) turnToward(actor,dx,dz,reduceMotion ? 1 : 1-Math.exp(-delta*14));
        actor.phase = (actor.phase+step*9.7)%TAU;
        actor.strength = mix(actor.strength,step > .0001 && !reduceMotion ? 1 : 0,1-Math.exp(-delta*12));
        actor.y = mix(actor.y,groundAt(actor.x,actor.z),reduceMotion ? 1 : 1-Math.exp(-delta*17));
        const last = trail.at(-1);
        if (Math.hypot(last[0]-actor.x,last[1]-actor.z) > .20) trail.push([actor.x,actor.z]);
        advanceCompanion(delta,reduceMotion);
        destination.target = [actor.x*.64,1.16+actor.y*.26+landing[0]*.24,actor.z*.62];
        if (!arriving) positionWalker(actor.x,actor.z);
      }
      let person = actor, pet = companion, pose = [0,0,0,0];
      if (performer) {
        const {stop,entered,started} = performer;
        const [x,z,heading] = stop.stage;
        const seconds = (now-entered)/1000;
        const progress = reduceMotion ? 1 : ease(0,.61,seconds);
        const age = started === null ? -1 : reduceMotion ? finishTime[stop.id] : Math.max(0,(now-started)/1000);
        pose = actingPose(stop.id,age);
        const px = x+Math.sin(heading)*.36*(1-progress);
        const seatShift = stop.id === 'rest' ? .23 : stop.id === 'together' ? -.57 : 0;
        const pz = z-Math.cos(heading)*.36*(1-progress)+pose[1]*seatShift;
        person = {x:px,z:pz,heading,y:groundAt(px,pz),phase:progress*TAU*1.27,
          strength:Math.sin(progress*Math.PI)};
        const [catX,catZ] = stop.pet;
        pet = {x:catX,z:catZ,y:groundAt(catX,catZ),heading:Math.atan2(catX-px,pz-catZ),phase:0,strength:0};
      }
      camera.zoom = mix(camera.zoom,destination.zoom,easing);
      camera.target = camera.target.map((value,axis) => mix(value,destination.target[axis],easing));
      const travel = arriving ? Math.sin(Math.PI*ease(0,1.52,entryAge)) : 0;
      const azimuth = camera.angle+travel*.19, elevation = .53-travel*.09;
      right = [Math.cos(azimuth),0,-Math.sin(azimuth)];
      forward = [Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation)];
      up = cross(forward,right);
      const gallery = !walking && !performer;
      const desiredFrame = gallery
        ? [compact ? 0 : .30,compact ? -.21 : -.01,compact ? .96 : .70]
        : [performer && !compact ? .19 : 0,performer && compact ? .45 : .015,1+travel*.19];
      framing = !framing ? desiredFrame : framing.map((value,index) => mix(value,desiredFrame[index],easing*1.0));
      const pixelsPerUnit = Math.min(width/18.7,height/10.0)*camera.zoom*framing[2];
      zoomX = 2*pixelsPerUnit/width;
      zoomY = 2*pixelsPerUnit/height;
      [shiftX,shiftY] = framing;
      moodValue = Object.fromEntries(Object.keys(moodValue).map(key =>
        [key,moodValue[key].map((value,axis) => mix(value,brightTarget[key][axis],easing*.68))]));
      dusk = mix(dusk,duskTarget,easing*.68);
      seasons = seasons.map((value,index) => mix(value,index===seasonIndex ? 1 : 0,easing*.61));

      gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      const u = setView(terrain);
      gl.uniform3fv(u.light,unit(moodValue.light));
      gl.uniform3fv(u.ambient,moodValue.ambient);
      gl.uniform3fv(u.direct,moodValue.direct);
      gl.uniform1f(u.elapsed,elapsed);
      gl.uniform4f(u.actionAge,actionAge('read'),actionAge('listen'),actionAge('together'),actionAge('create'));
      gl.uniform1f(u.restAge,actionAge('rest'));
      gl.uniform1f(u.dusk,dusk);
      const characterVisible = walking || performer ? 1 : 0;
      gl.uniform4fv(u.seasonMix,seasons);
      gl.uniform4fv(u.pose,pose);
      gl.uniform3fv(u.arrival,landing);
      gl.uniform4f(u.walker,person.x,person.z,person.heading,characterVisible);
      gl.uniform3f(u.stride,person.phase,person.strength,person.y);
      gl.uniform4f(u.cat,pet.x,pet.z,pet.heading,characterVisible);
      gl.uniform3f(u.catStride,pet.phase,pet.strength,pet.y);
      attributes(terrain,solidBuffer,12,[['position',3,0],['normal',3,3],['pigment',3,6],['emission',1,9],['groupId',1,10],['surfaceId',1,11]]);
      gl.drawArrays(gl.TRIANGLES,0,mesh.length/12);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      const p = setView(particles);
      gl.uniform1f(p.time,elapsed);
      gl.uniform1f(p.density,density);
      gl.uniform1f(p.dusk,dusk);
      gl.uniform1f(p.snow,seasons[3]);
      const particleAttributes = [['position',3,0],['sparkle',2,3]];
      attributes(particles,moteBuffer,5,particleAttributes);
      gl.drawArrays(gl.POINTS,0,motes.length);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      positionMarkers(project);
      if (entryStarted !== null && (reduceMotion || entryAge >= 1.56)) {
        entryStarted = null;
        canvas.dispatchEvent(new Event('islandarrival'));
      }
      frameId = requestAnimationFrame(render);
    }
    function advanceCompanion(delta,reduceMotion) {
      let travelled = 0;
      if (trail.length > 3) {
        const [x,z] = trail[0];
        const dx = x-companion.x, dz = z-companion.z;
        const distance = Math.hypot(dx,dz);
        if (distance < .10) {
          trail.shift();
        } else {
          const step = Math.min(distance,delta*2.59)/distance;
          const beforeX = companion.x, beforeZ = companion.z;
          if (walkable(companion.x+dx*step,companion.z,shoreline,.07)) companion.x += dx*step;
          if (walkable(companion.x,companion.z+dz*step,shoreline,.07)) companion.z += dz*step;
          travelled = Math.hypot(companion.x-beforeX,companion.z-beforeZ);
          if (travelled > .0001) turnToward(companion,dx,dz,reduceMotion ? 1 : 1-Math.exp(-delta*12));
        }
      }
      companion.phase = (companion.phase+travelled*13.8)%TAU;
      companion.strength = mix(companion.strength,travelled > .0001 && !reduceMotion ? 1 : 0,1-Math.exp(-delta*13));
      companion.y = mix(companion.y,groundAt(companion.x,companion.z),reduceMotion ? 1 : 1-Math.exp(-delta*17));
    }
    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1,bounds.width);
      height = Math.max(1,bounds.height);
      density = Math.min(window.devicePixelRatio || 1,1.75);
      canvas.width = Math.round(width*density);
      canvas.height = Math.round(height*density);
      gl.viewport(0,0,canvas.width,canvas.height);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frameId = requestAnimationFrame(render);
    canvas.addEventListener('webglcontextlost', () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      canvas.dispatchEvent(new Event('islandunavailable'));
    });
    const nearAngle = angle => camera.angle+Math.atan2(Math.sin(angle-camera.angle),Math.cos(angle-camera.angle));
    return {
      rotate(delta) { destination.angle += delta; },
      reset() {
        walking = false;
        performer = null;
        entryStarted = null;
        walkAngle = overview.angle;
        destination = {...overview,angle:nearAngle(overview.angle)};
      },
      focus(stop) {
        if (walking) walkAngle = destination.angle;
        walking = false;
        entryStarted = null;
        performer = {stop,entered:performance.now(),started:null};
        destination = {angle:nearAngle(stop.angle),zoom:stop.zoom,target:stop.view};
      },
      walk(drop = false) {
        walking = true;
        performer = null;
        horizontal = vertical = 0;
        entryStarted = drop && !reduced.matches ? performance.now() : null;
        destination = {angle:nearAngle(walkAngle),zoom:compactFrame.matches ? 1.64 : 1.37,target:[actor.x*.64,1.16,actor.z*.62]};
        return entryStarted !== null;
      },
      move(x,z) {
        const length = Math.max(1,Math.hypot(x,z));
        horizontal = x/length;
        vertical = z/length;
      },
      time(minute) {
        const next = dayCurve.findIndex(slot => slot[0] > minute);
        const [start,from,low] = dayCurve[next-1];
        const [end,to,high] = dayCurve[next];
        const progress = ease(start,end,minute);
        brightTarget = Object.fromEntries(Object.keys(moods[from]).map(key =>
          [key,moods[from][key].map((value,index) => mix(value,moods[to][key][index],progress))]));
        duskTarget = mix(low,high,progress);
      },
      season(index) { seasonIndex = index; },
      pauseAmbient(value) { paused = value; },
      act(name) {
        const start = performer ? Math.max(performance.now(),performer.entered+560) : performance.now();
        actions[name] = start;
        if (performer && (name !== 'rest' || performer.started === null)) performer.started = start;
      }
    };
  };
})();
