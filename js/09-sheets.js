/* 09-sheets.js — ボトムシート・建物設定・枠の自動計算
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= シート（ボトムシート）管理 ================= */
const SHEETS=['addSheet','inspSheet','dispSheet','menuSheet','floorSheet','exportSheet','varSheet'];
function openSheet(id){SHEETS.forEach(s=>$(s).classList.toggle('open',s===id));$('backdrop').classList.add('show');
  if(id==='addSheet')buildAddSheet();
  if(id==='dispSheet')buildDispSheet();
  if(id==='menuSheet')buildMenuSheet();
  if(id==='exportSheet')buildExportSheet();
  if(id==='floorSheet')buildFloorSheet();
  if(id==='inspSheet')buildInspector($('inspM'),selObj());
  if(id==='varSheet')buildVarSheet();}
function closeSheet(){SHEETS.forEach(s=>$(s).classList.remove('open'));$('backdrop').classList.remove('show');}
$('backdrop').onclick=closeSheet;
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeSheet);
/* 追加パレット */
let addMode='room';
function buildAddSheet(){const box=$('addSheetBody');box.innerHTML='';
  const seg=el('div','segrow');
  const b1=document.createElement('button');b1.textContent='🏠 空間を追加（部屋・区画）';
  const b2=document.createElement('button');b2.textContent='🛋 設備・家具を追加';
  b1.className=addMode==='room'?'on':'';b2.className=addMode==='elem'?'on':'';
  b1.onclick=()=>{addMode='room';buildAddSheet();};b2.onclick=()=>{addMode='elem';buildAddSheet();};
  seg.appendChild(b1);seg.appendChild(b2);box.appendChild(seg);
  if(addMode==='room'){
    box.appendChild(el('div','hint','空間＝面積計算の対象になる「部屋・区画」。用途区分で自宅/賃貸/共用などの算入が決まります。'));
    box.appendChild(el('div','palcat','用途区分を選んで追加'));
    const rg=el('div','palgrid');
    Object.keys(SPACE).forEach(k=>{const b=document.createElement('button');
      b.innerHTML=`<span class="sw" style="background:${hexA(SPACE[k].color,.5)};border:1.5px solid ${SPACE[k].color}"></span>${k}`;
      b.onclick=()=>{addRoom(k);};rg.appendChild(b);});
    box.appendChild(rg);
  }else{
    box.appendChild(el('div','hint','設備・家具＝空間の上に置くシンボル。既定では面積計算に影響しませんが、「詳細」の<b>面積計算への算入</b>で加算/差引に変えられます。「詳細」ではカテゴリ別の<b>参考サイズ</b>も見られます。'));
    ELEMCATS.forEach(([cat,label])=>{
      const keys=Object.keys(ELEM).filter(k=>ELEM[k].cat===cat);if(!keys.length)return;
      box.appendChild(el('div','palcat',label));
      const g=el('div','palgrid');
      keys.forEach(k=>{const d=ELEM[k];const b=document.createElement('button');
        b.innerHTML=`${d.label}<small>${mm(d.w)}×${mm(d.h)}</small>`;
        b.onclick=()=>{addElem(k);};g.appendChild(b);});
      box.appendChild(g);});}}
function viewCenter(){const f=F();const S=view.pxPerM,off=1.3*.7*S;
  const cx=(stage.scrollLeft+stage.clientWidth/2-40-off)/S,cy=(stage.scrollTop+stage.clientHeight/2-40-off)/S;
  return[Math.max(.5,Math.min(f.footW-1,cx)),Math.max(.5,Math.min(f.footH-1,cy))];}
function addRoom(type){const f=F();const[cx,cy]=viewCenter();const w=type==='EV'?1.6:(type==='外階段'?1.8:3),h=type==='EV'?1.4:(type==='外階段'?1.4:3);
  const r=room(type==='自宅内部'?'新規部屋':type,type,snap(Math.max(0,cx-w/2)),snap(Math.max(0,cy-h/2)),w,h);
  f.rooms.push(r);view.sel={type:'room',id:r.id};closeSheet();switchTab('plan');render();}
function addElem(kind){const f=F();const[cx,cy]=viewCenter();const d=ELEM[kind];
  const e=elem(kind,snap(Math.max(0,cx-d.w/2)),snap(Math.max(0,cy-d.h/2)));
  f.elems.push(e);view.sel={type:'elem',id:e.id};closeSheet();switchTab('plan');render();}
