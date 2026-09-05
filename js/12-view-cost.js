/* 12-view-cost.js — コストビュー
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= コストビュー（整理版） ================= */
function renderCostView(){const box=$('costView');box.innerHTML='';const L=state.land,P=state.price,c=computeCost();
  box.appendChild(el('div','viewtitle','コスト<small>敷地・建物・諸費用と総事業費</small>'));
  const bd=el('div','badges');
  bd.appendChild(el('div','badge','<div class="bk">① 土地価格</div><div class="bv">'+yen(c.landPrice)+'</div>'));
  bd.appendChild(el('div','badge','<div class="bk">② 建物価格</div><div class="bv">'+yen(c.buildingPrice)+'</div>'));
  bd.appendChild(el('div','badge','<div class="bk">③ 別途+諸費用</div><div class="bv">'+yen(c.extrasSum+c.misc)+'</div>'));
  bd.appendChild(el('div','badge','<div class="bk">総事業費 ①+②+③</div><div class="bv">'+yen(c.total)+'</div>'));
  box.appendChild(bd);
  box.appendChild(el('div','hint','このタブは「いくらかかるか（コスト）」。「どう借りるか」は<b>融資</b>タブ、「回るか」は<b>収支</b>タブへ。敷地の法規制は<b>土地</b>タブで詳しく設定できます。'));
  /* ⚖ 延床の法規チェック */
  box.appendChild(renderFloorCapCard(c));
  /* ① 土地 */
  const cd1=el('div','card');cd1.appendChild(el('h3','','① 土地（敷地・価格）'));
  cd1.appendChild(fSelect('敷地の形状',[['rect','整形地（間口×奥行）'],['poly','不整形地（座標求積）']],L.mode||'rect',v=>{L.mode=v;if(v==='poly'&&(!L.poly||L.poly.length<3))L.poly=[[0,0],[+L.W||9,0],[+L.W||9,+L.D||11],[0,+L.D||11]];render();}));
  if((L.mode||'rect')==='rect'){
    const g3=el('div','row3');
    g3.appendChild(fNum('敷地 間口 W(m)',L.W,.1,v=>{L.W=Math.max(0,v||0);L.areaManual=null;render();}));
    g3.appendChild(fNum('敷地 奥行 D(m)',L.D,.1,v=>{L.D=Math.max(0,v||0);L.areaManual=null;render();}));
    g3.appendChild(fNum('面積直接(㎡)',L.areaManual!=null?L.areaManual:'',1,v=>{L.areaManual=(v&&v>0)?v:null;render();},'自動'));
    cd1.appendChild(g3);
  }else{
    cd1.appendChild(el('div','refnote','📐 座標求積法: 敷地の各頂点座標(m)を時計回りに入力すると面積を自動計算します（測量図の座標を写せます）。旗竿地・台形・多角形に対応。'));
    const pt=document.createElement('table');pt.className='cost';pt.innerHTML='<tr><th>#</th><th>X(m)</th><th>Y(m)</th><th></th></tr>';
    (L.poly||[]).forEach((v,i)=>{const tr=document.createElement('tr');tr.appendChild(el('td','',String(i+1)));
      [[0,'X'],[1,'Y']].forEach(([k])=>{const td=document.createElement('td');const inp=document.createElement('input');inp.type='number';inp.step='0.1';inp.inputMode='decimal';inp.value=Math.round(v[k]*100)/100;inp.onchange=e=>{L.poly[i][k]=+e.target.value||0;render();};td.appendChild(inp);tr.appendChild(td);});
      const td=document.createElement('td');if(L.poly.length>3){const rm=btn('×',()=>{L.poly.splice(i,1);render();},'del');rm.style.cssText='padding:2px 8px;min-height:30px';td.appendChild(rm);}tr.appendChild(td);pt.appendChild(tr);});
    cd1.appendChild(pt);
    cd1.appendChild(btn('＋ 頂点を追加',()=>{const pv=L.poly[L.poly.length-1]||[0,0];L.poly.push([pv[0]+2,pv[1]]);render();}));
    /* 敷地形状ミニプレビュー */
    const bb=L.poly.reduce((a,pnt)=>({x0:Math.min(a.x0,pnt[0]),y0:Math.min(a.y0,pnt[1]),x1:Math.max(a.x1,pnt[0]),y1:Math.max(a.y1,pnt[1])}),{x0:1e9,y0:1e9,x1:-1e9,y1:-1e9});
    const sc2=Math.min(220/Math.max(.1,bb.x1-bb.x0),140/Math.max(.1,bb.y1-bb.y0));
    const svg='<svg width="240" height="156" style="background:#fff;border:1px solid var(--line);border-radius:8px"><polygon points="'+L.poly.map(pnt=>((pnt[0]-bb.x0)*sc2+10)+','+((pnt[1]-bb.y0)*sc2+8)).join(' ')+'" fill="rgba(52,80,107,.12)" stroke="#34506B" stroke-width="1.5"/></svg>';
    const pv2=el('div','');pv2.innerHTML=svg;cd1.appendChild(pv2);
  }
  cd1.appendChild(readout('敷地面積',`${fmt(c.la,1)}㎡ / ${f1(c.lt)}坪`));
  const lp=el('div','row2');
  lp.appendChild(fSelect('単価基準',[['tsubo','万円/坪'],['sqm','万円/㎡']],P.landUnitMode,v=>{P.landUnitMode=v;render();}));
  lp.appendChild(fNum(P.landUnitMode==='sqm'?'土地単価(万/㎡)':'土地単価(万/坪)',P.landUnit,5,v=>{P.landUnit=Math.max(0,v||0);render();}));
  cd1.appendChild(lp);
  cd1.appendChild(el('div','big',`<span class="k">① 土地価格</span><span class="v">${yen(c.landPrice)}</span>`));
  box.appendChild(cd1);
  /* ② 建物 */
  const cd2=el('div','card');cd2.appendChild(el('h3','','② 建物価格（構造・階別積算）'));
  const struct=state.structure||'wood';const si=structInfo(struct);
  cd2.appendChild(fSelect('構造（工法）',STRUCTURES.map(s=>[s.v,s.label]),struct,v=>{
    state.structure=v;const s2=structInfo(v);
    state.tax.bodyYears=s2.years;                 /* 減価償却：法定耐用年数を反映 */
    P.buildingUnit=s2.unit;                        /* 積算：構造別の目安坪単価を反映 */
    render();}));
  cd2.appendChild(el('div','refnote','🏗 <b>'+esc(si.label)+'</b>：法定耐用年数 <b>'+si.years+'年</b>（躯体）／ 目安坪単価 約'+si.unit+'万/坪。'+esc(si.note)+'　構造を選ぶと「坪単価（積算）」と「躯体の償却年数（減価償却）」を自動セットします（どちらも下で微調整可）。'));
  const tb=document.createElement('table');tb.className='cost';tb.innerHTML=`<tr><th>階</th><th>施工床(坪)</th><th>坪単価</th><th>金額(万)</th></tr>`;
  c.rows.forEach(rw=>{const tr=document.createElement('tr');tr.appendChild(el('td','',rw.f.name));
    const td1=document.createElement('td');const i1=document.createElement('input');i1.type='number';i1.step='0.1';i1.inputMode='decimal';i1.value=f1(rw.t);i1.placeholder=f1(rw.autoT);i1.onchange=e=>{P.perFloor[rw.f.id]=P.perFloor[rw.f.id]||{};P.perFloor[rw.f.id].t=e.target.value===''?null:+e.target.value;render();};td1.appendChild(i1);tr.appendChild(td1);
    const td2=document.createElement('td');const i2=document.createElement('input');i2.type='number';i2.step='1';i2.inputMode='numeric';i2.value=rw.over&&rw.over.u!=null&&rw.over.u!==''?rw.over.u:'';i2.placeholder=String(P.buildingUnit);i2.onchange=e=>{P.perFloor[rw.f.id]=P.perFloor[rw.f.id]||{};P.perFloor[rw.f.id].u=e.target.value===''?null:+e.target.value;render();};td2.appendChild(i2);tr.appendChild(td2);
    tr.appendChild(el('td','',f0(rw.amt)));tb.appendChild(tr);});
  cd2.appendChild(tb);
  const bu=el('div','row2');bu.appendChild(fNum('共通坪単価(万/坪)',P.buildingUnit,1,v=>{P.buildingUnit=Math.max(0,v||0);render();}));bu.appendChild(fNum('付帯・諸経費(%)',P.ancillaryPct,1,v=>{P.ancillaryPct=Math.max(0,v||0);render();}));cd2.appendChild(bu);
  cd2.appendChild(el('div','grid2',`<span class="g-k">建物本体</span><span class="g-v">${yen(c.body)}</span><span class="g-k">＋付帯 ${P.ancillaryPct}%</span><span class="g-v">${yen(c.buildingPrice-c.body)}</span><span class="g-k">実効坪単価</span><span class="g-v">${f1(c.effUnit)} 万/坪</span><span class="g-k">施工床合計</span><span class="g-v">${f1(c.areaT)} 坪</span>`));
  cd2.appendChild(el('div','big',`<span class="k">② 建物価格</span><span class="v">${yen(c.buildingPrice)}</span>`));
  /* 概算積算内訳 */
  cd2.appendChild(subttl('概算積算内訳（本体の構成比・'+esc(si.label)+'目安）'));
  const st=document.createElement('table');st.className='cost';st.innerHTML='<tr><th>工事区分</th><th>構成比</th><th>概算(万)</th></tr>';
  c.seisan.forEach(x=>{const tr=document.createElement('tr');tr.innerHTML=`<td style="text-align:left">${x.n}</td><td>${x.pc}%</td><td>${f0(x.amt)}</td>`;st.appendChild(tr);});
  cd2.appendChild(st);
  cd2.appendChild(el('div','hint','本見積は建設会社の詳細積算（数量×単価）で必ず確認。木造は2024→25年で坪単価上昇傾向、早期の概算取得が有利。'));
  box.appendChild(cd2);
  /* ③ 別途・諸費用 */
  const cd3=el('div','card');cd3.appendChild(el('h3','','③ 別途工事・購入諸費用'));
  const et=document.createElement('table');et.className='cost';et.innerHTML=`<tr><th>項目</th><th>金額(万)</th><th></th></tr>`;
  (P.extras||[]).forEach((x,idx)=>{const tr=document.createElement('tr');
    const td0=document.createElement('td');const in0=document.createElement('input');in0.type='text';in0.value=x.name;in0.style.cssText='width:100%;text-align:left';in0.onchange=e=>{x.name=e.target.value;};td0.appendChild(in0);tr.appendChild(td0);
    const td1=document.createElement('td');const in1=document.createElement('input');in1.type='number';in1.step='10';in1.inputMode='numeric';in1.value=x.amount||0;in1.onchange=e=>{x.amount=+e.target.value||0;render();};td1.appendChild(in1);tr.appendChild(td1);
    const td2=document.createElement('td');const rm=btn('×',()=>{P.extras.splice(idx,1);render();},'del');rm.style.cssText='padding:2px 8px;min-height:30px';td2.appendChild(rm);tr.appendChild(td2);
    et.appendChild(tr);});
  cd3.appendChild(et);
  cd3.appendChild(btn('＋ 項目を追加',()=>{(P.extras=P.extras||[]).push({name:'新規項目',amount:0});render();}));
  cd3.appendChild(fNum('購入諸費用(万) — 登記・ローン手数料・火災保険・取得税・仲介等',P.misc!=null?P.misc:'',10,v=>{P.misc=v;render();},`自動 ${f0(c.miscAuto)}（総額7%）`));
  cd3.appendChild(el('div','grid2',`<span class="g-k">別途工事 合計</span><span class="g-v">${yen(c.extrasSum)}</span><span class="g-k">諸費用</span><span class="g-v">${yen(c.misc)}</span>`));
  box.appendChild(cd3);
  /* まとめ */
  const cd4=el('div','card');cd4.appendChild(el('h3','','総事業費まとめ'));
  cd4.appendChild(el('div','grid2',`<span class="g-k">① 土地</span><span class="g-v">${yen(c.landPrice)}</span><span class="g-k">② 建物（本体+付帯）</span><span class="g-v">${yen(c.buildingPrice)}</span><span class="g-k">③ 別途工事</span><span class="g-v">${yen(c.extrasSum)}</span><span class="g-k">③ 諸費用</span><span class="g-v">${yen(c.misc)}</span>`));
  cd4.appendChild(el('div','big',`<span class="k">総事業費</span><span class="v">${yen(c.total)}</span>`));
  cd4.appendChild(el('div','hint','自己資金・借入・銀行別の融資条件は<b>融資</b>タブで設定します。'));
  box.appendChild(cd4);}
