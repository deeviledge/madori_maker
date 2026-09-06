/* 18-cards.js — モード対応カード・税比較・自宅モード・出口・延床チェック
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= モード対応カード ================= */
function renderCFTreeCard(r){const c=el('div','card');c.appendChild(el('h3','','キャッシュフローツリー<span class="tag">初年度・年額</span>'));
  const full=r.rentYear,vac=full-r.effRent,opex=r.effRent-r.noi,noi=r.noi,pay=r.payA1,zei=r.tx1.tax,cfPre=noi-pay,cfPost=cfPre-zei;
  const base=Math.max(1,full);
  const vacPct=r.rentYear?f1((1-r.effRent/r.rentYear)*100):'—';
  /* ウォーターフォール（各行＝満室家賃を100%とした横バー＋金額） */
  const wf=el('div','cfwf');
  const row=(lb,val,col,{sub,tot,sign}={})=>{
    const w=Math.min(100,Math.abs(val)/base*100);
    const amtCls=sign?(val>=0?'pos':'neg'):'';
    const disp=(sign?(val>=0?'+':'−'):(sign===false?'−':''))+f0(Math.abs(val))+'万';
    return `<div class="r ${sub?'sub':''} ${tot?'tot':''}"><span class="lb">${lb}</span>`+
      `<span class="track"><span class="fill" style="width:${w}%;background:${col}"></span></span>`+
      `<span class="amt ${amtCls}">${disp}</span></div>`;};
  wf.innerHTML=
    row('満室家賃',full,'#0E7C86')+
    row('− 空室損 '+vacPct+'%',vac,'#B9C4CF',{sub:true,sign:false})+
    row('− 運営費',opex,'#C79A2E',{sub:true,sign:false})+
    row('＝ NOI',noi,'#2E7D5B',{tot:true})+
    row('− ローン返済',pay,'#7A8794',{sub:true,sign:false})+
    row('＝ 税引前CF',cfPre,cfPre>=0?'#34506B':'#C0453B',{tot:true,sign:true})+
    row((zei<=0?'＋ 税の節税効果':'− 税額'),Math.abs(zei),zei<=0?'#2E7D5B':'#C0453B',{sub:true,sign:false})+
    row('＝ 税引後CF',cfPost,cfPost>=0?'#34506B':'#C0453B',{tot:true,sign:true});
  c.appendChild(wf);
  c.appendChild(el('div','refnote','各バーは「満室家賃」を基準にした比率。左の項目名と右の金額で必ず数値が読めます。'+(cfPre<0?'本件は税引前CFがマイナス＝毎年の持ち出しがある状態（逆レバ）。自宅部分の住居費削減・元本返済・土地資産で判断します。':'')));
  return c;}