/* 表示・共通設定 */
function buildDispSheet(){const box=$('dispSheetBody');box.innerHTML='';const st=state.settings,f=F();
  box.appendChild(el('div','palcat','表示'));
  const g=el('div','flags');
  [['snap','スナップ'],['showGrid','目盛'],['showLabels','名称'],['showDim','寸法線'],['showWall','壁'],['drawMode','設計図面'],['vtx','頂点編集']].forEach(([k,lb])=>{
    const l=document.createElement('label');const c=document.createElement('input');c.type='checkbox';c.checked=!!view[k];c.onchange=()=>{view[k]=c.checked?1:0;render();};l.appendChild(c);l.appendChild(document.createTextNode(lb));g.appendChild(l);});
  box.appendChild(g);
  box.appendChild(el('div','hint','<b>設計図面</b>をONにすると、通り芯（X1・Y1…）と符号・外側2段の寸法線（総寸法／通り芯間）・方位マーク・表題欄が付き、壁はソリッド塗り＋隅に柱、部屋名は名称＋畳数の書式になります。見た目だけで面積・法規・収支の数値は変わりません。柱は作図上の表現で、構造計算に基づくものではありません。'));
  box.appendChild(fSelect('グリッド',[['0.1','100 mm'],['0.2','200 mm'],['0.25','250 mm'],['0.455','455 mm (半々間)'],['0.5','500 mm'],['0.91','910 mm (半間)']],String(view.grid),v=>{view.grid=+v;render();}));
  box.appendChild(fSelect('パッドの大きさ',[['S','小'],['M','中'],['L','大']],view.padSize||'S',v=>{view.padSize=v;applyNudgeUI();}));
  box.appendChild(fSelect('微調整パッドの位置',NUDGE_POS.map(([v,l])=>[v,l]),view.nudgePos||'br',v=>{view.nudgePos=v;view.nudgeXY=null;applyNudgeUI();}));
  box.appendChild(fSelect('微調整の移動量',NUDGE_STEPS.map(v=>[String(v),(Math.round(v*10000)/10)+'mm']),String(view.nudgeStep!=null?view.nudgeStep:.05),v=>{view.nudgeStep=+v;applyNudgeUI();}));
  box.appendChild(fSelect('選択ツールバーの位置',SELBAR_POS.map(([v,l])=>[v,l]),view.selbarPos||'left',v=>{view.selbarPos=v;applySelbarPos();renderSelbar();}));
  box.appendChild(fSelect('壁の表示倍率（見た目のみ）',[['1','×1（実寸）'],['1.5','×1.5'],['2','×2（強調）'],['3','×3（しっかり強調）']],String(view.wallMag||1),v=>{view.wallMag=+v;render();}));
  box.appendChild(el('div','refnote','🧱 外壁＝<b style="color:#1F2E3C">濃紺</b> / 内壁＝<b style="color:#7C8D9C">グレー</b> で色分けしています。実寸だと 100mm壁は表示79%で約3pxしかないため、強調倍率で確認できます（<b>面積・寸法は常に実寸のまま</b>で、拡大しても数値は変わりません）。'));
  /* ↓ 建物設定本体は「建物タブ」へ移行。ここはショートカットのみ */
  box.appendChild(el('div','palcat','建物設定（建物タブに移行）'));
  {const reg=landReg(state);const ov=setbackOver(f,reg);
   box.appendChild(el('div','hint','建物枠（間口×奥行）・壁厚・階高は<b>建物タブ</b>にまとめました。<br>現在：建物枠 <b>'+f1(f.footW)+'×'+f1(f.footH)+'m</b>　外壁 '+mm(st.wallOut)+'mm / 内壁 '+mm(st.wallIn)+'mm　階高 '+mm(st.floorH)+'mm'));
   if(ov.over)box.appendChild(el('div','ratio warn','<span>隣地離隔 '+f1(reg.setback)+'m</span><span>⚠ 超過（上限 '+f1(reg.buildW)+'×'+f1(reg.buildD)+'m）</span>'));
   const go=btn('⚙ 建物タブで設定する ›',()=>{closeSheet();switchTab('building');});go.classList.add('solid');box.appendChild(go);}}
