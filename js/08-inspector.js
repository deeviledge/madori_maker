/* 08-inspector.js — インスペクタ・この階の内訳・建物ビュー
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ---------- インスペクタ ---------- */
function renderInspectorAll(){const o=selObj();
  $('inspectorEmptyD').style.display=o?'none':'block';
  buildInspector($('inspD'),o);
  if($('inspSheet').classList.contains('open'))buildInspector($('inspM'),o);}
function buildInspector(host,o){host.innerHTML='';if(!o)return;const isRoom=view.sel.type==='room';
  /* タブ：寸法・型 / 設定 */
  {const tb=el('div','insptabs');
   [['size','寸法・型'],['prop',isRoom?'設定（名前・用途・壁）':'設定（種別・算入）']].forEach(([k,lb])=>{
     const b=document.createElement('button');b.textContent=lb;
     if((view.inspTab||'size')===k)b.classList.add('on');
     b.onclick=()=>{view.inspTab=k;buildInspector(host,selObj());};tb.appendChild(b);});
   host.appendChild(tb);}
  if((view.inspTab||'size')==='size'){buildVarBody(host);return;}
  if(isRoom){host.appendChild(fText('名称',o.name,v=>{o.name=v;renderSheet();renderSelbar();}));
    host.appendChild(fSelect('用途区分',Object.keys(SPACE).map(k=>[k,k]),o.type,v=>{o.type=v;const sp=SPACE[v];o.flags=clone(sp.flags);o.sym=sp.sym;render();}));
    const fl=el('div','flags');FLAGDEF.forEach(([k,lb])=>{const l=document.createElement('label');const c=document.createElement('input');c.type='checkbox';c.checked=!!o.flags[k];c.onchange=()=>{o.flags[k]=c.checked?1:0;render();};l.appendChild(c);l.appendChild(document.createTextNode(lb));fl.appendChild(l);});
    host.appendChild(subttl('算入フラグ'));host.appendChild(fl);
    host.appendChild(fSelect('シンボル',ROOMSYM,o.sym||'',v=>{o.sym=v;render();}));
    const a=roomAreas(o,F());host.appendChild(subttl('面積（壁厚考慮）'));
    host.appendChild(readout('壁芯',areaStr(a.gross)));host.appendChild(readout('内法',areaStr(a.net)));host.appendChild(readout('施工(壁込)',areaStr(a.constr)));}
  else{host.appendChild(readout('種別',ELEM[o.kind]?.label||o.kind));
    if(ELEM[o.kind]?.opening&&o.kind==='door'){
      host.appendChild(subttl('開き勝手'));
      const hg=!!(o.props&&o.props.hinge),fp=!!o.flip;
      host.appendChild(readout('現在',(hg?'吊元：奇数側':'吊元：基準側')+' / '+(fp?'開き：反対側':'開き：基準側')));
      const gg=el('div','chips');
      [['左吊元・手前開き',0,0],['右吊元・手前開き',1,0],['左吊元・向こう開き',0,1],['右吊元・向こう開き',1,1]].forEach(([lb,hv,fv])=>{
        const b=document.createElement('button');b.textContent=lb;
        if(hg===!!hv&&fp===!!fv)b.classList.add('on');
        b.onclick=()=>{o.props=o.props||{};o.props.hinge=!!hv;o.flip=fv?1:0;render();};gg.appendChild(b);});
      host.appendChild(gg);
      host.appendChild(el('div','refnote','🚪 扉の太い線が扉、●が吊元（ヒンジ）、薄い扉型の塗りが開いたときに占有する範囲です。ここに家具を置くと干渉します。回転している場合は上下左右が入れ替わります。'));}
    if(ELEM[o.kind]?.stair){
      host.appendChild(subttl('上り下りの表示'));
      host.appendChild(fSelect('UP / DN',STAIRDIR,o.dir||'auto',v=>{o.dir=v;render();}));
      host.appendChild(readout('現在の表示',{up:'UP（上りのみ）',dn:'DN（下りのみ）',both:'UP＋DN（両方）'}[stairDirOf(o)]));
      host.appendChild(el('div','refnote','自動の場合、<b>最上階はDNのみ</b>、<b>1階はUPのみ</b>、<b>中間階はUP＋DN</b>を表示します。階を並べ替えると自動で切り替わります。'));}
    /* --- 面積計算への算入（部屋と同じフラグ） --- */
    host.appendChild(subttl('面積計算への算入'));
    const mode=o.areaMode||'none';
    host.appendChild(fSelect('算入方法',[['none','算入しない（既定）'],['add','加算する（＋）'],['sub','差し引く（−）']],mode,v=>{
      o.areaMode=v;
      if(v!=='none'&&!o.flags)o.flags=(v==='sub')?{own:0,rental:0,far:1,bcr:0,reg:1}:{own:0,rental:0,far:1,bcr:1,reg:1};
      render();}));
    if(mode!=='none'){
      const ea=Math.max(0,+o.w||0)*Math.max(0,+o.h||0);
      host.appendChild(readout('対象面積（W×D）',(mode==='sub'?'−':'＋')+f1(ea)+'㎡ / '+f1(ea/TATAMI)+'畳'));
      o.flags=o.flags||{own:0,rental:0,far:1,bcr:0,reg:1};
      const fl2=el('div','flags');FLAGDEF.forEach(([k,lb])=>{const l=document.createElement('label');const c=document.createElement('input');c.type='checkbox';c.checked=!!o.flags[k];c.onchange=()=>{o.flags[k]=c.checked?1:0;render();};l.appendChild(c);l.appendChild(document.createTextNode(lb));fl2.appendChild(l);});
      host.appendChild(fl2);
      host.appendChild(el('div','refnote','➕➖ チェックした区分にだけ W×D の面積を加減します。例：<b>吹抜</b>は「差し引く×容積対象・登記床」、<b>ポーチ・ピロティ</b>は「加算×建ぺい対象のみ」、<b>PS・納戸</b>は「加算×全部」など。壁芯の部屋面積（壊さない）に対する<b>後からの補正</b>として動きます。'));}}
  /* 参考サイズ・よくある寸法（設備） */
  if(!isRoom&&ELEM[o.kind]){const d=ELEM[o.kind];
    host.appendChild(readout('カテゴリ',(CATLABEL[d.cat]||d.cat)+(d.stair?'（階段）':'')));
    if(d.note)host.appendChild(el('div','refnote','📐 '+d.note));
    }
  const b=isRoom?bbox(o.poly):{x:o.x,y:o.y,w:o.w,h:o.h};
  host.appendChild(subttl('寸法・位置（左上基準 / ±0.1m）'));
  const r2=el('div','row2');r2.appendChild(fNum('幅 W (m)',b.w,.1,v=>{resizeTo(o,Math.max(.1,v||.1),b.h);render();}));r2.appendChild(fNum('奥行 D (m)',b.h,.1,v=>{resizeTo(o,b.w,Math.max(.1,v||.1));render();}));host.appendChild(r2);
  const r3=el('div','row2');r3.appendChild(fNum('X 左端 (m)',b.x,.1,v=>{moveTo(o,Math.max(0,v||0),b.y);render();}));r3.appendChild(fNum('Y 上端 (m)',b.y,.1,v=>{moveTo(o,b.x,Math.max(0,v||0));render();}));host.appendChild(r3);
  const act=el('div','miniact');act.appendChild(btn('回転',()=>{rotate(o);render();}));act.appendChild(btn('反転',()=>{flipObj(o);render();}));act.appendChild(btn('複製',dupSel));act.appendChild(btn('削除',delSel,'del'));host.appendChild(act);
  if(isRoom){
    /* 辺ごとの壁設定 */
    host.appendChild(subttl('壁（辺ごとの厚み・有無）'));
    host.appendChild(el('div','refnote','🧱 参考: 外壁 150〜210mm(木造・サイディング)/180〜250mm(付加断熱) ・ 内壁(間仕切) 90〜130mm ・ 界壁(賃貸間) 135〜200mm(遮音GW+PB二重張) ・ 水回り壁 105〜155mm'));
    o.wallE=o.wallE||{};
    const wt=document.createElement('table');wt.className='walltbl';wt.innerHTML='<tr><th>辺</th><th>位置</th><th>壁</th><th>厚み(mm)</th></tr>';
    const eds=edges(o.poly);
    eds.forEach(([pp,qq],i)=>{const cfg=o.wallE[i]||{};const ext=isExtEdge(pp,qq,F());
      const tr=document.createElement('tr');
      tr.appendChild(el('td','',String(i+1)));
      tr.appendChild(el('td','',ext?'外周':'内側'));
      const t1=document.createElement('td');const c1=document.createElement('input');c1.type='checkbox';c1.checked=cfg.on!==0;c1.onchange=()=>{o.wallE[i]=o.wallE[i]||{};o.wallE[i].on=c1.checked?1:0;render();};t1.appendChild(c1);tr.appendChild(t1);
      const t2=document.createElement('td');const sl=document.createElement('select');
      const defT=Math.round((ext?state.settings.wallOut:state.settings.wallIn)*1000);
      [['','既定 '+defT],['90','90 内壁(尺)'],['105','105 内壁(柱芯)'],['120','120 内壁+PB'],['135','135 界壁(遮音)'],['150','150 外壁(標準)'],['180','180 界壁/外壁厚'],['210','210 外壁(付加断熱)'],['250','250 高断熱']].forEach(([v2,t3])=>{const op=document.createElement('option');op.value=v2;op.textContent=t3;if(String(cfg.t??'')===v2)op.selected=true;sl.appendChild(op);});
      sl.onchange=()=>{o.wallE[i]=o.wallE[i]||{};o.wallE[i].t=sl.value===''?null:+sl.value;render();};
      t2.appendChild(sl);tr.appendChild(t2);wt.appendChild(tr);});
    host.appendChild(wt);
    host.appendChild(subttl('形状（多角形）'));
    const sh=el('div','miniact');sh.appendChild(btn('L字(左上欠き)',()=>{makeL(o,'nw');render();}));sh.appendChild(btn('L字(右上欠き)',()=>{makeL(o,'ne');render();}));host.appendChild(sh);
    const sh2=el('div','miniact');sh2.appendChild(btn('直交補正',()=>{orthogonalize(o);render();}));sh2.appendChild(btn('四角に戻す',()=>{const bb=bbox(o.poly);o.poly=rectPoly(bb.x,bb.y,bb.w,bb.h);render();}));sh2.appendChild(btn('頂点追加',()=>{addVertex(o);render();}));host.appendChild(sh2);
    host.appendChild(chk('頂点をドラッグ編集する',view.vtx,v=>{view.vtx=v;render();}));
    const vt=document.createElement('table');vt.className='cost';vt.innerHTML='<tr><th>#</th><th>X(m)</th><th>Y(m)</th><th></th></tr>';
    o.poly.forEach((v,i)=>{const tr=document.createElement('tr');tr.appendChild(el('td','',String(i+1)));
      const t1=document.createElement('td');const i1=document.createElement('input');i1.type='number';i1.step='0.05';i1.inputMode='decimal';i1.value=(Math.round(v[0]*100)/100);i1.onchange=e=>{o.poly[i][0]=Math.max(0,+e.target.value||0);render();};t1.appendChild(i1);tr.appendChild(t1);
      const t2=document.createElement('td');const i2=document.createElement('input');i2.type='number';i2.step='0.05';i2.inputMode='decimal';i2.value=(Math.round(v[1]*100)/100);i2.onchange=e=>{o.poly[i][1]=Math.max(0,+e.target.value||0);render();};t2.appendChild(i2);tr.appendChild(t2);
      const t3=document.createElement('td');if(o.poly.length>3){const rm=btn('×',()=>{o.poly.splice(i,1);render();},'del');rm.style.padding='2px 8px';rm.style.minHeight='30px';t3.appendChild(rm);}tr.appendChild(t3);
      vt.appendChild(tr);});
    host.appendChild(vt);}
  if(isStairObj(o)){const c=stairCalc(o);const codeOk=c.rise<=.23,comfy=c.rise<=.2,tOk=c.tread>=.21,tCode=c.tread>=.15;
    const d=el('div','calc',`<div class="rowc"><span>階高</span><span>${mm(state.settings.floorH)} mm</span></div><div class="rowc"><span>段数(蹴上)</span><span>${c.risers} 段</span></div><div class="rowc ${comfy?'okc':(codeOk?'':'warnc')}"><span>蹴上</span><span>${mm(c.rise)} mm ${comfy?'✓':(codeOk?'△':'✗')}</span></div><div class="rowc ${tOk?'okc':(tCode?'':'warnc')}"><span>踏面</span><span>${mm(c.tread)} mm ${tOk?'✓':(tCode?'△':'✗')}</span></div><div class="rowc"><span>有効幅</span><span>${mm(c.clearW)} mm</span></div>`);
    host.appendChild(subttl('階段 自動計算'));host.appendChild(d);}}
