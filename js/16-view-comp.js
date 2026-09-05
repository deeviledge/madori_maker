/* 16-view-comp.js — シナリオ比較ビュー
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= シナリオ比較ビュー ================= */
function renderCompView(){const box=$('compView');box.innerHTML='';
  box.appendChild(el('div','viewtitle','比較<small>シナリオ横断の指標比較</small>'));
  const scs=store.scenarios;
  const c0=el('div','card');c0.appendChild(el('h3','','シナリオ比較<span class="tag">'+scs.length+'案</span>'));
  c0.appendChild(el('div','hint','登録中の全シナリオを採用ローンベースで横断比較します。シナリオはヘッダーのセレクタ／メニューで追加・複製できます。'));
  const M=mode();
  const data=scs.map(sc=>{migrateScenario(sc);const r=financeCalc(sc);const{B}=buildingAggSc(sc);const base=B.own+B.rental,own=base>0?B.own/base*100:0;const ex=(M!=='home')?exitCalc(sc,r):null;return{sc,r,own,ex,agg:buildingAggSc(sc)};});
  const isHome=M==='home',isInv=M==='invest',isHyb=M==='hybrid';
  const rows=[
   ['延床面積',d=>f1(d.agg.gross)+'㎡',null],
   ...(isHyb?[['自宅専有率',d=>f1(d.own)+'%',d=>d.r.need50?(d.own>=50?'pos':'neg'):null]]:[]),
   ['総事業費',d=>yen(d.r.c.total),null],
   ['自己資金',d=>yen(+d.sc.finance.equity||0),null],
   ['借入必要額',d=>yen(d.r.loan),null],
   ['採用ローン',d=>d.r.LN.name,null],
   ['種別',d=>LOANTYPES[d.r.LN.type].label,null],
   ['金利/期間',d=>f1(d.r.LN.rate)+'% / '+d.r.LN.years+'年',null],
   ['月返済(初回)',d=>fmt(d.r.schA.firstMonthly,1)+'万',null],
   ['返済比率(審査)',d=>f1(d.r.dsrS)+'%',d=>d.r.dsrS<=d.r.LN.dsrLimit?'pos':'neg'],
   ['融資上限判定',d=>d.r.capOk?'✓ 内':'✗ 超過',d=>d.r.capOk?'pos':'neg'],
   ...(!isHome?[
     ['想定賃料/月',d=>f1(d.r.mRent)+'万',null],
     ['表面利回り',d=>f1(d.r.grossY)+'%',null],
     ['NOI利回り',d=>f1(d.r.netY)+'%',null],
     ['イールドギャップ',d=>f1(d.r.yieldGap)+'pt',d=>d.r.yieldGap>=0?'pos':'neg'],
     ['DSCR',d=>fmt(d.r.dscr,2),d=>d.r.dscr>=1.2?'pos':(d.r.dscr>=1?null:'neg')]
   ]:[]),
   ...(isHyb?[['実質住居費/月',d=>f1(d.r.netMonthly1)+'万',null]]:[]),
   ...(isHome?[['実質住居費/月',d=>f1(d.r.payA1/12-(d.r.dedEnabled?d.r.ded1/12:0))+'万',null]]:[]),
   ['初年度CF(税後)',d=>f0(d.r.cf[0]?d.r.cf[0].cf:0)+'万',d=>(d.r.cf[0]?.cf||0)>=0?'pos':'neg'],
   ['保有末 累計CF',d=>yen(d.r.cf[d.r.cf.length-1]?.cum||0),d=>(d.r.cf[d.r.cf.length-1]?.cum||0)>=0?'pos':'neg'],
   ...(!isHome?[
     ['税引後IRR',d=>d.ex.postIRR==null?'—':f1(d.ex.postIRR)+'%',d=>(d.ex.postIRR||0)>=0?'pos':'neg'],
     ['マルチプル',d=>fmt(d.ex.multiple,2),null],
     ['売却時CF',d=>yen(d.ex.base.cfSell),d=>d.ex.base.cfSell>=0?'pos':'neg']
   ]:[])];
  const cw=el('div','comp');const t=document.createElement('table');
  let hd='<tr class="hd"><th>指標</th>';data.forEach(d=>{hd+=`<th>${d.sc.name}${d.sc.id===store.activeId?' ★':''}</th>`;});hd+='</tr>';
  let bodyH='';rows.forEach(([lb,fn,clsFn])=>{bodyH+='<tr><td>'+lb+'</td>';data.forEach(d=>{const cls=clsFn?clsFn(d):null;bodyH+=`<td class="${cls||''}">${fn(d)}</td>`;});bodyH+='</tr>';});
  t.innerHTML=hd+bodyH;cw.appendChild(t);c0.appendChild(cw);
  const act=el('div','miniact');
  act.appendChild(btn('⧉ 現在のシナリオを複製',()=>{const cp=clone(state);cp.id=nid('s');cp.name=state.name+' 改';cp.floors.forEach(fl=>{fl.id=nid('f');fl.rooms.forEach(r=>r.id=nid('r'));fl.elems.forEach(e=>e.id=nid('e'));});cp.activeFloorId=cp.floors[0].id;(cp.loans||[]).forEach(L=>L.id=nid('L'));cp.activeLoanId=cp.loans[0]?.id;store.scenarios.push(cp);store.activeId=cp.id;state=cp;render();}));
  act.appendChild(btn('＋ 新規シナリオ',()=>{const s2=makeScenario('プラン'+String.fromCharCode(65+store.scenarios.length));store.scenarios.push(s2);store.activeId=s2.id;state=s2;render();}));
  if(store.scenarios.length>1)act.appendChild(btn('🗑 現在のシナリオを削除',()=>{if(!confirm(state.name+' を削除しますか？'))return;store.scenarios=store.scenarios.filter(x=>x.id!==state.id);store.activeId=store.scenarios[0].id;state=store.scenarios[0];render();},'del'));
  c0.appendChild(act);
  box.appendChild(c0);
  /* 主要指標のバー比較 */
  if(data.length>=2){
    const c1=el('div','card');c1.appendChild(el('h3','','総事業費・借入・月返済の比較'));
    const metrics=[['総事業費(億)',d=>d.r.c.total/10000,'#34506B'],['借入(億)',d=>d.r.loan/10000,'#0E7C86'],['月返済(万)',d=>d.r.schA.firstMonthly,'#A67C3D'],['NOI利回り(%)',d=>d.r.netY,'#4E7A4E']];
    metrics.forEach(([lb,fn,col])=>{
      c1.appendChild(el('div','subttl',lb));
      const mx=Math.max(...data.map(fn),.001);
      data.forEach(d=>{const v=fn(d),pct=v/mx*100;
        const row=el('div','');row.style.cssText='display:flex;align-items:center;gap:8px;margin:3px 0;font-size:11.5px';
        row.innerHTML=`<span style="width:90px;color:#54677A;flex:0 0 auto">${d.sc.name.slice(0,8)}</span><span style="flex:1;background:#EEF2F6;border-radius:4px;overflow:hidden"><span style="display:block;height:16px;width:${Math.max(2,pct)}%;background:${col}"></span></span><span style="width:56px;text-align:right;font-variant-numeric:tabular-nums">${f1(v)}</span>`;
        c1.appendChild(row);});});
    box.appendChild(c1);}}
