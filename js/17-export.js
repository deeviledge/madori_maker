/* 17-export.js — エクスポート（PDF / Excel / CSV / SVG）
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= エクスポート ================= */
function buildExportSheet(){const box=$('exportSheetBody');box.innerHTML='';
  const fullBtn=btn('📄 全タブまとめPDF資料を作成（推奨）',()=>{exportFullPdf(state);});fullBtn.style.cssText='background:var(--accent);color:#fff;font-weight:700;padding:13px;width:100%;margin-bottom:6px';box.appendChild(fullBtn);
  box.appendChild(el('div','hint','↑ 表紙・全タブを1冊にまとめたプレゼン資料PDF。下は項目を選んで出す従来版です。'));
  box.appendChild(el('div','hint','出力したい項目を選んで形式を選択。PDFは銀行提出用の体裁、Excelは項目別シートで出力します。'));
  const M=mode();
  const opts=[
   ['plan_cur','現在の階の平面図（PNG/SVG）',1],
   ['plan_all','全階の平面図',1],
   ['summary','物件概要・面積表',1],
   ['cost','資金計画（コスト内訳・積算）',1],
   ['loan','融資計画（採用プラン・比較）',1],
   ...(M!=='home'?[['rent','レントロール',1],['yield','利回り分析',1]]:[]),
   ['cf',M==='home'?'返済・住居費':'年次キャッシュフロー',1],
   ['repay','返済年表・金利比較',1],
   ...(M!=='home'?[['exit','出口・売却・IRR',M==='invest'?1:0]]:[]),
   ['sched','事業スケジュール',0],
   ['compare','シナリオ比較表',0]];
  const list=el('div','exlist');
  window._exSel=window._exSel||{};
  opts.forEach(([k,lb,def])=>{if(window._exSel[k]===undefined)window._exSel[k]=def;
    const l=document.createElement('label');const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!window._exSel[k];cb.onchange=()=>{window._exSel[k]=cb.checked;};
    l.appendChild(cb);l.appendChild(document.createTextNode(lb));list.appendChild(l);});
  box.appendChild(list);
  const q=el('div','miniact');
  q.appendChild(btn('全選択',()=>{opts.forEach(([k])=>window._exSel[k]=true);buildExportSheet();}));
  q.appendChild(btn('全解除',()=>{opts.forEach(([k])=>window._exSel[k]=false);buildExportSheet();}));
  box.appendChild(q);
  box.appendChild(subttl('出力形式'));
  const g=el('div','');g.style.cssText='display:flex;flex-direction:column;gap:8px';
  const bpdf=btn('📄 PDF（銀行提出用）を出力',()=>{exportPDF(state);});bpdf.style.cssText='background:var(--ink);color:#fff;font-weight:700;padding:12px';g.appendChild(bpdf);
  const bxls=btn('📊 Excel（項目別シート）を出力',()=>{exportExcel(state);});bxls.style.cssText='background:#1D6F42;color:#fff;font-weight:700;padding:12px';g.appendChild(bxls);
  const bimg=el('div','miniact');bimg.appendChild(btn('🖼 現在の階をPNG',()=>{exportPng();}));bimg.appendChild(btn('🖼 現在の階をSVG',()=>{exportSvg();}));g.appendChild(bimg);
  box.appendChild(g);
  box.appendChild(subttl('シナリオ別 一括PDF'));
  const sc=el('div','');sc.style.cssText='display:flex;flex-direction:column;gap:6px';
  store.scenarios.forEach(s2=>{sc.appendChild(btn('📄 '+s2.name+' のPDF',()=>{exportPDF(s2);}));});
  box.appendChild(sc);}
/* --- 平面図をSVG文字列で取得（任意シナリオ・階） --- */
function floorSVG(sc,f,px){px=px||38;let mr=f.footW,mb=f.footH;
  f.rooms.forEach(r=>{const b=bbox(r.poly);mr=Math.max(mr,b.x+b.w);mb=Math.max(mb,b.y+b.h);});
  f.elems.forEach(e=>{mr=Math.max(mr,e.x+e.w);mb=Math.max(mb,e.y+e.h);});
  const M=1.1,off=M*.6*px,W=(mr+M)*px,H=(mb+M)*px;
  let s=`<svg xmlns="${SVGNS}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#fff"/><g transform="translate(${off},${off})">`;
  for(let x=0;x<=mr+1e-6;x+=0.91)s+=`<line x1="${x*px}" y1="0" x2="${x*px}" y2="${mb*px}" stroke="#EEF2F6"/>`;
  for(let y=0;y<=mb+1e-6;y+=0.91)s+=`<line x1="0" y1="${y*px}" x2="${mr*px}" y2="${y*px}" stroke="#EEF2F6"/>`;
  f.rooms.forEach(r=>{const col=SPACE[r.type]?.color||'#34506B';s+=`<polygon points="${r.poly.map(([x,y])=>x*px+','+y*px).join(' ')}" fill="${hexA(col,.16)}" stroke="${col}" stroke-width="1.2"/>`;
    const[cx,cy]=centroid(r.poly),ar=polyArea(r.poly);s+=`<text x="${cx*px}" y="${cy*px-4}" font-size="11" font-weight="700" text-anchor="middle" fill="#16232F">${esc(r.name)}</text><text x="${cx*px}" y="${cy*px+10}" font-size="9" text-anchor="middle" fill="#54677A">${f1(ar)}㎡</text>`;});
  s+=`<rect x="0" y="0" width="${f.footW*px}" height="${f.footH*px}" fill="none" stroke="#16232F" stroke-width="2"/></g></svg>`;
  return s;}
