/* 03-canvas.js — 平面図キャンバスの描画とグリフ
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= キャンバス描画 ================= */
const sheet=$('sheet'),stage=$('stage'),dimtip=$('dimtip');
function renderSheet(){drawFloorId=state.activeFloorId;
  const f=F(),S=view.pxPerM;let mr=f.footW,mb=f.footH;
  sheet.innerHTML='';
  f.rooms.forEach(r=>{const b=bbox(r.poly);mr=Math.max(mr,b.x+b.w);mb=Math.max(mb,b.y+b.h);});
  f.elems.forEach(e=>{mr=Math.max(mr,e.x+e.w);mb=Math.max(mb,e.y+e.h);});
  const M=1.3,off=M*.7*S,Wpx=(mr+M)*S,Hpx=(mb+M)*S;
  sheet.setAttribute('width',Wpx);sheet.setAttribute('height',Hpx);
  {const defs=E('defs',{});
   const hp=(id,bg,ln,sw)=>{const pt=E('pattern',{id,width:6,height:6,patternUnits:'userSpaceOnUse',patternTransform:'rotate(45)'});
     pt.appendChild(E('rect',{x:0,y:0,width:6,height:6,fill:bg}));
     pt.appendChild(E('line',{x1:0,y1:0,x2:0,y2:6,stroke:ln,'stroke-width':sw}));return pt;};
   defs.appendChild(hp('wHatchOut','#B9C0C7','#6E7982',1.6));   /* \u5916\u58c1 */
   defs.appendChild(hp('wHatchIn','#D6DBE0','#98A3AC',1.2));    /* \u5185\u58c1 */
   sheet.appendChild(defs);}
  const root=E('g',{transform:`translate(${off},${off})`});sheet.appendChild(root);
  if(view.showGrid&&!view.drawMode){const cand=[view.grid,.25,.5,.91,1];let ds=cand.find(g=>g*S>=6)||1;const gg=E('g',{});
    for(let x=0;x<=mr+1e-6;x+=ds)gg.appendChild(E('line',{x1:x*S,y1:0,x2:x*S,y2:mb*S,stroke:'var(--grid)','stroke-width':1}));
    for(let y=0;y<=mb+1e-6;y+=ds)gg.appendChild(E('line',{x1:0,y1:y*S,x2:mr*S,y2:y*S,stroke:'var(--grid)','stroke-width':1}));
    for(let x=0;x<=mr+1e-6;x+=.91)gg.appendChild(E('line',{x1:x*S,y1:0,x2:x*S,y2:mb*S,stroke:'var(--grid-major)','stroke-width':1}));
    for(let y=0;y<=mb+1e-6;y+=.91)gg.appendChild(E('line',{x1:0,y1:y*S,x2:mr*S,y2:y*S,stroke:'var(--grid-major)','stroke-width':1}));
    root.appendChild(gg);}
  const rl=E('g',{}),ol=E('g',{'pointer-events':'none'}),ll=E('g',{'pointer-events':'none'});
  const PT=pl=>pl.map(([x,y])=>`${x*S},${y*S}`).join(' ');
  f.rooms.forEach(r=>{const col=SPACE[r.type]?.color||'#34506B';const g=E('g',{class:'obj'});g.dataset.type='room';g.dataset.id=r.id;
    /* 壁を実厚みで見せるモード：塗りは内法ポリゴン、壁芯は破線で併記 */
    const ip=view.showWall?insetPolyByWalls(r,f,view.wallMag||1):r.poly;
    g.appendChild(E('polygon',{points:PT(r.poly),fill:'transparent',stroke:'none'}));           /* ヒット領域=壁芯 */
    if(view.showWall)g.appendChild(E('polygon',{points:PT(r.poly),fill:'none',stroke:col,'stroke-width':1,'stroke-dasharray':'3 3',opacity:.5}));
    if(view.drawMode)g.appendChild(E('polygon',{points:PT(ip),fill:'#FFFFFF',stroke:'none'}));   /* \u56f3\u9762\u98a8\uff1a\u76ee\u76db\u3092\u900f\u304b\u3055\u306a\u3044 */
    g.appendChild(E('polygon',{points:PT(ip),fill:hexA(col,view.drawMode?.30:.18),stroke:view.showWall?'none':col,'stroke-width':1.2}));
    if(view.showWall)ol.appendChild(E('polygon',{points:PT(ip),fill:'none',stroke:'#3F4B56','stroke-width':1.2}));  /* \u58c1\u306e\u5185\u5074\u306e\u9762\u7dda */
    if(r.sym){const b=bbox(ip);const sg=E('g',{transform:`translate(${b.x*S},${b.y*S})`});drawGlyph(sg,r.sym,b.w*S,b.h*S,{},true);g.appendChild(sg);}
    g.addEventListener('pointerdown',ev=>startMove(ev,'room',r.id));rl.appendChild(g);
    /* ラベルは壁レイヤーより上に描画（壁を実厚み化しても隠れない） */
    if(view.showLabels){const [cx,cy]=centroid(ip),b=bbox(ip),a=roomAreas(r,f);
      const big=b.w*S>62&&b.h*S>40,med=b.w*S>52&&b.h*S>24;
      ll.appendChild(txt(cx*S,cy*S-(big?12:0),r.name,{weight:700,size:Math.min(13,Math.max(9,b.w*S/6))}));
      if(big){ll.appendChild(txt(cx*S,cy*S+3,`壁芯 ${f1(a.gross)}㎡ / ${f1(a.gross/TATAMI)}畳`,{mono:true,size:9.5,fill:'#54677A'}));
        ll.appendChild(txt(cx*S,cy*S+15,`内法 ${f1(a.net)}㎡ / ${f1(a.net/TATAMI)}畳`,{mono:true,size:9,fill:'#8A9CAB'}));}
      else if(med){ll.appendChild(txt(cx*S,cy*S+11,`${f1(a.gross)}㎡`,{mono:true,size:9,fill:'#54677A'}));}}});
  root.appendChild(rl);
  if(view.showWall){const MAG=view.wallMag||1,wl=E('g',{}),outW=Math.max(2,state.settings.wallOut*MAG*S);
    /* 壁はハッチ帯（建築図面風）で塗り、両面の種線を上レイヤーで引く */
    const jobs=[];
    f.rooms.forEach(r=>{const we=r.wallE||{};edges(r.poly).forEach(([p,q],ei)=>{const cfg=we[ei]||{};if(cfg.on===0)return;
      const ext=isExtEdge(p,q,f);
      const t=cfg.t!=null?cfg.t/1000:(ext?state.settings.wallOut:state.settings.wallIn);
      jobs.push({p,q,t,ext});});});
    jobs.sort((a,b)=>a.ext-b.ext);   /* 内壁→外壁の順に重ねる */
    jobs.forEach(({p,q,t,ext})=>{const w=Math.max(2,t*MAG*S);
      wl.appendChild(E('line',{x1:p[0]*S,y1:p[1]*S,x2:q[0]*S,y2:q[1]*S,stroke:ext?'url(#wHatchOut)':'url(#wHatchIn)','stroke-width':w,'stroke-linecap':'square'}));});
    /* 外周：建物枠の帯と、その外側の面線 */
    wl.appendChild(E('rect',{x:0,y:0,width:f.footW*S,height:f.footH*S,fill:'none',stroke:'url(#wHatchOut)','stroke-width':outW}));
    const oh=outW/2;
    ol.appendChild(E('rect',{x:-oh,y:-oh,width:f.footW*S+outW,height:f.footH*S+outW,fill:'none',stroke:'#2A3742','stroke-width':1.6}));
    root.appendChild(wl);}
  root.appendChild(ol);
  root.appendChild(ll);
  const eg=E('g',{});
  f.elems.forEach(e=>{const rot=e.rot||0;const dw=e.w*S,dh=e.h*S,cx=e.x*S+dw/2,cy=e.y*S+dh/2;
    const g=E('g',{class:'obj'});g.dataset.type='elem';g.dataset.id=e.id;
    const cw=(rot%2===1?e.h:e.w)*S,ch=(rot%2===1?e.w:e.h)*S;
    const inner=E('g',{transform:`translate(${cx},${cy}) rotate(${rot*90}) scale(${e.flip?-1:1},1) translate(${-cw/2},${-ch/2})`});
    drawGlyph(inner,ELEM[e.kind]?.glyph||e.kind,cw,ch,Object.assign({},e.props||{},{dir:e.dir,flip:e.flip,srcKind:e.kind}));
    g.appendChild(E('rect',{x:e.x*S,y:e.y*S,width:dw,height:dh,fill:'transparent'}));
    g.appendChild(inner);g.addEventListener('pointerdown',ev=>startMove(ev,'elem',e.id));eg.appendChild(g);});
  root.appendChild(eg);
  const o=selObj();
  if(o){const hg=E('g',{}),b=(view.sel.type==='room')?bbox(o.poly):{x:o.x,y:o.y,w:o.w,h:o.h};const x=b.x*S,y=b.y*S,w=b.w*S,h=b.h*S;
    hg.appendChild(E('rect',{x,y,width:w,height:h,fill:'none',stroke:'var(--accent)','stroke-width':view.resizeMode?2.4:2,'stroke-dasharray':view.resizeMode?null:'6 4'}));
    if(view.resizeMode){
    const pts={nw:[x,y],ne:[x+w,y],sw:[x,y+h],se:[x+w,y+h],n:[x+w/2,y],s:[x+w/2,y+h],w:[x,y+h/2],e:[x+w,y+h/2]};
    for(const d in pts){const[hx,hy]=pts[d];
      const hit=E('rect',{x:hx-11,y:hy-11,width:22,height:22,fill:'transparent',style:'cursor:'+cur(d)});
      hit.dataset.dir=d;hit.addEventListener('pointerdown',ev=>startResize(ev,o,d));hg.appendChild(hit);
      hg.appendChild(E('rect',{x:hx-7,y:hy-7,width:14,height:14,fill:'var(--accent)',stroke:'#fff','stroke-width':2,rx:3,'pointer-events':'none'}));}
    }
    if(view.sel.type==='room'&&view.vtx)o.poly.forEach((v,i)=>{const c=E('circle',{cx:v[0]*S,cy:v[1]*S,r:9,fill:'#fff',stroke:'var(--accent)','stroke-width':2,style:'cursor:move'});c.dataset.vi=i;c.addEventListener('pointerdown',ev=>startVertex(ev,o,i));hg.appendChild(c);});
    root.appendChild(hg);}
  if(view.showDim){const dg=E('g',{});dimLine(dg,0,-.55,f.footW,-.55,`${mm(f.footW)}`,S,'h');dimLine(dg,-.55,0,-.55,f.footH,`${mm(f.footH)}`,S,'v');
    if(o){const b=(view.sel.type==='room')?bbox(o.poly):{x:o.x,y:o.y,w:o.w,h:o.h};dimLine(dg,b.x,b.y-.28,b.x+b.w,b.y-.28,`${mm(b.w)}`,S,'h','#0E7C86');dimLine(dg,b.x-.28,b.y,b.x-.28,b.y+b.h,`${mm(b.h)}`,S,'v','#0E7C86');}root.appendChild(dg);}
}
function cur(d){return ({nw:'nwse-resize',se:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize',n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize'})[d];}
function dimLine(g,x1m,y1m,x2m,y2m,label,S,dir,color){color=color||'#54677A';const x1=x1m*S,y1=y1m*S,x2=x2m*S,y2=y2m*S,t=5;g.appendChild(E('line',{x1,y1,x2,y2,stroke:color,'stroke-width':1}));
  if(dir==='h'){g.appendChild(E('line',{x1,y1:y1-t,x2:x1,y2:y1+t,stroke:color,'stroke-width':1}));g.appendChild(E('line',{x1:x2,y1:y2-t,x2:x2,y2:y2+t,stroke:color,'stroke-width':1}));g.appendChild(txt((x1+x2)/2,y1-7,label,{mono:true,size:10,fill:color}));}
  else{g.appendChild(E('line',{x1:x1-t,y1,x2:x1+t,y2:y1,stroke:color,'stroke-width':1}));g.appendChild(E('line',{x1:x2-t,y1:y2,x2:x2+t,y2:y2,stroke:color,'stroke-width':1}));const tt=txt(x1-7,(y1+y2)/2,label,{mono:true,size:10,fill:color});tt.setAttribute('transform',`rotate(-90 ${x1-7} ${(y1+y2)/2})`);g.appendChild(tt);}}
