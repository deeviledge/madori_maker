/* 02-geometry.js — ユーティリティ・幾何計算・壁厚・土地の法規計算
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= ユーティリティ ================= */
const $=id=>document.getElementById(id);
const F=()=>state.floors.find(f=>f.id===state.activeFloorId)||state.floors[0];
function selObj(){const s=view.sel;if(!s)return null;const f=F();return s.type==='room'?f.rooms.find(r=>r.id===s.id):f.elems.find(e=>e.id===s.id);}
const fmt=(n,d=2)=>(Math.round(n*10**d)/10**d).toLocaleString('ja-JP',{minimumFractionDigits:d,maximumFractionDigits:d});
const f1=n=>(Math.round(n*10)/10).toFixed(1);
const f0=n=>Math.round(n).toLocaleString('ja-JP');
const mm=n=>Math.round(n*1000);const tsubo=a=>a/TSUBO;
function areaStr(a){return `${fmt(a,2)}㎡ / ${f1(a/TATAMI)}畳 / ${fmt(a/TSUBO,2)}坪`;}
function snap(v){return view.snap?Math.round(v/view.grid)*view.grid:Math.round(v*1000)/1000;}
function hexA(hex,a){const n=hex.replace('#','');return `rgba(${parseInt(n.substr(0,2),16)},${parseInt(n.substr(2,2),16)},${parseInt(n.substr(4,2),16)},${a})`;}
function yen(man){const neg=man<0?'−':'';man=Math.abs(man);if(man>=10000)return `${neg}${fmt(man/10000,2)}億円`;return `${neg}${f0(man)}万円`;}
function bbox(p){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;p.forEach(([x,y])=>{x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);});return{x:x0,y:y0,w:x1-x0,h:y1-y0};}
function polyArea(p){let a=0;for(let i=0;i<p.length;i++){const[x1,y1]=p[i],[x2,y2]=p[(i+1)%p.length];a+=x1*y2-x2*y1;}return Math.abs(a)/2;}
function centroid(p){let a=0,cx=0,cy=0;for(let i=0;i<p.length;i++){const[x1,y1]=p[i],[x2,y2]=p[(i+1)%p.length];const c=x1*y2-x2*y1;a+=c;cx+=(x1+x2)*c;cy+=(y1+y2)*c;}a/=2;if(Math.abs(a)<1e-9){const b=bbox(p);return[b.x+b.w/2,b.y+b.h/2];}return[cx/(6*a),cy/(6*a)];}
function dist(p,q){return Math.hypot(p[0]-q[0],p[1]-q[1]);}
function edges(p){const e=[];for(let i=0;i<p.length;i++)e.push([p[i],p[(i+1)%p.length]]);return e;}
function isExtEdge(p,q,f){const eps=.02,v=Math.abs(p[0]-q[0])<eps,h=Math.abs(p[1]-q[1])<eps;if(v&&(Math.abs(p[0])<eps||Math.abs(p[0]-f.footW)<eps))return 1;if(h&&(Math.abs(p[1])<eps||Math.abs(p[1]-f.footH)<eps))return 1;return 0;}
function roomAreas(r,f){const gross=polyArea(r.poly);let inner=0,outer=0;edges(r.poly).forEach(([p,q],i)=>{const L=dist(p,q),ext=isExtEdge(p,q,f),t=edgeWallT(r,f,i,p,q);inner+=L*t/2;if(ext)outer+=L*state.settings.wallOut/2;});
  /* 内法は内側オフセットポリゴンの実面積（間取り図の描画と完全一致） */
  let net;try{net=polyArea(insetPolyByWalls(r,f));}catch(e){net=Math.max(0,gross-inner);}
  return{gross,net:Math.min(gross,Math.max(0,net)),constr:gross+outer};}
/* ================= 壁厚の実体化（壁芯→内法ポリゴン） ================= */
/* 辺 ei の壁厚（m）。壁なし=0 */
function edgeWallT(r,f,ei,p,q){const cfg=(r.wallE||{})[ei]||{};if(cfg.on===0)return 0;
  const ext=isExtEdge(p,q,f);
  return cfg.t!=null?cfg.t/1000:(ext?state.settings.wallOut:state.settings.wallIn);}