/* ================= 建物設定（建物タブ）・隣地離隔チェック ================= */
function setbackOver(f,reg){reg=reg||landReg(state);f=f||F();
  const dW=f.footW-reg.buildW,dD=f.footH-reg.buildD;
  return{reg,dW,dD,wOK:dW<=1e-6,dOK:dD<=1e-6,over:(dW>1e-6||dD>1e-6)};}
function anyFloorOverSetback(){const reg=landReg(state);
  return state.floors.some(fl=>fl.footW>reg.buildW+1e-6||fl.footH>reg.buildD+1e-6);}
function fitAllFloorsToSetback(reg){reg=reg||landReg(state);
  if(reg.buildW<1||reg.buildD<1){alert('離隔を引くと建物枠が小さすぎます。敷地サイズか離隔距離を見直してください。');return;}
  state.floors.forEach(fl=>{fl.footW=Math.min(fl.footW,reg.buildW);fl.footH=Math.min(fl.footH,reg.buildD);});
  render();}
/* ================= 枠の自動計算（法規MAX） ================= */
const FRAME_TARGETS=[['setback','離隔MAX'],['bcr','建ぺいMAX'],['far','容積MAX'],['legal','法規MAX（推奨）']];
/* 目標ごとの「1フロアの建物枠」を算出。
   枠は「これを埋め尽くしたときの上限」として扱う（部屋の充填率に依存させない→発散しない）。
   個別指定（manual）フロアの容積対象は実値を差し引いて、連動フロアで割り付ける。*/
function frameTargets(){const reg=landReg(state),la=landArea(state),L=state.land;
  const Wm=Math.max(0,reg.buildW),Dm=Math.max(0,reg.buildD),boxA=Wm*Dm;
  const bcrCap=la*(+L.bcrLimit||0)/100, farCap=la*(reg.effFar||0)/100;
  const auto=state.floors.filter(f=>(f.frameMode||'manual')==='auto');
  const manual=state.floors.filter(f=>(f.frameMode||'manual')!=='auto');
  /* 連動フロアがある場合だけ、個別フロアの実容積を控除して残りを連動フロアで割る。
     全部個別のときは「全階をこのサイズにしたら」の仮定で全階数で割る（控除なし）。*/
  const useAuto=auto.length>0;
  const manFar=useAuto?manual.reduce((a,f)=>a+floorTotals(f).basis.far,0):0;
  const n=Math.max(1,useAuto?auto.length:state.floors.length);
  const farPerFloor=Math.max(0,farCap-manFar)/n;
  const caps={setback:boxA,bcr:Math.min(boxA,bcrCap),far:Math.min(boxA,farPerFloor)};
  caps.legal=Math.min(caps.setback,caps.bcr,caps.far);
  const mk=A=>{const k=boxA>0?Math.min(1,Math.sqrt(Math.max(0,A)/boxA)):0;
    const W=Math.floor(Wm*k*200)/200,D=Math.floor(Dm*k*200)/200;return{W,D,area:W*D,cap:A};};
  const out={};Object.keys(caps).forEach(k=>out[k]=mk(caps[k]));
  out.bind=['setback','bcr','far'].reduce((b,k)=>caps[k]<caps[b]-1e-9?k:b,'setback');
  out.meta={Wm,Dm,boxA,bcrCap,farCap,manFar,autoN:auto.length,manualN:manual.length,farPerFloor,n};
  return out;}
/* 連動（auto）フロアの枠を目標値に追従させる。renderの先頭で呼ぶ */
function syncAutoFrames(){if(!state.floors.some(f=>(f.frameMode||'manual')==='auto'))return;
  const t=frameTargets(),tg=t[state.frameTarget||'legal'];if(!tg||tg.W<1||tg.D<1)return;
  state.floors.forEach(f=>{if((f.frameMode||'manual')==='auto'){f.footW=tg.W;f.footH=tg.D;}});}
/* 部屋・設備を枠の変化に合わせてスケール（設備は位置のみ、寸法は維持） */
function scaleFloorContents(f,sx,sy){if(!(sx>0)||!(sy>0))return;
  f.rooms.forEach(r=>{r.poly=r.poly.map(([x,y])=>[Math.round(x*sx*1000)/1000,Math.round(y*sy*1000)/1000]);});
  (f.elems||[]).forEach(e=>{e.x=Math.round(e.x*sx*1000)/1000;e.y=Math.round(e.y*sy*1000)/1000;});}