/* ================= グリフ ================= */
function drawGlyph(g,kind,w,h,opt,asOverlay){opt=opt||{};const flip=!!opt.flip,line='#2A3A49',soft='#54677A',horiz=w>=h;
  const box=(fill,stroke,sw)=>E('rect',{x:0,y:0,width:w,height:h,fill:fill||'none',stroke:stroke||line,'stroke-width':sw||1.3,rx:1});
  if(kind==='door'){const t=Math.max(state.settings.wallIn*(view.wallMag||1)*view.pxPerM,.12*view.pxPerM),hinge=!opt.hinge;g.appendChild(E('rect',{x:horiz?0:(w-t)/2,y:horiz?(h-t)/2:0,width:horiz?w:t,height:horiz?t:h,fill:'var(--paper)'}));doorSwing(g,w,h,horiz,hinge,flip,line);return;}
  if(kind==='sliding'||kind==='folding'){const t=Math.max(state.settings.wallIn*(view.wallMag||1)*view.pxPerM,.1*view.pxPerM);
    if(horiz){g.appendChild(E('rect',{x:0,y:(h-t)/2,width:w,height:t,fill:'var(--paper)'}));if(kind==='folding'){g.appendChild(E('path',{d:`M 0 ${h/2} l ${w*.25} -5 l ${w*.25} 5 l ${w*.25} -5 l ${w*.25} 5`,fill:'none',stroke:line,'stroke-width':1.6}));}else{g.appendChild(E('line',{x1:0,y1:h/2-2,x2:w*.55,y2:h/2-2,stroke:line,'stroke-width':2}));g.appendChild(E('line',{x1:w*.45,y1:h/2+2,x2:w,y2:h/2+2,stroke:line,'stroke-width':2}));}}
    else{g.appendChild(E('rect',{x:(w-t)/2,y:0,width:t,height:h,fill:'var(--paper)'}));if(kind==='folding'){g.appendChild(E('path',{d:`M ${w/2} 0 l -5 ${h*.25} l 5 ${h*.25} l -5 ${h*.25} l 5 ${h*.25}`,fill:'none',stroke:line,'stroke-width':1.6}));}else{g.appendChild(E('line',{x1:w/2-2,y1:0,x2:w/2-2,y2:h*.55,stroke:line,'stroke-width':2}));g.appendChild(E('line',{x1:w/2+2,y1:h*.45,x2:w/2+2,y2:h,stroke:line,'stroke-width':2}));}}return;}
  if(kind==='window'||kind==='fullwindow'){const t=Math.max(state.settings.wallOut*(view.wallMag||1)*view.pxPerM,.14*view.pxPerM);
    if(horiz){g.appendChild(E('rect',{x:0,y:(h-t)/2,width:w,height:t,fill:'var(--paper)',stroke:line,'stroke-width':1}));[-3,0,3].forEach((d,i)=>g.appendChild(E('line',{x1:0,y1:h/2+d,x2:w,y2:h/2+d,stroke:i===1?line:soft,'stroke-width':i===1?1.4:1})));if(kind==='fullwindow')g.appendChild(E('line',{x1:w/2,y1:h/2-6,x2:w/2,y2:h/2+6,stroke:line,'stroke-width':1.4}));}
    else{g.appendChild(E('rect',{x:(w-t)/2,y:0,width:t,height:h,fill:'var(--paper)',stroke:line,'stroke-width':1}));[-3,0,3].forEach((d,i)=>g.appendChild(E('line',{x1:w/2+d,y1:0,x2:w/2+d,y2:h,stroke:i===1?line:soft,'stroke-width':i===1?1.4:1})));if(kind==='fullwindow')g.appendChild(E('line',{x1:w/2-6,y1:h/2,x2:w/2+6,y2:h/2,stroke:line,'stroke-width':1.4}));}return;}
  if(kind==='stair'||kind==='extstair'){const isExt=kind==='extstair'||ELEM[opt.srcKind]?.ext;if(!asOverlay)g.appendChild(box(isExt?hexA('#7A8794',.1):hexA('#34506B',.05)));const n=Math.max(3,Math.min(stairCalcRaw().risers,18)),along=horiz?w:h;for(let i=1;i<n;i++){const t=i/n*along;if(horiz)g.appendChild(E('line',{x1:t,y1:0,x2:t,y2:h,stroke:soft,'stroke-width':1}));else g.appendChild(E('line',{x1:0,y1:t,x2:w,y2:t,stroke:soft,'stroke-width':1}));}stairDirMark(g,w,h,horiz,stairDirOf(opt),line);return;}
  if(kind==='switchback'||kind==='extswitch'){const isExt=kind==='extswitch';if(!asOverlay)g.appendChild(box(isExt?hexA('#7A8794',.12):hexA('#34506B',.05)));const mid=w/2,land=h*.22;g.appendChild(E('line',{x1:mid,y1:0,x2:mid,y2:h,stroke:soft,'stroke-width':1}));const per=Math.max(2,Math.floor(stairCalcRaw().risers/2));for(let i=1;i<per;i++){const t=land+(i/per)*(h-land);g.appendChild(E('line',{x1:0,y1:t,x2:mid,y2:t,stroke:soft,'stroke-width':1}));g.appendChild(E('line',{x1:mid,y1:h-t,x2:w,y2:h-t,stroke:soft,'stroke-width':1}));}g.appendChild(E('line',{x1:0,y1:land,x2:w,y2:land,stroke:soft,'stroke-width':1,'stroke-dasharray':'3 3'}));if(view.showLabels&&h>40)g.appendChild(txt(w/2,land/2,isExt?'外・踊場':'踊場',{mono:true,size:9,fill:soft}));
    {const d=stairDirOf(opt);if(d==='both'){stairDirMark(g,w/2,h,false,'up',line);const g2=E('g',{transform:`translate(${w/2},0)`});stairDirMark(g2,w/2,h,false,'dn',line);g.appendChild(g2);}else stairDirMark(g,w,h,false,d,line);}
    return;}
  if(kind==='lstair'||kind==='extlstair'){const isExt=kind==='extlstair';if(!asOverlay)g.appendChild(box(isExt?hexA('#7A8794',.12):hexA('#34506B',.05)));
    const L=Math.min(w,h)*.46;                       /* 回り部（踊場） */
    const n=Math.max(2,Math.floor(stairCalcRaw().risers/2));
    g.appendChild(E('rect',{x:0,y:h-L,width:L,height:L,fill:'none',stroke:soft,'stroke-width':1,'stroke-dasharray':'3 3'}));
    for(let i=1;i<n;i++){const y=(i/n)*(h-L);g.appendChild(E('line',{x1:0,y1:y,x2:L,y2:y,stroke:soft,'stroke-width':1}));}
    for(let i=1;i<n;i++){const x=L+(i/n)*(w-L);g.appendChild(E('line',{x1:x,y1:h-L,x2:x,y2:h,stroke:soft,'stroke-width':1}));}
    [0.25,0.5,0.75].forEach(t=>g.appendChild(E('line',{x1:0,y1:h-L,x2:L*Math.cos(t*Math.PI/2)||0.1,y2:h-L+L*Math.sin(t*Math.PI/2),stroke:soft,'stroke-width':.8})));
    if(view.showLabels&&L>22)g.appendChild(txt(L/2,h-L/2,isExt?'外・回り':'回り',{mono:true,size:8.5,fill:soft}));
    stairDirMark(g,w,h,w>=h,stairDirOf(opt),line);return;}
  if(kind==='spiral'){if(!asOverlay)g.appendChild(box(hexA('#34506B',.05)));
    const cx=w/2,cy=h/2,R=Math.min(w,h)/2-1,r0=Math.max(3,R*.16),n=Math.max(8,stairCalcRaw().risers);
    g.appendChild(E('circle',{cx,cy,r:R,fill:'none',stroke:soft,'stroke-width':1}));
    g.appendChild(E('circle',{cx,cy,r:r0,fill:'none',stroke:soft,'stroke-width':1}));
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;
      g.appendChild(E('line',{x1:cx+r0*Math.cos(a),y1:cy+r0*Math.sin(a),x2:cx+R*Math.cos(a),y2:cy+R*Math.sin(a),stroke:soft,'stroke-width':.9}));}
    if(view.showLabels)g.appendChild(txt(cx,cy+3,stairDirOf(opt)==='dn'?'DN':(stairDirOf(opt)==='both'?'UP/DN':'UP'),{mono:true,size:9,weight:700,fill:line}));
    return;}
  if(kind==='elevator'){g.appendChild(box(hexA('#5F7482',.08)));g.appendChild(E('line',{x1:0,y1:0,x2:w,y2:h,stroke:soft,'stroke-width':1}));g.appendChild(E('line',{x1:w,y1:0,x2:0,y2:h,stroke:soft,'stroke-width':1}));return;}
  if(kind==='corridor'){for(let x=8;x<w+h;x+=10){const x1=Math.max(0,x-h),y1=Math.min(h,x),x2=Math.min(w,x),y2=Math.max(0,x-w);g.appendChild(E('line',{x1,y1,x2,y2,stroke:soft,'stroke-width':.6,opacity:.4}));}return;}
  if(kind==='kitchen'){g.appendChild(box('#fff',line,1.3));const sx=w*.28,tx=w*.72,r=Math.min(h,w)*.22,br=Math.min(h,w)*.1;g.appendChild(E('circle',{cx:sx,cy:h/2,r,fill:'none',stroke:soft,'stroke-width':1.2}));[[tx-br*1.3,h/2-br*1.3],[tx+br*1.3,h/2-br*1.3],[tx-br*1.3,h/2+br*1.3],[tx+br*1.3,h/2+br*1.3]].forEach(([cx,cy])=>g.appendChild(E('circle',{cx,cy,r:br,fill:'none',stroke:soft,'stroke-width':1})));return;}
  if(kind==='bath'){g.appendChild(box('#fff',line,1.4));const m=Math.min(w,h)*.12;g.appendChild(E('rect',{x:m,y:m,width:w*.5-m,height:h-2*m,rx:5,fill:'none',stroke:soft,'stroke-width':1.2}));g.appendChild(E('circle',{cx:w*.75,cy:h*.35,r:Math.min(w,h)*.07,fill:'none',stroke:soft,'stroke-width':1}));if(view.showLabels&&w>40)g.appendChild(txt(w*.75,h*.72,'UB',{mono:true,size:9,fill:soft}));return;}
  if(kind==='toilet'){g.appendChild(box('#fff',line,1.2));const cw2=w*.55,cy=h*.55;g.appendChild(E('ellipse',{cx:w/2,cy,rx:cw2/2,ry:h*.28,fill:'none',stroke:soft,'stroke-width':1.2}));g.appendChild(E('rect',{x:w*.2,y:h*.08,width:w*.6,height:h*.18,rx:2,fill:'none',stroke:soft,'stroke-width':1.1}));return;}
  if(kind==='washbasin'){g.appendChild(box('#fff',line,1.2));g.appendChild(E('ellipse',{cx:w/2,cy:h/2,rx:w*.3,ry:h*.28,fill:'none',stroke:soft,'stroke-width':1.1}));g.appendChild(E('circle',{cx:w/2,cy:h*.22,r:1.6,fill:soft}));return;}
  if(kind==='washer'){g.appendChild(box('#fff',line,1.2));g.appendChild(E('circle',{cx:w/2,cy:h/2,r:Math.min(w,h)*.32,fill:'none',stroke:soft,'stroke-width':1.2}));g.appendChild(E('circle',{cx:w/2,cy:h/2,r:Math.min(w,h)*.18,fill:'none',stroke:soft,'stroke-width':.9}));if(view.showLabels&&w>34)g.appendChild(txt(w/2,h*.12,'W',{mono:true,size:8,fill:soft,base:'hanging'}));return;}
  if(kind==='closet'){g.appendChild(box(hexA('#A67C3D',.06),'#8a6a34',1.2));g.appendChild(E('line',{x1:0,y1:0,x2:w,y2:h,stroke:'#8a6a34','stroke-width':.7,opacity:.5}));g.appendChild(E('line',{x1:0,y1:h,x2:w,y2:0,stroke:'#8a6a34','stroke-width':.7,opacity:.5}));return;}
  if(kind==='wic'){g.appendChild(box(hexA('#A67C3D',.07),'#8a6a34',1.3));g.appendChild(E('line',{x1:w*.12,y1:h*.2,x2:w*.88,y2:h*.2,stroke:soft,'stroke-width':1.2}));for(let i=0;i<5;i++){const x=w*(.2+i*.15);g.appendChild(E('line',{x1:x,y1:h*.2,x2:x,y2:h*.32,stroke:soft,'stroke-width':.8}));}if(view.showLabels&&w>34)g.appendChild(txt(w/2,h*.66,'WIC',{mono:true,size:Math.min(11,w/3.5),fill:'#7a5f30'}));return;}
  if(kind==='oshiire'){g.appendChild(box(hexA('#A67C3D',.06),'#8a6a34',1.2));g.appendChild(E('line',{x1:w/2,y1:0,x2:w/2,y2:h,stroke:'#8a6a34','stroke-width':.9}));return;}
  if(kind==='fridge'){g.appendChild(box('#fff',line,1.3));g.appendChild(E('line',{x1:0,y1:h*.35,x2:w,y2:h*.35,stroke:soft,'stroke-width':1}));g.appendChild(E('circle',{cx:w*.85,cy:h*.2,r:1.5,fill:soft}));return;}
  if(kind==='cupboard'){g.appendChild(box('#fff',line,1.2));for(let i=1;i<4;i++)g.appendChild(E('line',{x1:w*i/4,y1:0,x2:w*i/4,y2:h,stroke:soft,'stroke-width':.8}));return;}
  if(kind==='bed'){g.appendChild(box('#fff',line,1.4));const ph=Math.min(h,w)>0?Math.min(h*.2,26):10;g.appendChild(E('rect',{x:w*.12,y:h*.05,width:w*.76,height:ph,rx:3,fill:'none',stroke:soft,'stroke-width':1.1}));g.appendChild(E('line',{x1:0,y1:h*.32,x2:w,y2:h*.32,stroke:soft,'stroke-width':1}));g.appendChild(E('path',{d:`M 0 ${h*.32} L ${w*.18} ${h*.42}`,stroke:soft,'stroke-width':.9,fill:'none'}));return;}
  if(kind==='sofa'){g.appendChild(E('rect',{x:0,y:0,width:w,height:h,rx:4,fill:'#fff',stroke:line,'stroke-width':1.4}));g.appendChild(E('rect',{x:2,y:2,width:w-4,height:h*.28,rx:3,fill:'none',stroke:soft,'stroke-width':1}));g.appendChild(E('rect',{x:2,y:2,width:w*.12,height:h-4,rx:3,fill:'none',stroke:soft,'stroke-width':1}));g.appendChild(E('rect',{x:w-2-w*.12,y:2,width:w*.12,height:h-4,rx:3,fill:'none',stroke:soft,'stroke-width':1}));const seats=w>140?3:2;for(let i=1;i<seats;i++)g.appendChild(E('line',{x1:w*.12+((w*.76)*i/seats),y1:h*.32,x2:w*.12+((w*.76)*i/seats),y2:h-3,stroke:soft,'stroke-width':.8}));return;}
  if(kind==='sofaL'){g.appendChild(E('path',{d:`M 3 3 H ${w-3} V ${h*.55} H ${w*.45} V ${h-3} H 3 Z`,fill:'#fff',stroke:line,'stroke-width':1.4,'stroke-linejoin':'round'}));g.appendChild(E('rect',{x:5,y:5,width:w-10,height:h*.2,rx:3,fill:'none',stroke:soft,'stroke-width':1}));g.appendChild(E('rect',{x:5,y:5,width:w*.1,height:h-10,rx:3,fill:'none',stroke:soft,'stroke-width':1}));return;}
  if(kind==='table'){g.appendChild(E('rect',{x:0,y:0,width:w,height:h,rx:Math.min(w,h)*.12,fill:'#fff',stroke:line,'stroke-width':1.4}));const ch2=Math.min(w,h)*.28;const n=w>120?(w>160?3:2):2;for(let i=0;i<n;i++){const cx=w*(i+1)/(n+1);g.appendChild(E('rect',{x:cx-ch2/2,y:-ch2*.9,width:ch2,height:ch2*.7,rx:2,fill:'none',stroke:soft,'stroke-width':1}));g.appendChild(E('rect',{x:cx-ch2/2,y:h+ch2*.2,width:ch2,height:ch2*.7,rx:2,fill:'none',stroke:soft,'stroke-width':1}));}return;}
  if(kind==='desk'){g.appendChild(box('#fff',line,1.3));g.appendChild(E('line',{x1:0,y1:h*.25,x2:w,y2:h*.25,stroke:soft,'stroke-width':.9}));return;}
  if(kind==='chair'){g.appendChild(E('rect',{x:1,y:1,width:w-2,height:h-2,rx:3,fill:'#fff',stroke:line,'stroke-width':1.2}));g.appendChild(E('line',{x1:2,y1:h*.25,x2:w-2,y2:h*.25,stroke:soft,'stroke-width':1}));return;}
  if(kind==='tv'){g.appendChild(box('#fff',line,1.2));g.appendChild(E('line',{x1:w*.15,y1:h*.4,x2:w*.85,y2:h*.4,stroke:soft,'stroke-width':2.2}));return;}
  if(kind==='aircon'){g.appendChild(E('rect',{x:0,y:0,width:w,height:h,rx:h*.4,fill:'#fff',stroke:line,'stroke-width':1.2}));g.appendChild(E('line',{x1:w*.15,y1:h*.6,x2:w*.85,y2:h*.6,stroke:soft,'stroke-width':.9}));return;}
  g.appendChild(box('#fff',line,1.2));
}
/* 階段の上り下り。auto は階の位置から自動判定（配列先頭＝最上階） */
function stairDirOf(o){const d=(o&&o.dir)||'auto';if(d!=='auto')return d;
  const n=state.floors.length;if(n<=1)return 'up';
  const i=state.floors.findIndex(f=>f.id===(drawFloorId||state.activeFloorId));
  if(i<=0)return 'dn';
  if(i>=n-1)return 'up';
  return 'both';}