/* 壁芯ポリゴンを各辺の壁厚/2 だけ内側にオフセット＝内法ポリゴン */
function insetPolyByWalls(r,f,mag){mag=mag||1;const P=r.poly,n=P.length;if(n<3)return P;
  let sa=0;for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];sa+=a[0]*b[1]-b[0]*a[1];}
  const sgn=sa>0?1:-1,L=[];
  for(let i=0;i<n;i++){const a=P[i],b=P[(i+1)%n];
    let dx=b[0]-a[0],dy=b[1]-a[1];const len=Math.hypot(dx,dy);
    if(len<1e-9){L.push(null);continue;}
    dx/=len;dy/=len;
    const nx=-dy*sgn,ny=dx*sgn,t=edgeWallT(r,f,i,a,b)*mag/2;
    L.push({px:a[0]+nx*t,py:a[1]+ny*t,dx,dy});}
  const out=[];
  for(let i=0;i<n;i++){const A=L[(i-1+n)%n],B=L[i];
    if(!A||!B){out.push(P[i].slice());continue;}
    const den=A.dx*B.dy-A.dy*B.dx;
    if(Math.abs(den)<1e-9){out.push([B.px,B.py]);continue;}
    const s=((B.px-A.px)*B.dy-(B.py-A.py)*B.dx)/den;
    out.push([A.px+A.dx*s,A.py+A.dy*s]);}
  const a0=polyArea(P);if(!(polyArea(out)>0.04*a0))return P;
  return out;}
function landArea(sc){const L=(sc||state).land;
 if(L.mode==='poly'&&Array.isArray(L.poly)&&L.poly.length>=3)return Math.abs(polyArea(L.poly));
 if(L.areaManual!=null&&L.areaManual>0)return +L.areaManual;
 return (+L.W||0)*(+L.D||0);}
/* ================= 土地の法規計算（用途地域・容積上限） ================= */
const YOUTO=[
 {v:'低層1',label:'一種低層住専',coef:0.4,resi:true,lowrise:true},
 {v:'低層2',label:'二種低層住専',coef:0.4,resi:true,lowrise:true},
 {v:'中高1',label:'一種中高層住居',coef:0.4,resi:true},
 {v:'中高2',label:'二種中高層住居',coef:0.4,resi:true},
 {v:'住居1',label:'一種住居',coef:0.4,resi:true},
 {v:'住居2',label:'二種住居',coef:0.4,resi:true},
 {v:'準住居',label:'準住居',coef:0.4,resi:true},
 {v:'近商',label:'近隣商業',coef:0.6,resi:true},
 {v:'商業',label:'商業',coef:0.6,resi:true},
 {v:'準工',label:'準工業',coef:0.6,resi:true},
 {v:'工業',label:'工業',coef:0.6,resi:true},
 {v:'工専',label:'工業専用',coef:0.6,resi:false}];
function youtoInfo(L){return YOUTO.find(y=>y.v===L.youto)||YOUTO[7];}
/* 敷地の法規計算。sc省略時はstate */
function landReg(sc){sc=sc||state;const L=sc.land;const info=youtoInfo(L),coef=info.coef;
 const area=landArea(sc);const areaT=area/TSUBO;
 const road=+L.road||0;const roadUnlimited=road>=12;
 const roadFar=roadUnlimited?Infinity:road*coef*100;
 const effFar=Math.min(+L.farLimit||0,roadFar);
 const farFloor=area*(effFar/100);                       /* 容積率上限の延床 */
 const footprint=area*((+L.bcrLimit||0)/100);            /* 建築面積(建ぺい上限) */
 const floors=Math.max(1,+L.floorsPlan||(sc.floors?sc.floors.length:1));
 const stackFloor=footprint*floors;                      /* 建ぺい×階数の延床上限 */
 const maxFloor=Math.min(farFloor,stackFloor);           /* 実効・建築可能延床 */
 const bind=farFloor<=stackFloor?'容積率':'建ぺい率×階数';
 const estH=floors*(sc.settings?sc.settings.floorH+0.2:3.1);
 /* 離隔（外壁後退）を考慮した建物枠の上限。低層住専は外壁後退1m級が課される場合あり */
 const setback=Math.max(0,+L.setback||0);
 let landW,landD;
 if((L.mode||'rect')==='poly'&&Array.isArray(L.poly)&&L.poly.length>=3){const bb=bbox(L.poly);landW=bb.w;landD=bb.h;}
 else{landW=+L.W||0;landD=+L.D||0;}
 const buildW=Math.max(0,landW-2*setback),buildD=Math.max(0,landD-2*setback);
 const buildFootprint=buildW*buildD;/* 離隔後に置ける最大の矩形建物枠 */
 return{info,coef,area,areaT,road,roadUnlimited,roadFar,effFar,farFloor,footprint,floors,stackFloor,maxFloor,maxFloorT:maxFloor/TSUBO,bind,estH,roadLimited:!roadUnlimited&&roadFar<(+L.farLimit||0),setback,landW,landD,buildW,buildD,buildFootprint};}
