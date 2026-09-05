/* 07-ui-parts.js — フォーム部品・SVGチャート・レンダリング統括
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= フォーム部品 ================= */
function fText(lb,v,on){const f=el('div','field',`<label>${lb}</label>`);const i=document.createElement('input');i.type='text';i.value=v;i.oninput=e=>on(e.target.value);f.appendChild(i);return f;}
function fNum(lb,v,st,on,ph){const f=el('div','field',`<label>${lb}</label>`);
  const wrap=el('div','stepper');
  const i=document.createElement('input');i.type='number';i.step=st;i.inputMode='decimal';
  if(v!==''&&v!=null)i.value=(typeof v==='number'&&!Number.isInteger(v))?Math.round(v*1000)/1000:v;
  if(ph)i.placeholder=ph;
  const fire=val=>on(val);
  i.onchange=e=>fire(e.target.value===''?null:parseFloat(e.target.value)||0);
  const bump=dir=>{const cur=i.value===''?(parseFloat(ph)||0):(parseFloat(i.value)||0);
    const nv=Math.round((cur+dir*st)*1000)/1000;i.value=nv;fire(nv);};
  const bm=btn2('−',()=>bump(-1)),bp=btn2('＋',()=>bump(1));
  wrap.appendChild(bm);wrap.appendChild(i);wrap.appendChild(bp);f.appendChild(wrap);return f;}
function btn2(t,fn){const b=document.createElement('button');b.type='button';b.textContent=t;b.onclick=fn;return b;}
function fSelect(lb,opts,val,on){const f=el('div','field',`<label>${lb}</label>`);const s=document.createElement('select');opts.forEach(([v,t])=>{const o=document.createElement('option');o.value=v;o.textContent=t;if(v===val)o.selected=true;s.appendChild(o);});s.onchange=e=>on(e.target.value);f.appendChild(s);return f;}
function readout(k,v){return el('div','readout',`<span class="k">${k}</span><span class="v">${v}</span>`);}
function subttl(t){return el('div','subttl',t);}
function btn(l,on,cls){const b=document.createElement('button');b.className='btn'+(cls?' '+cls:'');b.textContent=l;b.onclick=on;return b;}
function ratioBox(label,val,cls){return el('div','ratio '+cls,`<span>${label}</span><span>${val}</span>`);}
function chk(lb,v,on){const l=el('label','switch');const c=document.createElement('input');c.type='checkbox';c.checked=!!v;c.onchange=()=>on(c.checked?1:0);l.appendChild(c);l.appendChild(document.createTextNode(lb));return l;}
function infoCard(title,bodyHtml){const d=el('div','infocard');d.innerHTML='<h4>'+title+'</h4>'+bodyHtml;return d;}
/* ================= SVGチャート ================= */
function chart(opts){
  const W=opts.w||680,H=opts.h||220,padL=52,padR=12,padT=12,padB=24;
  const n=opts.n;const iw=W-padL-padR,ih=H-padT-padB;
  let mn=0,mx=0;
  opts.series.forEach(s=>s.vals.forEach(v=>{if(v==null)return;mn=Math.min(mn,v);mx=Math.max(mx,v);}));
  if(mx===mn){mx=mn+1;}
  const pad=(mx-mn)*.08;mx+=pad;if(mn<0)mn-=pad;
  const Y=v=>padT+ih-(v-mn)/(mx-mn)*ih;
  const X=i=>padL+(n<=1?iw/2:i/(n-1)*iw);
  const XB=i=>padL+i/n*iw;
  const svg=E('svg',{viewBox:`0 0 ${W} ${H}`,xmlns:SVGNS});
  const ticks=4;
  for(let t=0;t<=ticks;t++){const v=mn+(mx-mn)*t/ticks,y=Y(v);
    svg.appendChild(E('line',{x1:padL,y1:y,x2:W-padR,y2:y,stroke:'#E3EAEF','stroke-width':1}));
    svg.appendChild(txt(padL-6,y,Math.abs(v)>=10000?(v/10000).toFixed(1)+'億':f0(v),{mono:true,size:9,fill:'#54677A',anchor:'end'}));}
  if(mn<0){svg.appendChild(E('line',{x1:padL,y1:Y(0),x2:W-padR,y2:Y(0),stroke:'#54677A','stroke-width':1.2}));}
  const step=Math.max(1,Math.ceil(n/8));
  for(let i=0;i<n;i+=step)svg.appendChild(txt(opts.bar?XB(i)+iw/n/2:X(i),H-8,String((opts.x0||1)+i),{mono:true,size:9,fill:'#54677A'}));
  opts.series.forEach(s=>{
    if(s.type==='bar'){const bw=Math.max(2,iw/n*.62);
      s.vals.forEach((v,i)=>{if(v==null)return;const x=XB(i)+ (iw/n-bw)/2,y0=Y(0),y1=Y(v);
        svg.appendChild(E('rect',{x,y:Math.min(y0,y1),width:bw,height:Math.max(1,Math.abs(y0-y1)),fill:v>=0?(s.color||'#0E7C86'):(s.negColor||'#C0453B'),opacity:.85,rx:1}));});}
    else{let d='';s.vals.forEach((v,i)=>{if(v==null)return;d+=(d?' L ':'M ')+X(i)+' '+Y(v);});
      svg.appendChild(E('path',{d,fill:'none',stroke:s.color||'#16232F','stroke-width':s.width||2,'stroke-dasharray':s.dash||null,'stroke-linejoin':'round'}));}});
  return svg;}