const STAIRDIR=[['auto','自動（階の位置から）'],['up','UP 上りのみ'],['dn','DN 下りのみ'],['both','UP＋DN 両方']];
let drawFloorId=null;
/* 階段に UP/DN の矢印と文字を重ねる */
function stairDirMark(g,w,h,horiz,dir,line){
  const put=(cx,cy,up,lab)=>{
    const L=Math.min(horiz?w:h,60)*.3,sgn=up?-1:1;
    const x1=horiz?cx-L/2*(up?-1:1):cx, y1=horiz?cy:cy-L/2*(up?-1:1);
    const x2=horiz?cx+L/2*(up?-1:1):cx, y2=horiz?cy:cy+L/2*(up?-1:1);
    g.appendChild(E('line',{x1,y1,x2,y2,stroke:line,'stroke-width':1.6}));
    const a=6;
    if(horiz)g.appendChild(E('path',{d:`M ${x2} ${y2} l ${-a*(up?-1:1)} ${-a*.6} M ${x2} ${y2} l ${-a*(up?-1:1)} ${a*.6}`,stroke:line,'stroke-width':1.6,fill:'none'}));
    else g.appendChild(E('path',{d:`M ${x2} ${y2} l ${-a*.6} ${-a*(up?-1:1)} M ${x2} ${y2} l ${a*.6} ${-a*(up?-1:1)}`,stroke:line,'stroke-width':1.6,fill:'none'}));
    if(view.showLabels)g.appendChild(txt(horiz?cx:cx+13,horiz?cy-9:cy,lab,{mono:true,size:9.5,weight:700,fill:line}));};
  if(dir==='both'){
    if(horiz){put(w*.32,h*.5,true,'UP');put(w*.72,h*.5,false,'DN');}
    else{put(w*.5,h*.3,true,'UP');put(w*.5,h*.72,false,'DN');}}
  else put(w*.5,h*.5,dir==='up',dir==='up'?'UP':'DN');}