/* 法規制チェック（建築可否・要注意） */
function landEval(sc){sc=sc||state;const L=sc.land,c=landReg(sc),info=c.info,ng=[],warn=[];
 if(L.saiken==='不可')ng.push('再建築不可：新築・建替え不可');
 if((+L.setto||0)<2)ng.push('接道 '+f1(+L.setto||0)+'m < 2m：接道義務未達');
 if(!info.resi)ng.push(info.label+'地域：住宅・共同住宅は建築不可');
 if(L.kuiki==='調整')ng.push('市街化調整区域：原則 建築不可');
 if((+L.minArea||0)>0&&c.area<L.minArea)ng.push('最低敷地 '+f0(+L.minArea)+'㎡ 未満');
 if(info.lowrise)warn.push('低層住専：絶対高さ10〜12m。'+c.floors+'階(約'+f1(c.estH)+'m)は困難な可能性');
 if((+L.hLimit||0)>0&&c.estH>L.hLimit)warn.push('高さ制限 '+f1(+L.hLimit)+'m < 推定 約'+f1(c.estH)+'m');
 if(L.jyoken==='あり')warn.push('建築条件付き：施工会社が指定され自社選定不可');
 if(L.bouka==='防火'&&c.floors>=4)warn.push('防火地域＋4階：耐火建築物必須（坪単価+10〜20%）');
 else if(L.bouka&&L.bouka!=='なし')warn.push(L.bouka+'地域：準耐火以上が必要（コスト増）');
 if((+L.road||0)<4)warn.push('前面道路 '+f1(+L.road||0)+'m < 4m：セットバックで有効敷地減');
 if(c.roadLimited)warn.push('前面道路容積率 '+f0(c.roadFar)+'% で延床縮小');
 if(info.lowrise&&(+L.setback||0)<1)warn.push('低層住専：外壁後退1.0〜1.5mが課される場合あり（現在 '+f1(+L.setback||0)+'m）');
 {const f0f=sc.floors&&sc.floors[0];if(f0f&&(f0f.footW>c.buildW+1e-6||f0f.footH>c.buildD+1e-6))warn.push('建物枠 '+f1(f0f.footW)+'×'+f1(f0f.footH)+'m が離隔後の上限 '+f1(c.buildW)+'×'+f1(c.buildD)+'m を超過（隣地に近すぎ）');}
 return{level:ng.length?'ng':warn.length?'warn':'ok',ng,warn,c};}
function E(tag,attrs,ch){const e=document.createElementNS(SVGNS,tag);for(const k in attrs){if(attrs[k]!=null)e.setAttribute(k,attrs[k]);}if(ch)[].concat(ch).forEach(c=>c&&e.appendChild(c));return e;}
function txt(x,y,s,o={}){return E('text',{x,y,'text-anchor':o.anchor||'middle','dominant-baseline':o.base||'middle','font-family':o.mono?'JetBrains Mono, monospace':'Noto Sans JP, sans-serif','font-size':o.size||12,'font-weight':o.weight||400,fill:o.fill||'#16232F'},document.createTextNode(s));}
function el(tag,cls,html){const d=document.createElement(tag);if(cls)d.className=cls;if(html!=null)d.innerHTML=html;return d;}