function makeL(o,corner){const b=bbox(o.poly),x0=b.x,y0=b.y,x1=b.x+b.w,y1=b.y+b.h,nw=b.w*.5,nh=b.h*.5;
  if(corner==='nw')o.poly=[[x0+nw,y0],[x1,y0],[x1,y1],[x0,y1],[x0,y0+nh],[x0+nw,y0+nh]];
  else o.poly=[[x0,y0],[x1-nw,y0],[x1-nw,y0+nh],[x1,y0+nh],[x1,y1],[x0,y1]];}
/* ---------- この階の内訳 ---------- */
function renderFloorSummary(){const box=$('floorSummaryD');if(!box)return;box.innerHTML='';const f=F(),t=floorTotals(f);const total=t.gross;
  const bar=el('div','kbar');Object.entries(t.by).forEach(([k,v])=>{if(v>0){const i=document.createElement('i');i.style.width=(total?v/total*100:0)+'%';i.style.background=SPACE[k].color;bar.appendChild(i);}});box.appendChild(bar);
  const leg=el('div','legend');Object.entries(t.by).forEach(([k,v])=>{if(v<=0)return;leg.appendChild(el('div','li',`<span class="dot" style="background:${SPACE[k].color}"></span>${k}<span class="amt">${f1(v)}㎡ / ${f1(v/TSUBO)}坪</span>`));});box.appendChild(leg);
  box.appendChild(el('div','grid2',`<span class="g-k">壁芯 床面積</span><span class="g-v">${fmt(t.gross,1)}㎡ / ${fmt(t.gross/TSUBO,1)}坪</span><span class="g-k">内法</span><span class="g-v">${fmt(t.net,1)}㎡</span><span class="g-k">施工(壁込)</span><span class="g-v">${fmt(t.constr,1)}㎡</span>`));
  box.appendChild(el('div','grid2',
    '<span class="g-k">容積対象</span><span class="g-v">'+f1(t.basis.far)+'㎡</span>'+
    '<span class="g-k">建ぺい対象</span><span class="g-v">'+f1(t.basis.bcr)+'㎡</span>'+
    '<span class="g-k">自宅専有 / 賃貸専有</span><span class="g-v">'+f1(t.basis.own)+' / '+f1(t.basis.rental)+'㎡</span>'+
    '<span class="g-k">登記床</span><span class="g-v">'+f1(t.basis.reg)+'㎡</span>'+
    '<span class="g-k">この階の建物枠</span><span class="g-v">'+f1(f.footW*f.footH)+'㎡</span>'+
    (t.elemAdjAny?'<span class="g-k">設備による調整</span><span class="g-v">'+FLAGDEF.filter(([k])=>Math.abs(t.elemAdj[k])>1e-6).map(([k,lb])=>lb+' '+(t.elemAdj[k]>0?'+':'')+f1(t.elemAdj[k])).join(' / ')+'㎡</span>':'')));
  /* 隣地離隔アラート（間取り作業中にも見える） */
  {const reg=landReg(state),ov=setbackOver(f,reg);
   if(ov.over){box.appendChild(el('div','ratio warn','<span>⚠ 隣地離隔 '+f1(reg.setback)+'m 未確保</span><span>上限 '+f1(reg.buildW)+'×'+f1(reg.buildD)+'m ／ 現在 '+f1(f.footW)+'×'+f1(f.footH)+'m</span>'));
    const fx=btn('⚡ ワンタップ補正する',()=>{fitAllFloorsToSetback(reg);});fx.classList.add('solid');box.appendChild(fx);}}}
