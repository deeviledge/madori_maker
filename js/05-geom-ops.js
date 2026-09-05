/* 05-geom-ops.js — 部屋の合体・バリエーション・微調整・面積集計
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= 集計 ================= */
/* ================= 部屋の合体（軸平行ポリゴンの和集合） ================= */
/* セル分割で被覆を求め、境界辺を有向で抾って1つの環に縫う。
   環が2つ以上（離れている or 穴があく）なら null を返して合体を拒否する。*/
function unionPoly(polys){polys=polys.filter(p=>p&&p.length>=3);if(!polys.length)return null;
  const rd=v=>Math.round(v*1e4)/1e4,K=(x,y)=>rd(x)+','+rd(y);
  const xs=[...new Set([].concat(...polys.map(pl=>pl.map(pt=>rd(pt[0])))))].sort((a,b)=>a-b);
  const ys=[...new Set([].concat(...polys.map(pl=>pl.map(pt=>rd(pt[1])))))].sort((a,b)=>a-b);
  if(xs.length<2||ys.length<2)return null;
  const nx=xs.length-1,ny=ys.length-1,boxes=polys.map(pl=>bbox(pl));
  const cov=[];
  for(let i=0;i<nx;i++){cov[i]=[];const cx=(xs[i]+xs[i+1])/2;
    for(let j=0;j<ny;j++){const cy=(ys[j]+ys[j+1])/2;let c=false;
      for(let k=0;k<polys.length&&!c;k++){const b=boxes[k];
        if(cx<b.x||cx>b.x+b.w||cy<b.y||cy>b.y+b.h)continue;
        if(pointInPoly(cx,cy,polys[k]))c=true;}
      cov[i][j]=c;}}
  const on=(i,j)=>i>=0&&j>=0&&i<nx&&j<ny&&cov[i][j];
  const edges=new Map();const add=(a,b)=>{edges.set(K(a[0],a[1]),[a,b]);};
  for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){if(!cov[i][j])continue;
    const x0=xs[i],x1=xs[i+1],y0=ys[j],y1=ys[j+1];
    if(!on(i,j-1))add([x0,y0],[x1,y0]);
    if(!on(i+1,j))add([x1,y0],[x1,y1]);
    if(!on(i,j+1))add([x1,y1],[x0,y1]);
    if(!on(i-1,j))add([x0,y1],[x0,y0]);}
  if(!edges.size)return null;
  const total=edges.size,ring=[];
  let cur=edges.values().next().value,start=K(cur[0][0],cur[0][1]);
  let guard=0;
  while(guard++<total+5){ring.push(cur[0]);edges.delete(K(cur[0][0],cur[0][1]));
    const nk=K(cur[1][0],cur[1][1]);if(nk===start)break;
    const nxt=edges.get(nk);if(!nxt)return null;cur=nxt;}
  if(edges.size)return null;                    /* 残りがある＝穴 or 非連結 */
  /* 共線頂点を間引く */
  const out=[];for(let i=0;i<ring.length;i++){const a=ring[(i-1+ring.length)%ring.length],b=ring[i],c=ring[(i+1)%ring.length];
    const cr=(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]);
    if(Math.abs(cr)>1e-9)out.push([b[0],b[1]]);}
  return out.length>=4?out:ring;}
/* ================= バリエーションシート（詳細を開かずに型・サイズを変える） ================= */
/* 選択中のオブジェクトからパターンカテゴリを推定 */
const KIND2CAT={toilet:'toilet',washbasin:'washroom',washbasin75:'washroom',washer:'laundry',
 bath1216:'bath',bath1616:'bath',bath1818:'bath',
 kitchen:'kitchen',kitchenL:'kitchen',minikitchen:'kitchen',cupboard:'kitchen',fridge:'kitchen',
 dining4:'dining',dining6:'dining',chair:'dining',
 sofa2:'living',sofa3:'living',sofaL:'living',lowtable:'living',tv:'living',piano:'living',desk:'living',
 bedS:'bedroom',bedSD:'bedroom',bedD:'bedroom',bedQ:'bedroom',crib:'bedroom',
 closet91:'closet',oshiire:'closet',wic:'closet',shoebox:'entrance',
 stair:'stair',switchback:'stair',lstair:'stair',spiral:'stair',extstair:'stair',extswitch:'stair',extlstair:'stair'};
