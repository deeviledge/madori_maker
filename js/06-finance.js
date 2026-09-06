/* 06-finance.js — レントロール・コスト・融資・税・出口/IRR エンジン
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ---------- レントロール ---------- */
function rentUnits(sc){sc=sc||state;const list=[];
 [...sc.floors].forEach(f=>f.rooms.forEach(r=>{if(r.type==='賃貸'){const a=roomAreasSc(r,f,sc);
   const u=sc.rent.units[r.id]||(sc.rent.units[r.id]={rent:null,occ:1});
   const rate=+(sc.rent.unitRate!=null?sc.rent.unitRate:3800);   /* 既定の㎡単価（円/㎡・月） */
   const autoRent=Math.round(a.gross*rate/10000*10)/10;
   list.push({id:r.id,floor:f.name,name:r.name,area:a.gross,rent:(u.rent!=null&&u.rent!=='')?+u.rent:autoRent,autoRent,occ:u.occ==null?1:u.occ,u});}}));
 return list;}
function rentTotal(sc){sc=sc||state;if(sc.rent.override!=null&&sc.rent.override!=='')return +sc.rent.override;
 return rentUnits(sc).reduce((a,x)=>a+(x.occ?x.rent:0),0);}
function ageFactor(y,curve){let f=1;for(let i=2;i<=y;i++){const age=i-1;const r=age<=10?curve.r1:(age<=20?curve.r2:curve.r3);f*=1-(+r||0)/100;}return f;}
function roomAreasSc(r,f,sc){const gross=polyArea(r.poly);let inner=0,outer=0;edges(r.poly).forEach(([p,q])=>{const L=dist(p,q),ext=isExtEdge(p,q,f),t=ext?sc.settings.wallOut:sc.settings.wallIn;inner+=L*t/2;if(ext)outer+=L*sc.settings.wallOut/2;});return{gross,net:Math.max(0,gross-inner),constr:gross+outer};}
/* ================= コスト・ファイナンスエンジン ================= */
function computeCost(sc){sc=sc||state;const L=sc.land,P=sc.price;const la=(function(){if(L.mode==='poly'&&Array.isArray(L.poly)&&L.poly.length>=3)return Math.abs(polyArea(L.poly));if(L.areaManual!=null&&L.areaManual>0)return +L.areaManual;return (+L.W||0)*(+L.D||0);})(),lt=tsubo(la);
  const landPrice=(L.priceManual!=null&&L.priceManual!=='')?+L.priceManual:(P.landUnitMode==='sqm'?la*P.landUnit:lt*P.landUnit);
  let body=0,areaT=0;const rows=[];
  sc.floors.forEach(f=>{const o=P.perFloor[f.id]||{};const autoT=(f.footW*f.footH)/TSUBO;const t=(o.t!=null&&o.t!=='')?+o.t:autoT;const u=(o.u!=null&&o.u!=='')?+o.u:P.buildingUnit;const amt=t*u;body+=amt;areaT+=t;rows.push({f,t,u,amt,autoT,over:o});});
  const buildingPrice=body*(1+(P.ancillaryPct||0)/100),effUnit=areaT>0?buildingPrice/areaT:0;
  const extrasSum=(P.extras||[]).reduce((a,x)=>a+(+x.amount||0),0);
  const constructionTotal=buildingPrice+extrasSum;
  const hardTotal=landPrice+constructionTotal;
  const miscAuto=Math.round(hardTotal*0.07);
  const misc=(P.misc!=null&&P.misc!=='')?+P.misc:miscAuto;
  const total=hardTotal+misc;
  const{B,bcrMax}=buildingAggSc(sc);
  const builtA=builtAreaSc(sc);                     /* 建築面積＝全階の水平投影の和集合 */
  const bcrPct=la>0?builtA/la*100:0,farPct=la>0?B.far/la*100:0;
  /* 概算積算内訳（本体の構成比・一般値） */
  const _st=sc.structure||'wood';const _bodyLabel=_st==='wood'?'躯体(木工事)':(_st==='rc'||_st==='wrc'||_st==='src'?'躯体(コンクリート工事)':'躯体(鉄骨工事)');
  const seisan=[['仮設工事',4],['基礎・地業',8],[_bodyLabel,26],['屋根・板金',5],['外装(サッシ・外壁)',14],['内装(建具・造作・仕上)',18],['住宅設備(水回り・空調)',15],['電気・給排水設備',8],['現場管理・経費',2]].map(([n,pc])=>({n,pc,amt:body*pc/100}));
  return{la,lt,landPrice,rows,body,buildingPrice,effUnit,areaT,extrasSum,constructionTotal,hardTotal,misc,miscAuto,total,bcrPct,farPct,bcrMax,builtA,far:B.far,seisan};}