function renderJudgeCard(r){const j=investJudge(r);const c=el('div','card');c.appendChild(el('h3','','投資判断<span class="tag">合格ライン=任意設定</span>'));
  const J=state.judge||(state.judge=defJudge());
  /* 現状値 */
  c.appendChild(el('div','grid2',
    `<span class="g-k">実質利回り ROI（税引前CF÷投資総額）</span><span class="g-v ${j.roiOK?'pos':'neg'}"><b>${f1(j.roi)}%</b></span>`+
    `<span class="g-k">損益分岐点 BER（支出÷満室家賃）</span><span class="g-v ${j.berOK?'pos':'neg'}">${f1(j.be)}%</span>`+
    `<span class="g-k">レバレッジ</span><span class="g-v ${r.yieldGap>=0?'pos':'neg'}">${r.yieldGap>=0?'正':'負(逆レバ)'}</span>`));
  /* 任意合格ライン設定 */
  const js=el('div','judgeset');
  js.appendChild(el('div','jrow','<span>合格ライン（自分の基準で設定）</span>'));
  const jg=el('div','row2');
  jg.appendChild(fNum('合格 ROI（%以上）',J.roiPass,.5,v=>{J.roiPass=v||0;render();}));
  jg.appendChild(fNum('合格 BER（%以下）',J.berPass,1,v=>{J.berPass=v||0;render();}));
  js.appendChild(jg);
  js.appendChild(el('div','jrow',`<span>ROI 判定（${f1(j.roi)}% ${j.roiOK?'≥':'<'} ${f1(j.roiPass)}%）</span><b class="${j.roiOK?'chip-yes':'chip-no'}">${j.roiOK?'○ 合格':'× 未達'}</b>`));
  js.appendChild(el('div','jrow',`<span>BER 判定（${f1(j.be)}% ${j.berOK?'≤':'>'} ${f1(j.berPass)}%）</span><b class="${j.berOK?'chip-yes':'chip-no'}">${j.berOK?'○ 合格':'× 未達'}</b>`));
  js.appendChild(el('div','jrow',`<span><b>総合判定</b></span><b class="${j.passAll?'chip-yes':'chip-no'}" style="font-size:14px">${j.passAll?'✓ 合格':'✗ 基準未達'}</b>`));
  /* ケース別 参考値 */
  const ref=document.createElement('table');ref.className='judgeref';
  ref.innerHTML='<tr><th>ケース（目的）</th><th>合格ROI目安</th><th>合格BER目安</th></tr>'+
    '<tr><td>賃貸併用住宅（自宅重視・逆レバ許容）</td><td>0〜1%</td><td>90〜100%</td></tr>'+
    '<tr><td>賃貸併用住宅（収益も両立）</td><td>1〜2%</td><td>85%</td></tr>'+
    '<tr><td>区分マンション投資</td><td>2〜3%</td><td>85%</td></tr>'+
    '<tr><td>一棟RC（都心・低利回り安定）</td><td>2〜3%</td><td>80%</td></tr>'+
    '<tr><td>一棟木造アパート（標準）</td><td>3〜4%</td><td>75〜80%</td></tr>'+
    '<tr><td>築古高利回り（地方・リスク高）</td><td>5%以上</td><td>70%以下</td></tr>';
  js.appendChild(el('div','hint','▼ 目的別の合格ライン参考値（タップで上の欄に手入力）'));
  js.appendChild(ref);
  c.appendChild(js);
  /* BFコンサル式 3×3 参考マトリクス */
  c.appendChild(subttl('参考：BFコンサル式 3×3マトリクス'));
  const mx=document.createElement('table');mx.className='jmx';
  const cols=['4%以上','4〜3%','3%未満'];const rows=[['75%未満',['○','△','×']],['75〜80%',['△','△','×']],['80%以上',['×','×','×']]];
  const profIdx=r&&(j.roi>=4?0:(j.roi>=3?1:2));const safeIdx=j.be<75?0:(j.be<=80?1:2);
  let html='<tr><th>安全性＼収益性</th>'+cols.map(x=>`<th>${x}</th>`).join('')+'</tr>';
  rows.forEach((row,ri)=>{html+='<tr><th>'+row[0]+'</th>'+row[1].map((v,ci)=>{const hit=ri===safeIdx&&ci===profIdx;return `<td class="${hit?'hit':''}">${v}</td>`;}).join('')+'</tr>';});
  mx.innerHTML=html;c.appendChild(mx);
  const g=j.grade;const gi=g==='○'?0:(g==='×'?2:1);
  c.appendChild(el('div','grade g'+gi,g));
  c.appendChild(el('div','refnote','ROIは税引前CF÷投資総額、BER（損益分岐点）は（運営費＋ローン返済）÷満室家賃。上の「合格ライン」は物件タイプや投資方針で変わるため、参考表を目安に自分の基準を設定してください。3×3マトリクスはBFコンサル式の一般的な目安（○=良好／△=要検討／×=見送り）。'));
  return c;}
