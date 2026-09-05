/* 11-state.js — 履歴（Undo/Redo）・自動保存・モード/タブ制御
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= 履歴（元に戻す/やり直し） ================= */
let hist=[],hi=-1,histTimer=null,restoring=false;
function snapNow(){if(restoring)return;const str=JSON.stringify(store);if(hist[hi]===str)return;hist=hist.slice(0,hi+1);hist.push(str);if(hist.length>80)hist.shift();hi=hist.length-1;updUndoUI();}
function pushHistory(){if(restoring)return;clearTimeout(histTimer);histTimer=setTimeout(snapNow,350);}
function restoreFrom(str){restoring=true;try{store=JSON.parse(str);store.scenarios.forEach(migrateScenario);
  state=store.scenarios.find(x=>x.id===store.activeId)||store.scenarios[0];store.activeId=state.id;
  if(!state.floors.find(f=>f.id===state.activeFloorId))state.activeFloorId=state.floors[0].id;
  view.sel=null;render();}finally{restoring=false;}saveStore();updUndoUI();}
function undo(){clearTimeout(histTimer);snapNow();if(hi>0){hi--;restoreFrom(hist[hi]);}}
function redo(){if(hi<hist.length-1){hi++;restoreFrom(hist[hi]);}}
function updUndoUI(){const onPlan=view.tab==='plan';
  $('undoBtn').style.display=onPlan?'':'none';$('redoBtn').style.display=onPlan?'':'none';
  $('undoBtn').style.opacity=hi>0?1:.35;$('redoBtn').style.opacity=hi<hist.length-1?1:.35;}
function applyLockUI(){const b=$('lockBtn');if(b){b.textContent=view.locked?'👁 閲覧中':'✎ 編集中';
    b.classList.toggle('editing',!view.locked);b.classList.toggle('viewing',!!view.locked);}
  const bd=$('viewBadge');if(bd)bd.classList.toggle('show',!!view.locked);
  const fab=$('fabAdd');if(fab)fab.style.display=view.locked?'none':'';
  const da=$('deskAddBtn');if(da&&da.parentElement)da.parentElement.style.display=view.locked?'none':'';}
function toggleLock(){
  if(!view.locked){view._prevDraw=view.drawMode;view.drawMode=1;view.locked=1;view.sel=null;view.mode='move';view.resizeMode=0;view.vtx=0;}
  else{view.locked=0;if(view._prevDraw!=null)view.drawMode=view._prevDraw;}
  applyLockUI();render();}
$('lockBtn').onclick=toggleLock;
const MODES=[['move','✋ 移動'],['resize','⤢ 変形'],['nudge','✥ 微調']];
function setEditMode(m){view.mode=m;view.resizeMode=(m==='resize')?1:0;view.nudgePad=(m==='nudge')?1:0;render();}
function cycleMode(){const i=MODES.findIndex(x=>x[0]===(view.mode||'move'));setEditMode(MODES[(i+1)%MODES.length][0]);}
$('sbMode').onclick=cycleMode;
$('ndStep').onclick=cycleNudgeStep;
$('ndPos').onclick=cycleNudgePos;
$('ndUp').onclick=()=>stepShift(1);
$('ndDn').onclick=()=>stepShift(-1);
$('ndClose').onclick=()=>setEditMode('move');
/* ヘッダー：ドラッグで場所移動 / タップでモード切替 */
let padDrag=null;
$('ndMode').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();
  const pad=$('nudgePad'),host=pad.parentElement;
  const hr=host.getBoundingClientRect(),pr=pad.getBoundingClientRect();
  padDrag={sx:e.clientX,sy:e.clientY,ox:pr.left-hr.left+host.scrollLeft,oy:pr.top-hr.top+host.scrollTop,pw:pr.width,ph:pr.height,moved:0};
  try{e.target.setPointerCapture(e.pointerId);}catch(x){}});
$('ndMode').addEventListener('pointermove',e=>{if(!padDrag)return;
  const dx=e.clientX-padDrag.sx,dy=e.clientY-padDrag.sy;
  if(!padDrag.moved&&Math.abs(dx)+Math.abs(dy)<7)return;
  padDrag.moved=1;
  const host=$('nudgePad').parentElement;
  const maxX=Math.max(0,host.scrollWidth-padDrag.pw-4),maxY=Math.max(0,host.scrollHeight-padDrag.ph-4);
  view.nudgeXY={x:Math.max(0,Math.min(maxX,padDrag.ox+dx)),y:Math.max(0,Math.min(maxY,padDrag.oy+dy))};
  applyNudgeUI();});