function chartBox(title,svg,legendHtml){const b=el('div','chartbox');b.appendChild(el('div','charttitle',title+(legendHtml?` <span style="float:right;font-weight:500">${legendHtml}</span>`:'')));b.appendChild(svg);return b;}
/* ================= レンダリング統括 ================= */
function render(){
  syncAutoFrames();
  applyLockUI();renderScen();renderTabs();renderSheet();renderInspectorAll();renderFloorSummary();renderSelbar();
  if(view.tab==='building')renderBuildingView();
  if(view.tab==='tochi')renderTochiView();
  if(view.tab==='cost')renderCostView();
  if(view.tab==='loan')renderLoanView();
  if(view.tab==='sim')renderSimView();
  if(view.tab==='sched')renderSchedView();
  if(view.tab==='exit')renderExitView();
  if(view.tab==='comp')renderCompView();
  if(typeof pushHistory==='function'){pushHistory();saveStore();}
}
function renderScen(){const s=$('scenSel');s.innerHTML='';store.scenarios.forEach(sc=>{const o=document.createElement('option');o.value=sc.id;o.textContent=sc.name;if(sc.id===store.activeId)o.selected=true;s.appendChild(o);});}
function renderTabs(){const box=$('floortabs');box.innerHTML='';
  [...state.floors].forEach(f=>{const t=el('div','ftab'+(f.id===state.activeFloorId?' active':''));t.textContent=f.name;
    t.onclick=()=>{state.activeFloorId=f.id;view.sel=null;render();};
    t.ondblclick=()=>{const n=prompt('階の名称',f.name);if(n){f.name=n.trim();render();}};
    let timer=null;t.addEventListener('touchstart',()=>{timer=setTimeout(()=>{const n=prompt('階の名称（削除する場合は空欄→OK）',f.name);if(n===null)return;if(n.trim()===''){if(state.floors.length>1&&confirm(f.name+' を削除しますか？')){state.floors=state.floors.filter(z=>z.id!==f.id);if(state.activeFloorId===f.id)state.activeFloorId=state.floors[0].id;view.sel=null;render();}}else{f.name=n.trim();render();}},600);},{passive:true});
    t.addEventListener('touchend',()=>clearTimeout(timer));t.addEventListener('touchmove',()=>clearTimeout(timer));
    box.appendChild(t);});}
const SELBAR_POS=[['left','左端（縦）'],['right','右端（縦）'],['bottom','下（横）']];
function applySelbarPos(){const bar=$('selbar');if(!bar)return;const p=view.selbarPos||'left';
  bar.classList.remove('pos-left','pos-right','pos-bottom');bar.classList.add('pos-'+p);
  const fab=$('fabAdd');if(fab)fab.classList.toggle('fabLeft',p==='right');}
function cycleSelbarPos(){const i=SELBAR_POS.findIndex(x=>x[0]===(view.selbarPos||'left'));
  view.selbarPos=SELBAR_POS[(i+1)%SELBAR_POS.length][0];applySelbarPos();renderSelbar();}
function renderSelbar(){const o=view.locked?null:selObj(),bar=$('selbar');applySelbarPos();if(!o){view.mergeFrom=null;applyNudgeUI();const bd0=$('viewBadge');if(bd0&&!view.locked)bd0.classList.remove('show');bar.classList.remove('show');view.mode='move';view.resizeMode=0;return;}
  bar.classList.add('show');
  $('selName').textContent=view.sel.type==='room'?o.name:(ELEM[o.kind]?.label||o.kind);
  const mb=$('sbMerge');if(mb){const isRoom=view.sel.type==='room';mb.style.display=isRoom?'':'none';
    const on=view.mergeFrom===view.sel.id;mb.textContent=on?'✖ 中止':(((view.selbarPos||'left')!=='bottom')?'⊕ 合体':'⊕ 合体');mb.classList.toggle('pri',on);}
  const bd=$('viewBadge');if(bd&&!view.locked){const on=view.mergeFrom===view.sel.id;
    bd.textContent='⊕ 合体する相手の部屋をタップしてください';bd.classList.toggle('show',on);}
  applyNudgeUI();
  const vert=(view.selbarPos||'left')!=='bottom';
  const md=MODES.find(x=>x[0]===(view.mode||'move'))||MODES[0];
  const rb=$('sbMode');if(rb){rb.textContent=vert?md[1].split(' ')[1]:md[1];rb.classList.toggle('pri',md[0]!=='move');}}