/* ================= 個人／法人 税引後CF比較（初年度） ================= */
function renderEntityCompareCard(r){const sc=state,c=r.c;
  const noi=r.noi,int=(r.schA.yr[0]?.int)||0,dep=deprForYear(1,sc,c,r.rentalRatio);
  const taxable=noi-int*r.rentalRatio-dep;              /* 不動産課税所得（按分後） */
  const pRate=+sc.tax.marginalRate||0,cRate=+sc.tax.corpRate||0;
  const pTax=taxable*pRate/100;                          /* 個人：給与と損益通算前提（赤字は節税） */
  const cTax=Math.max(0,taxable)*cRate/100;              /* 法人：赤字は繰越（当期税0） */
  const cfPre=noi-r.payA1;
  const pCF=cfPre-pTax,cCF=cfPre-cTax;
  const cur=sc.tax.entity;
  const cell=(v,cls)=>`<td class="${cls||''}">${v}</td>`;
  const money=v=>(v<0?'−':'')+f0(Math.abs(v))+'万';
  const taxCell=v=>cell((v<=0?'+':'−')+f0(Math.abs(v))+'万');   /* +=節税 −=納税 */
  const card=el('div','card');card.appendChild(el('h3','','個人 vs 法人（初年度・税引後CF比較）<span class="tag">'+(cur==='corp'?'現在:法人':'現在:個人')+'</span>'));
  const t=document.createElement('table');t.className='enttbl';
  const pWin=pCF>=cCF;
  t.innerHTML='<tr class="hd"><th>項目</th><th>個人</th><th>法人</th></tr>'+
    `<tr><td>適用税率</td>${cell(f1(pRate)+'%')}${cell(f1(cRate)+'%')}</tr>`+
    `<tr><td>不動産課税所得</td>${cell(money(taxable))}${cell(money(taxable))}</tr>`+
    `<tr><td>税額（＋節税/−納税）</td>${taxCell(pTax)}${taxCell(cTax)}</tr>`+
    `<tr><td>税引前CF</td>${cell(money(cfPre))}${cell(money(cfPre))}</tr>`+
    `<tr><td>税引後CF（初年度）</td>${cell('<b>'+money(pCF)+'</b>',pWin?'win':'')}${cell('<b>'+money(cCF)+'</b>',!pWin?'win':'')}</tr>`;
  card.appendChild(t);
  card.appendChild(el('div','refnote','💡 個人は不動産赤字を給与所得と損益通算できる前提（赤字なら節税）。法人は当期赤字を最大10年繰越（当期税0）。'+(taxable<0?'本件は初年度が赤字のため、給与の高い個人の方が節税メリットが出やすい局面です。':'黒字化後は実効税率の低い側が有利になります。')+'税率は融資タブの税効果設定（個人=限界税率 '+f1(pRate)+'%／法人=実効税率 '+f1(cRate)+'%）に連動。青色控除・事業税・消費税・社会保険は未反映の簡易比較。'));
  return card;}