function annMonthly(P,rm,n){if(P<=0||n<=0)return 0;if(rm<=0)return P/n;return P*rm/(1-Math.pow(1+rm,-n));}
/* 償還スケジュール（年次集計・万円）type:'annuity'|'principal' stress:{after,add}|null */
function schedule(P,ratePct,years,type,stress){const n=Math.round(years*12);let bal=P,r=ratePct/100/12;
  let pm=type==='principal'?null:annMonthly(P,r,n);const pp=P/n;const yr=[];let totInt=0;let firstPay=0;
  for(let m=1;m<=n&&bal>1e-9;m++){
    if(stress&&m===Math.round(stress.after*12)+1){r=(ratePct+stress.add)/100/12;if(type!=='principal')pm=annMonthly(bal,r,n-m+1);}
    const i=bal*r;let p=type==='principal'?Math.min(pp,bal):Math.min(pm-i,bal);if(p<0)p=0;
    bal-=p;totInt+=i;
    if(m===1)firstPay=i+p;
    const y=Math.ceil(m/12);yr[y-1]=yr[y-1]||{pay:0,int:0,pri:0,bal:0};const Y=yr[y-1];Y.pay+=i+p;Y.int+=i;Y.pri+=p;Y.bal=bal;}
  const totPay=yr.reduce((a,y)=>a+y.pay,0);
  return{yr,totInt,totPay,firstPay,firstMonthly:firstPay,lastBalYear:y=>yr[Math.min(y,yr.length)-1]?.bal??0};}
function activeLoan(sc){sc=sc||state;return sc.loans.find(L=>L.id===sc.activeLoanId)||sc.loans[0];}
/* 償却対象の建物取得原価（万円）＝(建物本体+別途)×収益按分。投資モードは按分=1 */
function deprBase(sc,c,rentalRatio){return (c.buildingPrice+c.extrasSum)*rentalRatio;}
/* 減価償却（定額法・万円/年） */
function deprForYear(y,sc,c,rentalRatio){const T=sc.tax;if(!T||!T.rentalTaxOn)return 0;
 const bld=deprBase(sc,c,rentalRatio);
 const equip=bld*(+T.equipPct||0)/100,bodyC=bld-equip;
 let d=0;
 if(y<=(+T.bodyYears||22))d+=bodyC/(+T.bodyYears||22);
 if(y<=(+T.equipYears||15))d+=equip/(+T.equipYears||15);
 return d;}
/* 建物簿価（取得原価−累計償却、万円） */
function bldBookValue(y,sc,c,rentalRatio){const T=sc.tax;const bld=deprBase(sc,c,rentalRatio);let acc=0;for(let i=1;i<=y;i++)acc+=deprForYear(i,sc,c,rentalRatio);return Math.max(0,bld-acc);}
/* ================= 年収から税額を出すエンジン（個人・概算） =================
   すべて「万円」単位。制度は一般的な恒久措置のみを実装し、
   定額減税などの単年度特例・所得金額調整控除は入れていない。 */

/* 給与所得控除（令和2年分以降）。給与収入(万円) → 控除額(万円) */
function salaryDeductionOf(inc){
  if(inc<=162.5)return Math.min(inc,55);
  if(inc<=180)return inc*0.4-10;
  if(inc<=360)return inc*0.3+8;
  if(inc<=660)return inc*0.2+44;
  if(inc<=850)return inc*0.1+110;
  return 195;/* 上限 */
}
/* 所得税の速算表 [課税所得の上限(万), 税率%, 控除額(万)] */
const INCOME_TAX_TABLE=[[195,5,0],[330,10,9.75],[695,20,42.75],[900,23,63.6],[1800,33,153.6],[4000,40,279.6],[Infinity,45,479.6]];
function incomeTaxOf(taxable){
  if(!(taxable>0))return 0;
  const row=INCOME_TAX_TABLE.find(r=>taxable<=r[0]);
  return Math.max(0,taxable*row[1]/100-row[2]);
}
function incomeTaxMarginalOf(taxable){
  if(!(taxable>0))return 0;
  return (INCOME_TAX_TABLE.find(r=>taxable<=r[0]))[1];
}
const RESIDENT_RATE=10;/* 住民税所得割（都道府県＋市区町村） */

