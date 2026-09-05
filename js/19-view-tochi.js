/* 19-view-tochi.js — 土地ビュー
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= 土地ビュー ================= */
function segField2(label,val,opts,on){const f=el('div','field',`<label>${label}</label>`);
  const seg=el('div','segrow');seg.style.marginBottom='0';
  opts.forEach(o=>{const b=document.createElement('button');b.textContent=o;b.className=(val===o?'on':'');b.onclick=()=>on(o);seg.appendChild(b);});
  f.appendChild(seg);return f;}
function renderTochiView(){const box=$('tochiView');box.innerHTML='';const L=state.land;
  box.appendChild(el('div','viewtitle','土地<small>敷地の法規制と単価・建築可否</small>'));
  const reg=landReg(state),ev=landEval(state);
  /* 判定バナー */
  const vt=ev.level==='ng'?'⛔ 建築不可の可能性':(ev.level==='warn'?'⚠ 要注意':'✅ 建築可');
  const vcls=ev.level==='ng'?'ng':(ev.level==='warn'?'warn':'ok');
  const banner=el('div','ratio '+vcls);banner.style.cssText='display:block;padding:12px 13px';
  let bh='<b style="font-size:13px">'+vt+'</b>';
  if(ev.ng.length)bh+='<div style="margin-top:6px;font-size:11px;line-height:1.6">'+ev.ng.map(x=>'⛔ '+x).join('<br>')+'</div>';
  if(ev.warn.length)bh+='<div style="margin-top:6px;font-size:11px;line-height:1.6">'+ev.warn.map(x=>'⚠ '+x).join('<br>')+'</div>';
  if(!ev.ng.length&&!ev.warn.length)bh+='<div style="margin-top:4px;font-size:11px">明らかな法的障害は検出されませんでした（簡易判定）。</div>';
  banner.innerHTML=bh;box.appendChild(banner);
  /* 単価バッジ */
  const price=+L.priceManual!=null&&L.priceManual!==''&&L.priceManual!=null?+L.priceManual:computeCost().landPrice;
  const landPerT=reg.areaT>0?price/reg.areaT:0;
  const areaTankaT=reg.maxFloorT>0?price/reg.maxFloorT:0;
  const bd=el('div','badges');
  bd.appendChild(el('div','badge','<div class="bk">土地坪単価</div><div class="bv">'+f1(landPerT)+'<span style="font-size:9px"> 万/坪</span></div>'));
  bd.appendChild(el('div','badge','<div class="bk">建築面積単価</div><div class="bv">'+f1(areaTankaT)+'<span style="font-size:9px"> 万/延床坪</span></div>'));
  bd.appendChild(el('div','badge '+(reg.maxFloor>=260?'ok':'ng'),'<div class="bk">建築可能延床</div><div class="bv">'+f0(reg.maxFloor)+'<span style="font-size:9px"> ㎡</span></div>'));
  bd.appendChild(el('div','badge','<div class="bk">上限の決定要因</div><div class="bv" style="font-size:12px">'+reg.bind+'</div>'));
  box.appendChild(bd);
  /* 敷地・費用 */
  const c1=el('div','card');c1.appendChild(el('h3','','敷地・費用'));
  c1.appendChild(fSelect('敷地の形状',[['rect','整形地（間口×奥行）'],['poly','不整形地（座標求積）']],L.mode||'rect',v=>{L.mode=v;if(v==='poly'&&(!L.poly||L.poly.length<3))L.poly=[[0,0],[+L.W||9,0],[+L.W||9,+L.D||11],[0,+L.D||11]];render();}));
  if((L.mode||'rect')==='rect'){const g=el('div','row2');
    g.appendChild(fNum('敷地 間口 W(m)',L.W,.1,v=>{L.W=Math.max(0,v||0);L.areaManual=null;render();}));
    g.appendChild(fNum('敷地 奥行 D(m)',L.D,.1,v=>{L.D=Math.max(0,v||0);L.areaManual=null;render();}));c1.appendChild(g);
  }else{
    /* 不整形地：座標求積の入力（この土地タブで直接入力） */
    c1.appendChild(el('div','refnote','📐 座標求積法：敷地の各頂点座標(m)を時計回りに入力すると面積を自動計算します（測量図の座標を転記）。旗竿地・台形・多角形に対応。'));
    if(!L.poly||L.poly.length<3)L.poly=[[0,0],[+L.W||9,0],[+L.W||9,+L.D||11],[0,+L.D||11]];
    const pt=document.createElement('table');pt.className='cost';pt.innerHTML='<tr><th>#</th><th>X(m)</th><th>Y(m)</th><th></th></tr>';
    L.poly.forEach((v,i)=>{const tr=document.createElement('tr');tr.appendChild(el('td','',String(i+1)));
      [0,1].forEach(k=>{const td=document.createElement('td');const inp=document.createElement('input');inp.type='number';inp.step='0.1';inp.inputMode='decimal';inp.value=Math.round(v[k]*100)/100;inp.onchange=e=>{L.poly[i][k]=+e.target.value||0;render();};td.appendChild(inp);tr.appendChild(td);});
      const td=document.createElement('td');if(L.poly.length>3){const rm=btn('×',()=>{L.poly.splice(i,1);render();},'del');rm.style.cssText='padding:2px 8px;min-height:30px';td.appendChild(rm);}tr.appendChild(td);pt.appendChild(tr);});
    c1.appendChild(pt);
    c1.appendChild(btn('＋ 頂点を追加',()=>{const pv=L.poly[L.poly.length-1]||[0,0];L.poly.push([pv[0]+2,pv[1]]);render();}));
    /* 形状プレビュー */
    const bb=L.poly.reduce((a,pnt)=>({x0:Math.min(a.x0,pnt[0]),y0:Math.min(a.y0,pnt[1]),x1:Math.max(a.x1,pnt[0]),y1:Math.max(a.y1,pnt[1])}),{x0:1e9,y0:1e9,x1:-1e9,y1:-1e9});
    const sc2=Math.min(220/Math.max(.1,bb.x1-bb.x0),140/Math.max(.1,bb.y1-bb.y0));
    const svg='<svg width="240" height="156" style="background:#fff;border:1px solid var(--line);border-radius:8px"><polygon points="'+L.poly.map(pnt=>((pnt[0]-bb.x0)*sc2+10)+','+((pnt[1]-bb.y0)*sc2+8)).join(' ')+'" fill="rgba(52,80,107,.12)" stroke="#34506B" stroke-width="1.5"/></svg>';
    const pv2=el('div','');pv2.style.marginTop='6px';pv2.innerHTML=svg;c1.appendChild(pv2);
  }
  c1.appendChild(fNum('敷地面積を直接入力(㎡)',L.areaManual!=null?L.areaManual:'',1,v=>{L.areaManual=(v&&v>0)?v:null;render();},'自動 '+f1(reg.area)));
  c1.appendChild(fNum('土地総額(万円)',L.priceManual!=null?L.priceManual:'',50,v=>{L.priceManual=v;render();},'コストタブ連動 '+f0(computeCost().landPrice)));
  c1.appendChild(readout('敷地面積',f1(reg.area)+'㎡ / '+f1(reg.areaT)+'坪'));
  box.appendChild(c1);
  /* 法規制 */
  const c2=el('div','card');c2.appendChild(el('h3','','法規制・敷地条件'));
  c2.appendChild(fSelect('用途地域',YOUTO.map(y=>[y.v,y.label]),L.youto,v=>{L.youto=v;render();}));
  const g2=el('div','row2');
  g2.appendChild(fNum('指定容積率(%)',L.farLimit,10,v=>{L.farLimit=Math.max(0,v||0);render();}));
  g2.appendChild(fNum('建ぺい率(%)',L.bcrLimit,10,v=>{L.bcrLimit=Math.max(0,v||0);render();}));c2.appendChild(g2);
  const g3=el('div','row2');
  g3.appendChild(fNum('前面道路幅員(m)',L.road,.5,v=>{L.road=Math.max(0,v||0);render();}));
  g3.appendChild(fNum('計画階数',L.floorsPlan,1,v=>{L.floorsPlan=Math.max(1,v||1);render();}));c2.appendChild(g3);
  c2.appendChild(segField2('区域区分',L.kuiki,['市街化','調整'],v=>{L.kuiki=v;render();}));
  c2.appendChild(segField2('防火指定',L.bouka,['なし','準防火','防火'],v=>{L.bouka=v;render();}));
  c2.appendChild(segField2('再建築',L.saiken,['可','不可'],v=>{L.saiken=v;render();}));
  c2.appendChild(segField2('建築条件付き',L.jyoken,['なし','あり'],v=>{L.jyoken=v;render();}));
  const g4=el('div','row2');
  g4.appendChild(fNum('接道長さ(m)',L.setto,.5,v=>{L.setto=Math.max(0,v||0);render();}));
  g4.appendChild(fNum('高さ制限(m,0=なし)',L.hLimit,1,v=>{L.hLimit=Math.max(0,v||0);render();}));c2.appendChild(g4);
  c2.appendChild(fNum('最低敷地(㎡,0=なし)',L.minArea,5,v=>{L.minArea=Math.max(0,v||0);render();}));
  box.appendChild(c2);
  /* 離隔（外壁後退）と建てられる建物枠 */
  const cs=el('div','card');cs.appendChild(el('h3','','離隔（外壁後退）と建てられる建物枠'));
  cs.appendChild(fNum('外壁の離隔・後退距離（片側 m）',L.setback,.1,v=>{L.setback=Math.max(0,v||0);render();}));
  const lowrise=reg.info.lowrise;
  cs.appendChild(el('div','refnote','🏘 隣地との間には外壁を離す必要があります。原則<b>民法234条で境界から50cm以上</b>（=0.5m）。'+(lowrise?'<b>一種・二種低層住専</b>では都市計画で<b>外壁後退1.0〜1.5m</b>が定められることが多く、要確認です。':'防火・準防火地域で一定の耐火要件を満たすと隣地ギリギリまで寄せられる緩和もありますが、施工・メンテ・採光の観点で0.5m前後は確保するのが一般的です。')+'角地・道路側は別途セットバック等も考慮してください。'));
  const s=reg.setback;const fits=[];
  const fitOK=(reg.buildW>0&&reg.buildD>0);
  cs.appendChild(el('div','grid2',
    `<span class="g-k">敷地の外形（間口×奥行）</span><span class="g-v">${f1(reg.landW)}×${f1(reg.landD)}m</span>`+
    `<span class="g-k">離隔（両側で差引く）</span><span class="g-v">−${f1(s)}m ×2</span>`+
    `<span class="g-k">建てられる建物枠の上限</span><span class="g-v"><b>${f1(reg.buildW)}×${f1(reg.buildD)}m</b></span>`+
    `<span class="g-k">＝ 最大建築面積（矩形）</span><span class="g-v">${f1(reg.buildFootprint)}㎡ / ${f1(reg.buildFootprint/TSUBO)}坪</span>`));
  /* 現在の建物枠との比較 */
  const f0f=state.floors[0];const curW=f0f?f0f.footW:0,curD=f0f?f0f.footH:0;
  const wOK=curW<=reg.buildW+1e-6,dOK=curD<=reg.buildD+1e-6,bothOK=wOK&&dOK;
  cs.appendChild(ratioBox('現在の建物枠 '+f1(curW)+'×'+f1(curD)+'m',
    bothOK?'✓ 離隔を確保して収まります':('⚠ '+(!wOK?'幅が'+f1(curW-reg.buildW)+'m超過':'')+(!wOK&&!dOK?' / ':'')+(!dOK?'奥行が'+f1(curD-reg.buildD)+'m超過':'')),
    bothOK?'ok':'warn'));
  const applyBtn=btn('▸ 建物枠を土地いっぱい（離隔確保）に合わせる：全フロア '+f1(reg.buildW)+'×'+f1(reg.buildD)+'m',()=>{if(reg.buildW<1||reg.buildD<1){alert('離隔を引くと建物枠が小さすぎます。敷地サイズか離隔距離を見直してください。');return;}state.floors.forEach(fl=>{fl.footW=reg.buildW;fl.footH=reg.buildD;});render();});applyBtn.classList.add('solid');
  cs.appendChild(applyBtn);
  cs.appendChild(el('div','hint','※「建物枠」＝間取り図に描かれる建物の外形サイズ（敷地とは別）。各階ごとに設定でき、⚙（表示・設定）の『この階の建物枠』でも変更できます。上のボタンは全フロアをまとめて土地に合わせます。'));
  box.appendChild(cs);
  /* クイック入力 */
  const cp=el('div','card');cp.appendChild(el('h3','','クイック入力（綱島エリア想定）'));
  const chips=el('div','chips');
  [['綱島 近隣商業',{youto:'近商',farLimit:300,bcrLimit:80,bouka:'準防火'}],
   ['大倉山 商業',{youto:'商業',farLimit:400,bcrLimit:80,bouka:'防火'}],
   ['菊名 準住居',{youto:'準住居',farLimit:200,bcrLimit:60,bouka:'準防火'}]].forEach(([nm,preset])=>{
    const b=document.createElement('button');b.textContent=nm;b.onclick=()=>{Object.assign(L,preset);render();};chips.appendChild(b);});
  cp.appendChild(chips);box.appendChild(cp);
  /* 内訳 */
  const c3=el('div','card');c3.appendChild(el('h3','','建築可能ボリューム内訳'));
  const effFarF=reg.roadUnlimited?('幅員12m以上 → 指定 '+f0(L.farLimit)+'% 適用')
    :('min(指定 '+f0(L.farLimit)+'%, 道路 '+f1(L.road)+'×'+reg.coef+'×100='+f0(reg.roadFar)+'%) = '+f0(reg.effFar)+'%');
  c3.appendChild(el('div','grid2',
    `<span class="g-k">有効容積率</span><span class="g-v ${reg.roadLimited?'neg':''}">${f0(reg.effFar)}%</span>`+
    `<span class="g-k">容積率上限の延床</span><span class="g-v">${f1(reg.farFloor)}㎡</span>`+
    `<span class="g-k">建築面積（建ぺい上限）</span><span class="g-v">${f1(reg.footprint)}㎡</span>`+
    `<span class="g-k">建ぺい×${reg.floors}階の延床</span><span class="g-v">${f1(reg.stackFloor)}㎡</span>`+
    `<span class="g-k">実効 建築可能延床</span><span class="g-v"><b>${f1(reg.maxFloor)}㎡ / ${f1(reg.maxFloorT)}坪</b></span>`+
    `<span class="g-k">推定建物高さ</span><span class="g-v">約${f1(reg.estH)}m</span>`));
  c3.appendChild(el('div','refnote','📐 有効容積率：'+effFarF+'　／　上限決定：'+reg.bind+(reg.bind==='容積率'?'（階を増やしても延床上限は不変）':'（容積率に余裕あり。階を増やせば延床増）')));
  box.appendChild(c3);
  /* 現在の間取りとの整合 */
  const agg=buildingAgg();const okFit=agg.gross<=reg.maxFloor+0.01;
  const c4=el('div','card');c4.appendChild(el('h3','','現在の間取りとの整合'));
  c4.appendChild(el('div','grid2',`<span class="g-k">間取りの実延床</span><span class="g-v ${okFit?'pos':'neg'}">${f1(agg.gross)}㎡</span><span class="g-k">この土地の上限</span><span class="g-v">${f1(reg.maxFloor)}㎡</span><span class="g-k">残り/超過</span><span class="g-v ${okFit?'pos':'neg'}"><b>${okFit?'残 '+f1(reg.maxFloor-agg.gross)+'㎡':'超過 '+f1(agg.gross-reg.maxFloor)+'㎡'}</b></span>`));
  c4.appendChild(ratioBox(okFit?'✅ この土地に現在の建物が載ります':'⛔ この土地には現在の建物は載りません',okFit?'コストタブの延床チェックと連動しています。':'間取りを縮小するか、別の土地条件を検討してください。',okFit?'ok':'ng'));
  box.appendChild(c4);
  /* 複数土地（シナリオ）比較 */
  if(store.scenarios.length>1){
    const c5=el('div','card');c5.appendChild(el('h3','','複数土地の比較<span class="tag">'+store.scenarios.length+'案</span>'));
    c5.appendChild(el('div','hint','各シナリオの土地条件を横断比較します。'));
    const cw=el('div','comp');const t=document.createElement('table');
    const data=store.scenarios.map(sc=>{migrateScenario(sc);return{sc,reg:landReg(sc),ev:landEval(sc),price:(sc.land.priceManual!=null&&sc.land.priceManual!==''?+sc.land.priceManual:computeCost(sc).landPrice)};});
    let hd='<tr class="hd"><th>項目</th>'+data.map(d=>`<th>${d.sc.name}${d.sc.id===store.activeId?' ★':''}</th>`).join('')+'</tr>';
    const vpill=lv=>lv==='ok'?'<span style="color:var(--ok)">建築可</span>':(lv==='warn'?'<span style="color:var(--warn)">要注意</span>':'<span style="color:var(--ng)">不可</span>');
    const rows=[['判定',d=>vpill(d.ev.level)],['用途地域',d=>d.reg.info.label],['敷地',d=>f0(d.reg.area)+'㎡'],['土地坪単価',d=>d.reg.areaT>0?f1(d.price/d.reg.areaT)+'万':'—'],['建築面積単価',d=>d.reg.maxFloorT>0?f1(d.price/d.reg.maxFloorT)+'万':'—'],['建築可能延床',d=>f0(d.reg.maxFloor)+'㎡'],['目標260㎡',d=>d.reg.maxFloor>=260?'○':'×']];
    let bh='';rows.forEach(([lb,fn])=>{bh+='<tr><td>'+lb+'</td>'+data.map(d=>'<td>'+fn(d)+'</td>').join('')+'</tr>';});
    t.innerHTML=hd+bh;cw.appendChild(t);c5.appendChild(cw);box.appendChild(c5);
  }
  box.appendChild(el('div','hint','※簡易判定です。角地緩和・日影規制・地区計画・既存不適格等は未反映。最終判断は役所窓口・重要事項説明で確認を。'));
}