/* ================= 自宅購入モード：収支（収益なし） ================= */
function renderHomeSim(box,G,r){
  const bd=el('div','badges');
  bd.appendChild(el('div','badge','<div class="bk">月返済(初回)</div><div class="bv">'+fmt(r.schA.firstMonthly,1)+'万</div>'));
  const dedM=r.dedEnabled?r.ded1/12:0;
  const netHouse=r.payA1/12-dedM;
  bd.appendChild(el('div','badge '+(netHouse<=+G.currentRent?'ok':'warn'),'<div class="bk">実質住居費/月</div><div class="bv">'+f1(netHouse)+'万</div>'));
  bd.appendChild(el('div','badge','<div class="bk">総返済額</div><div class="bv">'+yen(r.schA.totPay)+'</div>'));
  box.appendChild(bd);
  box.appendChild(el('div','hint','自宅購入モードです。賃貸収入・利回り・出口売却は計算対象外。住宅ローンの返済と住宅ローン控除・実質負担のみを表示します。'));
  /* 返済 */
  const c1=el('div','card');c1.appendChild(el('h3','','住宅ローン返済<span class="tag">'+r.LN.name+' / '+yen(r.loan)+'</span>'));
  c1.appendChild(el('div','hint','金利・期間・方式は融資タブの採用プランで変更します。'));
  const first=r.schA.yr[0]||{pay:0,int:0,pri:0};
  c1.appendChild(el('div','grid2',`<span class="g-k">月返済(初回)</span><span class="g-v"><b>${fmt(r.schA.firstMonthly,1)}万</b></span><span class="g-k">年返済(初年度)</span><span class="g-v">${f0(first.pay)}万</span><span class="g-k">うち利息(初年度)</span><span class="g-v">${f0(first.int)}万</span><span class="g-k">総利息</span><span class="g-v">${yen(r.schA.totInt)}</span><span class="g-k">総返済額</span><span class="g-v">${yen(r.schA.totPay)}</span>`));
  c1.appendChild(subttl('金利上昇ストレス'));
  c1.appendChild(el('div','refnote','❓ <b>なぜ見るのか</b>：変動金利は将来上がる可能性があり、上昇すると毎月の返済額が増えます。返済期間が長い住宅ローンでは、+1%程度上がっても家計が耐えられるかを事前に確認しておくと安心です。全期間固定なら影響はありません。'));
  c1.appendChild(chk(`${G.stressAfter}年後に金利 +${G.stressAdd}% を反映`,G.stressOn,v=>{G.stressOn=v;render();}));
  const st=el('div','row2');st.appendChild(fNum('上昇タイミング(年後)',G.stressAfter,1,v=>{G.stressAfter=v||0;render();}));st.appendChild(fNum('上昇幅(%)',G.stressAdd,.25,v=>{G.stressAdd=v||0;render();}));c1.appendChild(st);
  const series=[{vals:r.schA.yr.map(y=>y.bal),color:'#16232F',width:2}];
  if(r.schStress)series.push({vals:r.schStress.yr.map(y=>y.bal),color:'#C0453B',width:1.6,dash:'5 4'});
  c1.appendChild(chartBox('ローン残債の推移（万円 / 年）',chart({n:r.schA.yr.length,series}),r.schStress?'━ 基本　┅ ストレス':''));
  box.appendChild(c1);
  /* 控除・実質住居費 */
  const c2=el('div','card');c2.appendChild(el('h3','','住宅ローン控除・実質住居費'));
  if(r.need50||mode()==='home'){c2.appendChild(chk('住宅ローン控除を反映する',G.dedOn,v=>{G.dedOn=v;render();}));
    const dd=el('div','row2');dd.appendChild(fNum('控除率(%)',G.dedRate,.1,v=>{G.dedRate=v||0;render();}));dd.appendChild(fNum('控除年数',G.dedYears,1,v=>{G.dedYears=v||0;render();}));c2.appendChild(dd);
    c2.appendChild(fNum('対象残高の上限(万円)',G.dedCap,100,v=>{G.dedCap=v||0;render();}));}
  const homeDed=(G.dedOn)?dedForYear(1,r.schA,r.loan,1,G,state):0;/* 自宅モードは全額自宅→ownRatio=1 */
  const netM=r.payA1/12-homeDed/12;
  c2.appendChild(el('div','grid2',`<span class="g-k">ローン返済/月</span><span class="g-v">−${fmt(r.payA1/12,1)}万</span><span class="g-k">住宅ローン控除/月</span><span class="g-v pos">+${fmt(homeDed/12,1)}万</span>`));
  c2.appendChild(el('div','big',`<span class="k">実質住居費（初年度・月）</span><span class="v">${fmt(netM,1)} 万円</span>`));
  const diff=(+G.currentRent||0)-netM;
  c2.appendChild(ratioBox('現在の家賃 '+f1(+G.currentRent||0)+'万 との差',(diff>=0?'✓ 月 '+f1(diff)+'万 軽くなる':'△ 月 '+f1(-diff)+'万 重くなる'),diff>=0?'ok':'warn'));
  box.appendChild(c2);
  box.appendChild(infoCard('🏠 住宅ローン減税（控除）の詳細',
    '<p>年末のローン残高の<span class="hl">0.7%</span>が所得税から直接引かれます（税額控除）。所得税で引ききれない分は<b>住民税からも</b>控除されます（上限あり）。</p>'+
    '<div class="step"><span class="n">率</span><span>控除率 0.7% ／ 最大 '+f0(+G.dedYears||13)+'年間</span></div>'+
    '<div class="step"><span class="n">上限</span><span>対象残高の上限 '+f0(+G.dedCap||0)+'万円（住宅の省エネ性能で変動）</span></div>'+
    '<div class="step"><span class="n">手続</span><span><b>入居1年目は確定申告</b>が必須（源泉徴収票・残高証明書・登記事項証明書等）。2年目以降は年末調整で自動</span></div>'+
    '<p style="color:#54677A;font-size:10px">※新築は省エネ基準適合が要件。自宅の売却益には3,000万円特別控除など投資用と異なる特例があります。制度は改正されるため最新情報／税理士で確認を。</p>'));
  /* 資産価値の目安（簡易） */
  const c3=el('div','card');c3.appendChild(el('h3','','参考：資産と残債の推移'));
  const hy=el('div','row2');hy.appendChild(fNum('保有・分析年数',G.holdYears,1,v=>{G.holdYears=Math.max(1,v||1);render();}));hy.appendChild(fNum('土地値上がり率(%/年)',G.landAppr,.1,v=>{G.landAppr=v||0;render();}));c3.appendChild(hy);
  const H=Math.round(+G.holdYears||1);const landF=r.c.landPrice*Math.pow(1+(+G.landAppr||0)/100,H);const balH=r.schA.yr[Math.min(H,r.schA.yr.length)-1]?.bal||0;
  c3.appendChild(el('div','grid2',`<span class="g-k">${H}年後の土地価格(概算)</span><span class="g-v">${yen(landF)}</span><span class="g-k">${H}年後のローン残債</span><span class="g-v">${yen(balH)}</span><span class="g-k">土地−残債(簡易純資産)</span><span class="g-v ${landF-balH>=0?'pos':'neg'}">${yen(landF-balH)}</span>`));
  c3.appendChild(el('div','hint','建物価値の減耗・売却諸費用は未反映の概算です。自宅は売却益課税に3,000万円特別控除等があり、投資物件とは扱いが異なります。'));
  box.appendChild(c3);}