/* 給与収入(万円) → その人の税プロフィール。
   taxable: 課税所得 ＝ 給与収入 − 給与所得控除 − 社会保険料 − その他所得控除
   marginal: 限界税率（所得税＋住民税10%）
   dedRoom: 住宅ローン控除で使い切れる上限 ＝ 所得税額 ＋ min(課税所得×5%, 9.75万) */
function taxProfile(income,T){
  T=T||(state&&state.tax)||{};
  const inc=Math.max(0,+income||0);
  const salaryDed=salaryDeductionOf(inc);
  const social=inc*(+T.socialPct||0)/100;
  const other=+T.deductOther||0;
  const taxable=Math.max(0,inc-salaryDed-social-other);
  const incomeTax=incomeTaxOf(taxable);
  const residentTax=taxable*RESIDENT_RATE/100;
  const marginal=incomeTaxMarginalOf(taxable)+RESIDENT_RATE;
  const dedRoom=incomeTax+Math.min(taxable*0.05,9.75);
  return{income:inc,salaryDed,social,other,taxable,incomeTax,residentTax,marginal,dedRoom};
}

/* ================= 借入形態（単独／収入合算／ペアローン） =================
   ratio は「借入の負担割合」。ペアローンでは持分・住宅ローン控除・不動産所得の
   按分もこの割合を使う（借入額に応じて持分を持つ、という一般的な組み方の前提）。 */
function borrowerList(sc,loan){
  sc=sc||state;const G=sc.finance;
  if(loan==null)loan=Math.max(0,computeCost(sc).total-(+G.equity||0));
  const a=Math.max(0,+G.incomeSelf||0),b=Math.max(0,+G.incomePartner||0);
  const nameA=G.nameSelf||'本人',nameB=G.namePartner||'パートナー';
  const mode=G.borrowMode||'combined';
  if(mode==='single')return[{name:nameA,income:a,taxIncome:a,ratio:1,solo:1}];
  if(mode==='pair'){
    let ra;
    if(G.pairSplit==='manual'&&loan>0&&G.pairSelfLoan!=null&&G.pairSelfLoan!==''){
      ra=Math.min(1,Math.max(0,(+G.pairSelfLoan||0)/loan));
    }else{
      ra=(a+b)>0?a/(a+b):0.5;
    }
    return[{name:nameA,income:a,taxIncome:a,ratio:ra,solo:1},{name:nameB,income:b,taxIncome:b,ratio:1-ra,solo:1}];
  }
  /* combined: 世帯を1人の借主とみなす（収入合算）。
     審査は合算年収だが、住宅ローン控除・損益通算は主たる債務者（年収の高い方）1人分として扱う。 */
  return[{name:nameA+'＋'+nameB,income:a+b,taxIncome:Math.max(a,b),ratio:1,solo:0}];
}
/* 各借主に税プロフィールと借入額を付ける */
function borrowerParts(sc,loan){
  sc=sc||state;const T=sc.tax||{};
  return borrowerList(sc,loan).map(p=>{
    const prof=taxProfile(p.taxIncome,T);
    return Object.assign({},p,{loan:loan*p.ratio,prof,rate:prof.marginal});
  });
}
/* 個人の適用税率（%）。auto は借入割合で加重平均した限界税率を1本の代表値として返す */
function personalRate(sc){
  sc=sc||state;const T=sc.tax||{};
  if(T.rateMode!=='auto')return +T.marginalRate||0;
  const G=sc.finance,mode=G.borrowMode||'combined';
  if(mode==='combined'){
    /* 収入合算：主たる債務者（年収の高い方）の限界税率 */
    const top=Math.max(+G.incomeSelf||0,+G.incomePartner||0);
    return taxProfile(top,T).marginal;
  }
  const ps=borrowerParts(sc);
  const sum=ps.reduce((a,p)=>a+p.ratio,0)||1;
  return ps.reduce((a,p)=>a+p.rate*p.ratio,0)/sum;
}