function applyFrameTarget(key,scaleRooms,onlyAuto){const t=frameTargets(),tg=t[key];
  if(!tg||tg.W<1||tg.D<1){alert('計算された枠が小さすぎます。敷地サイズ・離隔・建ぺい/容積の設定を確認してください。');return;}
  state.floors.forEach(f=>{if(onlyAuto&&(f.frameMode||'manual')!=='auto')return;
    const sx=tg.W/(f.footW||1),sy=tg.D/(f.footH||1);
    f.footW=tg.W;f.footH=tg.D;
    if(scaleRooms)scaleFloorContents(f,sx,sy);});
  render();}
function buildFrameAutoCard(box){const t=frameTargets(),m=t.meta,la=landArea(state),reg=landReg(state);
  const agg=buildingAgg(),bA=builtArea();
  const bcrCap=m.bcrCap,farCap=m.farCap;
  const card=el('div','card');
  card.appendChild(el('h3','','枠を法規MAXに合わせる<span class="tag">自動計算</span>'));
  /* 現在の余力 */
  card.appendChild(el('div','grid2',
    '<span class="g-k">建築面積</span><span class="g-v">'+f1(bA)+' / '+f1(bcrCap)+'㎡（残り <b>'+f1(Math.max(0,bcrCap-bA))+'㎡</b>）</span>'+
    '<span class="g-k">容積対象</span><span class="g-v">'+f1(agg.B.far)+' / '+f1(farCap)+'㎡（残り <b>'+f1(Math.max(0,farCap-agg.B.far))+'㎡</b>）</span>'+
    '<span class="g-k">離隔後の最大枠</span><span class="g-v">'+f1(m.Wm)+'×'+f1(m.Dm)+'m（'+f1(m.boxA)+'㎡）</span>'));
  /* 目標一覧 */
  const wrap=el('div','tblwrap'),tb=document.createElement('table');tb.className='cost';
  tb.innerHTML='<tr><th>目標</th><th>間口×奥行</th><th>枠面積</th><th>根拠</th></tr>';
  const why={setback:'隣地離隔 '+f1(reg.setback)+'m×2',bcr:'建ぺい '+f0(state.land.bcrLimit)+'% → '+f1(bcrCap)+'㎡',
    far:'容積 '+f0(reg.effFar)+'% → '+f1(farCap)+'㎡ ÷ '+m.n+'階'+(m.manFar>0?'（個別階 '+f1(m.manFar)+'㎡を控除）':''),
    legal:'上記のうち最も厳しい制約：'+({setback:'離隔',bcr:'建ぺい',far:'容積'}[t.bind])};
  FRAME_TARGETS.forEach(([k,lb])=>{const g=t[k];
    tr_append(tb,[lb,f1(g.W)+'×'+f1(g.D),f1(g.area),why[k]]);});
  wrap.appendChild(tb);card.appendChild(wrap);
  /* 目標選択＋適用 */
  card.appendChild(subttl('適用'));
  card.appendChild(fSelect('連動先の目標',FRAME_TARGETS.map(([v,l])=>[v,l]),state.frameTarget||'legal',v=>{state.frameTarget=v;render();}));
  const sc=!!state.scaleRoomsWithFrame;
  const tg=btn((sc?'☑':'☐')+' 部屋・設備も一緒に拡大縮小する',()=>{state.scaleRoomsWithFrame=!sc;render();});card.appendChild(tg);
  const cur=t[state.frameTarget||'legal'];
  const b1=btn('▸ 全フロアを '+f1(cur.W)+'×'+f1(cur.D)+'m にする',()=>{applyFrameTarget(state.frameTarget||'legal',!!state.scaleRoomsWithFrame,false);});b1.classList.add('solid');card.appendChild(b1);
  if(m.autoN>0)card.appendChild(btn('▸ 連動フロアのみ適用（'+m.autoN+'階）',()=>{applyFrameTarget(state.frameTarget||'legal',!!state.scaleRoomsWithFrame,true);}));
  /* フロアごとの紐づけ */
  card.appendChild(subttl('フロアごとの枠の決め方'));
  card.appendChild(el('div','hint','<b>連動</b>：上の目標値に常に追従（土地・建ぺい・容積を変えると自動で追従）。<b>個別</b>：この階だけ自分でW×Dを指定し、自動計算の影響を受けない。'));
  const w2=el('div','tblwrap'),t2=document.createElement('table');t2.className='cost';
  t2.innerHTML='<tr><th>階</th><th>モード</th><th>間口×奥行</th><th>枠面積</th><th>容積対象</th></tr>';
  state.floors.forEach(fl=>{const mode=(fl.frameMode||'manual')==='auto';const tt=floorTotals(fl);
    const tr=document.createElement('tr');
    const td0=document.createElement('td');td0.textContent=fl.name+(fl.id===state.activeFloorId?' ●':'');td0.style.textAlign='left';
    const td1=document.createElement('td');
    const bt=btn(mode?'🔗 連動':'✎ 個別',()=>{fl.frameMode=mode?'manual':'auto';render();});
    bt.style.cssText='min-height:28px;padding:2px 8px;font-size:11px;margin:0';if(mode)bt.classList.add('pri');
    td1.appendChild(bt);
    const td2=document.createElement('td');
    if(mode){td2.textContent=f1(fl.footW)+'×'+f1(fl.footH);td2.style.opacity='.55';}
    else{const box2=document.createElement('div');box2.style.cssText='display:flex;gap:3px;align-items:center;justify-content:center';
      const mk=(val,set)=>{const i=document.createElement('input');i.type='number';i.step='0.455';i.inputMode='decimal';i.value=f1(val);
        i.style.cssText='width:52px;min-width:0;padding:4px 3px;text-align:center;font-size:11px';
        i.onchange=e=>{set(Math.max(1,+e.target.value||1));render();};return i;};
      box2.appendChild(mk(fl.footW,v=>fl.footW=v));
      const x=document.createElement('span');x.textContent='×';x.style.cssText='font-size:10px;opacity:.6';box2.appendChild(x);
      box2.appendChild(mk(fl.footH,v=>fl.footH=v));
      td2.appendChild(box2);}
    const td3=document.createElement('td');td3.textContent=f1(fl.footW*fl.footH);
    const td4=document.createElement('td');td4.textContent=f1(tt.basis.far);
    [td0,td1,td2,td3,td4].forEach(x=>tr.appendChild(x));t2.appendChild(tr);});
  w2.appendChild(t2);card.appendChild(w2);
  card.appendChild(el('div','refnote','※ 枠は「ここまで埋めてよい」という上限値として計算しています（枠を埋め尽くした場合に建ぺい・容積をちょうど使い切る寸法）。実際の建築面積・容積対象は配置した部屋で決まるため、上の「残り」を見ながら部屋を埋めてください。縦横比は離隔後の敷地形状の比率を維持し、面積が最大になるよう相似縮小しています。'));
  box.appendChild(card);}