function esc(t){return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
/* --- PDF用インラインSVGチャート（文字列） --- */
function pdfChart(opts){const W=opts.w||720,H=opts.h||210,padL=54,padR=14,padT=14,padB=26;
  const n=opts.n,iw=W-padL-padR,ih=H-padT-padB;let mn=0,mx=0;
  opts.series.forEach(se=>se.vals.forEach(v=>{if(v==null)return;mn=Math.min(mn,v);mx=Math.max(mx,v);}));
  if(mx===mn)mx=mn+1;const pd=(mx-mn)*.08;mx+=pd;if(mn<0)mn-=pd;
  const Y=v=>padT+ih-(v-mn)/(mx-mn)*ih,X=i=>padL+(n<=1?iw/2:i/(n-1)*iw),XB=i=>padL+i/n*iw;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  for(let t=0;t<=4;t++){const v=mn+(mx-mn)*t/4,y=Y(v);s+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#E3EAEF"/><text x="${padL-6}" y="${y+3}" font-size="9" text-anchor="end" fill="#54677A">${Math.abs(v)>=10000?(v/10000).toFixed(1)+'億':f0(v)}</text>`;}
  if(mn<0)s+=`<line x1="${padL}" y1="${Y(0)}" x2="${W-padR}" y2="${Y(0)}" stroke="#54677A"/>`;
  const step=Math.max(1,Math.ceil(n/10));
  for(let i=0;i<n;i+=step)s+=`<text x="${opts.bar?XB(i)+iw/n/2:X(i)}" y="${H-8}" font-size="9" text-anchor="middle" fill="#54677A">${(opts.x0||1)+i}</text>`;
  opts.series.forEach(se=>{
    if(se.type==='bar'){const bw=Math.max(2,iw/n*.6);se.vals.forEach((v,i)=>{if(v==null)return;const x=XB(i)+(iw/n-bw)/2,y0=Y(0),y1=Y(v);s+=`<rect x="${x}" y="${Math.min(y0,y1)}" width="${bw}" height="${Math.max(1,Math.abs(y0-y1))}" fill="${v>=0?(se.color||'#0E7C86'):(se.negColor||'#C0453B')}" opacity="0.85"/>`;});}
    else{let d='';se.vals.forEach((v,i)=>{if(v==null)return;d+=(d?' L ':'M ')+X(i)+' '+Y(v);});s+=`<path d="${d}" fill="none" stroke="${se.color||'#16232F'}" stroke-width="${se.width||2}" stroke-dasharray="${se.dash||''}"/>`;}
  });
  return s+`</svg>`;}
/* --- PDF用ウォーターフォール（CFツリー）SVG文字列 --- */
function pdfWaterfall(rows,base){const W=720,rowH=30,H=rows.length*rowH+8,labW=150,barW=W-labW-120;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>`;
  rows.forEach((r,i)=>{const y=i*rowH+4,w=Math.min(barW,Math.abs(r.val)/base*barW);
    s+=`<text x="0" y="${y+rowH/2+4}" font-size="11" fill="${r.tot?'#16232F':'#54677A'}" font-weight="${r.tot?'700':'400'}">${esc(r.lb)}</text>`;
    s+=`<rect x="${labW}" y="${y+6}" width="${barW}" height="${rowH-14}" fill="#F1F5F8" rx="4"/>`;
    s+=`<rect x="${labW}" y="${y+6}" width="${w}" height="${rowH-14}" fill="${r.col}" rx="4"/>`;
    s+=`<text x="${W}" y="${y+rowH/2+4}" font-size="11" text-anchor="end" font-weight="700" fill="${r.val<0?'#B4402F':(r.tot?'#16232F':'#1E7A45')}">${(r.val<0?'−':(r.sign?'+':''))+f0(Math.abs(r.val))}万</text>`;});
  return s+`</svg>`;}
/* --- PDF: 印刷ウィンドウ方式 --- */
/* ================= 全タブまとめ プレゼン資料PDF ================= */
function exportFullPdf(sc){migrateScenario(sc);const r=financeCalc(sc);const agg=buildingAggSc(sc);
  const base=agg.B.own+agg.B.rental,own=base>0?agg.B.own/base*100:0;const M=mode();const now=new Date().toLocaleDateString('ja-JP');
  const j=investJudge(r);const ex=(M!=='home')?exitCalc(sc,r):null;
  const title=M==='invest'?'不動産投資 事業計画書':(M==='home'?'住宅取得 資金計画書':'賃貸併用住宅 事業計画書');
  const modeLabel=M==='invest'?'収益物件':(M==='home'?'自宅':'賃貸併用');
  /* 税比較 */
  const noiV=r.noi,intV=(r.schA.yr[0]?.int)||0,depV=deprForYear(1,sc,r.c,r.rentalRatio);
  const taxable=noiV-intV*r.rentalRatio-depV,pRate=+sc.tax.marginalRate||0,cRate=+sc.tax.corpRate||0;
  const pTax=taxable*pRate/100,cTax=Math.max(0,taxable)*cRate/100,cfPreY=noiV-r.payA1;
  /* CFツリー rows */
  const full=r.rentYear,vac=full-r.effRent,opex=r.effRent-r.noi,pay=r.payA1,zei=r.tx1.tax,cfPre=r.noi-pay,cfPost=cfPre-zei;
  const wfRows=[{lb:'満室家賃',val:full,col:'#0E7C86'},{lb:'− 空室損',val:-vac,col:'#B9C4CF'},{lb:'− 運営費',val:-opex,col:'#C79A2E'},{lb:'＝ NOI',val:r.noi,col:'#2E7D5B',tot:1},{lb:'− ローン返済',val:-pay,col:'#7A8794'},{lb:'＝ 税引前CF',val:cfPre,col:cfPre>=0?'#34506B':'#C0453B',tot:1,sign:cfPre>=0},{lb:(zei<=0?'＋ 税の節税':'− 税額'),val:-zei,col:zei<=0?'#2E7D5B':'#C0453B'},{lb:'＝ 税引後CF',val:cfPost,col:cfPost>=0?'#34506B':'#C0453B',tot:1,sign:cfPost>=0}];
  /* charts */
  const cfBar=pdfChart({n:r.cf.length,bar:true,series:[{type:'bar',vals:r.cf.map(x=>x.cf),color:'#0E7C86',negColor:'#C0453B'},{vals:r.cf.map(x=>x.cum),color:'#16232F',width:2}]});
  const balLine=pdfChart({n:r.schA.yr.length,series:[{vals:r.schA.yr.map(y=>y.bal),color:'#34506B',width:2}]});
  const rentLine=pdfChart({n:35,series:[{vals:(function(){const a=[];for(let y=1;y<=35;y++)a.push(r.mRent*12*ageFactor(y,sc.rent.curve));return a;})(),color:'#0E7C86',width:2}]});
  const P=[];/* pages */
  /* ---- 表紙 ---- */
  P.push(`<section class="cover">
    <div class="ctop"><span class="badge">${modeLabel}プラン</span><span class="brandc">MADORI STUDIO</span></div>
    <h1>${title}</h1>
    <div class="scen">${esc(sc.name)}</div><div class="date">作成日 ${now}</div>
    <div class="hero">
      <div class="hcard"><div class="k">総事業費</div><div class="v">${yen(r.c.total)}</div></div>
      <div class="hcard"><div class="k">自己資金</div><div class="v">${yen(+sc.finance.equity||0)}</div></div>
      <div class="hcard"><div class="k">借入額</div><div class="v">${yen(r.loan)}</div></div>
      ${M!=='home'?`<div class="hcard"><div class="k">表面利回り</div><div class="v">${f1(r.grossY)}%</div></div>
      <div class="hcard"><div class="k">NOI利回り</div><div class="v">${f1(r.netY)}%</div></div>
      <div class="hcard"><div class="k">${M==='invest'?'税引後IRR':'実質住居費/月'}</div><div class="v">${M==='invest'?(ex&&ex.postIRR!=null?f1(ex.postIRR)+'%':'—'):f1(r.netMonthly1)+'万'}</div></div>`
      :`<div class="hcard"><div class="k">月返済(初回)</div><div class="v">${fmt(r.schA.firstMonthly,1)}万</div></div>
      <div class="hcard"><div class="k">実質住居費/月</div><div class="v">${f1(r.payA1/12-(r.dedEnabled?r.ded1/12:0))}万</div></div>
      <div class="hcard"><div class="k">総返済額</div><div class="v">${yen(r.schA.totPay)}</div></div>`}
    </div>
    <div class="verdict">${M==='home'?`このプランの実質住居費は月 <b>${f1(r.payA1/12-(r.dedEnabled?r.ded1/12:0))}万円</b>（住宅ローン控除反映後）。現在家賃 ${f1(+sc.finance.currentRent||0)}万円との比較で検討します。`:`投資判断：ROI <b>${f1(j.roi)}%</b>（合格ライン ${f1(j.roiPass)}%）／ 損益分岐入居率 <b>${f1(j.be)}%</b>（合格 ${f1(j.berPass)}%）→ <b>${j.passAll?'✓ 合格':'✗ 基準未達'}</b>`}</div>
  </section>`);
  /* ---- サマリー・物件概要 ---- */
  let s1=`<div class="sec"><span class="secnum">01</span>エグゼクティブサマリー・物件概要</div>
    <div class="kpi">
      <div><div class="k">延床面積</div><div class="v">${f1(agg.gross)}㎡</div><div class="u">${f1(agg.gross/TSUBO)}坪</div></div>
      ${M!=='invest'?`<div><div class="k">自宅専有率</div><div class="v">${f1(own)}%</div><div class="u">${own>=50?'50%要件クリア':'50%未満'}</div></div>`:''}
      <div><div class="k">総事業費</div><div class="v">${yen(r.c.total)}</div></div>
      <div><div class="k">${M==='home'?'月返済':'NOI利回り'}</div><div class="v">${M==='home'?fmt(r.schA.firstMonthly,1)+'万':f1(r.netY)+'%'}</div></div>
    </div>
    <table><tr><th class="l">階</th><th>壁芯(㎡)</th><th>内法(㎡)</th>${M!=='invest'?'<th>自宅(㎡)</th>':''}${M!=='home'?'<th>賃貸(㎡)</th>':''}</tr>`;
  sc.floors.forEach(f=>{const t=floorTotalsSc(f,sc);s1+=`<tr><td class="l">${esc(f.name)}</td><td>${f1(t.gross)}</td><td>${f1(t.net)}</td>${M!=='invest'?`<td>${f1(t.basis.own)}</td>`:''}${M!=='home'?`<td>${f1(t.basis.rental)}</td>`:''}</tr>`;});
  s1+=`<tr><th class="l">合計</th><th>${f1(agg.gross)}</th><th>${f1(agg.net)}</th>${M!=='invest'?`<th>${f1(agg.B.own)}</th>`:''}${M!=='home'?`<th>${f1(agg.B.rental)}</th>`:''}</tr></table>
    <div class="note">敷地 ${f1(r.c.la)}㎡（${f1(r.c.lt)}坪）／ 用途地域 ${landReg(sc).info.label} ／ 建ぺい率 ${f1(r.c.bcrPct)}%（上限${sc.land.bcrLimit}%）・ 容積率 ${f1(r.c.farPct)}%（上限${sc.land.farLimit}%）／ 前面道路 ${f1(+sc.land.road||0)}m ／ 外壁後退 ${f1(+sc.land.setback||0)}m（建てられる建物枠 最大 ${f1(landReg(sc).buildW)}×${f1(landReg(sc).buildD)}m）</div>`;
  P.push(s1);
  /* ---- 平面図 ---- */
  let s2=`<div class="sec"><span class="secnum">02</span>平面図（全階）</div><div class="plans">`;
  sc.floors.forEach(f=>{s2+=`<div class="plan">${floorSVG(sc,f,30)}<div class="cap">${esc(f.name)}　外形 ${mm(f.footW)}×${mm(f.footH)}mm</div></div>`;});
  s2+=`</div>`;P.push(s2);
  /* ---- 資金計画 ---- */
  let s3=`<div class="sec"><span class="secnum">03</span>資金計画（総事業費）</div>
    <table><tr><th class="l">区分</th><th>金額</th><th>構成比</th></tr>
    <tr><td class="l">① 土地取得費</td><td>${yen(r.c.landPrice)}</td><td>${f1(r.c.landPrice/r.c.total*100)}%</td></tr>
    <tr><td class="l">② 建物本体（付帯込）</td><td>${yen(r.c.buildingPrice)}</td><td>${f1(r.c.buildingPrice/r.c.total*100)}%</td></tr>
    <tr><td class="l">③ 別途工事</td><td>${yen(r.c.extrasSum)}</td><td>${f1(r.c.extrasSum/r.c.total*100)}%</td></tr>
    <tr><td class="l">③ 諸費用</td><td>${yen(r.c.misc)}</td><td>${f1(r.c.misc/r.c.total*100)}%</td></tr>
    <tr><th class="l">総事業費</th><th>${yen(r.c.total)}</th><th>100%</th></tr></table>
    <div class="subh">建物本体 概算積算内訳</div><table><tr><th class="l">工事区分</th><th>構成比</th><th>概算</th></tr>`;
  r.c.seisan.forEach(x=>{s3+=`<tr><td class="l">${x.n}</td><td>${x.pc}%</td><td>${f0(x.amt)}万</td></tr>`;});
  s3+=`</table><div class="note">構造：${esc(structInfo(sc.structure||'wood').label)}（法定耐用年数 ${structInfo(sc.structure||'wood').years}年）／ 実効坪単価 ${f1(r.c.effUnit)}万/坪 ・ 施工床 ${f1(r.c.areaT)}坪</div>`;P.push(s3);
  /* ---- 借入計画 ---- */
  let s4=`<div class="sec"><span class="secnum">04</span>借入計画（銀行・ローン比較）</div>
    <div class="kpi"><div><div class="k">借入必要額</div><div class="v">${yen(r.loan)}</div></div>
    <div><div class="k">採用ローン</div><div class="v" style="font-size:13px">${esc(r.LN.name)}</div></div>
    <div><div class="k">月返済(初回)</div><div class="v">${fmt(r.schA.firstMonthly,1)}万</div></div>
    <div><div class="k">返済比率(審査)</div><div class="v">${f1(r.dsrS)}%</div></div></div>
    <table><tr><th class="l">銀行/商品</th><th>種別</th><th>金利</th><th>期間</th><th>月返済</th><th>返済比率</th><th>総利息</th></tr>`;
  sc.loans.forEach(LN=>{const pl=calcPlan(LN,r.c,sc.finance,r.mRent,r.income,agg);s4+=`<tr><td class="l">${esc(LN.name)}${LN.id===sc.activeLoanId?' ★採用':''}</td><td>${LOANTYPES[LN.type].label}</td><td>${f1(LN.rate)}%</td><td>${LN.years}年</td><td>${fmt(pl.sch.firstMonthly,1)}万</td><td>${f1(pl.dsrS)}%</td><td>${yen(pl.sch.totInt)}</td></tr>`;});
  s4+=`</table><div class="subh">ローン残債の推移</div>${balLine}`;P.push(s4);
  /* ---- 収支・利回り ---- */
  let s5=`<div class="sec"><span class="secnum">05</span>収支・利回り分析</div>`;
  if(M!=='home'){s5+=`<div class="cols"><div class="col">
    <div class="subh">利回り</div><table>
    <tr><td class="l">表面(総事業費)</td><td>${f1(r.grossY)}%</td></tr>
    <tr><td class="l">表面(建物のみ)</td><td>${f1(r.grossYB)}%</td></tr>
    <tr><td class="l">実効利回り</td><td>${f1(r.effY)}%</td></tr>
    <tr><td class="l">NOI利回り/FCR</td><td>${f1(r.netY)}%</td></tr></table></div>
    <div class="col"><div class="subh">安全性・借入</div><table>
    <tr><td class="l">DSCR</td><td>${fmt(r.dscr,2)}</td></tr>
    <tr><td class="l">返済比率(対家賃)</td><td>${f1(r.repayRatio)}%</td></tr>
    <tr><td class="l">経費率</td><td>${f1(r.expenseRatio)}%</td></tr>
    <tr><td class="l">損益分岐入居率(BER)</td><td>${f1(r.berRatio)}%</td></tr>
    <tr><td class="l">イールドギャップ</td><td>${f1(r.yieldGap)}pt</td></tr></table></div></div>
    <div class="subh">キャッシュフローツリー（初年度・年額）</div>${pdfWaterfall(wfRows,Math.max(1,full))}`;}
  else{s5+=`<div class="kpi"><div><div class="k">実質住居費/月</div><div class="v">${f1(r.payA1/12-(r.dedEnabled?r.ded1/12:0))}万</div></div>
    <div><div class="k">総返済額</div><div class="v">${yen(r.schA.totPay)}</div></div>
    <div><div class="k">総利息</div><div class="v">${yen(r.schA.totInt)}</div></div></div>`;}
  P.push(s5);
  /* ---- レントロール（賃貸あり） ---- */
  if(M!=='home'){let s6=`<div class="sec"><span class="secnum">06</span>レントロール（部屋別賃料）</div><table><tr><th class="l">階・部屋</th><th>面積㎡</th><th>賃料(万/月)</th><th>㎡単価</th><th>稼働</th></tr>`;
    rentUnits(sc).forEach(u=>{s6+=`<tr><td class="l">${esc(u.floor)} ${esc(u.name)}</td><td>${f1(u.area)}</td><td>${f1(u.rent)}</td><td>${u.area>0?f0(u.rent*10000/u.area)+'円':'—'}</td><td>${u.occ?'○':'空室'}</td></tr>`;});
    s6+=`<tr><th class="l">満室合計</th><th></th><th>${f1(r.mRent)}万/月</th><th>年 ${f0(r.rentYear)}万</th><th></th></tr></table>
    <div class="subh">満室賃料の推移（築年数別・万円/年）</div>${rentLine}`;P.push(s6);}
  /* ---- 投資判断（賃貸あり） ---- */
  if(M!=='home'){const gi=j.grade==='○'?'#1E7A45':(j.grade==='×'?'#B4402F':'#C79A2E');
    let s7=`<div class="sec"><span class="secnum">07</span>投資判断</div>
    <div class="verdictbox" style="border-color:${gi}"><div class="grade" style="color:${gi}">${j.grade}</div>
    <div class="vtxt"><b>${j.passAll?'合格ライン クリア':'基準未達'}</b><br>ROI ${f1(j.roi)}%（合格 ${f1(j.roiPass)}%）／ BER ${f1(j.be)}%（合格 ${f1(j.berPass)}%）／ レバレッジ ${r.yieldGap>=0?'正':'負(逆レバ)'}</div></div>
    <div class="subh">BFコンサル式 3×3マトリクス（安全性×収益性）</div>
    <table class="mx"><tr><th>安全性＼収益性</th><th>4%以上</th><th>4〜3%</th><th>3%未満</th></tr>`;
    const rows=[['75%未満',['○','△','×']],['75〜80%',['△','△','×']],['80%以上',['×','×','×']]];
    const profIdx=j.roi>=4?0:(j.roi>=3?1:2),safeIdx=j.be<75?0:(j.be<=80?1:2);
    rows.forEach((rw,ri)=>{s7+=`<tr><th>${rw[0]}</th>`+rw[1].map((v,ci)=>`<td class="${ri===safeIdx&&ci===profIdx?'hit':''}">${v}</td>`).join('')+`</tr>`;});
    s7+=`</table><div class="note">ROI=税引前CF÷投資総額、BER=（運営費＋返済）÷満室家賃。合格ラインは物件タイプ・方針に応じて設定した任意基準です。</div>`;P.push(s7);}
  /* ---- 税効果 ---- */
  let s8=`<div class="sec"><span class="secnum">08</span>税効果・${M==='home'?'住宅ローン控除':'個人／法人比較'}</div>`;
  if(M!=='home'){const pWin=(cfPreY-pTax)>=(cfPreY-cTax);
    s8+=`<table><tr><th class="l">初年度</th><th>個人</th><th>法人</th></tr>
    <tr><td class="l">適用税率</td><td>${f1(pRate)}%</td><td>${f1(cRate)}%</td></tr>
    <tr><td class="l">不動産課税所得</td><td>${(taxable<0?'−':'')+f0(Math.abs(taxable))}万</td><td>${(taxable<0?'−':'')+f0(Math.abs(taxable))}万</td></tr>
    <tr><td class="l">税額(＋節税/−納税)</td><td>${(pTax<=0?'+':'−')+f0(Math.abs(pTax))}万</td><td>${(cTax<=0?'+':'−')+f0(Math.abs(cTax))}万</td></tr>
    <tr><td class="l">税引前CF</td><td>${(cfPreY<0?'−':'')+f0(Math.abs(cfPreY))}万</td><td>${(cfPreY<0?'−':'')+f0(Math.abs(cfPreY))}万</td></tr>
    <tr><th class="l">税引後CF(初年度)</th><th class="${pWin?'win':''}">${((cfPreY-pTax)<0?'−':'')+f0(Math.abs(cfPreY-pTax))}万</th><th class="${!pWin?'win':''}">${((cfPreY-cTax)<0?'−':'')+f0(Math.abs(cfPreY-cTax))}万</th></tr></table>
    <div class="note">個人は不動産赤字を給与と損益通算（赤字＝節税）。法人は当期赤字を最大10年繰越。減価償却（初年度 ${f0(r.tx1.dep)}万）は現金支出なしの経費で節税に効くが、償却終了後は税増（デッドクロス）に注意。</div>`;}
  if(r.need50||M==='home'){s8+=`<div class="subh">住宅ローン控除</div><div class="note">年末残高の0.7%を所得税から控除（引ききれない分は住民税から）。最大${f0(+sc.finance.dedYears||13)}年間・対象残高上限${f0(+sc.finance.dedCap||0)}万円。初年度は確定申告、2年目以降は年末調整。${M!=='invest'?'賃貸併用は自宅部分の残高のみ対象（自宅50%以上が条件）。':''}</div>`;}
  P.push(s8);
  /* ---- 年次CF ---- */
  let s9=`<div class="sec"><span class="secnum">09</span>年次キャッシュフロー（税引後）</div>${cfBar}
    <table><tr><th>年</th><th>満室賃料</th><th>NOI</th><th>返済</th><th>税額</th><th>年CF</th><th>累計CF</th><th>残債</th></tr>`;
  r.cf.forEach(x=>{if(x.y<=10||x.y%5===0)s9+=`<tr><td>${x.y}</td><td>${f0(x.rent)}</td><td>${f0(x.noi)}</td><td>${f0(x.pay)}</td><td>${f0(x.tax)}</td><td>${f0(x.cf)}</td><td>${f0(x.cum)}</td><td>${f0(x.bal)}</td></tr>`;});
  const bkEven=r.cf.find(x=>x.cum>=0);s9+=`</table><div class="note">累計CF黒字化：${bkEven?bkEven.y+'年目':'分析期間内なし'} ／ 保有${sc.finance.holdYears}年 累計CF ${yen(r.cf[r.cf.length-1]?.cum||0)}</div>`;P.push(s9);
  /* ---- 出口 ---- */
  if(ex){let s10=`<div class="sec"><span class="secnum">10</span>出口・売却・収益指標</div>
    <div class="kpi"><div><div class="k">保有${ex.H}年 想定売却</div><div class="v">${yen(ex.base.price)}</div></div>
    <div><div class="k">売却時CF</div><div class="v">${yen(ex.base.cfSell)}</div></div>
    <div><div class="k">税引後IRR</div><div class="v">${ex.postIRR==null?'—':f1(ex.postIRR)+'%'}</div></div>
    <div><div class="k">マルチプル</div><div class="v">${fmt(ex.multiple,2)}</div></div></div>
    <table><tr><th class="l">複数Capでの売却試算</th><th>売却価格</th><th>譲渡益</th><th>売却時CF</th></tr>`;
    [sc.exit.exitCapRate-1,sc.exit.exitCapRate,sc.exit.exitCapRate+1,sc.exit.exitCapRate+2].filter(v=>v>0).forEach(cap=>{const price=ex.noiH/(cap/100),netp=price*(1-(+sc.exit.sellCostPct||0)/100),gain=price-ex.book-price*(+sc.exit.sellCostPct||0)/100,tax=Math.max(0,gain)*ex.capGainTaxRate/100,cfSell=netp-ex.balH-tax;
      s10+=`<tr><td class="l">Cap ${f1(cap)}%${Math.abs(cap-sc.exit.exitCapRate)<.01?' ★想定':''}</td><td>${yen(price)}</td><td>${yen(gain)}</td><td>${yen(cfSell)}</td></tr>`;});
    s10+=`</table><div class="note">税引前IRR ${ex.preIRR==null?'—':f1(ex.preIRR)+'%'} ／ 税引後IRR ${ex.postIRR==null?'—':f1(ex.postIRR)+'%'} ／ 純資産(累計CF＋売却時CF) ${yen(ex.cumCF+ex.base.cfSell)}。売却価格＝保有末NOI÷出口Cap（直接還元法）。</div>`;P.push(s10);}
  /* ---- 事業スケジュール ---- */
  let s11=`<div class="sec"><span class="secnum">${ex?'11':'10'}</span>事業スケジュール</div><table><tr><th class="l">タスク</th><th>区分</th><th>開始</th><th>期間</th><th>支出</th></tr>`;
  const SCLB={land:'土地',loan:'融資',design:'設計',build:'建築',lease:'募集',other:'他'};let totC=0;
  (sc.sched.items||[]).forEach(it=>{totC+=(+it.cost||0);s11+=`<tr><td class="l">${esc(it.name)}</td><td>${SCLB[it.cat]||'他'}</td><td>${it.start}ヶ月〜</td><td>${it.dur}ヶ月</td><td>${it.cost?f0(it.cost)+'万':'—'}</td></tr>`;});
  s11+=`<tr><th class="l">計画支出 合計</th><th></th><th></th><th></th><th>${yen(totC)}</th></tr></table>
    <div class="note">住宅ローンは竣工時実行が基本。土地代・着手金・中間金にはつなぎ融資や分割実行が必要（銀行に要確認）。</div>`;P.push(s11);
  /* ---- シナリオ比較 ---- */
  if(store.scenarios.length>1){let s12=`<div class="sec"><span class="secnum">${ex?'12':'11'}</span>シナリオ比較</div><table><tr><th class="l">指標</th>`;
    const cmp=store.scenarios.map(s2=>{migrateScenario(s2);return{s2,rr:financeCalc(s2)};});
    cmp.forEach(d=>{s12+=`<th>${esc(d.s2.name)}${d.s2.id===sc.id?' ★':''}</th>`;});s12+=`</tr>`;
    [['総事業費',d=>yen(d.rr.c.total)],['借入額',d=>yen(d.rr.loan)],['月返済',d=>fmt(d.rr.schA.firstMonthly,1)+'万'],['表面利回り',d=>f1(d.rr.grossY)+'%'],['NOI利回り',d=>f1(d.rr.netY)+'%'],['DSCR',d=>fmt(d.rr.dscr,2)],['初年度CF',d=>f0(d.rr.cf[0]?d.rr.cf[0].cf:0)+'万']].forEach(([lb,fn])=>{s12+=`<tr><td class="l">${lb}</td>`;cmp.forEach(d=>{s12+=`<td>${fn(d)}</td>`;});s12+=`</tr>`;});
    s12+=`</table>`;P.push(s12);}
  /* ---- 組み立て ---- */
  const pagesHtml=P.map((c,i)=>i===0?c:`<section class="page">${c}<div class="pfoot">${esc(sc.name)}　—　${title}　—　p.${i+1}</div></section>`).join('');
  const doc=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${esc(sc.name)}｜${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
  @page{size:A4;margin:0}*{box-sizing:border-box}
  body{font-family:'Noto Sans JP',sans-serif;color:#16232F;margin:0;font-size:11px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .cover{min-height:297mm;background:linear-gradient(150deg,#16232F 0%,#25516B 60%,#0E7C86 130%);color:#fff;padding:26mm 22mm;page-break-after:always}
  .cover .ctop{display:flex;justify-content:space-between;align-items:center}
  .cover .badge{display:inline-block;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);border-radius:20px;padding:5px 16px;font-size:12px;font-weight:700}
  .cover .brandc{font-size:11px;letter-spacing:2px;opacity:.7}
  .cover h1{font-size:36px;font-weight:900;margin:70px 0 10px;line-height:1.25}
  .cover .scen{font-size:18px;font-weight:700;opacity:.95}
  .cover .date{font-size:12px;opacity:.6;margin-top:6px}
  .cover .hero{display:flex;flex-wrap:wrap;gap:12px;margin-top:56px}
  .cover .hcard{flex:1 1 28%;min-width:130px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);border-radius:12px;padding:14px 16px}
  .cover .hcard .k{font-size:11px;opacity:.8}
  .cover .hcard .v{font-size:23px;font-weight:800;margin-top:4px}
  .cover .verdict{margin-top:40px;background:rgba(255,255,255,.14);border-radius:12px;padding:16px 18px;font-size:13.5px;line-height:1.7}
  .page{padding:16mm 15mm 18mm;page-break-after:always;position:relative;min-height:297mm}
  .page:last-child{page-break-after:auto}
  .sec{font-size:16px;font-weight:900;color:#16232F;border-left:6px solid #0E7C86;padding:3px 0 3px 12px;margin:0 0 14px}
  .secnum{font-family:'JetBrains Mono',monospace;color:#0E7C86;margin-right:8px}
  .subh{font-size:12px;font-weight:700;color:#34506B;margin:14px 0 6px}
  table{width:100%;border-collapse:collapse;margin:6px 0;font-size:10.5px}
  th,td{border:1px solid #C7D0D8;padding:5px 8px;text-align:right}th{background:#EEF2F6;text-align:left;font-weight:700}
  td.l,th.l{text-align:left}
  table.mx td,table.mx th{text-align:center}table.mx .hit{background:#0E7C86;color:#fff;font-weight:800}
  th.win{background:#E7F4EC}
  .kpi{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}
  .kpi>div{flex:1;min-width:118px;border:1px solid #C7D0D8;border-radius:8px;padding:9px 11px;background:#F7FAFB}
  .kpi .k{font-size:9.5px;color:#54677A}.kpi .v{font-size:17px;font-weight:800;margin-top:2px}.kpi .u{font-size:9px;color:#54677A}
  .cols{display:flex;gap:12px}.cols .col{flex:1}
  .plans{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
  .plan{text-align:center;page-break-inside:avoid}.plan svg{max-width:330px;height:auto;border:1px solid #E3E9EF;border-radius:4px}
  .cap{font-size:9.5px;color:#54677A;margin-top:3px}
  .note{font-size:9.5px;color:#54677A;background:#F4F7F9;border-radius:6px;padding:8px 10px;margin-top:8px;line-height:1.6}
  svg{max-width:100%;height:auto}
  .verdictbox{display:flex;align-items:center;gap:16px;border:2px solid;border-radius:12px;padding:12px 16px;margin:8px 0}
  .verdictbox .grade{font-size:42px;font-weight:900;line-height:1}
  .verdictbox .vtxt{font-size:12px;line-height:1.7}
  .pfoot{position:absolute;bottom:8mm;left:15mm;right:15mm;font-size:8.5px;color:#9AA5AF;border-top:1px solid #E3E9EF;padding-top:5px;display:flex;justify-content:space-between}
  .disc{font-size:9px;color:#9AA5AF;margin-top:16px;border-top:1px solid #E3E9EF;padding-top:8px;line-height:1.6}
  </style></head><body>${pagesHtml}
  <section class="page"><div class="disc">本書はMADORI STUDIOによる概算シミュレーションです。金利・賃料・工事費・税制・売却価格は入力した前提条件に基づく試算であり、実際の融資条件・収支・税額・売却結果を保証するものではありません。法規制（用途地域・日影・地区計画等）は簡易判定です。投資判断・契約・申告の前に、必ず各金融機関・建設会社・不動産会社・税理士等の専門家にご確認ください。</div></section>
  <script>window.onload=()=>setTimeout(()=>window.print(),600)<\/script></body></html>`;
  const w=window.open('','_blank');if(!w){alert('ポップアップがブロックされました。ブラウザ設定で許可してください。');return;}
  w.document.open();w.document.write(doc);w.document.close();closeSheet();}
function exportPDF(sc){migrateScenario(sc);const r=financeCalc(sc);const agg=buildingAggSc(sc);const base=agg.B.own+agg.B.rental,own=base>0?agg.B.own/base*100:0;const S=window._exSel||{};
  const now=new Date().toLocaleDateString('ja-JP');
  let h=`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>事業計画書 ${esc(sc.name)}</title><style>
   @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:'Noto Sans JP',sans-serif;color:#16232F;font-size:11px;line-height:1.6;margin:0}
   h1{font-size:20px;border-bottom:3px solid #34506B;padding-bottom:8px;margin:0 0 4px}h2{font-size:14px;background:#34506B;color:#fff;padding:5px 10px;margin:18px 0 8px;border-radius:3px}
   .sub{color:#54677A;font-size:10px;margin-bottom:20px}
   table{width:100%;border-collapse:collapse;margin:6px 0;font-size:10.5px}th,td{border:1px solid #C7D0D8;padding:4px 7px;text-align:right}th{background:#EEF2F6;text-align:left}td.l,th.l{text-align:left}
   .kpi{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.kpi div{flex:1;min-width:110px;border:1px solid #C7D0D8;border-radius:5px;padding:7px}.kpi .k{font-size:9px;color:#54677A}.kpi .v{font-size:15px;font-weight:700}
   .plan{page-break-inside:avoid;text-align:center;margin:8px 0}.plan svg{max-width:100%;height:auto;border:1px solid #E3E9EF}
   .cap{font-size:9px;color:#54677A;text-align:center;margin-top:2px}.foot{margin-top:24px;font-size:9px;color:#9AA5AF;border-top:1px solid #E3E9EF;padding-top:6px}
   .pb{page-break-before:always}</style></head><body>
   <h1>${mode()==='invest'?'不動産投資 事業計画書':(mode()==='home'?'住宅取得 資金計画書':'賃貸併用住宅 事業計画書')}</h1><div class="sub">${esc(sc.name)}　／　作成日 ${now}　／　MADORI STUDIO</div>`;
  if(S.summary){h+=`<h2>1. 物件概要・面積</h2><div class="kpi">
    <div><div class="k">延床面積</div><div class="v">${f1(agg.gross)}㎡</div></div>
    <div><div class="k">自宅専有率</div><div class="v">${f1(own)}%</div></div>
    <div><div class="k">総事業費</div><div class="v">${yen(r.c.total)}</div></div>
    <div><div class="k">NOI利回り</div><div class="v">${f1(r.netY)}%</div></div></div>
    <table><tr><th class="l">階</th><th>壁芯(㎡)</th><th>内法(㎡)</th><th>賃貸(㎡)</th><th>自宅(㎡)</th></tr>`;
    sc.floors.forEach(f=>{const t=floorTotalsSc(f,sc);h+=`<tr><td class="l">${esc(f.name)}</td><td>${f1(t.gross)}</td><td>${f1(t.net)}</td><td>${f1(t.basis.rental)}</td><td>${f1(t.basis.own)}</td></tr>`;});
    h+=`<tr><th class="l">合計</th><th>${f1(agg.gross)}</th><th>${f1(agg.net)}</th><th>${f1(agg.B.rental)}</th><th>${f1(agg.B.own)}</th></tr></table>
    <p>敷地面積 ${f1(r.c.la)}㎡（${f1(r.c.lt)}坪）／ 建ぺい率 ${f1(r.c.bcrPct)}% ・ 容積率 ${f1(r.c.farPct)}%</p>`;}
  if(S.plan_all||S.plan_cur){h+=`<h2>2. 平面図</h2>`;
    const floors=S.plan_all?sc.floors:[sc.floors.find(f=>f.id===sc.activeFloorId)||sc.floors[0]];
    floors.forEach(f=>{h+=`<div class="plan">${floorSVG(sc,f,34)}<div class="cap">${esc(f.name)}　1:100目安　外形 ${mm(f.footW)}×${mm(f.footH)}mm</div></div>`;});}
  if(S.cost){h+=`<h2>3. 資金計画（総事業費）</h2>
    <table><tr><th class="l">区分</th><th>金額</th></tr>
    <tr><td class="l">① 土地取得費</td><td>${yen(r.c.landPrice)}</td></tr>
    <tr><td class="l">② 建物本体（付帯込）</td><td>${yen(r.c.buildingPrice)}</td></tr>
    <tr><td class="l">③ 別途工事</td><td>${yen(r.c.extrasSum)}</td></tr>
    <tr><td class="l">③ 諸費用</td><td>${yen(r.c.misc)}</td></tr>
    <tr><th class="l">総事業費</th><th>${yen(r.c.total)}</th></tr></table>
    <table><tr><th class="l">概算積算内訳（本体）</th><th>構成比</th><th>金額</th></tr>`;
    r.c.seisan.forEach(x=>{h+=`<tr><td class="l">${x.n}</td><td>${x.pc}%</td><td>${f0(x.amt)}万</td></tr>`;});h+=`</table>`;}
  if(S.loan){h+=`<h2>4. 借入計画</h2><div class="kpi">
    <div><div class="k">借入必要額</div><div class="v">${yen(r.loan)}</div></div>
    <div><div class="k">採用ローン</div><div class="v" style="font-size:12px">${esc(r.LN.name)}</div></div>
    <div><div class="k">月返済(初回)</div><div class="v">${fmt(r.schA.firstMonthly,1)}万</div></div>
    <div><div class="k">返済比率</div><div class="v">${f1(r.dsrS)}%</div></div></div>
    <table><tr><th class="l">銀行/商品</th><th>種別</th><th>金利</th><th>期間</th><th>月返済</th><th>返済比率</th></tr>`;
    sc.loans.forEach(LN=>{const pl=calcPlan(LN,r.c,sc.finance,r.mRent,r.income,agg);h+=`<tr><td class="l">${esc(LN.name)}${LN.id===sc.activeLoanId?' ★':''}</td><td>${LOANTYPES[LN.type].label}</td><td>${f1(LN.rate)}%</td><td>${LN.years}年</td><td>${fmt(pl.sch.firstMonthly,1)}万</td><td>${f1(pl.dsrS)}%</td></tr>`;});
    h+=`</table>`;}
  if(S.rent){h+=`<h2>5. レントロール</h2><table><tr><th class="l">部屋</th><th>面積㎡</th><th>賃料(万)</th><th>㎡単価</th></tr>`;
    rentUnits(sc).forEach(u=>{h+=`<tr><td class="l">${esc(u.floor)} ${esc(u.name)}</td><td>${f1(u.area)}</td><td>${f1(u.rent)}</td><td>${u.area>0?f0(u.rent*10000/u.area)+'円':'—'}</td></tr>`;});
    h+=`<tr><th class="l">満室合計</th><th></th><th>${f1(r.mRent)}万/月</th><th></th></tr></table>`;}
  if(S.yield){h+=`<h2>6. 収支・利回り</h2><table>
    <tr><td class="l">表面利回り（総事業費）</td><td>${f1(r.grossY)}%</td><td class="l">NOI利回り</td><td>${f1(r.netY)}%</td></tr>
    <tr><td class="l">実効利回り</td><td>${f1(r.effY)}%</td><td class="l">ローン定数K%</td><td>${f1(r.kPct)}%</td></tr>
    <tr><td class="l">イールドギャップ</td><td>${f1(r.yieldGap)}pt</td><td class="l">DSCR</td><td>${fmt(r.dscr,2)}</td></tr>
    <tr><td class="l">実質住居費/月</td><td>${f1(r.netMonthly1)}万</td><td class="l">CCR</td><td>${f1(r.ccr)}%</td></tr></table>`;}
  if(S.repay){h+=`<h2>7. 返済計画（5年毎）</h2><table><tr><th>年</th><th>年返済</th><th>うち利息</th><th>残債</th></tr>`;
    r.schA.yr.forEach((y,i)=>{if((i+1)%5===0||i===0)h+=`<tr><td>${i+1}</td><td>${f0(y.pay)}万</td><td>${f0(y.int)}万</td><td>${f0(y.bal)}万</td></tr>`;});
    h+=`</table>`;}
  if(S.cf){h+=`<h2>8. 年次キャッシュフロー</h2><table><tr><th>年</th><th>NOI</th><th>返済</th><th>税額</th><th>年CF</th><th>累計</th></tr>`;
    r.cf.forEach(x=>{if(x.y<=10||x.y%5===0)h+=`<tr><td>${x.y}</td><td>${f0(x.noi)}</td><td>${f0(x.pay)}</td><td>${f0(x.tax)}</td><td>${f0(x.cf)}</td><td>${f0(x.cum)}</td></tr>`;});
    h+=`</table>`;}
  if(S.exit){const ex=exitCalc(sc,r);h+=`<h2>9. 出口・売却・収益指標</h2>
    <div class="kpi"><div><div class="k">保有${ex.H}年 想定売却</div><div class="v">${yen(ex.base.price)}</div></div>
    <div><div class="k">売却時CF</div><div class="v">${yen(ex.base.cfSell)}</div></div>
    <div><div class="k">税引後IRR</div><div class="v">${ex.postIRR==null?'—':f1(ex.postIRR)+'%'}</div></div>
    <div><div class="k">マルチプル</div><div class="v">${fmt(ex.multiple,2)}</div></div></div>
    <table><tr><th class="l">項目</th><th>金額</th></tr>
    <tr><td class="l">保有末NOI</td><td>${f0(ex.noiH)}万</td></tr>
    <tr><td class="l">税務簿価(土地+建物残)</td><td>${yen(ex.book)}</td></tr>
    <tr><td class="l">残債</td><td>${yen(ex.balH)}</td></tr>
    <tr><td class="l">譲渡益</td><td>${yen(ex.base.gain)}</td></tr>
    <tr><td class="l">譲渡税</td><td>${f0(ex.base.tax)}万</td></tr>
    <tr><td class="l">税引前IRR / 税引後IRR</td><td>${ex.preIRR==null?'—':f1(ex.preIRR)+'%'} / ${ex.postIRR==null?'—':f1(ex.postIRR)+'%'}</td></tr>
    <tr><td class="l">純資産(累計CF+売却時CF)</td><td>${yen(ex.cumCF+ex.base.cfSell)}</td></tr></table>`;}
  if(S.sched){h+=`<h2>10. 事業スケジュール</h2><table><tr><th class="l">タスク</th><th>開始</th><th>期間</th><th>支出</th></tr>`;
    (sc.sched.items||[]).forEach(it=>{h+=`<tr><td class="l">${esc(it.name)}</td><td>${it.start}ヶ月</td><td>${it.dur}ヶ月</td><td>${it.cost?f0(it.cost)+'万':'—'}</td></tr>`;});
    h+=`</table>`;}
  if(S.compare&&store.scenarios.length>1){h+=`<h2 class="pb">10. シナリオ比較</h2><table><tr><th class="l">指標</th>`;
    store.scenarios.forEach(s2=>{h+=`<th>${esc(s2.name)}</th>`;});h+=`</tr>`;
    const cmp=store.scenarios.map(s2=>{migrateScenario(s2);return{s2,r:financeCalc(s2)};});
    [['総事業費',d=>yen(d.r.c.total)],['借入',d=>yen(d.r.loan)],['月返済',d=>fmt(d.r.schA.firstMonthly,1)+'万'],['NOI利回り',d=>f1(d.r.netY)+'%'],['実質住居費',d=>f1(d.r.netMonthly1)+'万']].forEach(([lb,fn])=>{h+=`<tr><td class="l">${lb}</td>`;cmp.forEach(d=>{h+=`<td>${fn(d)}</td>`;});h+=`</tr>`;});
    h+=`</table>`;}
  h+=`<div class="foot">本書はMADORI STUDIOによる概算シミュレーションです。金利・賃料・工事費・税制は前提条件に基づく試算であり、実際の融資条件・収支を保証するものではありません。詳細は各金融機関・建設会社・税理士にご確認ください。</div>
   <script>window.onload=()=>{setTimeout(()=>window.print(),400)}<\/script></body></html>`;
  const w=window.open('','_blank');if(!w){alert('ポップアップがブロックされました。ブラウザの設定で許可してください。');return;}
  w.document.open();w.document.write(h);w.document.close();closeSheet();}
/* --- Excel: SheetJS遅延ロード、失敗時CSV --- */
function exportExcel(sc){migrateScenario(sc);const r=financeCalc(sc);const agg=buildingAggSc(sc);const S=window._exSel||{};
  const sheets={};
  if(S.summary){const aoa=[['項目','値'],['シナリオ',sc.name],['延床面積(㎡)',+f1(agg.gross)],['自宅専有率(%)',+f1((agg.B.own/(agg.B.own+agg.B.rental)||0)*100)],['敷地面積(㎡)',+f1(r.c.la)],['総事業費(万円)',Math.round(r.c.total)]];sheets['概要']=aoa;
    const fa=[['階','壁芯㎡','内法㎡','賃貸㎡','自宅㎡']];sc.floors.forEach(f=>{const t=floorTotalsSc(f,sc);fa.push([f.name,+f1(t.gross),+f1(t.net),+f1(t.basis.rental),+f1(t.basis.own)]);});sheets['面積集計']=fa;}
  if(S.cost){const a=[['区分','金額(万円)'],['①土地',Math.round(r.c.landPrice)],['②建物本体(付帯込)',Math.round(r.c.buildingPrice)],['③別途工事',Math.round(r.c.extrasSum)],['③諸費用',Math.round(r.c.misc)],['総事業費',Math.round(r.c.total)],[],['積算内訳','金額(万円)']];r.c.seisan.forEach(x=>a.push([x.n,Math.round(x.amt)]));sheets['資金計画']=a;}
  if(S.loan){const a=[['銀行','商品','種別','金利%','期間','月返済(万)','返済比率%','融資上限(万)']];sc.loans.forEach(LN=>{const pl=calcPlan(LN,r.c,sc.finance,r.mRent,r.income,agg);a.push([LN.name,LN.product||'',LOANTYPES[LN.type].label,LN.rate,LN.years,+fmt(pl.sch.firstMonthly,1),+f1(pl.dsrS),LN.capAmount||'']);});sheets['融資比較']=a;}
  if(S.rent){const a=[['階','部屋','面積㎡','賃料(万)','㎡単価(円)','稼働']];rentUnits(sc).forEach(u=>a.push([u.floor,u.name,+f1(u.area),+f1(u.rent),u.area>0?Math.round(u.rent*10000/u.area):0,u.occ?'○':'×']));sheets['レントロール']=a;}
  if(S.repay){const a=[['年','年返済(万)','元金(万)','利息(万)','残債(万)']];r.schA.yr.forEach((y,i)=>a.push([i+1,+f0(y.pay),+f0(y.pri),+f0(y.int),+f0(y.bal)]));sheets['返済年表']=a;}
  if(S.cf){const a=[['年','満室賃料','NOI','修繕','返済','控除','償却','税額','年CF','累計','残債']];r.cf.forEach(x=>a.push([x.y,+f0(x.rent),+f0(x.noi),+f0(x.repair),+f0(x.pay),+f0(x.ded),+f0(x.dep),+f0(x.tax),+f0(x.cf),+f0(x.cum),+f0(x.bal)]));sheets['年次CF']=a;}
  if(S.exit){const ex=exitCalc(sc,r);const a=[['項目','値'],['保有年数',ex.H],['想定売却価格(万)',Math.round(ex.base.price)],['税務簿価(万)',Math.round(ex.book)],['残債(万)',Math.round(ex.balH)],['譲渡益(万)',Math.round(ex.base.gain)],['譲渡税(万)',Math.round(ex.base.tax)],['売却時CF(万)',Math.round(ex.base.cfSell)],['税引前IRR(%)',ex.preIRR==null?'':+f1(ex.preIRR)],['税引後IRR(%)',ex.postIRR==null?'':+f1(ex.postIRR)],['税引前MIRR(%)',ex.preMIRR==null?'':+f1(ex.preMIRR)],['税引後MIRR(%)',ex.postMIRR==null?'':+f1(ex.postMIRR)],['マルチプル',+fmt(ex.multiple,2)],['純資産(万)',Math.round(ex.cumCF+ex.base.cfSell)]];sheets['出口・IRR']=a;}
  if(S.sched){const a=[['タスク','区分','開始(月)','期間(月)','支出(万)','メモ','完了']];(sc.sched.items||[]).forEach(it=>a.push([it.name,(SCHEDCATS[it.cat]||['他'])[0],it.start,it.dur,it.cost,it.task||'',it.done?'○':'']));sheets['スケジュール']=a;}
  if(!Object.keys(sheets).length){alert('出力する項目を選んでください。');return;}
  const done=()=>{try{const wb=XLSX.utils.book_new();Object.entries(sheets).forEach(([nm,aoa])=>{const ws=XLSX.utils.aoa_to_sheet(aoa);XLSX.utils.book_append_sheet(wb,ws,nm.slice(0,31));});XLSX.writeFile(wb,`事業計画_${sc.name}_${new Date().toISOString().slice(0,10)}.xlsx`);closeSheet();}catch(e){csvFallback(sheets,sc);}};
  if(window.XLSX)return done();
  const sp=document.createElement('script');sp.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  sp.onload=done;sp.onerror=()=>csvFallback(sheets,sc);document.head.appendChild(sp);}
function csvFallback(sheets,sc){let csv='';Object.entries(sheets).forEach(([nm,aoa])=>{csv+='■ '+nm+'\n'+aoa.map(row=>row.map(c=>{const s=String(c==null?'':c);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\n')+'\n\n';});
  dl(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),`事業計画_${sc.name}.csv`);
  alert('Excelライブラリを読み込めなかったため、CSV形式で出力しました。');closeSheet();}