const NAME2CAT=[['トイレ','toilet'],['洗面','washroom'],['脱衣','washroom'],['ランドリ','laundry'],
 ['浴室','bath'],['風呂','bath'],['キッチン','kitchen'],['LDK','living'],['リビング','living'],
 ['ダイニング','dining'],['寝室','bedroom'],['ベッド','bedroom'],['子供室','bedroom'],
 ['WIC','closet'],['クローゼット','closet'],['納戸','closet'],['押入','closet'],
 ['玄関','entrance'],['階段','stair'],['廊下','corridor'],['ホール','corridor']];
function patCatFor(o,isRoom){
  if(!isRoom)return KIND2CAT[o.kind]||null;
  const byType={'外廊下':'corridor','EV':'ev','ベランダ':'balcony','賃貸':'unit','外階段':'stair'}[o.type];
  if(byType)return byType;
  const nm=o.name||'';const hit=NAME2CAT.find(([k])=>nm.indexOf(k)>=0);
  return hit?hit[1]:null;}
function patSizeStr(v){return v?mm(v[v.length-2])+'×'+mm(v[v.length-1]):'—';}
function buildVarSheet(){const box=$('varSheetBody');box.innerHTML='';buildVarBody(box);}
function buildVarBody(box){const o=selObj();
  if(!o){box.appendChild(el('div','hint','部屋または設備を選んでから開いてください。'));return;}
  const isRoom=view.sel.type==='room';
  const b=isRoom?bbox(o.poly):{x:o.x,y:o.y,w:o.w,h:o.h};
  const reb=()=>{render();buildInspector($('inspM'),selObj());};
  box.appendChild(el('div','ratio ok','<span>'+esc(isRoom?o.name:(ELEM[o.kind]?.label||o.kind))+'</span><span><b>'+mm(b.w)+' × '+mm(b.h)+' mm</b>（'+f1(b.w*b.h)+'㎡ / '+f1(b.w*b.h/TATAMI)+'畳）</span>'));
  /* ---- カテゴリ ---- */
  const selKey=view.sel.type+':'+view.sel.id;
  if(view.varSelKey!==selKey){view.varSelKey=selKey;view.varCat=patCatFor(o,isRoom)||view.varCat||(isRoom?'corridor':'living');}
  box.appendChild(el('div','hint','ここでは<b>寸法と型</b>だけを決めます。名前・用途区分・面積フラグ・壁は「詳細」で。'));
  box.appendChild(el('div','palcat','カテゴリを選ぶ'));
  const cg=el('div','chips');
  PATLIB.forEach(c=>{const bt=document.createElement('button');bt.textContent=c.label;
    if(c.id===view.varCat)bt.classList.add('on');
    bt.onclick=()=>{view.varCat=c.id;buildInspector($('inspM'),selObj());};cg.appendChild(bt);});
  box.appendChild(cg);
  const cat=PATLIB.find(c=>c.id===view.varCat)||PATLIB[0];
  /* ---- パターン ---- */
  box.appendChild(el('div','palcat',cat.label+'：よくあるパターン'));
  box.appendChild(el('div','hint',(isRoom?'部屋を選択中です。タップすると<b>空間サイズ</b>が適用されます。':'設備を選択中です。タップすると<b>設備本体サイズ</b>が適用されます（型も差し替わります）。')+'どちらの寸法も常に両方表示します。'));
  const pl=el('div','patlist');
  cat.items.forEach(it=>{const bt=document.createElement('button');
    const eS=it.e?mm(it.e[1])+'×'+mm(it.e[2]):'—';
    const rS=it.r?mm(it.r[0])+'×'+mm(it.r[1]):'—';
    const rA=it.r?(it.r[0]*it.r[1]):0;
    const applicable=isRoom?!!it.r:!!it.e;
    const cur=isRoom?(it.r&&Math.abs(b.w-it.r[0])<.005&&Math.abs(b.h-it.r[1])<.005)
                    :(it.e&&o.kind===it.e[0]&&Math.abs(o.w-it.e[1])<.005&&Math.abs(o.h-it.e[2])<.005);
    if(cur)bt.classList.add('on');
    bt.innerHTML='<b>'+esc(it.n)+(applicable?'':' （この選択には適用不可）')+'</b>'+
      '<span class="sz"><i>設備 '+eS+'</i><i>空間 '+rS+(rA?' （'+f1(rA)+'㎡ / '+f1(rA/TATAMI)+'畳）':'')+'</i></span>'+
      (it.note?'<small>'+esc(it.note)+'</small>':'');
    if(!applicable)bt.style.opacity='.5';
    else bt.onclick=()=>{
      if(isRoom){resizeTo(o,it.r[0],it.r[1]);}
      else{o.kind=it.e[0];o.w=it.e[1];o.h=it.e[2];}
      reb();};
    pl.appendChild(bt);});
  box.appendChild(pl);
  /* ---- カスタム ---- */
  box.appendChild(el('div','palcat','完全にカスタムする'));
  box.appendChild(el('div','hint','上のパターンを参考にしながら自由な寸法を入力できます。入力値に一致するパターンがあれば上でハイライトされます。'));
  const r=el('div','row2');
  r.appendChild(fNum('幅 W (m)',b.w,.0455,v=>{resizeTo(o,Math.max(.1,v||.1),b.h);reb();}));
  r.appendChild(fNum('奥行 D (m)',b.h,.0455,v=>{resizeTo(o,b.w,Math.max(.1,v||.1));reb();}));
  box.appendChild(r);
  const gr=el('div','chips');
  [.455,.91,1.365,1.82,2.275,2.73,3.185,3.64,4.55,5.46].forEach(v=>{
    const bt=document.createElement('button');bt.textContent=mm(v);
    bt.onclick=()=>{resizeTo(o,v,b.h);reb();};gr.appendChild(bt);});
  box.appendChild(el('div','hint','幅Wを尺モジュールにスナップ：'));box.appendChild(gr);
  const ac=el('div','menulist');
  ac.appendChild(btn('↺ 縦横を入れ替える（'+mm(b.h)+' × '+mm(b.w)+'）',()=>{resizeTo(o,b.h,b.w);reb();}));
  ac.appendChild(btn('↻ 回転',()=>{rotate(o);reb();}));
  box.appendChild(ac);
  /* ---- 見つからないときの逃げ道（折りたたみ） ---- */
  if(!isRoom){const d=ELEM[o.kind]||{};
    const dt=document.createElement('details');dt.style.cssText='margin-top:10px';
    const sm=document.createElement('summary');sm.textContent='パターンにない設備に差し替える';
    sm.style.cssText='cursor:pointer;font-size:12px;font-weight:700;color:var(--ink-soft);padding:6px 0';
    dt.appendChild(sm);
    Object.keys(CATLABEL).forEach(c=>{const ks=Object.keys(ELEM).filter(k=>ELEM[k].cat===c);if(!ks.length)return;
      dt.appendChild(el('div','palcat',CATLABEL[c]));
      const g2=el('div','chips');
      ks.forEach(k=>{const bt=document.createElement('button');bt.textContent=ELEM[k].label;
        if(k===o.kind)bt.classList.add('on');
        bt.onclick=()=>{o.kind=k;o.w=ELEM[k].w;o.h=ELEM[k].h;reb();};g2.appendChild(bt);});
      dt.appendChild(g2);});
    box.appendChild(dt);}}