function buildFloorAreaTable(box){const la=landArea(state),c=landReg(state),L=state.land;
  const card=el('div','card');
  card.appendChild(el('h3','','各フロアの面積内訳<span class="tag">壁芯ベース</span>'));
  card.appendChild(el('div','hint','建物枠＝真上から見た外形。床面積＝実際に配置した部屋の壁芯合計。各列は部屋ごとのフラグ（容積対象・建ぺい対象・自宅専有・賃貸・登記床）の集計です。'));
  const wrap=el('div','tblwrap');const tb=document.createElement('table');tb.className='cost';
  tb.innerHTML='<tr><th>階</th><th>建物枠</th><th>床面積<br>(壁芯)</th><th>容積対象</th><th>建ぺい対象</th><th>自宅専有</th><th>賃貸専有</th><th>登記床</th><th>内法</th></tr>';
  const T={frame:0,gross:0,far:0,bcr:0,own:0,rental:0,reg:0,net:0};let bcrMax=0;
  state.floors.forEach(fl=>{const t=floorTotals(fl),fr=fl.footW*fl.footH;
    T.frame+=fr;T.gross+=t.gross;T.far+=t.basis.far;T.bcr+=t.basis.bcr;T.own+=t.basis.own;T.rental+=t.basis.rental;T.reg+=t.basis.reg;T.net+=t.net;
    bcrMax=Math.max(bcrMax,t.basis.bcr);
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+esc(fl.name)+(fl.id===state.activeFloorId?' ●':'')+'</td><td>'+f1(fr)+'</td><td>'+f1(t.gross)+'</td><td>'+f1(t.basis.far)+'</td><td>'+f1(t.basis.bcr)+'</td><td>'+f1(t.basis.own)+'</td><td>'+f1(t.basis.rental)+'</td><td>'+f1(t.basis.reg)+'</td><td>'+f1(t.net)+'</td>';
    tb.appendChild(tr);});
  const ts=document.createElement('tr');ts.className='sumrow';
  ts.innerHTML='<td>合計</td><td>'+f1(T.frame)+'</td><td>'+f1(T.gross)+'</td><td>'+f1(T.far)+'</td><td>'+f1(T.bcr)+'</td><td>'+f1(T.own)+'</td><td>'+f1(T.rental)+'</td><td>'+f1(T.reg)+'</td><td>'+f1(T.net)+'</td>';
  tb.appendChild(ts);wrap.appendChild(tb);card.appendChild(wrap);
  {const adjF=state.floors.filter(fl=>floorTotals(fl).elemAdjAny);
   if(adjF.length)card.appendChild(el('div','refnote','➕➖ 設備による面積調整あり：'+adjF.map(fl=>{const t=floorTotals(fl);return esc(fl.name)+'（'+FLAGDEF.filter(([k])=>Math.abs(t.elemAdj[k])>1e-6).map(([k,lb])=>lb+(t.elemAdj[k]>0?'+':'')+f1(t.elemAdj[k])).join('、')+'）';}).join(' / ')+'。上の各列には反映済みです。'));}
  card.appendChild(el('div','refnote','単位はすべて㎡。建ぺい率は「合計」ではなく<b>最大の階</b>で判定します（下記）。'));
  /* --- 判定 --- */
  const builtA=builtArea();                         /* 建築面積（法定） */
  const farPct=la>0?T.far/la*100:0,bcrPct=la>0?builtA/la*100:0;
  const effFar=c.effFar,farCap=la*effFar/100,bcrCap=la*(+L.bcrLimit||0)/100;
  card.appendChild(subttl('判定'));
  card.appendChild(el('div','grid2',
    '<span class="g-k">敷地面積</span><span class="g-v">'+f1(la)+'㎡ / '+f1(la/TSUBO)+'坦</span>'+
    '<span class="g-k">容積対象面積 合計</span><span class="g-v">'+f1(T.far)+'㎡（上限 '+f1(farCap)+'㎡）</span>'+
    '<span class="g-k">建築面積（全階の投影）</span><span class="g-v"><b>'+f1(builtA)+'㎡</b>（上限 '+f1(bcrCap)+'㎡）</span>'+
    '<span class="g-k">うち最大の階単体</span><span class="g-v">'+f1(bcrMax)+'㎡</span>'+
    '<span class="g-k">自宅比率（登記床ベース）</span><span class="g-v">'+(T.reg>0?f1(T.own/T.reg*100):'0.0')+'%</span>'));
  card.appendChild(ratioBox('容積率 '+f1(farPct)+'%',farPct<=effFar?'✓ ≤ '+f0(effFar)+'%'+(c.roadLimited?'（道路幅員で'+f0(effFar)+'%に縮小）':''):'✗ > '+f0(effFar)+'%（'+f1(T.far-farCap)+'㎡超過）',farPct<=effFar?'ok':'ng'));
  card.appendChild(ratioBox('建ぺい率 '+f1(bcrPct)+'%',bcrPct<=(+L.bcrLimit||100)?'✓ ≤ '+(L.bcrLimit||0)+'%':'✗ > '+(L.bcrLimit||0)+'%（'+f1(builtA-bcrCap)+'㎡超過）',bcrPct<=(+L.bcrLimit||100)?'ok':'ng'));
  card.appendChild(el('div','refnote','建ぺい率の分子は<b>建築面積</b>（建物を真上から見た投影面積、外壁の<b>中心線</b>囲み）。作図用の「建物枠」ではなく、建ぺい対象フラグの部屋を全階重ねた和集合で算出しています（上階が張り出す場合も拾えます）。'));
  card.appendChild(el('div','refnote','共用廄下・EV・外階段・ベランダは初期設定で容積不算入にしてあります。実際の不算入可否は形状・開放性・自治体運用で変わるため、部屋ごとのフラグ（インスペクタの「面積フラグ」）で個別に変更できます。'));
  box.appendChild(card);}