/* 税率（その年の適用税率%）: 個人=限界税率, 法人=実効法人税率 */
function taxRate(sc){const T=sc.tax;return T.entity==='corp'?(+T.corpRate||0):personalRate(sc);}
/* 不動産所得の税効果（単年・繰越なし簡易。+なら納税/−なら節税、万円/年） */
function taxEffectYear(y,sc,c,sch,rentalRatio,noi,eff){const T=sc.tax;if(!T||!T.rentalTaxOn)return{tax:0,dep:0,taxable:0};
 const dep=deprForYear(y,sc,c,rentalRatio);
 const Y=sch.yr[y-1]||{int:0};
 const taxable=noi-Y.int*rentalRatio-dep;
 const tax=taxable*taxRate(sc)/100;
 return{tax,dep,taxable};}
function financeCalc(sc){sc=sc||state;const c=computeCost(sc),G=sc.finance,LN=activeLoan(sc);
  const income=(+G.incomeSelf||0)+(+G.incomePartner||0);
  const mRent=rentTotal(sc);
  const loan=Math.max(0,c.total-(+G.equity||0));
  const capAmount=(LN.capAmount!=null&&LN.capAmount!=='')?+LN.capAmount:(+G.loanCap||Infinity);
  const capOk=loan<=capAmount;
  const incomeEff=income+mRent*12*(+LN.includeRentPct||0)/100; /* 賃料収入合算後の審査年収 */
  const maxSalary=income*(+G.multSalary||0),maxCombined=incomeEff*(+G.multCombined||0);
  const stress=G.stressOn?{after:+G.stressAfter||0,add:+G.stressAdd||0}:null;
  const schA=schedule(loan,+LN.rate,+LN.years,LN.method,null);
  const schStress=stress?schedule(loan,+LN.rate,+LN.years,LN.method,stress):null;
  const payS1=annMonthly(loan,(+LN.rateScreen)/100/12,LN.years*12)*12;
  const payA1=schA.yr[0]?schA.yr[0].pay:0;
  const dsrA=incomeEff>0?payA1/incomeEff*100:0,dsrS=incomeEff>0?payS1/incomeEff*100:0;
  /* 賃料・NOI（初年度） */
  const rentYear=mRent*12,effRent=rentYear*(1-(G.vacancy||0)/100);
  const mgmt=effRent*(G.mgmtFee||0)/100,opx=effRent*(G.opex||0)/100,fixed=(+G.taxAnnual||0)+(+G.insAnnual||0);
  const noi=effRent-mgmt-opx-fixed;
  /* 面積按分 */
  const{B}=buildingAggSc(sc);const base=B.own+B.rental;const ownRatio=base>0?B.own/base:1,rentalRatio=1-ownRatio;
  const need50=LN.type==='jutaku';
  /* 住宅ローン控除（住宅ローンのみ） */
  const dedEnabled=need50&&G.dedOn;
  const dedD=dedEnabled?dedDetail(1,schA,loan,ownRatio,G,sc):{total:0,parts:[]};
  const ded1=dedD.total;
  /* 借主ごとの審査（ペアローンでは各自の年収・各自の借入額で判定する） */
  const rentAdd=mRent*12*(+LN.includeRentPct||0)/100;
  const tmode=(sc.tax&&sc.tax.rateMode)||'auto';
  const isCorpSc=sc.tax&&sc.tax.entity==='corp';
  const borrowers=borrowerParts(sc,loan).map(p=>{
    /* 実際に適用される税率（手入力モードなら全員その値、法人なら実効法人税率） */
    const applied=isCorpSc?(+sc.tax.corpRate||0):(tmode==='auto'?p.rate:(+sc.tax.marginalRate||0));
    const roomUsed=(!isCorpSc)&&tmode==='auto'&&sc.tax.dedCapByTax;
    const incEff=p.income+rentAdd*p.ratio;
    const maxSal=p.income*(+G.multSalary||0),maxComb=incEff*(+G.multCombined||0);
    const payA=payA1*p.ratio,payS=payS1*p.ratio;
    return Object.assign({},p,{rate:applied,autoRate:p.rate,roomUsed,incomeEff:incEff,maxSalary:maxSal,maxCombined:maxComb,payA,payS,
      dsrA:incEff>0?payA/incEff*100:0,dsrS:incEff>0?payS/incEff*100:0,
      capOk:p.loan<=Math.max(maxSal,maxComb)});});
  const pairOn=(G.borrowMode||'combined')==='pair';
  /* 税効果（不動産所得: 減価償却・利息按分） */
  const tx1=taxEffectYear(1,sc,c,schA,rentalRatio,noi,effRent);
  const netMonthly1=payA1/12-noi/12-ded1/12+tx1.tax/12;
  /* 利回り一式 */
  const grossY=c.total>0?rentYear/c.total*100:0;              /* 表面(総事業費) */
  const grossYB=(c.buildingPrice+c.extrasSum)>0?rentYear/(c.buildingPrice+c.extrasSum)*100:0; /* 建物のみ */
  const effY=c.total>0?effRent/c.total*100:0;                 /* 実効 */
  const netY=c.total>0?noi/c.total*100:0;                     /* NOI(FCR) */
  const kPct=loan>0?payA1/loan*100:0;                         /* ローン定数K% */
  const dscr=payA1>0?noi/payA1:0;
  const yieldGap=netY-kPct;
  const cf1pre=noi-payA1+ded1-tx1.tax;
  const ccr=(+G.equity||0)>0?cf1pre/(+G.equity)*100:0;        /* 自己資金配当率 */
  /* 安全指標 */
  const repayRatio=rentYear>0?payA1/rentYear*100:0;            /* 返済比率（対満室家賃） */
  const opexTotal=mgmt+opx+fixed;
  const expenseRatio=rentYear>0?opexTotal/rentYear*100:0;      /* 経費率（対満室家賃） */
  const berRatio=rentYear>0?(opexTotal+payA1)/rentYear*100:0;  /* 損益分岐入居率(BER) */
  /* 年次CF */
  const cf=cfSeries(schStress||schA,loan,ownRatio,G,sc,c,dedEnabled);
  return{c,income,incomeEff,mRent,loan,capAmount,maxSalary,maxCombined,capOk,schA,schStress,payA1,payS1,dsrA,dsrS,rentYear,effRent,noi,grossY,grossYB,effY,netY,kPct,dscr,yieldGap,ccr,ownRatio,rentalRatio,need50,dedEnabled,ded1,dedParts:dedD.parts,borrowers,pairOn,tx1,netMonthly1,cf,stress,LN,repayRatio,expenseRatio,berRatio};}