/* ================= 上下左右の微調整 ================= */
const NUDGE_STEPS=[.005,.01,.025,.05,.075,.1,.2,.2275,.455,.91];
function nudgeStepLabel(){const v=(view.nudgeStep!=null?view.nudgeStep:.05)*1000;return (Math.round(v*10)/10)+'mm';}
function stepShift(d){const cur=(view.nudgeStep!=null?view.nudgeStep:.05);
  let i=NUDGE_STEPS.indexOf(cur);if(i<0)i=NUDGE_STEPS.indexOf(.05);
  view.nudgeStep=NUDGE_STEPS[Math.max(0,Math.min(NUDGE_STEPS.length-1,i+d))];applyNudgeUI();}
function cycleNudgeStep(){const cur=(view.nudgeStep!=null?view.nudgeStep:.05);
  let i=NUDGE_STEPS.indexOf(cur);view.nudgeStep=NUDGE_STEPS[(i+1+NUDGE_STEPS.length)%NUDGE_STEPS.length];applyNudgeUI();}
const NUDGE_POS=[['br','右下'],['bl','左下'],['tl','左上'],['tr','右上']];
function cycleNudgePos(){if(view.nudgeXY){view.nudgeXY=null;applyNudgeUI();return;}
  const i=NUDGE_POS.findIndex(x=>x[0]===(view.nudgePos||'br'));
  view.nudgePos=NUDGE_POS[(i+1)%NUDGE_POS.length][0];applyNudgeUI();}