/* ---------- 建物ビュー（断面スタック） ---------- */
function miniFloorSVG(f,W){const S=W/Math.max(f.footW,1);const H=f.footH*S;
  const svg=E('svg',{width:W,height:H,viewBox:`0 0 ${W} ${H}`});
  f.rooms.forEach(r=>{const col=SPACE[r.type]?.color||'#34506B';svg.appendChild(E('polygon',{points:r.poly.map(([x,y])=>`${x*S},${y*S}`).join(' '),fill:hexA(col,.35),stroke:col,'stroke-width':.8}));});
  svg.appendChild(E('rect',{x:0,y:0,width:f.footW*S,height:f.footH*S,fill:'none',stroke:'#2A3A49','stroke-width':1.5}));
  return svg;}
function renderBuildingView(){const box=$('buildingView');box.innerHTML='';
  box.appendChild(el('div','viewtitle','建物<small>階構成・面積・建物設定</small>'));
  /* 隣地離隔アラート（最上部） */
  {const reg=landReg(state);if(anyFloorOverSetback()){const al=el('div','card');
    al.appendChild(el('div','ratio warn','<span>⚠ 隣地離隔 '+f1(reg.setback)+'m を確保できていません</span><span>上限 '+f1(reg.buildW)+'×'+f1(reg.buildD)+'m</span>'));
    const fx=btn('⚡ ワンタップ補正：全フロアを上限内に収める',()=>{fitAllFloorsToSetback(reg);});fx.classList.add('solid');al.appendChild(fx);
    box.appendChild(al);}}
  const{B,by,gross,net,constr,bcrMax}=buildingAgg();const c=computeCost();
  const base=B.own+B.rental,ratio=base>0?B.own/base*100:0,ok=ratio>=50;
  /* 50%ゲージ */
  const g=el('div','card');g.appendChild(el('h3','','自宅専有率（50%ルール）<span class="tag">own ÷ (own+rental) 壁芯</span>'));
  const gd=el('div','gauge',`<div class="gtrack"><div class="gfill" style="width:${Math.min(100,ratio)}%"></div><div class="gmark"></div><div class="glabel">${f1(ratio)} %</div></div>`);
  g.appendChild(gd);
  g.appendChild(ratioBox('判定',ok?`✓ 50%以上（余裕 ${f1(ratio-50)}pt）`:`✗ 50%未満（不足 ${f1(50-ratio)}pt）`,ok?'ok':'ng'));
  g.appendChild(el('div','grid2',`<span class="g-k">自宅専有</span><span class="g-v">${fmt(B.own,1)}㎡ / ${f1(B.own/TSUBO)}坪</span><span class="g-k">賃貸</span><span class="g-v">${fmt(B.rental,1)}㎡ / ${f1(B.rental/TSUBO)}坪</span>`));
  box.appendChild(g);
  /* フロアスタック */
  const s=el('div','card');s.appendChild(el('h3','','建物 断面スタック<span class="tag">タップで編集へ</span>'));
  const stack=el('div','stack');
  state.floors.forEach(f=>{const t=floorTotals(f);const slab=el('div','slab');
    const th=el('div','thumb');th.appendChild(miniFloorSVG(f,86));slab.appendChild(th);
    const meta=el('div','meta');meta.appendChild(el('div','fn',f.name));
    meta.appendChild(el('div','fa',`${fmt(t.gross,1)}㎡ / ${f1(t.gross/TSUBO)}坪　自宅 ${f1(t.basis.own)}㎡・賃貸 ${f1(t.basis.rental)}㎡`));
    const fb=el('div','fbar');Object.entries(t.by).forEach(([k,v])=>{if(v>0){const i=document.createElement('i');i.style.width=(t.gross?v/t.gross*100:0)+'%';i.style.background=SPACE[k].color;fb.appendChild(i);}});
    meta.appendChild(fb);slab.appendChild(meta);slab.appendChild(el('div','go','›'));
    slab.onclick=()=>{state.activeFloorId=f.id;view.sel=null;switchTab('plan');};
    stack.appendChild(slab);});
  s.appendChild(stack);
  s.appendChild(el('div','hint','上から下へ最上階→1階。バーは用途別の面積構成。長押し（PCはダブルクリック）で階タブから名称変更できます。'));
  box.appendChild(s);
  /* 法規チェック */
  const lg=el('div','card');lg.appendChild(el('h3','','法規・面積チェック'));
  const L=state.land;
  const r2=el('div','row2');r2.appendChild(fNum('指定建ぺい率(%)',L.bcrLimit,5,v=>{L.bcrLimit=v||0;render();}));r2.appendChild(fNum('指定容積率(%)',L.farLimit,10,v=>{L.farLimit=v||0;render();}));lg.appendChild(r2);
  lg.appendChild(ratioBox(`建ぺい率 ${f1(c.bcrPct)}%`,c.bcrPct<=(L.bcrLimit||100)?`✓ ≤ ${L.bcrLimit}%`:`✗ > ${L.bcrLimit}%`,c.bcrPct<=(L.bcrLimit||100)?'ok':'ng'));
  lg.appendChild(ratioBox(`容積率 ${f1(c.farPct)}%`,c.farPct<=(L.farLimit||400)?`✓ ≤ ${L.farLimit}%`:`✗ > ${L.farLimit}%`,c.farPct<=(L.farLimit||400)?'ok':'ng'));
  lg.appendChild(el('div','grid2',`<span class="g-k">敷地面積</span><span class="g-v">${fmt(c.la,1)}㎡ / ${f1(c.lt)}坪</span><span class="g-k">建ぺい対象(最大階)</span><span class="g-v">${fmt(bcrMax,1)}㎡</span><span class="g-k">容積対象延床</span><span class="g-v">${fmt(B.far,1)}㎡</span><span class="g-k">登記床</span><span class="g-v">${fmt(B.reg,1)}㎡</span>`));
  box.appendChild(lg);
  /* 面積集計 */
  const a=el('div','card');a.appendChild(el('h3','','面積集計（全階・壁芯）'));
  const leg=el('div','legend');Object.entries(by).forEach(([k,v])=>{if(v<=0)return;leg.appendChild(el('div','li',`<span class="dot" style="background:${SPACE[k].color}"></span>${k}<span class="amt">${f1(v)}㎡ / ${f1(v/TSUBO)}坪</span>`));});a.appendChild(leg);
  a.appendChild(el('div','grid2',`<span class="g-k">壁芯 延床</span><span class="g-v">${fmt(gross,1)}㎡ / ${fmt(gross/TSUBO,1)}坪</span><span class="g-k">内法 合計</span><span class="g-v">${fmt(net,1)}㎡</span><span class="g-k">施工床(壁込)</span><span class="g-v">${fmt(constr,1)}㎡</span><span class="g-k">壁が占める面積</span><span class="g-v">${fmt(gross-net,1)}㎡</span>`));
  a.appendChild(el('div','refnote','※ 壁芯＝壁の中心線で囲んだ面積（登記・50％判定のベース）。内法＝壁の内側だけの実専有面積。間取り図では壁帯を実厚みで描画し、各部屋に両方を表示しています。'));
  box.appendChild(a);
  buildFrameAutoCard(box);
  buildFloorAreaTable(box);
  /* ↓ 間取りタブから移行した建物設定 */
  box.appendChild(el('div','viewtitle','建物設定<small>建物枠・壁厚・階高・隣地離隔</small>'));
  buildBuildingSettings(box);}