/* 住宅ローン控除（万円/年）。借主ごとに「自分の残高 × 自宅割合」を上限額で切り、
   さらに自分の所得税額＋住民税からの控除上限（dedRoom）で頭打ちにして合計する。
   戻り値 {total, parts:[{name,ratio,bal,raw,room,capped}]} */
function dedDetail(y,sch,loan,ownRatio,G,sc){
  sc=sc||state;const T=sc.tax||{};const out={total:0,parts:[]};
  if(!G.dedOn||y>(+G.dedYears||0))return out;
  const bal=sch.yr[y-1]?sch.yr[y-1].bal:0;
  const useRoom=(T.entity!=='corp')&&T.rateMode==='auto'&&T.dedCapByTax;
  borrowerParts(sc,loan).forEach(p=>{
    const myBal=bal*p.ratio;
    const target=Math.min(myBal*ownRatio,+G.dedCap||0);
    const raw=target*(+G.dedRate||0)/100;
    const room=useRoom?p.prof.dedRoom:Infinity;
    const capped=Math.min(raw,room);
    out.parts.push({name:p.name,ratio:p.ratio,bal:myBal,raw,room,capped});
    out.total+=capped;});
  return out;}
function dedForYear(y,sch,loan,ownRatio,G,sc){return dedDetail(y,sch,loan,ownRatio,G,sc).total;}
function cfSeries(sch,loan,ownRatio,G,sc,c,dedEnabled){sc=sc||state;c=c||computeCost(sc);const rows=[];let cum=0;const H=Math.max(1,Math.round(+G.holdYears||1));
  const base=rentTotal(sc)*12,curve=sc.rent.curve,rentalRatio=1-ownRatio;
  const T=sc.tax||{};const isCorp=T.entity==='corp';
  /* 借主ごとに税率と繰越欠損を持つ。ペアローンでは不動産所得を借入割合で按分して各自の税率で課税する。
     単独・収入合算・法人は1人分の配列になるので、以下のループは従来と同じ結果になる。 */
  const parts=isCorp
    ?[{name:'法人',ratio:1,rate:+T.corpRate||0}]
    :borrowerParts(sc,loan).map(p=>Object.assign({},p,{rate:T.rateMode==='auto'?p.rate:(+T.marginalRate||0)}));
  const carries=parts.map(()=>0);/* 繰越欠損（万円・借主ごと） */
  for(let y=1;y<=H;y++){
    const rent=base*ageFactor(y,curve);
    const eff=rent*(1-(+G.vacancy||0)/100);
    const mgmt=eff*(+G.mgmtFee||0)/100,opx=eff*(+G.opex||0)/100;
    const fixed=(+G.taxAnnual||0)+(+G.insAnnual||0);
    const noi=eff-mgmt-opx-fixed;
    const repair=(G.repairs||[]).filter(r=>+r.year===y).reduce((a,r)=>a+(+r.amount||0),0);
    const Y=sch.yr[y-1]||{pay:0,bal:0,int:0,pri:0};
    const dd=dedEnabled?dedDetail(y,sch,loan,ownRatio,G,sc):{total:0,parts:[]};
    const ded=dd.total;
    const dep=(T.rentalTaxOn)?deprForYear(y,sc,c,rentalRatio):0;
    /* 課税所得（不動産所得）: NOI−利息(按分)−償却−修繕(当期経費) */
    const pretax=noi-Y.int*rentalRatio-dep-repair;
    let taxable=0,tax=0;const taxParts=[];
    if(T.rentalTaxOn){
      parts.forEach((p,i)=>{
        const pre=pretax*p.ratio;
        let tb=pre,tx=0;
        if(T.carryLoss){
          if(pre<0){carries[i]+=-pre;tb=0;}
          else{const u=Math.min(carries[i],pre);tb=pre-u;carries[i]-=u;}
          tx=Math.max(0,tb)*p.rate/100;
        }else{
          /* 個人は給与と損益通算できるため、赤字なら節税(マイナス税)。法人は0止まり。 */
          tx=(!isCorp&&pre<0)?pre*p.rate/100:Math.max(0,pre)*p.rate/100;
        }
        taxable+=Math.max(0,tb);tax+=tx;
        taxParts.push({name:p.name,ratio:p.ratio,rate:p.rate,pretax:pre,taxable:tb,tax:tx});});
    }
    const carry=carries.reduce((a,v)=>a+v,0);
    const cf=noi-repair-Y.pay+ded-tax;cum+=cf;
    rows.push({y,rent,eff,noi,repair,pay:Y.pay,int:Y.int,ded,dedParts:dd.parts,dep,pretax,taxable,carry,tax,taxParts,cf,cum,bal:Y.bal});}
  return rows;}
