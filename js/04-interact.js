/* 04-interact.js — ドラッグ・リサイズ・ピンチ・選択操作
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= 操作（ドラッグ・リサイズ・頂点・ピンチ） ================= */
let drag=null;
function showTip(ev,s){dimtip.style.display='block';dimtip.style.left=ev.clientX+'px';dimtip.style.top=(ev.clientY-14)+'px';dimtip.textContent=s;}
function hideTip(){dimtip.style.display='none';}
/* ポインタ位置に重なっているオブジェクトを、小さい順に列挙 */
function hitsAt(mx,my){const f=F(),out=[];
  f.rooms.forEach(r=>{if(pointInPoly(mx,my,r.poly))out.push({type:'room',id:r.id,a:polyArea(r.poly)});});
  f.elems.forEach(e=>{if(mx>=e.x&&mx<=e.x+e.w&&my>=e.y&&my<=e.y+e.h)out.push({type:'elem',id:e.id,a:e.w*e.h});});
  return out.sort((p,q)=>p.a-q.a);}
function evToModel(ev){const S=view.pxPerM,r=sheet.getBoundingClientRect();
  const off=1.3*.7*S;
  return[(ev.clientX-r.left-off)/S,(ev.clientY-r.top-off)/S];}
function startMove(ev,type,id){if(view.locked)return;
  /* 同じ場所を重ねてタップしたときは、重なっている別のオブジェクトに順に切り替える */
  if(!view.mergeFrom&&!drag){try{const [mx,my]=evToModel(ev);const hs=hitsAt(mx,my);
    if(hs.length>1){const ci=hs.findIndex(h=>view.sel&&h.type===view.sel.type&&h.id===view.sel.id);
      if(ci>=0){const nx=hs[(ci+1)%hs.length];type=nx.type;id=nx.id;}
      else{type=hs[0].type;id=hs[0].id;}}}catch(e){}}
  if(view.mergeFrom){ev.stopPropagation();ev.preventDefault();if(type==='room')doMerge(id);else{view.mergeFrom=null;render();}return;}if(ev.target.dataset&&(ev.target.dataset.dir||ev.target.dataset.vi!=null))return;ev.stopPropagation();ev.preventDefault();
  view.sel={type,id};
  if(view.resizeMode){render();return;}/* サイズ変更モード中は本体ドラッグで移動しない（誤操作防止） */
  render();
  const o=selObj(),b=type==='room'?bbox(o.poly):{x:o.x,y:o.y};
  drag={mode:'move',sx:ev.clientX,sy:ev.clientY,ox:b.x,oy:b.y,base:type==='room'?clone(o.poly):null,pid:ev.pointerId,moved:0};
  window.addEventListener('pointermove',onDrag);window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);}
function startResize(ev,o,dir){if(view.locked)return;ev.stopPropagation();ev.preventDefault();const b=view.sel.type==='room'?bbox(o.poly):{x:o.x,y:o.y,w:o.w,h:o.h};
  drag={mode:'resize',dir,ox:b.x,oy:b.y,ow:b.w,oh:b.h,sx:ev.clientX,sy:ev.clientY,base:view.sel.type==='room'?clone(o.poly):null};
  window.addEventListener('pointermove',onDrag);window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);}
function startVertex(ev,o,vi){if(view.locked)return;ev.stopPropagation();ev.preventDefault();drag={mode:'vertex',vi,sx:ev.clientX,sy:ev.clientY,vx:o.poly[vi][0],vy:o.poly[vi][1]};
  window.addEventListener('pointermove',onDrag);window.addEventListener('pointerup',endDrag);window.addEventListener('pointercancel',endDrag);}