function applyNudgeUI(){const pad=$('nudgePad');if(!pad)return;
  const o=view.locked?null:selObj();
  const on=!!(o&&(view.mode==='nudge'||view.mode==='resize'));
  pad.classList.toggle('show',on);
  const hd=$('ndMode');if(hd){const rz=view.mode==='resize';
    hd.textContent=rz?'⤢ サイズ ≡':'✥ 位置 ≡';
    hd.classList.toggle('rz',rz);}
  ['S','M','L'].forEach(k=>pad.classList.remove('sz-'+k));pad.classList.add('sz-'+(view.padSize||'S'));
  NUDGE_POS.forEach(([k])=>pad.classList.remove('pos-'+k));
  if(view.nudgeXY){pad.style.left=view.nudgeXY.x+'px';pad.style.top=view.nudgeXY.y+'px';pad.style.right='auto';pad.style.bottom='auto';}
  else{pad.style.left=pad.style.top=pad.style.right=pad.style.bottom='';pad.classList.add('pos-'+(view.nudgePos||'br'));}
  const st=$('ndStep');if(st)st.textContent=nudgeStepLabel();
  const fab=$('fabAdd');if(fab&&!view.locked)fab.style.display=on?'none':'';
  }
function padStep(){return view.nudgeStep!=null?view.nudgeStep:.05;}
/* 変形モード：→←で幅W、↓↑で奥行Dを増減 */
function resizeSel(sx,sy){const o=selObj();if(!o||view.locked)return;
  const st=padStep(),r4=v=>Math.round(v*1e4)/1e4;
  const b=view.sel.type==='room'?bbox(o.poly):{w:o.w,h:o.h};
  resizeTo(o,Math.max(.1,r4(b.w+sx*st)),Math.max(.1,r4(b.h+sy*st)));render();}
function padAct(sx,sy){if(view.mode==='resize')resizeSel(sx,sy);else nudgeSel(sx,sy);}
function nudgeSel(sx,sy){const o=selObj();if(!o||view.locked)return;
  const st=padStep(),dx=sx*st,dy=sy*st,r3=v=>Math.round(v*1e4)/1e4;
  if(view.sel.type==='room')o.poly=o.poly.map(([x,y])=>[r3(x+dx),r3(y+dy)]);
  else{o.x=r3(o.x+dx);o.y=r3(o.y+dy);}
  render();}
/* 合体モード */
function startMerge(){const o=selObj();if(!o||view.sel.type!=='room'){alert('合体できるのは部屋同士です。まず部屋を選んでください。');return;}
  if(view.mergeFrom===view.sel.id){view.mergeFrom=null;}else{view.mergeFrom=view.sel.id;}
  render();}
function doMerge(bId){const f=F(),a=f.rooms.find(r=>r.id===view.mergeFrom),b=f.rooms.find(r=>r.id===bId);
  view.mergeFrom=null;
  if(!a||!b||a===b){render();return;}
  const u=unionPoly([a.poly,b.poly]);
  if(!u){alert('この2つは合体できません。\n・離れている（辺が接していない）\n・合体すると穴があく形になる\nのどちらかです。間を接してから再度お試しください。');render();return;}
  const diff=(a.type!==b.type);
  if(diff&&!confirm('種別が違います（'+a.type+' ← '+b.type+'）。\n合体後は「'+a.name+'（'+a.type+'）」に統一され、面積区分（容積・建ぺい・自宅/賃貸）も'+a.type+'側になります。続けますか？')){render();return;}
  a.poly=u;a.wallE={};                       /* 辺番号が変わるので辺ごとの壁設定はリセット */
  f.rooms=f.rooms.filter(r=>r.id!==b.id);
  view.sel={type:'room',id:a.id};
  render();}
