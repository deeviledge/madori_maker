/* 13-view-loan.js — 融資ビュー
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= 融資ビュー ================= */
const LOANTYPES={jutaku:{label:'住宅ローン',cls:'jutaku',desc:'低金利・最長35年。自宅50%以上要件。住宅ローン控除が使える。'},apart:{label:'アパートローン',cls:'apart',desc:'賃貸事業向けパッケージ。賃料の収入合算可。控除なし・金利高め。'},proper:{label:'プロパー融資',cls:'proper',desc:'銀行独自の事業性融資。条件は個別交渉、DSCR等の事業性評価。'}};
function calcPlan(LN,c,G,mRent,income,agg){
  const loan=Math.max(0,c.total-(+G.equity||0));
  const sch=schedule(loan,+LN.rate,+LN.years,LN.method,null);
  const pay1=sch.yr[0]?sch.yr[0].pay:0;
  const incomeEff=income+mRent*12*(+LN.includeRentPct||0)/100;
  const payS=annMonthly(loan,(+LN.rateScreen)/100/12,LN.years*12)*12;
  const dsrS=incomeEff>0?payS/incomeEff*100:0;
  const cap=(LN.capAmount!=null&&LN.capAmount!=='')?+LN.capAmount:Infinity;
  const base=agg.B.own+agg.B.rental,own=base>0?agg.B.own/base*100:0;
  const need50=LN.type==='jutaku',ok50=!need50||own>=50;
  const fee=loan*(+LN.feePct||0)/100;
  return{loan,sch,pay1,incomeEff,payS,dsrS,cap,capOk:loan<=cap,own,need50,ok50,fee};}