function buildBuildingSettings(box){const st=state.settings,f=F();const reg=landReg(state);const ov=setbackOver(f,reg);
  const la=landArea(state);
  const frame=f.footW*f.footH;                                   /* 表示中の階の建物枠面積（上から見た外形） */
  const maxFrame=state.floors.reduce((m,fl)=>Math.max(m,fl.footW*fl.footH),0); /* 建築面積＝最大階の外形 */
  const ft=floorTotals(f);                                       /* この階に実際に配置されている壁芯床 */
  const bcr=la>0?maxFrame/la*100:0,bcrLim=+state.land.bcrLimit||100;
  /* ===== 建物枠：間口・奥行・面積・離隔を1つのカードに集約 ===== */
  const cf=el('div','card');
  cf.appendChild(el('h3','','建物枠（表示中：'+esc(f.name)+'）<span class="tag">上から見た外形／各階ごと</span>'));
  cf.appendChild(el('div','hint','これは<b>建物の外形サイズ（壁芯）</b>で、敷地（土地）の大きさとは別物です。下の面積は<b>延床ではなく、この階を真上から見た面積</b>です。'));
  const r2=el('div','row2');
  r2.appendChild(fNum('建物 間口 W(m)',f.footW,.455,v=>{f.footW=Math.max(1,v||1);render();}));
  r2.appendChild(fNum('建物 奥行 D(m)',f.footH,.455,v=>{f.footH=Math.max(1,v||1);render();}));
  cf.appendChild(r2);
  /* --- 入力直下に面積を即表示 --- */
  cf.appendChild(el('div','ratio ok','<span>建物枠の面積（W×D）</span><span><b>'+f1(frame)+'㎡</b> / '+f1(frame/TSUBO)+'坪</span>'));
  cf.appendChild(el('div','grid2',
    '<span class="g-k">この階に配置済み（壁芯床）</span><span class="g-v">'+f1(ft.gross)+'㎡ / '+f1(ft.gross/TSUBO)+'坪</span>'+
    '<span class="g-k">枠に対する充填率</span><span class="g-v">'+(frame>0?f1(ft.gross/frame*100):'0.0')+'%（残り '+f1(Math.max(0,frame-ft.gross))+'㎡）</span>'+
    '<span class="g-k">建築面積（最大階の外形）</span><span class="g-v">'+f1(maxFrame)+'㎡ / '+f1(maxFrame/TSUBO)+'坪</span>'+
    '<span class="g-k">敷地面積</span><span class="g-v">'+f1(la)+'㎡ / '+f1(la/TSUBO)+'坪</span>'));
  const bA=builtArea(),bcrReal=la>0?bA/la*100:0;
  cf.appendChild(ratioBox('建ぺい率（建築面積 '+f1(bA)+'㎡） '+f1(bcrReal)+'%',bcrReal<=bcrLim?'✓ ≤ '+bcrLim+'%':'✗ > '+bcrLim+'%（'+f1(la*bcrLim/100)+'㎡まで）',bcrReal<=bcrLim?'ok':'ng'));
  cf.appendChild(el('div','refnote','※ 上の「建物枠」は<b>作図の外形（入れ物の箱）</b>で、法規上の建築面積ではありません。建ぺい率の分子は<b>建ぺい対象の部屋を全階重ねた水平投影面積</b>です。枠を広げても部屋を置かなければ建ぺい率は上がりません。'));
  /* --- 隣地離隔チェック（同じカード内） --- */
  cf.appendChild(subttl('隣地離隔チェック（片側 '+f1(reg.setback)+'m ／ 民法234条=50cm）'));
  cf.appendChild(el('div','grid2',
    '<span class="g-k">敷地の外形</span><span class="g-v">'+f1(reg.landW)+'×'+f1(reg.landD)+'m</span>'+
    '<span class="g-k">離隔（両側差引）</span><span class="g-v">−'+f1(reg.setback)+'m × 2</span>'+
    '<span class="g-k">建物枠の上限</span><span class="g-v"><b>'+f1(reg.buildW)+'×'+f1(reg.buildD)+'m</b>（'+f1(reg.buildFootprint)+'㎡）</span>'+
    '<span class="g-k">現在の建物枠</span><span class="g-v">'+f1(f.footW)+'×'+f1(f.footH)+'m（'+f1(frame)+'㎡）</span>'));
  cf.appendChild(ratioBox('判定',ov.over?('⚠ '+(!ov.wOK?'間口が '+f1(ov.dW)+'m 超過':'')+(!ov.wOK&&!ov.dOK?' / ':'')+(!ov.dOK?'奥行が '+f1(ov.dD)+'m 超過':'')):'✓ 両側 '+f1(reg.setback)+'m を確保できています',ov.over?'warn':'ok'));
  if(ov.over||anyFloorOverSetback()){const fx=btn('⚡ ワンタップ補正：全フロアを '+f1(reg.buildW)+'×'+f1(reg.buildD)+'m 以内に収める',()=>{fitAllFloorsToSetback(reg);});fx.classList.add('solid');cf.appendChild(fx);}
  if(reg.setback<0.5)cf.appendChild(btn('離隔を 0.5m（50cm）に設定する',()=>{state.land.setback=0.5;render();}));
  /* --- 一括操作 --- */
  cf.appendChild(subttl('一括操作'));
  cf.appendChild(btn('この枠を全フロアに適用（'+f1(f.footW)+'×'+f1(f.footH)+'m ＝ '+f1(frame)+'㎡）',()=>{const W=f.footW,H=f.footH;state.floors.forEach(fl=>{fl.footW=W;fl.footH=H;});render();}));
  cf.appendChild(btn('▸ 土地いっぱい（離隔確保）に合わせる：全フロア '+f1(reg.buildW)+'×'+f1(reg.buildD)+'m ＝ '+f1(reg.buildFootprint)+'㎡',()=>{if(reg.buildW<1||reg.buildD<1){alert('離隔を引くと建物枠が小さすぎます。');return;}state.floors.forEach(fl=>{fl.footW=reg.buildW;fl.footH=reg.buildD;});render();}));
  cf.appendChild(el('div','refnote','🏘 隣地境界からは原則<b>50cm以上</b>（民法234条）。左右両側分を敷地の間口・奥行から引いて建物枠の上限を算出しています。離隔距離自体の変更は土地タブで。'));
  box.appendChild(cf);
  /* ===== 各階の建物枠 面積一覧 ===== */
  const cl=el('div','card');cl.appendChild(el('h3','','各階の建物枠 面積<span class="tag">上から見た外形</span>'));
  const tb=document.createElement('table');tb.className='cost';
  tb.innerHTML='<tr><th>階</th><th>間口×奥行</th><th>枠面積(㎡)</th><th>坪</th><th>配置済(㎡)</th></tr>';
  let sumFrame=0;
  state.floors.forEach(fl=>{const a=fl.footW*fl.footH;sumFrame+=a;const t2=floorTotals(fl);
    const tr=document.createElement('tr');
    tr.innerHTML='<td>'+esc(fl.name)+(fl.id===state.activeFloorId?' ●':'')+'</td><td>'+f1(fl.footW)+'×'+f1(fl.footH)+'</td><td>'+f1(a)+'</td><td>'+f1(a/TSUBO)+'</td><td>'+f1(t2.gross)+'</td>';
    tb.appendChild(tr);});
  const trs=document.createElement('tr');trs.innerHTML='<td><b>合計</b></td><td></td><td><b>'+f1(sumFrame)+'</b></td><td><b>'+f1(sumFrame/TSUBO)+'</b></td><td></td>';tb.appendChild(trs);
  cl.appendChild(tb);
  cl.appendChild(el('div','refnote','※ 「枠面積」は各階を真上から見た外形の面積。合計は枠ベースの延床上限であって、実際の延床（壁芯床）は「配置済」の合計です。'));
  box.appendChild(cl);
  /* ===== 壁厚・階高 ===== */
  const cc=el('div','card');cc.appendChild(el('h3','','共通設定（壁厚・階高）<span class="tag">全階共通</span>'));
  const r3=el('div','row2');r3.appendChild(fNum('外壁厚(mm)',mm(st.wallOut),10,v=>{st.wallOut=(v||0)/1000;render();}));r3.appendChild(fNum('内壁厚(mm)',mm(st.wallIn),10,v=>{st.wallIn=(v||0)/1000;render();}));cc.appendChild(r3);
  const r4=el('div','row2');r4.appendChild(fNum('階高(mm)',mm(st.floorH),10,v=>{st.floorH=Math.max(2,(v||2900)/1000);render();}));r4.appendChild(fNum('目標蹴上(mm)',mm(st.rise),5,v=>{st.rise=Math.max(.12,(v||190)/1000);render();}));cc.appendChild(r4);
  cc.appendChild(el('div','refnote','🧱 部屋は<b>壁芯（壁の中心線）</b>で作図し、壁はその線を中心に実厚みで描画されます。図上で見えている開口部＝<b>内法</b>、壁帯の中心まで＝<b>壁芯</b>です（各部屋に両方表示）。面積集計・50％判定は壁芯ベースのままです。'));
  box.appendChild(cc);}