function doorSwing(g,w,h,horiz,hinge,flip,line){let r;
  const tint='rgba(14,124,134,.13)';
  if(horiz){r=w;const hx=hinge?0:w,ex=hinge?w:0,ly=flip?h:0,ay=flip?h-r:r;
    const sw=hinge?(flip?0:1):(flip?1:0);
    /* 開き範囲を扉型に塗る（どちらに開くか一目で分かる） */
    g.appendChild(E('path',{d:`M ${hx} ${ly} L ${hx} ${ay} A ${r} ${r} 0 0 ${sw} ${ex} ${ly} Z`,fill:tint,stroke:'none'}));
    g.appendChild(E('path',{d:`M ${hx} ${ay} A ${r} ${r} 0 0 ${sw} ${ex} ${ly}`,fill:'none',stroke:line,'stroke-width':1,'stroke-dasharray':'4 3'}));
    g.appendChild(E('line',{x1:hx,y1:ly,x2:hx,y2:ay,stroke:line,'stroke-width':2.4}));      /* 扉 */
    g.appendChild(E('circle',{cx:hx,cy:ly,r:2.6,fill:line}));                                 /* 吊元 */
    [0,w].forEach(x=>g.appendChild(E('line',{x1:x,y1:h*.28,x2:x,y2:h*.72,stroke:line,'stroke-width':1.4})));/* 枠 */
  }else{r=h;const hy=hinge?0:h,ey=hinge?h:0,lx=flip?0:w,ax=flip?r:w-r;
    const sw=hinge?(flip?1:0):(flip?0:1);
    g.appendChild(E('path',{d:`M ${lx} ${hy} L ${ax} ${hy} A ${r} ${r} 0 0 ${sw} ${lx} ${ey} Z`,fill:tint,stroke:'none'}));
    g.appendChild(E('path',{d:`M ${ax} ${hy} A ${r} ${r} 0 0 ${sw} ${lx} ${ey}`,fill:'none',stroke:line,'stroke-width':1,'stroke-dasharray':'4 3'}));
    g.appendChild(E('line',{x1:lx,y1:hy,x2:ax,y2:hy,stroke:line,'stroke-width':2.4}));
    g.appendChild(E('circle',{cx:lx,cy:hy,r:2.6,fill:line}));
    [0,h].forEach(y=>g.appendChild(E('line',{x1:w*.28,y1:y,x2:w*.72,y2:y,stroke:line,'stroke-width':1.4})));}}