['pointerup','pointercancel'].forEach(k=>$('ndMode').addEventListener(k,e=>{
  if(!padDrag)return;const mv=padDrag.moved;padDrag=null;
  if(!mv)setEditMode(view.mode==='resize'?'nudge':'resize');}));
$('nudgePad').querySelectorAll('button[data-nd]').forEach(b=>{const [sx,sy]=b.dataset.nd.split(',').map(Number);
  let t=null,rep=null;
  const go=()=>padAct(sx,sy);
  b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();go();
    t=setTimeout(()=>{rep=setInterval(go,90);},420);});
  const stop=()=>{clearTimeout(t);clearInterval(rep);rep=null;};
  ['pointerup','pointerleave','pointercancel'].forEach(k=>b.addEventListener(k,stop));});
$('sbMerge').onclick=startMerge;
$('sbPos').onclick=cycleSelbarPos;
$('undoBtn').onclick=undo;$('redoBtn').onclick=redo;
/* ================= 永続化（端末に自動保存） ================= */
const LSKEY='madoriStudioV8';
let canLS=false;try{localStorage.setItem('__t','1');localStorage.removeItem('__t');canLS=true;}catch(e){canLS=false;}
let saveTimer=null;
function saveStore(){if(!canLS){$('saveDot').className='savedot off';$('saveDot').title='この環境では自動保存できません。JSON保存をご利用ください';return;}
  clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(LSKEY,JSON.stringify(store));
    $('saveDot').className='savedot on';$('saveDot').title='端末に自動保存済み';}catch(e){$('saveDot').className='savedot off';$('saveDot').title='保存失敗: '+e.message;}},500);}
let freshFile=false;
function loadStore(){if(!canLS)return null;try{let raw=localStorage.getItem(LSKEY);if(!raw){raw=localStorage.getItem('madoriStudioV7');if(raw){try{localStorage.setItem(LSKEY,raw);}catch(e){}}}if(!raw){freshFile=true;return null;}const d=JSON.parse(raw);if(!d||!Array.isArray(d.scenarios)||!d.scenarios.length)return null;return d;}catch(e){return null;}}
/* ================= タブ・イベント ================= */
/* ---- モード制御 ---- */
const MODEINFO={invest:{label:'投資',hideTabs:[],hide:['own','ded','home'],full:1},hybrid:{label:'賃貸併用',hideTabs:[],hide:[],full:1},home:{label:'自宅',hideTabs:['loan_income','exit'],hide:['rental','invest'],full:0}};
function mode(){return store.mode||'hybrid';}
function tabAllowed(view){const m=mode();
  if(m==='home'){/* 自宅モード: 収益・出口・比較の一部を隠す。融資は残すが収益系非表示 */
    if(view==='exit')return false;}
  if(view==='exit'){const b=document.querySelector('#tabbar button[data-view="exit"]');const modes=(b&&b.dataset.modes||'').split(' ');return modes.includes(m);}
  return true;}
function applyMode(){const m=mode();
  document.querySelectorAll('#modebar button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  document.querySelectorAll('#tabbar button').forEach(b=>{const v=b.dataset.view;b.style.display=tabAllowed(v)?'':'none';});
  document.body.dataset.mode=m;
  if(!tabAllowed(view.tab))view.tab='plan';}
function setMode(m){const prev=store.mode;store.mode=m;
  /* モードに合致するテンプレ生成の提案 */
  const{B}=buildingAggSc(state);
  if(prev!==m){
    if(m==='invest'&&B.own>0&&B.rental===0){if(confirm('投資モードに切替えました。現在のシナリオは自宅のみです。\n全戸賃貸の投資物件テンプレで新規シナリオを作成しますか？\n（キャンセル＝現在の間取りのまま）')){const sc=makeScenarioMode('投資プラン'+(store.scenarios.length+1),'invest');store.scenarios.push(sc);store.activeId=sc.id;state=sc;view.sel=null;}}
    else if(m==='home'&&B.rental>0){if(confirm('自宅モードに切替えました。\n自宅のみ(2階建て)のテンプレで新規シナリオを作成しますか？\n（キャンセル＝現在の間取りのまま。賃貸部屋は自宅モードでは収益計算に反映されません）')){const sc=makeScenarioMode('自宅プラン'+(store.scenarios.length+1),'home');store.scenarios.push(sc);store.activeId=sc.id;state=sc;view.sel=null;}}
  }
  applyMode();
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view.tab));
  document.querySelectorAll('#tabbar button').forEach(b=>b.classList.toggle('active',b.dataset.view===view.tab));
  render();}