/* ================= 出口・売却・IRR ================= */
function exitCalc(sc,r){const X=sc.exit||defExit(),c=r.c,rr=r.rentalRatio;const H=Math.max(1,Math.round(+X.holdYears||1));
  const noiH=(r.cf[H-1]||r.cf[r.cf.length-1]||{noi:r.noi}).noi;/* 保有末NOI */
  const capBase=(+X.exitCapRate||1)/100;
  const priceBase=capBase>0?noiH/capBase:0;/* 直接還元 */
  const capStress=(+X.exitCapRate+ +X.capRateStress)/100;
  const priceStress=capStress>0?noiH/capStress:0;
  const balH=(r.cf[H-1]||{}).bal||0;
  const sellCost=v=>v*(+X.sellCostPct||0)/100;
  /* 税務簿価：土地(取得原価)＋建物簿価 */
  const landCost=c.landPrice;const bldBook=bldBookValue(H,sc,c,rr);const book=landCost+bldBook;
  const capGainTaxRate=(+X.longTerm?20.315:39.63);/* 個人譲渡（法人は通常税率だが簡易に個人前提、法人はcorpRate） */
  const useRate=sc.tax.entity==='corp'?(+sc.tax.corpRate||0):capGainTaxRate;
  const scen=(price)=>{const net=price-sellCost(price);const gain=price-book-sellCost(price);const tax=Math.max(0,gain)*useRate/100;const cfSell=net-balH-tax;return{price,net,gain,tax,cfSell};};
  const base=scen(priceBase),stress=scen(priceStress);
  const cumCF=(r.cf[H-1]||{}).cum||0;
  /* IRR: 初期=−自己資金, 各年=年CF, 最終年=年CF+売却時CF */
  const equity=+sc.finance.equity||0;
  const flowsPre=[-r.c.total+r.loan];/* 税引前IRR用: 自己資金流出 */
  const eq=-equity;
  const cfsPre=[eq],cfsPost=[eq];
  for(let y=1;y<=H;y++){const row=r.cf[y-1]||{cf:0,tax:0};let pre=row.cf+row.tax;let post=row.cf;if(y===H){pre+=base.cfSell+base.tax;post+=base.cfSell;}cfsPre.push(pre);cfsPost.push(post);}
  const preIRR=irr(cfsPre),postIRR=irr(cfsPost);
  const preMIRR=mirr(cfsPre,(+sc.finance.rateActual||1)/100),postMIRR=mirr(cfsPost,(+sc.finance.rateActual||1)/100);
  const totalPost=cfsPost.reduce((a,b)=>a+b,0)+equity;/* 累計税後(自己資金戻し込み) */
  const multiple=equity>0?(cumCF+base.cfSell+equity)/equity:0;
  const netWorth=base.net-balH+cumCF;/* 純資産(売却手取り−残債+累計CF) */
  return{H,noiH,base,stress,book,landCost,bldBook,balH,capGainTaxRate:useRate,preIRR,postIRR,preMIRR,postMIRR,multiple,cumCF,netWorth,equity};}