function arrow(g,w,h,horiz,flip,line){if(horiz){const y=h/2,x1=flip?w-6:6,x2=flip?6:w-6;g.appendChild(E('line',{x1,y1:y,x2,y2:y,stroke:line,'stroke-width':1.4}));const s=flip?8:-8;g.appendChild(E('path',{d:`M ${x2} ${y} l ${s} -4 M ${x2} ${y} l ${s} 4`,stroke:line,'stroke-width':1.4,fill:'none'}));}else{const x=w/2,y1=flip?h-6:6,y2=flip?6:h-6;g.appendChild(E('line',{x1:x,y1,x2:x,y2,stroke:line,'stroke-width':1.4}));const s=flip?8:-8;g.appendChild(E('path',{d:`M ${x} ${y2} l -4 ${s} M ${x} ${y2} l 4 ${s}`,stroke:line,'stroke-width':1.4,fill:'none'}));}}
function stairCalcRaw(){const H=state.settings.floorH,t=state.settings.rise,risers=Math.max(2,Math.round(H/t));return{risers,rise:H/risers,treads:risers-1};}
function stairCalc(o){const{risers,rise,treads}=stairCalcRaw(),horiz=o.w>=o.h;let run,tread,flights=1,clearW;
  const K=o.kind||o.sym;
  if(K==='spiral'){const R=Math.min(o.w,o.h)/2;clearW=R*0.72;run=Math.PI*R*1.5;tread=run/treads;flights=1;return{risers,rise,treads,tread,run,flights,clearW};}
  if(K==='lstair'||K==='extlstair'){const L=Math.min(o.w,o.h)*.46;run=(o.w-L)+(o.h-L);clearW=L;tread=run/Math.max(1,treads-3);flights=2;return{risers,rise,treads,tread,run,flights,clearW};}
  if(o.kind==='switchback'||o.kind==='extswitch'||o.sym==='switchback'||o.sym==='extswitch'){flights=2;clearW=Math.min(o.w,o.h)/2;const land=o.h*.22;run=o.h-land;tread=run/Math.max(1,Math.ceil(treads/2));}else{run=horiz?o.w:o.h;clearW=horiz?o.h:o.w;tread=run/treads;}return{risers,rise,treads,tread,run,flights,clearW};}
function isStairObj(o){return o&&(ELEM[o.kind]?.stair||['stair','switchback','lstair','spiral','extstair','extswitch','extlstair'].includes(o.sym));}