function renderLoanView(){const box=$('loanView');box.innerHTML='';const G=state.finance,c=computeCost(),agg=buildingAgg();
  box.appendChild(el('div','viewtitle','融資<small>銀行・ローンパターンと税効果</small>'));
  const income=(+G.incomeSelf||0)+(+G.incomePartner||0),mRent=rentTotal(state);
  const r=financeCalc();
  const bd=el('div','badges');
  bd.appendChild(el('div','badge','<div class="bk">借入必要額</div><div class="bv">'+yen(r.loan)+'</div>'));
  bd.appendChild(el('div','badge','<div class="bk">採用プラン</div><div class="bv" style="font-size:13px">'+r.LN.name+'</div>'));
  bd.appendChild(el('div','badge '+(r.capOk?'ok':'ng'),'<div class="bk">融資上限 '+yen(r.capAmount)+'</div><div class="bv">'+(r.capOk?'✓ 上限内':'✗ '+yen(r.loan-r.capAmount)+'超過')+'</div>'));
  bd.appendChild(el('div','badge '+(r.dsrS<=r.LN.dsrLimit?'ok':'ng'),'<div class="bk">返済比率(審査)</div><div class="bv">'+f1(r.dsrS)+'%</div>'));
  box.appendChild(bd);
  /* 資金計画 */
  const cd0=el('div','card');cd0.appendChild(el('h3','','資金計画（共通）'));
  /* --- 借入形態（単独／収入合算／ペアローン） --- */
  const BORROWMODES=[['single','単独'],['combined','収入合算'],['pair','ペアローン']];
  const bm=G.borrowMode||'combined';
  cd0.appendChild(el('div','fieldlbl','借入形態'));
  const bseg=el('div','segrow','');
  BORROWMODES.forEach(([v,lb])=>{const b=document.createElement('button');b.type='button';b.textContent=lb;
    b.className=(bm===v?'on':'');b.onclick=()=>{G.borrowMode=v;render();};bseg.appendChild(b);});
  cd0.appendChild(bseg);
  cd0.appendChild(el('div','hint',
    bm==='single'?'本人1人で借ります。パートナーの年収は審査にも税計算にも使いません。'
    :bm==='combined'?'2人の年収を合算して1本で借ります（収入合算）。住宅ローン控除と損益通算は<b>主たる債務者（年収の高い方）1人分</b>として計算します。'
    :'2人がそれぞれ借ります。<b>借入割合＝持分</b>とみなし、住宅ローン控除・不動産所得の損益通算を<b>各自別々に</b>計算します。'));
  const inc=el('div','row2');
  inc.appendChild(fNum((G.nameSelf||'本人')+'の年収(万)',G.incomeSelf,10,v=>{G.incomeSelf=v||0;render();}));
  if(bm!=='single')inc.appendChild(fNum((G.namePartner||'パートナー')+'の年収(万)',G.incomePartner,10,v=>{G.incomePartner=v||0;render();}));
  cd0.appendChild(inc);
  if(bm==='pair'){
    const sp=el('div','row2');
    sp.appendChild(fSelect('借入の配分',[['income','年収比で自動'],['manual','本人の借入額を指定']],G.pairSplit||'income',v=>{G.pairSplit=v;render();}));
    if((G.pairSplit||'income')==='manual')
      sp.appendChild(fNum((G.nameSelf||'本人')+'の借入額(万)',G.pairSelfLoan!=null?G.pairSelfLoan:Math.round(r.loan/2),100,v=>{G.pairSelfLoan=v;render();}));
    cd0.appendChild(sp);
  }
  const eq=el('div','row2');eq.appendChild(fNum('自己資金(万)',G.equity,50,v=>{G.equity=v||0;render();}));eq.appendChild(fNum('現在の家賃(万/月)',G.currentRent,.5,v=>{G.currentRent=v||0;render();}));cd0.appendChild(eq);
  cd0.appendChild(el('div','grid2',`<span class="g-k">総事業費</span><span class="g-v">${yen(c.total)}</span><span class="g-k">− 自己資金</span><span class="g-v">${yen(+G.equity||0)}</span><span class="g-k">＝ 借入必要額</span><span class="g-v"><b>${yen(r.loan)}</b></span>`+(mode()!=='home'?`<span class="g-k">想定賃料（レントロール計）</span><span class="g-v">${f1(mRent)} 万/月</span>`:'')));
  box.appendChild(cd0);
  /* --- 借主ごとの内訳 --- */
  if(r.borrowers&&r.borrowers.length){
    const bw=el('div','card');
    bw.appendChild(el('h3','','借主ごとの内訳'+(r.pairOn?'<span class="tag">ペアローン</span>':'')));
    const cw=el('div','comp');const tb=document.createElement('table');
    const head='<tr class="hd"><th>項目</th>'+r.borrowers.map(p=>`<th>${esc(p.name)}</th>`).join('')+'</tr>';
    const brows=[
      ['年収',p=>yen(p.income)],
      ['借入割合',p=>f1(p.ratio*100)+'%'],
      ['借入額',p=>yen(p.loan)],
      ['年収倍率の上限',p=>yen(Math.max(p.maxSalary,p.maxCombined))],
      ['枠内か',p=>p.capOk?'<b style="color:var(--ok)">✓</b>':'<b style="color:var(--ng)">✗ '+yen(p.loan-Math.max(p.maxSalary,p.maxCombined))+'超</b>'],
      ['返済比率(審査)',p=>`<b style="color:${p.dsrS>(+r.LN.dsrLimit||100)?'var(--ng)':'var(--ok)'}">${f1(p.dsrS)}%</b>`],
      ['課税所得(概算)',p=>yen(p.prof.taxable)],
      ['適用税率',p=>f1(p.rate)+'%'+(p.roomUsed?'':'<small style="color:var(--ink-soft)">（手入力）</small>')],
      ['控除に使える税額/年',p=>p.roomUsed?yen(p.prof.dedRoom):'<span style="color:var(--ink-soft)">頭打ちなし</span>']
    ];
    let body='';brows.forEach(([lb,fn])=>{body+='<tr><td>'+lb+'</td>'+r.borrowers.map(p=>'<td>'+fn(p)+'</td>').join('')+'</tr>';});
    tb.innerHTML=head+body;cw.appendChild(tb);bw.appendChild(cw);
    bw.appendChild(el('div','refnote','💡 課税所得・限界税率・控除に使える税額は、年収から給与所得控除・社会保険料（'+f1(+state.tax.socialPct||0)+'%）・その他所得控除（'+f0(+state.tax.deductOther||0)+'万円）を引いた概算です。控除に使える税額＝所得税額＋住民税からの控除上限（課税所得の5%・最大9.75万円）。設定は下の「税効果」で変えられます。'
      +(r.pairOn?'　ペアローンは<b>借入割合＝持分</b>として各自で計算します。金利・年数は採用プランの条件を2人共通で使います。':'')));
    box.appendChild(bw);
  }
  /* 銀行・ローンパターン */
  const cd1=el('div','card');cd1.appendChild(el('h3','','銀行・融資パターン<span class="tag">タップで採用</span>'));
  cd1.appendChild(el('div','hint','複数の銀行×商品を登録して比較。<b>採用</b>したプランが収支・比較・PDFに反映されます。50%ルールは住宅ローンのみ要件として判定します。'));
  state.loans.forEach((LN,idx)=>{const pl=calcPlan(LN,c,G,mRent,income,agg);const T=LOANTYPES[LN.type]||LOANTYPES.jutaku;
    const card=el('div','loancard'+(LN.id===state.activeLoanId?' active':''));
    const h=el('div','lc-h');
    const radio=document.createElement('input');radio.type='radio';radio.name='lnact';radio.checked=LN.id===state.activeLoanId;radio.style.cssText='width:20px;height:20px;accent-color:var(--accent)';radio.onchange=()=>{state.activeLoanId=LN.id;render();};
    h.appendChild(radio);
    h.appendChild(el('b','',LN.name+'　<span style="font-weight:400;color:#54677A">'+(LN.product||'')+'</span>'));
    h.appendChild(el('span','ltag '+T.cls,T.label));
    card.appendChild(h);
    const ok=pl.ok50&&pl.capOk&&pl.dsrS<=LN.dsrLimit;
    card.appendChild(el('div','lcmini',
      `<span>月返済(初回)</span><b>${fmt(pl.sch.firstMonthly,1)} 万</b>`+
      `<span>総利息</span><b>${yen(pl.sch.totInt)}</b>`+
      `<span>審査年収(合算${LN.includeRentPct||0}%)</span><b>${yen(pl.incomeEff)}</b>`+
      `<span>返済比率(審査${LN.rateScreen}%)</span><b style="color:${pl.dsrS<=LN.dsrLimit?'var(--ok)':'var(--ng)'}">${f1(pl.dsrS)}%</b>`+
      `<span>融資上限</span><b style="color:${pl.capOk?'var(--ok)':'var(--ng)'}">${pl.cap===Infinity?'—':yen(pl.cap)} ${pl.capOk?'✓':'✗'}</b>`+
      `<span>50%要件</span><b style="color:${pl.ok50?'var(--ok)':'var(--ng)'}">${pl.need50?(f1(pl.own)+'% '+(pl.ok50?'✓':'✗')):'対象外'}</b>`+
      `<span>事務手数料(${LN.feePct}%)</span><b>${f0(pl.fee)} 万</b>`+
      `<span>税メリット</span><b>${LN.type==='jutaku'?'ローン控除':'減価償却(賃貸部)'}</b>`));
    card.appendChild(el('div','hint',ok?'✓ このプランは主要条件をクリアしています':'⚠ 条件未達の項目があります'));
    /* 編集 */
    const det=document.createElement('details');const sm=document.createElement('summary');sm.textContent='条件を編集…';sm.style.cssText='cursor:pointer;font-size:12px;color:var(--accent);margin-top:4px';det.appendChild(sm);
    const ed=el('div','');
    ed.appendChild(fText('銀行名',LN.name,v=>{LN.name=v;}));
    ed.appendChild(fText('商品名',LN.product||'',v=>{LN.product=v;}));
    ed.appendChild(fSelect('ローン種別',[['jutaku','住宅ローン（50%要件・控除あり）'],['apart','アパートローン（賃料合算・償却）'],['proper','プロパー融資（事業性）']],LN.type,v=>{LN.type=v;render();}));
    ed.appendChild(el('div','refnote',LOANTYPES[LN.type]?.desc||''));
    const e1=el('div','row3');e1.appendChild(fNum('実行金利(%)',LN.rate,.05,v=>{LN.rate=v||0;render();}));e1.appendChild(fNum('審査金利(%)',LN.rateScreen,.1,v=>{LN.rateScreen=v||0;render();}));e1.appendChild(fNum('期間(年)',LN.years,1,v=>{LN.years=Math.max(1,v||1);render();}));ed.appendChild(e1);
    const e2=el('div','row3');e2.appendChild(fSelect('返済方式',[['annuity','元利均等'],['principal','元金均等']],LN.method,v=>{LN.method=v;render();}));e2.appendChild(fNum('返済比率上限(%)',LN.dsrLimit,1,v=>{LN.dsrLimit=v||0;render();}));e2.appendChild(fNum('賃料合算(%)',LN.includeRentPct,10,v=>{LN.includeRentPct=v||0;render();}));ed.appendChild(e2);
    const e3=el('div','row2');e3.appendChild(fNum('融資上限額(万)',LN.capAmount!=null?LN.capAmount:'',100,v=>{LN.capAmount=v;render();},'なし'));e3.appendChild(fNum('事務手数料(%)',LN.feePct,.1,v=>{LN.feePct=v||0;render();}));ed.appendChild(e3);
    ed.appendChild(fText('メモ',LN.note||'',v=>{LN.note=v;}));
    const rmr=el('div','miniact');rmr.appendChild(btn('⧉ 複製',()=>{const cp=clone(LN);cp.id=nid('L');cp.name=LN.name+' コピー';state.loans.splice(idx+1,0,cp);render();}));
    if(state.loans.length>1)rmr.appendChild(btn('🗑 このプランを削除',()=>{if(!confirm(LN.name+' を削除しますか？'))return;state.loans.splice(idx,1);if(state.activeLoanId===LN.id)state.activeLoanId=state.loans[0].id;render();},'del'));
    ed.appendChild(rmr);
    det.appendChild(ed);card.appendChild(det);
    cd1.appendChild(card);});
  cd1.appendChild(btn('＋ 銀行・プランを追加',()=>{state.loans.push({id:nid('L'),name:'新規銀行',product:'',type:'jutaku',rate:1.0,rateScreen:3.5,years:35,method:'annuity',dsrLimit:35,includeRentPct:0,capAmount:null,feePct:2.2,note:''});render();}));
  box.appendChild(cd1);
  /* プラン横断比較 */
  const cd2=el('div','card');cd2.appendChild(el('h3','','プラン比較表'));
  const cw=el('div','comp');const t=document.createElement('table');
  let hd='<tr class="hd"><th>項目</th>';state.loans.forEach(LN=>{hd+=`<th>${LN.name}${LN.id===state.activeLoanId?' ★':''}</th>`;});hd+='</tr>';
  const plans=state.loans.map(LN=>({LN,pl:calcPlan(LN,c,G,mRent,income,agg)}));
  const rows2=[
   ['種別',p=>LOANTYPES[p.LN.type].label],
   ['金利 / 期間',p=>f1(p.LN.rate)+'% / '+p.LN.years+'年'],
   ['月返済',p=>fmt(p.pl.sch.firstMonthly,1)+'万'],
   ['総利息',p=>yen(p.pl.sch.totInt)],
   ['返済比率(審査)',p=>f1(p.pl.dsrS)+'%'+(p.pl.dsrS<=p.LN.dsrLimit?' ✓':' ✗')],
   ['融資上限',p=>p.pl.capOk?'✓':'✗ 超過'],
   ['50%要件',p=>p.pl.need50?(p.pl.ok50?'✓ '+f1(p.pl.own)+'%':'✗ '+f1(p.pl.own)+'%'):'—'],
   ['税メリット',p=>p.LN.type==='jutaku'?'控除':'償却'],
   ['事務手数料',p=>f0(p.pl.fee)+'万']];
  let bodyH='';rows2.forEach(([lb,fn])=>{bodyH+='<tr><td>'+lb+'</td>';plans.forEach(pp=>{bodyH+='<td>'+fn(pp)+'</td>';});bodyH+='</tr>';});
  t.innerHTML=hd+bodyH;cw.appendChild(t);cd2.appendChild(cw);box.appendChild(cd2);
  /* 税効果設定 */
  const T=state.tax;
  const cd3=el('div','card');cd3.appendChild(el('h3','','税効果の設定（キャッシュへの影響）'));
  cd3.appendChild(chk('不動産所得の税計算を反映（減価償却・利息の賃貸按分）',T.rentalTaxOn,v=>{T.rentalTaxOn=v;render();}));
  cd3.appendChild(el('div','segrow',''));
  const seg=cd3.lastChild;const bp=document.createElement('button'),bc=document.createElement('button');
  bp.textContent='個人（所得税・住民税）';bc.textContent='法人（法人実効税率）';
  bp.className=T.entity==='personal'?'on':'';bc.className=T.entity==='corp'?'on':'';
  bp.onclick=()=>{T.entity='personal';render();};bc.onclick=()=>{T.entity='corp';render();};
  seg.appendChild(bp);seg.appendChild(bc);
  const t1=el('div','row2');
  if(T.entity==='corp')t1.appendChild(fNum('法人実効税率(%)',T.corpRate,1,v=>{T.corpRate=v||0;render();}));
  else t1.appendChild(fSelect('税率の決め方',[['auto','年収から自動計算'],['manual','限界税率を手入力']],T.rateMode||'auto',v=>{T.rateMode=v;render();}));
  t1.appendChild(fNum('設備割合(%)',T.equipPct,5,v=>{T.equipPct=v||0;render();}));cd3.appendChild(t1);
  if(T.entity!=='corp'){
    if((T.rateMode||'auto')==='auto'){
      const ta=el('div','row2');
      ta.appendChild(fNum('社会保険料の本人負担(%)',T.socialPct,.1,v=>{T.socialPct=v||0;render();}));
      ta.appendChild(fNum('その他所得控除(万)',T.deductOther,1,v=>{T.deductOther=v||0;render();}));
      cd3.appendChild(ta);
      cd3.appendChild(chk('住宅ローン控除を「その人の税額」で頭打ちにする',T.dedCapByTax,v=>{T.dedCapByTax=v;render();}));
      cd3.appendChild(el('div','grid2',r.borrowers.map(p=>
        `<span class="g-k">${esc(p.name)}の限界税率</span><span class="g-v"><b>${f1(p.autoRate)}%</b>（課税所得 ${yen(p.prof.taxable)}）</span>`).join('')));
    }else{
      cd3.appendChild(fNum('限界税率(所得+住民 %)',T.marginalRate,1,v=>{T.marginalRate=v||0;render();}));
      cd3.appendChild(el('div','hint','手入力の税率を全員に適用します。年収ごとの税率・住宅ローン控除の頭打ちを反映したい場合は「年収から自動計算」を選んでください。'));
    }
  }
  const t2=el('div','row2');t2.appendChild(fNum('躯体 償却年数',T.bodyYears,1,v=>{T.bodyYears=Math.max(1,v||22);render();}));t2.appendChild(fNum('設備 償却年数',T.equipYears,1,v=>{T.equipYears=Math.max(1,v||15);render();}));cd3.appendChild(t2);
  {const si2=structInfo(state.structure||'wood');cd3.appendChild(el('div','ratio '+(T.bodyYears===si2.years?'ok':'warn'),`<span>構造：${esc(si2.label)}</span><span>法定耐用年数 ${si2.years}年 ${T.bodyYears===si2.years?'✓反映済':'（現在'+T.bodyYears+'年）'}</span>`));}
  cd3.appendChild(el('div','hint','躯体の償却年数は構造で決まります（コストタブ②の「構造（工法）」で選択）。中古取得の場合は法定年数より短くなる（簡便法）ため、手入力で上書きもできます。'));
  cd3.appendChild(chk('繰越欠損を翌年以降に繰越（法人10年・個人青色3年目安）',T.carryLoss,v=>{T.carryLoss=v;render();}));
  const rr2=financeCalc();
  cd3.appendChild(el('div','grid2',`<span class="g-k">${mode()==='invest'?'償却対象(建物)':'賃貸割合（面積按分）'}</span><span class="g-v">${mode()==='invest'?yen((rr2.c.buildingPrice+rr2.c.extrasSum)*rr2.rentalRatio):f1(rr2.rentalRatio*100)+'%'}</span><span class="g-k">減価償却（初年度）</span><span class="g-v">${f0(rr2.tx1.dep)} 万/年</span><span class="g-k">課税所得（初年度）</span><span class="g-v ${rr2.tx1.taxable<=0?'pos':''}">${f0(rr2.tx1.taxable)} 万</span><span class="g-k">税額（＋納税/−節税）</span><span class="g-v ${rr2.tx1.tax<=0?'pos':'neg'}">${f0(rr2.tx1.tax)} 万/年</span>`));
  cd3.appendChild(el('div','refnote','💡 法定耐用年数（住宅用・躯体）：木造22年／軽量鉄骨19〜27年／重量鉄骨34年／RC・SRC・WRC47年（いずれも設備は15年・定額法）。'+(T.entity==='corp'?'法人は実効税率約34%（外形標準前は約23%）。繰越欠損は最大10年。':'個人は限界税率（所得税＋住民税）。年収1,620万円世帯は33〜43%区分。赤字は給与と損益通算可（土地取得利息分は制限あり）。')+'　※青色申告特別控除・事業税・消費税は未反映の簡易計算。'));
  box.appendChild(cd3);
  /* 税金でお金が戻る仕組み（基礎解説） */
  box.appendChild(infoCard('💰 税金で「お金が戻る」仕組み（基礎）',
    '<p>不動産の家賃収入から経費（減価償却・ローン<b>利息</b>・管理費・固都税など）を引いた「不動産所得」が<span class="hl">赤字</span>になると、給与所得と合算（損益通算）して所得税・住民税が下がります。</p>'+
    '<div class="step"><span class="n">1</span><span>1年間の家賃・経費を集計し「不動産所得」を計算</span></div>'+
    '<div class="step"><span class="n">2</span><span>赤字なら給与所得から差し引く（損益通算）</span></div>'+
    '<div class="step"><span class="n">3</span><span><b>確定申告</b>（翌年2/16〜3/15）で、給与から源泉徴収された所得税が<span class="hl">還付</span>（口座に振込）</span></div>'+
    '<div class="step"><span class="n">4</span><span>住民税は<b>翌年6月〜</b>の天引き額が減る形で軽減</span></div>'+
    '<p>ポイントは<b>減価償却</b>。実際にはお金が出ていかないのに経費にできるため、<span class="hl">手元キャッシュは黒字でも会計は赤字</span>という状態を作れて節税になります。ただし建物を償却しきると経費が急減し、税金が増えてCFが悪化する「<b>デッドクロス</b>」に注意（収支タブ⑤のグラフ参照）。</p>'+
    '<p style="color:#54677A;font-size:10px">※土地取得のための借入利息は損益通算の対象外（制限あり）。青色申告特別控除（最大65万円）・事業税・消費税は本ツール未反映。実際の申告は税理士へ。</p>'));
}