function switchTab(t){if(!tabAllowed(t))t='plan';view.tab=t;
  document.querySelectorAll('#tabbar button').forEach(b=>b.classList.toggle('active',b.dataset.view===t));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+t));
  render();updUndoUI();
  const bar=$('tabbar');const ab=bar.querySelector('button.active');if(ab)ab.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});}
document.querySelectorAll('#tabbar button').forEach(b=>b.onclick=()=>switchTab(b.dataset.view));
document.querySelectorAll('#modebar button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
$('scenSel').onchange=e=>{store.activeId=e.target.value;state=store.scenarios.find(s=>s.id===store.activeId);view.sel=null;render();};
$('menuBtn').onclick=()=>openSheet('menuSheet');
$('fabAdd').onclick=()=>openSheet('addSheet');
$('deskAddBtn').onclick=()=>openSheet('addSheet');
$('dispBtn').onclick=()=>openSheet('dispSheet');
$('addFloor').onclick=()=>{openSheet('floorSheet');};
$('zoomIn').onclick=()=>setZoom(view.pxPerM*1.2);
$('zoomOut').onclick=()=>setZoom(view.pxPerM/1.2);
$('zoomFit').onclick=()=>{const f=F();const s=Math.min((stage.clientWidth-100)/(f.footW+1.3),(stage.clientHeight-100)/(f.footH+1.3));setZoom(s);stage.scrollLeft=0;stage.scrollTop=0;};
$('sbRot').onclick=()=>{const o=selObj();if(o){rotate(o);render();}};

$('sbFlip').onclick=()=>{const o=selObj();if(o){flipObj(o);render();}};
$('sbDup').onclick=dupSel;
$('sbDel').onclick=delSel;
$('sbEdit').onclick=()=>openSheet('inspSheet');
document.addEventListener('keydown',e=>{const tag=document.activeElement.tagName;if(tag==='INPUT'||tag==='SELECT'||tag==='TEXTAREA')return;
  if(e.key==='e'||e.key==='E'){toggleLock();e.preventDefault();return;}
  if(view.locked&&['r','R','f','F','Delete','Backspace'].includes(e.key))return;
  if(!view.locked&&selObj()&&e.key.startsWith('Arrow')){
    const m={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];
    if(m){padAct(m[0],m[1]);e.preventDefault();return;}}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.shiftKey?redo():undo();e.preventDefault();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){redo();e.preventDefault();return;}
  if(e.key==='Escape'){closeSheet();view.sel=null;render();return;}
  const o=selObj();if(!o)return;const step=e.shiftKey?view.grid*2:view.grid,b=view.sel.type==='room'?bbox(o.poly):{x:o.x,y:o.y};
  if(e.key==='ArrowLeft'){moveTo(o,Math.max(0,snap(b.x-step)),b.y);render();e.preventDefault();}
  else if(e.key==='ArrowRight'){moveTo(o,snap(b.x+step),b.y);render();e.preventDefault();}
  else if(e.key==='ArrowUp'){moveTo(o,b.x,Math.max(0,snap(b.y-step)));render();e.preventDefault();}
  else if(e.key==='ArrowDown'){moveTo(o,b.x,snap(b.y+step));render();e.preventDefault();}
  else if(e.key==='Delete'||e.key==='Backspace'){delSel();e.preventDefault();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){dupSel();e.preventDefault();}
  else if(e.key.toLowerCase()==='r'){rotate(o);render();e.preventDefault();}
  else if(e.key.toLowerCase()==='f'){flipObj(o);render();e.preventDefault();}});