/* ================= 建築面積（全階の水平投影の和集合） ================= */
function pointInPoly(x,y,pl){let inside=false;
  for(let i=0,j=pl.length-1;i<pl.length;j=i++){const [xi,yi]=pl[i],[xj,yj]=pl[j];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi))inside=!inside;}
  return inside;}
/* 軸平行多角形群の和集合面積（座標スラブ分割で厳密に算出） */
function unionArea(polys){polys=polys.filter(p=>p&&p.length>=3);if(!polys.length)return 0;
  const rd=v=>Math.round(v*1e4)/1e4;
  const xs=[...new Set([].concat(...polys.map(pl=>pl.map(pt=>rd(pt[0])))))].sort((a,b)=>a-b);
  const ys=[...new Set([].concat(...polys.map(pl=>pl.map(pt=>rd(pt[1])))))].sort((a,b)=>a-b);
  if(xs.length<2||ys.length<2)return 0;
  const boxes=polys.map(pl=>bbox(pl));
  let A=0;
  for(let i=0;i<xs.length-1;i++){const cx=(xs[i]+xs[i+1])/2,dx=xs[i+1]-xs[i];if(dx<=0)continue;
    for(let j=0;j<ys.length-1;j++){const cy=(ys[j]+ys[j+1])/2,dy=ys[j+1]-ys[j];if(dy<=0)continue;
      for(let k=0;k<polys.length;k++){const b=boxes[k];
        if(cx<b.x||cx>b.x+b.w||cy<b.y||cy>b.y+b.h)continue;
        if(pointInPoly(cx,cy,polys[k])){A+=dx*dy;break;}}}}
  return A;}
/* 建築面積＝「建ぺい対象」フラグの部屋を全階重ねて真上から見た面積（壁芯） */
function builtAreaSc(sc){sc=sc||state;const ps=[];
  sc.floors.forEach(f=>f.rooms.forEach(r=>{if(r.flags&&r.flags.bcr)ps.push(r.poly);}));
  return unionArea(ps);}
function builtArea(){return builtAreaSc(state);}
function floorTotals(f){return floorTotalsSc(f,state);}
function floorTotalsSc(f,sc){const by={};Object.keys(SPACE).forEach(k=>by[k]=0);const basis={own:0,rental:0,far:0,bcr:0,reg:0};let gross=0,net=0,constr=0;
  f.rooms.forEach(r=>{const a=roomAreasSc(r,f,sc);gross+=a.gross;net+=a.net;constr+=a.constr;if(by[r.type]==null)by[r.type]=0;by[r.type]+=a.gross;FLAGDEF.forEach(([k])=>{if(r.flags[k])basis[k]+=a.gross;});});
  /* 設備・家具側の面積調整（吹抜を引く・ポーチ/PSを足す 等） */
  const elemAdj={own:0,rental:0,far:0,bcr:0,reg:0};let elemAdjAny=0;
  (f.elems||[]).forEach(e=>{const m=e.areaMode||'none';if(m==='none')return;
    const a=Math.max(0,+e.w||0)*Math.max(0,+e.h||0),sg=(m==='sub'?-1:1),fl=e.flags||{};
    FLAGDEF.forEach(([k])=>{if(fl[k]){elemAdj[k]+=sg*a;elemAdjAny=1;}});});
  if(elemAdjAny)FLAGDEF.forEach(([k])=>{basis[k]=Math.max(0,basis[k]+elemAdj[k]);});
  return{by,basis,gross,net,constr,elemAdj,elemAdjAny};}
function buildingAgg(){return buildingAggSc(state);}
function buildingAggSc(sc){const B={own:0,rental:0,far:0,bcr:0,reg:0},by={};Object.keys(SPACE).forEach(k=>by[k]=0);let gross=0,net=0,constr=0,bcrMax=0;
  sc.floors.forEach(f=>{const t=floorTotalsSc(f,sc);gross+=t.gross;net+=t.net;constr+=t.constr;bcrMax=Math.max(bcrMax,t.basis.bcr);Object.keys(B).forEach(k=>B[k]+=t.basis[k]);Object.keys(by).forEach(k=>by[k]+=(t.by[k]||0));});
  return{B,by,gross,net,constr,bcrMax};}