function onDrag(ev){if(!drag)return;const o=selObj();if(!o)return;const S=view.pxPerM;
  const dx=(ev.clientX-drag.sx)/S,dy=(ev.clientY-drag.sy)/S;
  if(Math.abs(ev.clientX-drag.sx)+Math.abs(ev.clientY-drag.sy)>4)drag.moved=1;
  if(drag.mode==='move'){let nx=Math.max(0,snap(drag.ox+dx)),ny=Math.max(0,snap(drag.oy+dy));
    const bb0=view.sel.type==='room'?bbox(drag.base):{w:o.w,h:o.h};
    [nx,ny]=magnet(nx,ny,bb0.w,bb0.h,view.sel.id);
    if(view.sel.type==='room'){const b0=bbox(drag.base),ddx=nx-b0.x,ddy=ny-b0.y;o.poly=drag.base.map(([x,y])=>[x+ddx,y+ddy]);}
    else{o.x=nx;o.y=ny;}
    showTip(ev,`x ${mm(nx)} / y ${mm(ny)}`);}
  else if(drag.mode==='resize'){let{ox,oy,ow,oh}=drag,d=drag.dir;let nx=ox,ny=oy,nw=ow,nh=oh;
    if(d.includes('e'))nw=Math.max(.1,snap(ow+dx));
    if(d.includes('s'))nh=Math.max(.1,snap(oh+dy));
    if(d.includes('w')){const nx2=Math.min(ox+ow-.1,snap(ox+dx));nw=ow+(ox-nx2);nx=nx2;}
    if(d.includes('n')){const ny2=Math.min(oy+oh-.1,snap(oy+dy));nh=oh+(oy-ny2);ny=ny2;}
    if(view.sel.type==='room'){const b0=bbox(drag.base),sx=b0.w>1e-6?nw/b0.w:1,sy=b0.h>1e-6?nh/b0.h:1;o.poly=drag.base.map(([x,y])=>[nx+(x-b0.x)*sx,ny+(y-b0.y)*sy]);}
    else{o.x=nx;o.y=ny;o.w=nw;o.h=nh;}
    showTip(ev,`${mm(nw)} × ${mm(nh)}`);}
  else if(drag.mode==='vertex'){o.poly[drag.vi][0]=Math.max(0,snap(drag.vx+dx));o.poly[drag.vi][1]=Math.max(0,snap(drag.vy+dy));showTip(ev,`${mm(o.poly[drag.vi][0])} , ${mm(o.poly[drag.vi][1])}`);}
  renderSheet();}
function endDrag(){if(!drag)return;const o=selObj();
  if(o&&view.sel.type==='elem'&&ELEM[o.kind]?.opening&&drag.mode==='move')snapOpening(o);
  drag=null;hideTip();
  window.removeEventListener('pointermove',onDrag);window.removeEventListener('pointerup',endDrag);window.removeEventListener('pointercancel',endDrag);
  render();}
function magnet(nx,ny,w,h,selfId){if(!view.snap)return[nx,ny];const f=F(),tol=.09;
  const xs=[0,f.footW],ys=[0,f.footH];
  f.rooms.forEach(r=>{if(r.id!==selfId)r.poly.forEach(pt=>{xs.push(pt[0]);ys.push(pt[1]);});});
  f.elems.forEach(e2=>{if(e2.id!==selfId){xs.push(e2.x,e2.x+e2.w);ys.push(e2.y,e2.y+e2.h);}});
  let bx=nx,bdx=tol;xs.forEach(x=>{[x,x-w].forEach(c=>{const d=Math.abs(c-nx);if(d<bdx){bdx=d;bx=c;}});});
  let by=ny,bdy=tol;ys.forEach(y=>{[y,y-h].forEach(c=>{const d=Math.abs(c-ny);if(d<bdy){bdy=d;by=c;}});});
  return[Math.max(0,Math.round(bx*1000)/1000),Math.max(0,Math.round(by*1000)/1000)];}
function snapOpening(e){const f=F(),cx=e.x+e.w/2,cy=e.y+e.h/2;let best=null,bd=.45;
  const consider=(px,py,axis)=>{const d=axis==='v'?Math.abs(px-cx):Math.abs(py-cy);if(d<bd){bd=d;best={px,py,axis};}};
  f.rooms.forEach(r=>edges(r.poly).forEach(([p,q])=>{const vert=Math.abs(p[0]-q[0])<.02,hor=Math.abs(p[1]-q[1])<.02;
    if(vert){const y0=Math.min(p[1],q[1]),y1=Math.max(p[1],q[1]);if(cy>y0-.1&&cy<y1+.1)consider(p[0],cy,'v');}
    if(hor){const x0=Math.min(p[0],q[0]),x1=Math.max(p[0],q[0]);if(cx>x0-.1&&cx<x1+.1)consider(cx,p[1],'h');}}));
  if(best){if(best.axis==='v'){e.x=best.px-e.w/2;if(e.rot%2===0)e.rot=1;}else{e.y=best.py-e.h/2;if(e.rot%2===1)e.rot=0;}}}