/* ================= 出口・売却ビュー ================= */
function renderExitView(){const box=$('exitView');box.innerHTML='';const r=financeCalc();const X=state.exit;
  box.appendChild(el('div','viewtitle','出口<small>売却・IRR・純資産</small>'));
  const ex=exitCalc(state,r);
  const bd=el('div','badges');
  bd.appendChild(el('div','badge','<div class="bk">保有'+ex.H+'年 想定売却</div><div class="bv">'+yen(ex.base.price)+'</div>'));
  bd.appendChild(el('div','badge '+(ex.base.cfSell>=0?'ok':'warn'),'<div class="bk">売却時CF</div><div class="bv">'+(ex.base.cfSell>=0?'+':'')+yen(ex.base.cfSell)+'</div>'));
  bd.appendChild(el('div','badge '+((ex.postIRR||0)>=0?'ok':'warn'),'<div class="bk">税引後IRR</div><div class="bv">'+(ex.postIRR==null?'—':f1(ex.postIRR)+'%')+'</div>'));
  bd.appendChild(el('div','badge','<div class="bk">マルチプル</div><div class="bv">'+fmt(ex.multiple,2)+'</div>'));
  box.appendChild(bd);
  /* 出口条件 */
  const c0=el('div','card');c0.appendChild(el('h3','','出口条件'));
  const g1=el('div','row2');g1.appendChild(fNum('保有年数',X.holdYears,1,v=>{X.holdYears=Math.max(1,v||1);state.finance.holdYears=X.holdYears;render();}));g1.appendChild(fNum('売却時 想定Cap(%)',X.exitCapRate,.1,v=>{X.exitCapRate=v||0;render();}));c0.appendChild(g1);
  const g2=el('div','row2');g2.appendChild(fNum('Cap上振れストレス(%)',X.capRateStress,.1,v=>{X.capRateStress=v||0;render();}));g2.appendChild(fNum('売却諸費用(%)',X.sellCostPct,.5,v=>{X.sellCostPct=v||0;render();}));c0.appendChild(g2);
  c0.appendChild(chk('長期譲渡（保有5年超・個人20.315%）',X.longTerm,v=>{X.longTerm=v;render();}));
  c0.appendChild(el('div','refnote','売却価格＝保有末NOI ÷ 出口Cap（直接還元）。税務簿価＝土地取得原価＋建物未償却残高。譲渡益＝売却価格−簿価−諸費用。'+(state.tax.entity==='corp'?'法人は法人実効税率で課税。':'個人は長期20.315%/短期39.63%。')));
  box.appendChild(c0);
  /* 複数Cap 売却試算（カード型・視認性重視） */
  const c1=el('div','card');c1.appendChild(el('h3','','複数Cap（利回り）での売却試算<span class="tag">Cap↑=価格↓</span>'));
  c1.appendChild(el('div','hint','出口Capが高い（買主の要求利回りが高い）ほど売却価格は下がります。想定＝出口条件のCap。'));
  const caps=[X.exitCapRate-1,X.exitCapRate,X.exitCapRate+1,X.exitCapRate+2].filter(v=>v>0);
  const rows1=caps.map(cap=>{const price=cap>0?ex.noiH/(cap/100):0;const net=price*(1-(+X.sellCostPct||0)/100);const gain=price-ex.book-price*(+X.sellCostPct||0)/100;const tax=Math.max(0,gain)*ex.capGainTaxRate/100;const cfSell=net-ex.balH-tax;return{cap,price,net,gain,tax,cfSell,base:Math.abs(cap-X.exitCapRate)<.001};});
  const maxAbs=Math.max(1,...rows1.map(r2=>Math.abs(r2.cfSell)));
  const wrap1=el('div','capsim');
  rows1.forEach(r2=>{const row=el('div','caprow'+(r2.base?' base':''));
    const w=Math.min(50,Math.abs(r2.cfSell)/maxAbs*50);
    row.innerHTML=
      `<div class="caphd"><span class="capv">${f1(r2.cap)}%</span>${r2.base?'<span class="captag">想定</span>':''}`+
      `<span class="capprice">売却価格 <b>${yen(r2.price)}</b></span></div>`+
      `<div class="capgrid"><span class="k">譲渡益</span><span class="v ${r2.gain>=0?'pos':'neg'}">${yen(r2.gain)}</span>`+
      `<span class="k">譲渡税</span><span class="v">−${f0(r2.tax)}万</span>`+
      `<span class="k">売却手取り(−諸費用)</span><span class="v">${yen(r2.net)}</span>`+
      `<span class="k">−残債</span><span class="v">−${yen(ex.balH)}</span></div>`+
      `<div class="capcf"><span class="lb">売却時CF</span>`+
      `<span class="capbar"><span class="z"></span><span class="fill ${r2.cfSell>=0?'pos':'neg'}" style="width:${w}%"></span></span>`+
      `<span class="amt ${r2.cfSell>=0?'pos':'neg'}">${(r2.cfSell>=0?'+':'')+yen(r2.cfSell)}</span></div>`;
    wrap1.appendChild(row);});
  c1.appendChild(wrap1);
  c1.appendChild(el('div','grid2',`<span class="g-k">保有末NOI</span><span class="g-v">${f0(ex.noiH)}万</span><span class="g-k">税務簿価(土地+建物)</span><span class="g-v">${yen(ex.book)}</span><span class="g-k">ブレイクイーブン売却価格(残債+税前)</span><span class="g-v">${yen(ex.balH)}〜</span>`));
  box.appendChild(c1);
  /* 収益指標 IRR/MIRR/マルチプル */
  const c2=el('div','card');c2.appendChild(el('h3','','収益指標（保有→売却の総合）'));
  c2.appendChild(el('div','irrrow',
    `<span>税引前IRR</span><b>${ex.preIRR==null?'—':f1(ex.preIRR)+'%'}</b>`+
    `<span>税引後IRR</span><b>${ex.postIRR==null?'—':f1(ex.postIRR)+'%'}</b>`+
    `<span>税引前MIRR</span><b>${ex.preMIRR==null?'—':f1(ex.preMIRR)+'%'}</b>`+
    `<span>税引後MIRR</span><b>${ex.postMIRR==null?'—':f1(ex.postMIRR)+'%'}</b>`+
    `<span>マルチプル(回収/自己資金)</span><b>${fmt(ex.multiple,2)}</b>`+
    `<span>自己資金</span><b>${yen(ex.equity)}</b>`));
  c2.appendChild(el('div','refnote','IRRは「−自己資金 → 各年税後CF → 最終年に売却時CFを加算」の内部収益率。MIRRは再投資・借入金利を'+f1(+state.finance.rateActual||1)+'%と仮定。マルチプルは(累計CF＋売却時CF＋自己資金)÷自己資金。'));
  box.appendChild(c2);
  /* 純資産の推移（B/S簡易） */
  const c3=el('div','card');c3.appendChild(el('h3','','純資産（購入→売却）'));
  c3.appendChild(el('div','grid2',
    `<span class="g-k">保有期間 累計税後CF</span><span class="g-v ${ex.cumCF>=0?'pos':'neg'}">${yen(ex.cumCF)}</span>`+
    `<span class="g-k">売却手取り(価格−諸費用)</span><span class="g-v">${yen(ex.base.net)}</span>`+
    `<span class="g-k">− 残債</span><span class="g-v">−${yen(ex.balH)}</span>`+
    `<span class="g-k">− 譲渡税</span><span class="g-v">−${f0(ex.base.tax)}万</span>`+
    `<span class="g-k">＝ 売却時CF</span><span class="g-v ${ex.base.cfSell>=0?'pos':'neg'}"><b>${yen(ex.base.cfSell)}</b></span>`+
    `<span class="g-k">純資産(累計CF＋売却時CF)</span><span class="g-v ${(ex.cumCF+ex.base.cfSell)>=0?'pos':'neg'}"><b>${yen(ex.cumCF+ex.base.cfSell)}</b></span>`));
  box.appendChild(c3);}


