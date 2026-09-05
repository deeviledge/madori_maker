/* 14-view-sim.js — 収支ビュー
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= 収支ビュー（レントロール・利回り・CF） ================= */
function renderSimView(){const box=$('simView');box.innerHTML='';const G=state.finance,r=financeCalc();const{B}=buildingAgg();
  box.appendChild(el('div','viewtitle','収支<small>'+(mode()==='invest'?'収益・利回り・CF':'賃料・利回り・実質住居費')+'</small>'));
  if(mode()==='home')return renderHomeSim(box,G,r);
  const base=B.own+B.rental,ratio50=base>0?B.own/base*100:0;const M=mode();
  const bd=el('div','badges');
  if(M==='hybrid')bd.appendChild(el('div','badge '+(r.need50?(ratio50>=50?'ok':'ng'):''),'<div class="bk">自宅率'+(r.need50?'(50%要件)':'(参考)')+'</div><div class="bv">'+f1(ratio50)+'%</div>'));
  bd.appendChild(el('div','badge','<div class="bk">NOI利回り</div><div class="bv">'+f1(r.netY)+'%</div>'));
  if(M==='hybrid')bd.appendChild(el('div','badge '+(r.netMonthly1<=+G.currentRent?'ok':'warn'),'<div class="bk">実質住居費/月</div><div class="bv">'+f1(r.netMonthly1)+'万</div>'));
  else bd.appendChild(el('div','badge','<div class="bk">DSCR</div><div class="bv">'+fmt(r.dscr,2)+'</div>'));
  const cf1=r.cf[0]?r.cf[0].cf:0;
  bd.appendChild(el('div','badge '+(cf1>=0?'ok':'warn'),'<div class="bk">初年度CF(税後)</div><div class="bv">'+(cf1>=0?'+':'')+f0(cf1)+'万</div>'));
  box.appendChild(bd);
  /* ① レントロール */
  const units=rentUnits(state);
  const c1=el('div','card');c1.appendChild(el('h3','','① レントロール（部屋別賃料）<span class="tag">'+units.length+'戸</span>'));
  const wrap=el('div','rentroll');const t=document.createElement('table');
  t.innerHTML='<colgroup><col class="c-floor"><col class="c-name"><col class="c-area"><col class="c-rent"><col class="c-unit"><col class="c-occ"></colgroup><thead><tr><th>階</th><th>部屋</th><th>面積㎡</th><th>賃料<br>(万/月)</th><th>㎡単価</th><th>稼働</th></tr></thead><tbody></tbody>';
  const tb=t.querySelector('tbody');
  units.forEach(u=>{const tr=document.createElement('tr');
    tr.appendChild(el('td','tl',u.floor));tr.appendChild(el('td','tl',u.name));tr.appendChild(el('td','',f1(u.area)));
    const td=document.createElement('td');const inp=document.createElement('input');inp.type='number';inp.step='0.1';inp.inputMode='decimal';inp.value=u.rent;inp.placeholder=String(u.autoRent);inp.onchange=e=>{u.u.rent=e.target.value===''?null:+e.target.value;render();};td.appendChild(inp);tr.appendChild(td);
    const td3=document.createElement('td');
    if(u.area>0){const ui=document.createElement('input');ui.type='number';ui.step='50';ui.inputMode='numeric';
      ui.value=Math.round(u.rent*10000/u.area);
      ui.onchange=e=>{const rt=+e.target.value||0;u.u.rent=rt>0?Math.round(u.area*rt/10000*10)/10:null;render();};
      td3.appendChild(ui);}else td3.textContent='—';
    tr.appendChild(td3);
    const td2=document.createElement('td');const cb=document.createElement('input');cb.type='checkbox';cb.style.cssText='width:20px;height:20px;accent-color:var(--accent)';cb.checked=!!u.occ;cb.onchange=()=>{u.u.occ=cb.checked?1:0;render();};td2.appendChild(cb);tr.appendChild(td2);
    tb.appendChild(tr);});
  wrap.appendChild(t);c1.appendChild(wrap);
  c1.appendChild(subttl('㎡単価の設定'));
  const rr=el('div','row2');
  rr.appendChild(fNum('既定の㎡単価(円/㎡・月)',state.rent.unitRate!=null?state.rent.unitRate:3800,50,v=>{state.rent.unitRate=v||0;render();}));
  {const avgA=units.reduce((a,x)=>a+x.area,0),avgR=units.reduce((a,x)=>a+x.rent,0);
   rr.appendChild(el('div','field','<label>現在の平均㎡単価</label><div class="g-v" style="padding:8px 0;font-weight:800">'+(avgA>0?f0(avgR*10000/avgA)+' 円/㎡':'—')+'</div>'));}
  c1.appendChild(rr);
  c1.appendChild(btn('▸ 既定の㎡単価を全戸に一括適用（個別入力をクリア）',()=>{
    if(!confirm('各部屋の個別賃料をクリアし、既定の㎡単価×面積で再計算します。よろしいですか？'))return;
    units.forEach(u=>{u.u.rent=null;});render();}));
  c1.appendChild(fNum('賃料合計の上書き(万/月)',state.rent.override!=null?state.rent.override:'',1,v=>{state.rent.override=v;render();},'自動 '+f1(units.reduce((a,x)=>a+(x.occ?x.rent:0),0))));
  c1.appendChild(el('div','grid2',`<span class="g-k">満室想定 月額</span><span class="g-v"><b>${f1(r.mRent)} 万円</b></span><span class="g-k">年額（満室）</span><span class="g-v">${f0(r.rentYear)} 万円</span>`));
  c1.appendChild(el('div','hint','賃料未入力の部屋は「面積×既定の㎡単価」で自動計算。<b>㎡単価列は直接入力できます</b>（入力するとその部屋の賃料が面積×単価で再計算）。角部屋や上階を高めにするといった調整にどうぞ。'));
  /* 築年数カーブ */
  c1.appendChild(subttl('築年数別 賃料下落シミュレーション'));
  const cv=state.rent.curve;
  const cr=el('div','row3');
  cr.appendChild(fNum('築1〜10年(%/年)',cv.r1,.1,v=>{cv.r1=v||0;render();}));
  cr.appendChild(fNum('築11〜20年(%/年)',cv.r2,.1,v=>{cv.r2=v||0;render();}));
  cr.appendChild(fNum('築21年〜(%/年)',cv.r3,.1,v=>{cv.r3=v||0;render();}));
  c1.appendChild(cr);
  const at=document.createElement('table');at.className='cost';at.innerHTML='<tr><th>築年数</th><th>賃料指数</th><th>月額賃料</th><th>年額</th></tr>';
  [1,5,10,15,20,25,30,35].forEach(y=>{const fct=ageFactor(y,cv);const tr=document.createElement('tr');
    tr.innerHTML=`<td>築${y}年</td><td>${f1(fct*100)}%</td><td>${f1(r.mRent*fct)}万</td><td>${f0(r.mRent*12*fct)}万</td>`;at.appendChild(tr);});
  c1.appendChild(at);
  const idxVals=[];for(let y=1;y<=35;y++)idxVals.push(r.mRent*12*ageFactor(y,cv));
  c1.appendChild(chartBox('満室賃料の推移（万円/年 × 築年数）',chart({n:35,series:[{vals:idxVals,color:'#0E7C86',width:2}]})));
  box.appendChild(c1);
  /* ② 利回り */
  const c2=el('div','card');c2.appendChild(el('h3','','② 利回り分析'));
  const rn=el('div','row3');rn.appendChild(fNum('空室率(%)',G.vacancy,1,v=>{G.vacancy=v||0;render();}));rn.appendChild(fNum('管理料(%)',G.mgmtFee,.5,v=>{G.mgmtFee=v||0;render();}));rn.appendChild(fNum('運営費率(%)',G.opex,1,v=>{G.opex=v||0;render();}));c2.appendChild(rn);
  const rn2=el('div','row2');rn2.appendChild(fNum('固都税/年(万)',G.taxAnnual,5,v=>{G.taxAnnual=v||0;render();}));rn2.appendChild(fNum('火災保険 等/年(万)',G.insAnnual,1,v=>{G.insAnnual=v||0;render();}));c2.appendChild(rn2);
  /* 主要指標（大きく） */
  const yb=el('div','badges');
  yb.appendChild(el('div','badge','<div class="bk">表面利回り(総)</div><div class="bv">'+f1(r.grossY)+'%</div>'));
  yb.appendChild(el('div','badge','<div class="bk">NOI利回り/FCR</div><div class="bv">'+f1(r.netY)+'%</div>'));
  yb.appendChild(el('div','badge '+(r.dscr>=1.2?'ok':(r.dscr>=1?'warn':'ng')),'<div class="bk">DSCR</div><div class="bv">'+fmt(r.dscr,2)+'</div>'));
  yb.appendChild(el('div','badge '+(r.berRatio<=80?'ok':'ng'),'<div class="bk">損益分岐入居率</div><div class="bv">'+f1(r.berRatio)+'%</div>'));
  c2.appendChild(yb);
  /* 利回り */
  c2.appendChild(subttl('利回り'));
  c2.appendChild(el('div','grid2',
   `<span class="g-k">表面利回り（総事業費）</span><span class="g-v"><b>${f1(r.grossY)}%</b></span>`+
   `<span class="g-k">表面利回り（建物のみ）</span><span class="g-v">${f1(r.grossYB)}%</span>`+
   `<span class="g-k">実効利回り（空室考慮）</span><span class="g-v">${f1(r.effY)}%</span>`+
   `<span class="g-k">NOI利回り / FCR</span><span class="g-v"><b>${f1(r.netY)}%</b></span>`));
  /* 借入とのバランス */
  c2.appendChild(subttl('借入とのバランス'));
  c2.appendChild(el('div','grid2',
   `<span class="g-k">ローン定数 K%</span><span class="g-v">${f1(r.kPct)}%</span>`+
   `<span class="g-k">イールドギャップ（NOI−K）</span><span class="g-v ${r.yieldGap>=0?'pos':'neg'}">${f1(r.yieldGap)}pt</span>`+
   `<span class="g-k">DSCR（NOI÷年返済）</span><span class="g-v ${r.dscr>=1.2?'pos':(r.dscr>=1?'':'neg')}">${fmt(r.dscr,2)}</span>`+
   `<span class="g-k">CCR（初年度CF÷自己資金）</span><span class="g-v">${f1(r.ccr)}%</span>`));
  /* 安全性 */
  c2.appendChild(subttl('安全性（空室・返済耐性）'));
  c2.appendChild(el('div','grid2',
   `<span class="g-k">返済比率（返済÷満室家賃）</span><span class="g-v ${r.repayRatio<=50?'pos':(r.repayRatio<=60?'':'neg')}">${f1(r.repayRatio)}%</span>`+
   `<span class="g-k">経費率（運営費÷満室家賃）</span><span class="g-v">${f1(r.expenseRatio)}%</span>`+
   `<span class="g-k">損益分岐入居率（BER）</span><span class="g-v ${r.berRatio<=80?'pos':'neg'}"><b>${f1(r.berRatio)}%</b></span>`));
  c2.appendChild(el('div','refnote','📊 目安: 返済比率は満室家賃の50%以下が安全圏・60%超は要注意。BER（損益分岐入居率）は（運営費＋返済）÷満室家賃で、これを上回る入居率なら黒字＝低いほど空室耐性が高い（80%以下が目安）。DSCRはNOI÷年返済で、プロパー審査は1.2〜1.3以上が一般的な目線。イールドギャップがマイナス＝逆レバ（賃貸併用では自宅部分が収益を生まないため出やすい）。'));
  box.appendChild(c2);
  /* ②-B キャッシュフローツリー＋投資判断（投資・併用モード） */
  box.appendChild(renderCFTreeCard(r));
  box.appendChild(renderJudgeCard(r));
  if(state.tax&&state.tax.rentalTaxOn)box.appendChild(renderEntityCompareCard(r));
  /* ③ 返済・金利 */
  const c3=el('div','card');c3.appendChild(el('h3','','③ 返済シミュレーション<span class="tag">'+r.LN.name+' / '+yen(r.loan)+'</span>'));
  c3.appendChild(el('div','hint','金利・期間・方式は<b>融資</b>タブの採用プランで変更します。'));
  const first=r.schA.yr[0]||{pay:0};
  c3.appendChild(el('div','grid2',`<span class="g-k">月返済（初回）</span><span class="g-v"><b>${fmt(r.schA.firstMonthly,1)} 万円</b></span><span class="g-k">年返済（初年度）</span><span class="g-v">${f0(first.pay)} 万円</span><span class="g-k">総利息</span><span class="g-v">${yen(r.schA.totInt)}</span><span class="g-k">総返済額</span><span class="g-v">${yen(r.schA.totPay)}</span>`));
  c3.appendChild(subttl('金利上昇ストレス'));
  c3.appendChild(el('div','refnote','❓ <b>なぜ金利ストレスを見るのか</b>：変動金利は日銀の政策金利しだいで将来上がる可能性があります。返済期間30〜35年の間に金利が1〜2%上がると<b>返済額が増えてCFが悪化</b>し、DSCR（返済余力）も低下します。「今の低金利では回るが、上がったら赤字」という物件を避けるため、あらかじめ<b>+1%程度のストレス</b>をかけても持ちこたえるかを確認します。全期間固定（フラット35等）ならこのリスクは基本的にありません。'));
  c3.appendChild(chk(`${G.stressAfter}年後に金利 +${G.stressAdd}% を反映する`,G.stressOn,v=>{G.stressOn=v;render();}));
  const st=el('div','row2');st.appendChild(fNum('上昇タイミング(年後)',G.stressAfter,1,v=>{G.stressAfter=v||0;render();}));st.appendChild(fNum('上昇幅(%)',G.stressAdd,.25,v=>{G.stressAdd=v||0;render();}));c3.appendChild(st);
  if(r.schStress){const yi=Math.min(G.stressAfter,r.schStress.yr.length-1);const yS=r.schStress.yr[yi]||{pay:0},yA=r.schA.yr[yi]||{pay:0};
    c3.appendChild(el('div','grid2',`<span class="g-k">上昇後の月返済</span><span class="g-v">${fmt(yS.pay/12,1)} 万円（+${fmt(yS.pay/12-yA.pay/12,1)}万）</span><span class="g-k">総利息（ストレス）</span><span class="g-v">${yen(r.schStress.totInt)}（+${yen(r.schStress.totInt-r.schA.totInt)}）</span>`));}
  const series=[{vals:r.schA.yr.map(y=>y.bal),color:'#16232F',width:2}];
  if(r.schStress)series.push({vals:r.schStress.yr.map(y=>y.bal),color:'#C0453B',width:1.6,dash:'5 4'});
  c3.appendChild(chartBox('ローン残債の推移（万円 / 年）',chart({n:r.schA.yr.length,series}),r.schStress?'━ 基本　┅ ストレス':''));
  c3.appendChild(subttl('金利シナリオ比較'));
  c3.appendChild(fText('比較する金利（カンマ区切り %）',G.rateList,v=>{G.rateList=v;}));
  const rates=(G.rateList||'').split(/[,、\s]+/).map(x=>parseFloat(x)).filter(v=>!isNaN(v)&&v>=0).slice(0,6);
  const rt=document.createElement('table');rt.className='cost';rt.innerHTML='<tr><th>金利</th><th>月返済</th><th>年返済</th><th>総利息</th><th>返済比率</th></tr>';
  rates.forEach(rp=>{const s2=schedule(r.loan,rp,r.LN.years,r.LN.method,null);const y1=s2.yr[0]||{pay:0};const dsr=r.incomeEff>0?y1.pay/r.incomeEff*100:0;
    const tr=document.createElement('tr');tr.innerHTML=`<td>${f1(rp)} %</td><td>${fmt(s2.firstMonthly,1)}万</td><td>${f0(y1.pay)}万</td><td>${yen(s2.totInt)}</td><td style="color:${dsr<=r.LN.dsrLimit?'var(--ok)':'var(--ng)'}">${f1(dsr)}%</td>`;rt.appendChild(tr);});
  c3.appendChild(rt);
  box.appendChild(c3);
  /* ④ 実質住居費（税込み）※賃貸併用モードのみ */
  if(M==='hybrid'){
  const c4=el('div','card');c4.appendChild(el('h3','','④ 実質住居費（賃料・税効果込み）'));
  if(r.need50){c4.appendChild(chk('住宅ローン控除を反映する（自宅部分のみ）',G.dedOn,v=>{G.dedOn=v;render();}));
    const dd=el('div','row2');dd.appendChild(fNum('控除率(%)',G.dedRate,.1,v=>{G.dedRate=v||0;render();}));dd.appendChild(fNum('控除年数',G.dedYears,1,v=>{G.dedYears=v||0;render();}));c4.appendChild(dd);
    c4.appendChild(fNum('対象残高の上限(万円)',G.dedCap,100,v=>{G.dedCap=v||0;render();}));}
  else c4.appendChild(el('div','refnote','採用中の「'+(LOANTYPES[r.LN.type]?.label||'')+'」では住宅ローン控除は適用されません。代わりに賃貸部分の減価償却による税効果を反映しています（設定は融資タブ）。'));
  c4.appendChild(el('div','grid3',`<span class="h">月あたり</span><span class="h">金額</span><span class="h"></span>`+
    `<span class="g-k">ローン返済</span><span class="g-v">−${fmt(r.payA1/12,1)}万</span><span class="g-v"></span>`+
    `<span class="g-k">手取り賃料(NOI)</span><span class="g-v pos">+${fmt(r.noi/12,1)}万</span><span class="g-v"></span>`+
    (r.dedEnabled?`<span class="g-k">住宅ローン控除</span><span class="g-v pos">+${fmt(r.ded1/12,1)}万</span><span class="g-v"></span>`:'')+
    `<span class="g-k">不動産所得の税額</span><span class="g-v ${r.tx1.tax<=0?'pos':'neg'}">${r.tx1.tax<=0?'+':'−'}${fmt(Math.abs(r.tx1.tax)/12,1)}万</span><span class="g-v"></span>`));
  c4.appendChild(el('div','big',`<span class="k">実質住居費（初年度・月）</span><span class="v">${fmt(r.netMonthly1,1)} 万円</span>`));
  const diff=(+G.currentRent||0)-r.netMonthly1;
  c4.appendChild(ratioBox('現在の家賃 '+f1(+G.currentRent||0)+'万 との差',(diff>=0?'✓ 月 '+f1(diff)+'万 軽くなる':'△ 月 '+f1(-diff)+'万 重くなる'),diff>=0?'ok':'warn'));
  box.appendChild(c4);
  if(r.need50)box.appendChild(infoCard('🏠 住宅ローン減税（控除）の詳細',
    '<p>年末のローン残高の<span class="hl">0.7%</span>が所得税から直接差し引かれます（税額控除）。賃貸併用は<b>自宅部分の残高</b>のみが対象です。</p>'+
    '<div class="step"><span class="n">率</span><span>控除率 0.7% ／ 最大 '+f0(+state.finance.dedYears||13)+'年間</span></div>'+
    '<div class="step"><span class="n">上限</span><span>対象残高の上限 '+f0(+state.finance.dedCap||0)+'万円（住宅性能で変動）。省エネ基準適合が新築の要件</span></div>'+
    '<div class="step"><span class="n">還付</span><span>所得税から控除→<b>引ききれない分は住民税から</b>控除（上限あり）</span></div>'+
    '<div class="step"><span class="n">手続</span><span><b>初年度は確定申告</b>が必須。2年目以降は年末調整で自動処理</span></div>'+
    '<p>賃貸併用で住宅ローンを使うには<span class="hl">自宅の床面積が50%以上</span>が原則条件（建物タブで判定）。投資用（アパートローン等）には適用されません。</p>'+
    '<p style="color:#54677A;font-size:10px">※制度は年度で改正されます。実際の控除額・要件は必ず最新の国税庁情報／税理士で確認を。</p>'));
  }
  /* ⑤ 年次CF */
  const c5=el('div','card');c5.appendChild(el('h3','','⑤ 年次キャッシュフロー（税引後）<span class="tag">'+(r.stress?'ストレス金利反映':'実行金利ベース')+'</span>'));
  const hy=el('div','row2');hy.appendChild(fNum('保有・分析年数',G.holdYears,1,v=>{G.holdYears=Math.max(1,v||1);render();}));hy.appendChild(fNum('土地値上がり率(%/年)',G.landAppr,.1,v=>{G.landAppr=v||0;render();}));c5.appendChild(hy);
  c5.appendChild(chartBox('年次CF（棒）と累計CF（線）　万円',chart({n:r.cf.length,series:[{type:'bar',vals:r.cf.map(x=>x.cf),color:'#0E7C86',negColor:'#C0453B'},{vals:r.cf.map(x=>x.cum),color:'#16232F',width:2}]})));
  /* 税効果の可視化：税引前CF vs 税引後CF、税額・償却の推移 */
  c5.appendChild(subttl('税がキャッシュに与える影響（複数年）'));
  const preCF=r.cf.map(x=>x.cf+x.tax);          /* 税引前CF = 税引後CF + 税額 */
  c5.appendChild(chartBox('税引前CF（━）と税引後CF（━）　万円',chart({n:r.cf.length,series:[
    {vals:preCF,color:'#B9C4CF',width:2},
    {vals:r.cf.map(x=>x.cf),color:'#0E7C86',width:2}]}),'━ 税引前　━ 税引後（差＝税負担）'));
  c5.appendChild(chartBox('年間の税額（棒）と減価償却（線）　万円',chart({n:r.cf.length,series:[
    {type:'bar',vals:r.cf.map(x=>x.tax),color:'#C0453B',negColor:'#2E7D5B'},
    {vals:r.cf.map(x=>x.dep),color:'#8A7BA8',width:1.8,dash:'4 3'}]}),'棒＝税額（緑=節税/赤=納税）　┅ 減価償却'));
  const totTax=r.cf.reduce((a,x)=>a+x.tax,0),totDep=r.cf.reduce((a,x)=>a+x.dep,0);
  const depEndY=r.cf.find(x=>x.dep<=0.01);
  c5.appendChild(el('div','grid2',
    `<span class="g-k">保有期間の税額 累計</span><span class="g-v ${totTax<=0?'pos':'neg'}">${f0(totTax)}万</span>`+
    `<span class="g-k">減価償却 累計</span><span class="g-v">${f0(totDep)}万</span>`+
    `<span class="g-k">償却の切れる年（デッドクロス注意）</span><span class="g-v ${depEndY?'neg':''}">${depEndY?depEndY.y+'年目〜':'期間内は継続'}</span>`));
  c5.appendChild(el('div','refnote','💡 減価償却が終わると経費が減り課税所得が増える＝税額が跳ね上がりCFが悪化（デッドクロス）。上のグラフで税引前後の差が広がる年が要注意。'+(state.tax.entity==='corp'?'（法人税率で計算中）':'（個人の限界税率で計算中）')));
  const wrap5=el('div','cftable');const t5=document.createElement('table');
  t5.innerHTML='<tr><th>年</th><th>満室賃料</th><th>NOI</th><th>修繕</th><th>返済</th><th>控除</th><th>償却</th><th>税額</th><th>年CF</th><th>累計</th><th>残債</th></tr>';
  r.cf.forEach(x=>{const tr=document.createElement('tr');
    tr.innerHTML=`<td>${x.y}</td><td>${f0(x.rent)}</td><td>${f0(x.noi)}</td><td>${x.repair?f0(x.repair):'—'}</td><td>${f0(x.pay)}</td><td>${x.ded?f0(x.ded):'—'}</td><td>${x.dep?f0(x.dep):'—'}</td><td class="${x.tax<=0?'pos':'neg'}">${f0(x.tax)}</td><td class="${x.cf>=0?'pos':'neg'}">${f0(x.cf)}</td><td class="${x.cum>=0?'pos':'neg'}">${f0(x.cum)}</td><td>${f0(x.bal)}</td>`;
    t5.appendChild(tr);});
  wrap5.appendChild(t5);c5.appendChild(wrap5);
  const bkEven=r.cf.find(x=>x.cum>=0);
  c5.appendChild(el('div','grid2',`<span class="g-k">累計CF黒字化</span><span class="g-v">${bkEven?bkEven.y+'年目':'期間内なし'}</span><span class="g-k">保有${G.holdYears}年 累計CF</span><span class="g-v">${yen(r.cf[r.cf.length-1]?.cum||0)}</span>`));
  box.appendChild(c5);
  /* ⑥ 修繕 */
  const c6=el('div','card');c6.appendChild(el('h3','','⑥ 修繕スケジュール'));
  const rt2=document.createElement('table');rt2.className='cost';rt2.innerHTML='<tr><th>経過年</th><th>費用(万)</th><th></th></tr>';
  (G.repairs||[]).forEach((x,idx)=>{const tr=document.createElement('tr');
    const t0=document.createElement('td');const i0=document.createElement('input');i0.type='number';i0.step='1';i0.inputMode='numeric';i0.value=x.year;i0.onchange=e=>{x.year=+e.target.value||0;render();};t0.appendChild(i0);t0.style.textAlign='left';tr.appendChild(t0);
    const t1=document.createElement('td');const i1=document.createElement('input');i1.type='number';i1.step='10';i1.inputMode='numeric';i1.value=x.amount;i1.onchange=e=>{x.amount=+e.target.value||0;render();};t1.appendChild(i1);tr.appendChild(t1);
    const t2=document.createElement('td');const rm=btn('×',()=>{G.repairs.splice(idx,1);render();},'del');rm.style.cssText='padding:2px 8px;min-height:30px';t2.appendChild(rm);tr.appendChild(t2);
    rt2.appendChild(tr);});
  c6.appendChild(rt2);c6.appendChild(btn('＋ 修繕を追加',()=>{(G.repairs=G.repairs||[]).push({year:10,amount:100});render();}));
  box.appendChild(c6);
  /* ⑦ 出口 */
  const c7=el('div','card');c7.appendChild(el('h3','','⑦ 出口・純資産の目安'));
  const H=Math.round(+G.holdYears||1);
  const landF=r.c.landPrice*Math.pow(1+(+G.landAppr||0)/100,H);
  const balH=r.cf[r.cf.length-1]?.bal||0,cumH=r.cf[r.cf.length-1]?.cum||0;
  c7.appendChild(el('div','grid2',`<span class="g-k">${H}年後の土地価格</span><span class="g-v">${yen(landF)}</span><span class="g-k">土地 含み損益</span><span class="g-v ${landF-r.c.landPrice>=0?'pos':'neg'}">${(landF-r.c.landPrice>=0?'+':'')+yen(landF-r.c.landPrice)}</span><span class="g-k">${H}年後の残債</span><span class="g-v">${yen(balH)}</span><span class="g-k">土地−残債（簡易純資産）</span><span class="g-v ${landF-balH>=0?'pos':'neg'}">${yen(landF-balH)}</span><span class="g-k">累計CF込み</span><span class="g-v ${landF-balH+cumH>=0?'pos':'neg'}">${yen(landF-balH+cumH)}</span>`));
  c7.appendChild(el('div','hint','建物残存価値・売却諸費用・譲渡税・原状回復は未反映の概算。賃貸併用は「住居費削減＋強制的な元本返済＋土地資産」で成立を判断（逆レバ許容の方針）。'));
  box.appendChild(c7);}