/* 背景タップで選択解除・1本指パン・ピンチズーム */
const ptrs=new Map();let pinch=null,pan=null;
sheet.addEventListener('pointerdown',ev=>{ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(ptrs.size===2){drag=null;pan=null;hideTip();const a=[...ptrs.values()];pinch={d0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y),s0:view.pxPerM};}
  if(ptrs.size===1&&!ev.target.closest('.obj')&&!ev.target.dataset.dir&&ev.target.dataset.vi==null){
    pan={sx:ev.clientX,sy:ev.clientY,sl:stage.scrollLeft,st:stage.scrollTop,moved:0};}});
window.addEventListener('pointermove',ev=>{if(!ptrs.has(ev.pointerId))return;ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(pinch&&ptrs.size===2){const a=[...ptrs.values()];const d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);setZoom(pinch.s0*d/pinch.d0);return;}
  if(pan&&!drag&&ptrs.size===1){const dx=ev.clientX-pan.sx,dy=ev.clientY-pan.sy;
    if(Math.abs(dx)+Math.abs(dy)>6)pan.moved=1;
    stage.scrollLeft=pan.sl-dx;stage.scrollTop=pan.st-dy;}});
window.addEventListener('pointerup',ev=>{ptrs.delete(ev.pointerId);
  if(pan&&!pan.moved&&!drag&&ptrs.size===0){view.sel=null;render();}
  if(ptrs.size===0)pan=null;if(ptrs.size<2)pinch=null;});
window.addEventListener('pointercancel',ev=>{ptrs.delete(ev.pointerId);if(ptrs.size===0)pan=null;if(ptrs.size<2)pinch=null;});
function setZoom(s){view.pxPerM=Math.max(10,Math.min(140,s));$('zoomVal').textContent=Math.round(view.pxPerM/40*100)+'%';renderSheet();}
/* ================= 選択操作 ================= */
function moveTo(o,nx,ny){if(view.sel.type==='room'){const b=bbox(o.poly),dx=nx-b.x,dy=ny-b.y;o.poly=o.poly.map(([x,y])=>[snap(x+dx),snap(y+dy)]);}else{o.x=nx;o.y=ny;}}
function resizeTo(o,nw,nh){if(view.sel.type==='room'){const b=bbox(o.poly),sx=b.w>1e-6?nw/b.w:1,sy=b.h>1e-6?nh/b.h:1;o.poly=o.poly.map(([x,y])=>[b.x+(x-b.x)*sx,b.y+(y-b.y)*sy]);}else{o.w=nw;o.h=nh;}}
function rotate(o){if(view.sel.type==='room'){const b=bbox(o.poly);o.poly=o.poly.map(([x,y])=>[b.x+(y-b.y),b.y+(x-b.x)]);}else{o.rot=((o.rot||0)+1)%4;const t=o.w;o.w=o.h;o.h=t;}}
function flipObj(o){if(view.sel.type==='room'){const b=bbox(o.poly);o.poly=o.poly.map(([x,y])=>[2*b.x+b.w-x,y]);}else{o.flip=o.flip?0:1;}}
function orthogonalize(o){let p=o.poly.map(v=>v.slice());for(let it=0;it<4;it++){for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];if(Math.abs(a[0]-b[0])<Math.abs(a[1]-b[1])){const mx=(a[0]+b[0])/2;a[0]=mx;b[0]=mx;}else{const my=(a[1]+b[1])/2;a[1]=my;b[1]=my;}}}o.poly=p.map(v=>[snap(v[0]),snap(v[1])]);}
function addVertex(o){let bi=0,bl=-1;const p=o.poly;for(let i=0;i<p.length;i++){const L=dist(p[i],p[(i+1)%p.length]);if(L>bl){bl=L;bi=i;}}const a=p[bi],b=p[(bi+1)%p.length];p.splice(bi+1,0,[snap((a[0]+b[0])/2),snap((a[1]+b[1])/2)]);}
function dupSel(){const o=selObj();if(!o)return;const f=F();if(view.sel.type==='room'){const c=clone(o);c.id=nid('r');c.poly=c.poly.map(([x,y])=>[x+.5,y+.5]);f.rooms.push(c);view.sel={type:'room',id:c.id};}else{const c=clone(o);c.id=nid('e');c.x+=.3;c.y+=.3;f.elems.push(c);view.sel={type:'elem',id:c.id};}render();}
function delSel(){const o=selObj();if(!o)return;const f=F();if(view.sel.type==='room')f.rooms=f.rooms.filter(r=>r.id!==o.id);else f.elems=f.elems.filter(e=>e.id!==o.id);view.sel=null;closeSheet('inspSheet');render();}