/* IRR（ニュートン＋二分法フォールバック、月次でなく年次） */
function npv(rate,cfs){let s=0;for(let i=0;i<cfs.length;i++)s+=cfs[i]/Math.pow(1+rate,i);return s;}
function irr(cfs){if(!cfs.some(v=>v>0)||!cfs.some(v=>v<0))return null;let lo=-0.9,hi=1.0;let flo=npv(lo,cfs),fhi=npv(hi,cfs);
  if(flo*fhi>0){for(hi=1.0;hi<20;hi+=0.5){fhi=npv(hi,cfs);if(flo*fhi<0)break;}if(flo*fhi>0)return null;}
  for(let k=0;k<200;k++){const mid=(lo+hi)/2,fm=npv(mid,cfs);if(Math.abs(fm)<1e-6)return mid*100;if(flo*fm<0){hi=mid;fhi=fm;}else{lo=mid;flo=fm;}}
  return (lo+hi)/2*100;}
function mirr(cfs,fin){const n=cfs.length-1;if(n<1)return null;let pvNeg=0,fvPos=0;const reinvest=fin,finance=fin;
  for(let i=0;i<cfs.length;i++){if(cfs[i]<0)pvNeg+=cfs[i]/Math.pow(1+finance,i);else fvPos+=cfs[i]*Math.pow(1+reinvest,n-i);}
  if(pvNeg===0||fvPos<=0)return null;return (Math.pow(fvPos/-pvNeg,1/n)-1)*100;}
/* 投資判断マトリクス（BFコンサル式）: ROI=税引前CF/投資総額, 損益分岐点=支出/満室家賃 */
function investJudge(r){const roi=r.c.total>0?(r.noi-r.payA1)/r.c.total*100:0;
  const outgo=r.noi>=0?(r.effRent-r.noi)+r.payA1:r.payA1;/* 運営費+返済 */
  const be=r.rentYear>0?outgo/r.rentYear*100:999;
  const safe=be<75?'A':(be<=80?'B':'C');
  const prof=roi>=4?'A':(roi>=3?'B':'C');
  const grade=(safe==='A'&&prof==='A')?'○':((safe==='C'||prof==='C')?'×':'△');
  const J=(state.judge)||defJudge();const roiPass=+J.roiPass||0,berPass=+J.berPass||100;
  const roiOK=roi>=roiPass,berOK=be<=berPass,passAll=roiOK&&berOK;
  return{roi,be,outgo,safe,prof,grade,roiPass,berPass,roiOK,berOK,passAll};}
