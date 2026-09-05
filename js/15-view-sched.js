/* 15-view-sched.js — 計画（ガント）ビュー
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= 計画（ガント）ビュー ================= */
/* ガントの支出をコストタブの金額に合わせる */
function syncSchedToCost(){const c=computeCost(state),SD=state.sched;
  const grp={land:['land'],build:['build'],misc:['design','loan','lease','other']};
  const tgt={land:c.landPrice,build:c.constructionTotal,misc:c.misc};
  Object.keys(grp).forEach(k=>{const its=SD.items.filter(x=>grp[k].includes(x.cat));
    if(!its.length)return;
    const cur=its.reduce((a,x)=>a+(+x.cost||0),0),T=Math.round(tgt[k]||0);
    if(cur>0)its.forEach(x=>{x.cost=Math.round((+x.cost||0)/cur*T);});
    else its.forEach(x=>{x.cost=Math.round(T/its.length);});
    /* 丸め誤差を最大の項で吸収 */
    const d=T-its.reduce((a,x)=>a+(+x.cost||0),0);
    if(d){const mx=its.reduce((a,x)=>(+x.cost||0)>(+a.cost||0)?x:a,its[0]);mx.cost=(+mx.cost||0)+d;}});
  render();}
const SCHEDCATS={land:['土地','#34506B'],loan:['融資','#0E7C86'],design:['設計','#8A7BA8'],build:['建築','#A67C3D'],lease:['募集','#4E7A4E'],other:['他','#7A8794']};
function renderSchedView(){const box=$('schedView');box.innerHTML='';const SD=state.sched;
  box.appendChild(el('div','viewtitle','計画<small>工程・支出のスケジュール</small>'));
  const items=[...SD.items];
  const totCost=items.reduce((a,x)=>a+(+x.cost||0),0);
  const span=Math.max(18,...items.map(x=>(+x.start||0)+(+x.dur||1)))+1;
  const bd=el('div','badges');
  bd.appendChild(el('div','badge','<div class="bk">タスク数</div><div class="bv">'+items.length+'</div>'));
  bd.appendChild(el('div','badge','<div class="bk">全体期間</div><div class="bv">'+span+'ヶ月</div>'));
  const cc=computeCost(state),gap=totCost-cc.total;
  bd.appendChild(el('div','badge '+(Math.abs(gap)<=Math.max(50,cc.total*0.01)?'ok':'warn'),'<div class="bk">計画支出合計</div><div class="bv">'+yen(totCost)+'</div>'));
  bd.appendChild(el('div','badge','<div class="bk">総事業費（コスト）</div><div class="bv">'+yen(cc.total)+'</div>'));
  box.appendChild(bd);
  /* コストタブとの連動 */
  {const c0=el('div','card');c0.appendChild(el('h3','','コストタブとの照合<span class="tag">計画支出 ↔ 総事業費</span>'));
   c0.appendChild(el('div','grid2',
     '<span class="g-k">土地価格</span><span class="g-v">'+yen(cc.landPrice)+'</span>'+
     '<span class="g-k">建築工事費</span><span class="g-v">'+yen(cc.constructionTotal)+'</span>'+
     '<span class="g-k">諸費用</span><span class="g-v">'+yen(cc.misc)+'</span>'+
     '<span class="g-k">総事業費</span><span class="g-v"><b>'+yen(cc.total)+'</b></span>'+
     '<span class="g-k">ガントの支出合計</span><span class="g-v">'+yen(totCost)+'</span>'));
   c0.appendChild(ratioBox('差額',(gap>=0?'+':'')+yen(gap)+(Math.abs(gap)<=Math.max(50,cc.total*0.01)?'（ほぼ一致）':'（未連動）'),Math.abs(gap)<=Math.max(50,cc.total*0.01)?'ok':'warn'));
   const b=btn('▸ コストタブの金額を各タスクに連動させる',()=>{syncSchedToCost();});b.classList.add('solid');c0.appendChild(b);
   c0.appendChild(el('div','refnote','土地系（land）のタスク合計を<b>土地価格</b>に、建築系（build）を<b>建築工事費</b>に、その他（設計・融資・募集・他）を<b>諸費用</b>に合わせて、グループ内は現在の金額比で按分します（金額0のグループは均等割）。支出時期は変えません。'));
   box.appendChild(c0);}
  /* ガントチャート */
  const c1=el('div','card');c1.appendChild(el('h3','','工程表（ガントチャート）'));
  c1.appendChild(fText('起点（表示ラベル 例: 2026-08）',SD.startLabel||'',v=>{SD.startLabel=v;}));
  const rowH=34,headerH=32,barH=18,mw=34,rightPad=54,botPad=8;
  const rowsH=items.length*rowH,Wt=span*mw+rightPad,Ht=headerH+rowsH+botPad;
  /* 左：タスク名（固定列・2行折返し） */
  let namesH='<div class="g2-head">タスク</div>';
  items.forEach(it=>{const[cl,col]=SCHEDCATS[it.cat]||SCHEDCATS.other;
    namesH+=`<div class="g2-name ${it.done?'done':''}"><span class="cdot" style="background:${col}"></span><span class="nm">${esc(it.name)}</span></div>`;});
  /* 右：タイムライン（スクロール） */
  let sv=`<svg width="${Wt}" height="${Ht}" font-family="sans-serif">`;
  /* 月グリッド＋ヘッダ */
  for(let m=0;m<span;m++){const x=m*mw;
    sv+=`<line x1="${x}" y1="${headerH-4}" x2="${x}" y2="${headerH+rowsH}" stroke="#EEF2F6" stroke-width="1"/>`;
    if(m%3===0)sv+=`<text x="${x+mw/2}" y="${headerH-11}" font-size="9" text-anchor="middle" fill="#54677A">${m}</text>`;
    if(m%12===0&&m>0)sv+=`<line x1="${x}" y1="6" x2="${x}" y2="${headerH+rowsH}" stroke="#B9C4CF" stroke-width="1"/>`;}
  sv+=`<text x="2" y="${headerH-11}" font-size="8" fill="#9AA5AF">経過月→</text>`;
  /* 行の交互背景 */
  items.forEach((it,i)=>{if(i%2===1)sv+=`<rect x="0" y="${headerH+i*rowH}" width="${span*mw}" height="${rowH}" fill="#FAFBFC"/>`;});
  /* 累計支出ライン（行エリアにスケール） */
  let cum=0;const pts=[];
  for(let m=0;m<span;m++){items.forEach(it=>{if(+it.start===m)cum+=(+it.cost||0);});pts.push([m*mw+mw/2,cum]);}
  const maxC=Math.max(1,cum),lineTop=headerH+6,lineBot=headerH+rowsH-6;
  sv+='<polyline fill="none" stroke="#C0453B" stroke-width="1.5" stroke-dasharray="4 3" points="'+pts.map(([x,cv])=>x+','+(lineBot-(cv/maxC)*(lineBot-lineTop))).join(' ')+'"/>';
  /* バー */
  items.forEach((it,i)=>{const y=headerH+i*rowH+(rowH-barH)/2;const[cl,col]=SCHEDCATS[it.cat]||SCHEDCATS.other;
    const x=(+it.start||0)*mw,w2=Math.max(mw*.6,(+it.dur||1)*mw-3);
    sv+=`<rect x="${x}" y="${y}" width="${w2}" height="${barH}" rx="5" fill="${col}" opacity="${it.done?.35:.9}"/>`;
    if(+it.cost>0)sv+=`<text x="${x+w2+4}" y="${y+barH-5}" font-size="8.5" fill="#C0453B">${f0(it.cost)}万</text>`;});
  sv+='</svg>';
  const g2=el('div','gantt2');
  const gn=el('div','g2-names');gn.innerHTML=namesH;
  const gs=el('div','g2-scroll');gs.innerHTML=sv;
  g2.appendChild(gn);g2.appendChild(gs);c1.appendChild(g2);
  c1.appendChild(el('div','g2-hint','← 右にスワイプで先の月を表示（┅赤線＝累計支出 最大 '+yen(maxC)+'）'));
  const lg=el('div','chips');Object.entries(SCHEDCATS).forEach(([k,[lb,col]])=>{const b=document.createElement('button');b.innerHTML=`<span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${col};margin-right:4px"></span>${lb}`;b.style.pointerEvents='none';lg.appendChild(b);});
  c1.appendChild(lg);
  box.appendChild(c1);
  /* タスク一覧（編集）＝カード型で見やすく */
  const c2=el('div','card');c2.appendChild(el('h3','','タスク・支出の編集'));
  const list=el('div','taskedit');
  SD.items.forEach((it,idx)=>{const[cl,col]=SCHEDCATS[it.cat]||SCHEDCATS.other;
    const card=el('div','tecard');
    /* 見出し行：完了チェック＋タスク名＋削除 */
    const top=el('div','te-top');
    const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!it.done;cb.title='完了';cb.onchange=()=>{it.done=cb.checked?1:0;render();};
    const nm=document.createElement('input');nm.type='text';nm.className='te-name';nm.value=it.name;nm.onchange=e=>{it.name=e.target.value;render();};
    const rm=btn('×',()=>{SD.items.splice(idx,1);render();},'del');rm.className='btn del te-del';
    top.appendChild(cb);top.appendChild(nm);top.appendChild(rm);card.appendChild(top);
    /* 入力行：区分／開始月／期間／支出 */
    const grid=el('div','te-grid');
    const mkField=(lb,node)=>{const f=el('div','te-f');f.appendChild(el('label',null,lb));f.appendChild(node);return f;};
    const sl=document.createElement('select');Object.entries(SCHEDCATS).forEach(([k,[lb2]])=>{const op=document.createElement('option');op.value=k;op.textContent=lb2;if(it.cat===k)op.selected=true;sl.appendChild(op);});sl.onchange=()=>{it.cat=sl.value;render();};
    const mkNum=(val,step,key)=>{const inp=document.createElement('input');inp.type='number';inp.step=step;inp.inputMode='numeric';inp.value=val;inp.onchange=e=>{it[key]=+e.target.value||0;render();};return inp;};
    grid.appendChild(mkField('区分',sl));
    grid.appendChild(mkField('開始月',mkNum(it.start,1,'start')));
    grid.appendChild(mkField('期間(月)',mkNum(it.dur,1,'dur')));
    grid.appendChild(mkField('支出(万)',mkNum(it.cost,10,'cost')));
    card.appendChild(grid);
    /* メモ行 */
    const memo=document.createElement('input');memo.type='text';memo.className='te-memo';memo.placeholder='やること・メモ';memo.value=it.task||'';memo.onchange=e=>{it.task=e.target.value;render();};
    card.appendChild(mkField('メモ',memo));
    list.appendChild(card);});
  c2.appendChild(list);
  c2.appendChild(btn('＋ タスクを追加',()=>{SD.items.push({id:nid('T'),name:'新規タスク',start:0,dur:1,cost:0,cat:'other',task:'',done:0});render();}));
  c2.appendChild(el('div','refnote','💰 支払いの一般的な流れ: 手付金(土地10%)→土地決済(残金+諸費用)→請負契約印紙→着手金(30%)→中間金(30%)→残金(40%)。住宅ローンは竣工時実行が基本のため、土地代・着手金・中間金には<b>つなぎ融資</b>（金利2〜3%+手数料）や分割実行が必要。銀行に分割実行の可否を必ず確認。'));
  box.appendChild(c2);}