/* ================= 延床の法規チェックカード ================= */
function renderFloorCapCard(c){c=c||computeCost();const reg=landReg(state);const agg=buildingAgg();
  const actual=agg.gross;                      /* 実際の延床（間取りの壁芯合計・容積対象含む） */
  const cap=reg.maxFloor;                        /* 法規上の延床上限 */
  const over=actual-cap;const okCap=actual<=cap+0.01;
  const farUsed=reg.area>0?actual/reg.area*100:0;
  const card=el('div','card');
  card.appendChild(el('h3','','⚖ 延床の法規チェック<span class="tag">'+(okCap?'OK':'超過')+'</span>'));
  /* ゲージ */
  const pct=cap>0?Math.min(120,actual/cap*100):0;
  const gauge=el('div','');gauge.style.cssText='margin:2px 0 8px';
  gauge.innerHTML=`<div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink-soft);margin-bottom:3px"><span>実延床 ${f1(actual)}㎡</span><span>上限 ${f1(cap)}㎡</span></div>
    <div style="height:16px;background:#EEF2F6;border-radius:8px;overflow:hidden;position:relative">
      <div style="height:100%;width:${Math.min(100,pct)}%;background:${okCap?'linear-gradient(90deg,#2E7D5B,#0E7C86)':'linear-gradient(90deg,#C97A1E,#B4402F)'};border-radius:8px"></div>
      <div style="position:absolute;top:0;left:100%;transform:translateX(-1px);height:100%;width:2px;background:#16232F"></div>
    </div>
    <div style="text-align:right;font-size:9.5px;color:var(--ink-soft);margin-top:2px">消化率 ${f1(pct)}%（対 上限）</div>`;
  card.appendChild(gauge);
  card.appendChild(el('div','grid2',
    `<span class="g-k">敷地面積</span><span class="g-v">${f1(reg.area)}㎡ / ${f1(reg.areaT)}坪</span>`+
    `<span class="g-k">有効容積率${reg.roadLimited?'（道路制限）':''}</span><span class="g-v ${reg.roadLimited?'neg':''}">${f0(reg.effFar)}%</span>`+
    `<span class="g-k">容積上限の延床</span><span class="g-v">${f1(reg.farFloor)}㎡</span>`+
    `<span class="g-k">建ぺい×階数の延床</span><span class="g-v">${f1(reg.stackFloor)}㎡（${reg.floors}階）</span>`+
    `<span class="g-k">建築可能な延床（上限）</span><span class="g-v"><b>${f1(cap)}㎡</b>（${reg.bind}）</span>`+
    `<span class="g-k">現在の実延床</span><span class="g-v ${okCap?'pos':'neg'}"><b>${f1(actual)}㎡</b></span>`+
    `<span class="g-k">残り / 超過</span><span class="g-v ${okCap?'pos':'neg'}"><b>${okCap?'残 '+f1(cap-actual)+'㎡':'超過 '+f1(over)+'㎡'}</b></span>`+
    `<span class="g-k">実効容積率（実延床÷敷地）</span><span class="g-v ${farUsed<=reg.effFar+0.5?'':'neg'}">${f1(farUsed)}%</span>`));
  card.appendChild(ratioBox(okCap?'✅ 法規上限内に収まっています':'⛔ 延床が法規上限を超えています',
    okCap?`容積率${f0(reg.effFar)}%・建ぺい率${f0(state.land.bcrLimit)}%・${reg.floors}階の条件で、あと ${f1(cap-actual)}㎡（${f1((cap-actual)/TSUBO)}坪）増やせます。`
    :`このままでは建築確認が下りません。各階の面積を合計 ${f1(over)}㎡（${f1(over/TSUBO)}坪）減らすか、敷地・容積率・階数の条件を見直してください。`,
    okCap?'ok':'ng'));
  /* 各階の実床内訳 */
  const tb=document.createElement('table');tb.className='cost';tb.style.marginTop='8px';
  tb.innerHTML='<tr><th>階</th><th>実延床(㎡)</th><th>建築面積(㎡)</th><th>建ぺい判定</th></tr>';
  let footMax=0;
  state.floors.forEach(f=>{const t=floorTotalsSc(f,state);footMax=Math.max(footMax,t.basis.bcr);
    tr_append(tb,[f.name,f1(t.gross),f1(t.basis.bcr),t.basis.bcr<=reg.footprint+0.01?'✓':'⚠']);});
  card.appendChild(tb);
  const bA=builtArea();
  const bcrPct=reg.area>0?bA/reg.area*100:0;
  card.appendChild(el('div','grid2',`<span class="g-k">建築面積（全階の水平投影）</span><span class="g-v ${bA<=reg.footprint+0.01?'pos':'neg'}">${f1(bA)}㎡ / 上限${f1(reg.footprint)}㎡</span><span class="g-k">うち最大の階単体</span><span class="g-v">${f1(footMax)}㎡</span><span class="g-k">建ぺい率（実）</span><span class="g-v ${bcrPct<=(+state.land.bcrLimit)+0.5?'pos':'neg'}">${f1(bcrPct)}% / ${f0(state.land.bcrLimit)}%</span>`));
  if(reg.roadLimited)card.appendChild(el('div','refnote','⚠ 前面道路が狭いため容積率が指定値より下がっています（前面道路 '+f1(reg.road)+'m ×係数'+reg.coef+'×100='+f0(reg.roadFar)+'%）。土地タブで道路幅員を確認してください。'));
  card.appendChild(el('div','hint','実延床は間取りタブの各階（壁芯）合計。容積対象外の面積（バルコニー・一定の共用部等）は自治体の算定で控除される場合があり、この簡易チェックより余裕が出ることがあります。'));
  return card;}
function tr_append(tb,cells){const tr=document.createElement('tr');cells.forEach((c,i)=>{const td=document.createElement('td');td.textContent=c;if(i===0)td.style.textAlign='left';tr.appendChild(td);});tb.appendChild(tr);}
