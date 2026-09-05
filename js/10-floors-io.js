/* 10-floors-io.js — フロア管理・データ引き継ぎ・入出力
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= フロア管理（追加・複製・削除） ================= */
function addFloorFrom(srcId){const src=srcId?state.floors.find(f=>f.id===srcId):null;
  const ref=state.floors[0]||{footW:8.19,footH:9.1};
  const nf={id:nid('f'),name:(state.floors.length+1)+'F',footW:src?src.footW:ref.footW,footH:src?src.footH:ref.footH,rooms:[],elems:[]};
  if(src){nf.rooms=clone(src.rooms);nf.rooms.forEach(r=>r.id=nid('r'));nf.elems=clone(src.elems);nf.elems.forEach(e=>e.id=nid('e'));}
  state.floors.unshift(nf);state.activeFloorId=nf.id;view.sel=null;closeSheet();switchTab('plan');render();}
/* 階の並べ替え（dir=-1:上へ / +1:下へ。配列の先頭が最上階） */
function moveFloor(id,dir){const i=state.floors.findIndex(f=>f.id===id);if(i<0)return;
  const j=i+dir;if(j<0||j>=state.floors.length)return;
  const a=state.floors;[a[i],a[j]]=[a[j],a[i]];render();buildFloorSheet();}
/* 下から 1F,2F,... に付け直す */
function renumberFloors(){const n=state.floors.length;
  state.floors.forEach((f,i)=>{f.name=(n-i)+'F';});render();buildFloorSheet();}
/* 階数を直接指定（増やす=最上階をコピーして上に積む / 減らす=上から削除） */
function setFloorCount(n,copy){n=Math.max(1,Math.min(12,Math.round(+n||1)));
  const cur=state.floors.length;if(n===cur)return;
  if(n<cur){const gone=state.floors.slice(0,cur-n);
    if(!confirm('上から '+(cur-n)+' 階（'+gone.map(f=>f.name).join('、')+'）を削除します。\n間取りも一緒に消えますが、よろしいですか？（↩で戻せます）'))return;
    state.floors=state.floors.slice(cur-n);}
  else{for(let k=cur;k<n;k++){const src=copy?state.floors[0]:null;
      const ref=state.floors[0]||{footW:8.19,footH:9.1};
      const nf={id:nid('f'),name:(k+1)+'F',footW:src?src.footW:ref.footW,footH:src?src.footH:ref.footH,rooms:[],elems:[],frameMode:src?src.frameMode:undefined};
      if(src){nf.rooms=clone(src.rooms);nf.rooms.forEach(r=>r.id=nid('r'));nf.elems=clone(src.elems);nf.elems.forEach(e=>e.id=nid('e'));}
      state.floors.unshift(nf);}}
  if(!state.floors.find(f=>f.id===state.activeFloorId))state.activeFloorId=state.floors[0].id;
  view.sel=null;render();buildFloorSheet();}
function deleteFloor(id){if(state.floors.length<=1){alert('最後のフロアは削除できません。');return;}
  const f=state.floors.find(x=>x.id===id);if(!f)return;
  if(!confirm('「'+f.name+'」を削除しますか？\n（↩ボタンで元に戻せます）'))return;
  state.floors=state.floors.filter(x=>x.id!==id);
  if(state.activeFloorId===id)state.activeFloorId=state.floors[0].id;
  if(state.price&&state.price.perFloor)delete state.price.perFloor[id];
  view.sel=null;render();buildFloorSheet();}
function buildFloorSheet(){const box=$('floorSheetBody');box.innerHTML='';
  box.appendChild(el('div','hint','フロア（各階）をここで管理します。行をタップで表示切替、▲▼で並べ替え、✎で名称変更、⧉で複製、🗑で削除。'));
  /* --- 階数の設定 --- */
  box.appendChild(el('div','palcat','階数を設定'));
  {const cur=state.floors.length;
   box.appendChild(el('div','ratio ok','<span>現在の階数</span><span><b>'+cur+'階</b>（地上）</span>'));
   const cg=el('div','chips');
   [1,2,3,4,5,6,7,8].forEach(n=>{const b=document.createElement('button');b.textContent=n+'階';
     if(n===cur)b.classList.add('on');
     b.onclick=()=>setFloorCount(n,true);cg.appendChild(b);});
   box.appendChild(cg);
   const g0=el('div','menulist');
   g0.appendChild(btn('＋ 1階増やす（最上階をコピー）',()=>setFloorCount(cur+1,true)));
   g0.appendChild(btn('＋ 1階増やす（空のフロア）',()=>setFloorCount(cur+1,false)));
   if(cur>1)g0.appendChild(btn('－ 1階減らす（最上階を削除）',()=>setFloorCount(cur-1),'del'));
   box.appendChild(g0);
   box.appendChild(el('div','refnote','階数チップは「最上階をコピーして積む」動作です。減らすときは上から削除されます（↩で戻せます）。'));}
  box.appendChild(el('div','palcat','現在のフロア（上＝上階）'));
  const list=el('div','floorlist');
  state.floors.forEach(f=>{const t=floorTotals(f);
    const row=el('div','floorrow'+(f.id===state.activeFloorId?' active':''));
    const info=el('div','fi');
    info.innerHTML=`<b>${esc(f.name)}${f.id===state.activeFloorId?' <span style="font-size:9px;color:var(--accent)">表示中</span>':''}</b><small>${f1(t.gross)}㎡ / ${f1(t.gross/TSUBO)}坪 ・ 部屋${f.rooms.length}・設備${f.elems.length}</small>`;
    info.onclick=()=>{state.activeFloorId=f.id;view.sel=null;render();buildFloorSheet();};
    row.appendChild(info);
    const acts=el('div','fa2');
    {const i=state.floors.indexOf(f);
     const up=btn('▲',()=>moveFloor(f.id,-1));if(i===0)up.disabled=true,up.style.opacity='.3';acts.appendChild(up);
     const dn=btn('▼',()=>moveFloor(f.id,1));if(i===state.floors.length-1)dn.disabled=true,dn.style.opacity='.3';acts.appendChild(dn);}
    acts.appendChild(btn('✎',()=>{const n=prompt('フロア名',f.name);if(n&&n.trim()){f.name=n.trim();render();buildFloorSheet();}}));
    acts.appendChild(btn('⧉',()=>addFloorFrom(f.id)));
    if(state.floors.length>1)acts.appendChild(btn('🗑',()=>deleteFloor(f.id),'del'));
    row.appendChild(acts);list.appendChild(row);});
  box.appendChild(list);
  box.appendChild(btn('↺ 階名を下から 1F・2F・… に付け直す',()=>{if(confirm('現在の並び順に合わせて、下から 1F、2F… と名前を付け直します。よろしいですか？'))renumberFloors();}));
  box.appendChild(el('div','palcat','新しいフロアを追加'));
  box.appendChild(el('div','hint','コピー元を選ぶと、その階の間取りを複製して開始します。空のフロアから始めることもできます。'));
  const g=el('div','flooradd');
  const be=btn('＋ 空のフロアを追加（コピーしない）',()=>addFloorFrom(null));be.classList.add('solid');g.appendChild(be);
  state.floors.forEach(f=>{g.appendChild(btn('⧉ 「'+f.name+'」をコピーして追加',()=>addFloorFrom(f.id)));});
  box.appendChild(g);}
/* メニュー */
function buildMenuSheet(){const box=$('menuSheetBody');box.innerHTML='';
  box.appendChild(el('div','palcat','シナリオ「'+state.name+'」'));
  const m1=el('div','menulist');
  m1.appendChild(btn('＋ 新規シナリオ',()=>{const sc=makeScenario('建物・土地'+(store.scenarios.length+1));store.scenarios.push(sc);store.activeId=sc.id;state=sc;view.sel=null;closeSheet();render();}));
  m1.appendChild(btn('⧉ このシナリオを複製',()=>{const sc=reidScenario(clone(state));sc.name=state.name+' コピー';store.scenarios.push(sc);store.activeId=sc.id;state=sc;view.sel=null;closeSheet();render();}));
  m1.appendChild(btn('✎ 名称変更',()=>{const n=prompt('シナリオ名',state.name);if(n){state.name=n.trim();render();}}));
  m1.appendChild(btn('🗑 削除',()=>{if(store.scenarios.length<=1){alert('最後のシナリオは削除できません');return;}if(!confirm(state.name+' を削除しますか？'))return;store.scenarios=store.scenarios.filter(s=>s.id!==state.id);store.activeId=store.scenarios[0].id;state=store.scenarios[0];view.sel=null;closeSheet();render();},'del'));
  box.appendChild(m1);
  box.appendChild(el('div','palcat','データ'));
  const m2=el('div','menulist');
  m2.appendChild(btn('📄 PDF資料をダウンロード（全タブまとめ）',()=>{closeSheet();exportFullPdf(state);}));
  m2.appendChild(btn('📊 Excelをダウンロード',()=>{closeSheet();exportExcel(state);}));
  m2.appendChild(btn('⇪ 詳細エクスポート（項目選択・画像）…',()=>{openSheet('exportSheet');}));
  m2.appendChild(btn('💾 保存（JSONダウンロード）',exportJson));
  m2.appendChild(btn('📂 読込（JSON）',()=>{$('fileInput').click();}));
  m2.appendChild(btn('↺ この設計を初期化',()=>{if(!confirm('現在のシナリオを初期状態に戻しますか？'))return;const nm=state.name;const idx=store.scenarios.indexOf(state);const sc=makeScenario(nm);store.scenarios[idx]=sc;store.activeId=sc.id;state=sc;view.sel=null;closeSheet();render();},'del'));
  box.appendChild(m2);
  box.appendChild(el('div','hint',(canLS?'✅ この端末のブラウザに自動保存されています（再読み込みしても消えません）。機種変更・共有にはJSON保存を使ってください。':'⚠ この環境ではブラウザ保存が使えません。作業後は必ずJSON保存してください。')+'<br>旧バージョン(v5/v6)のJSONも読み込めます。'));
  const m3=el('div','menulist');
  if(canLS)m3.appendChild(btn('🧹 端末の保存データを消去して初期化',()=>{if(!confirm('この端末に保存されたデータを消去して初期状態に戻します。よろしいですか？'))return;try{localStorage.removeItem(LSKEY);}catch(e){}location.reload();},'del'));
  box.appendChild(el('div','palcat','端末データ'));box.appendChild(m3);
  buildTransferCard(box);}
/* ================= データの引き継ぎ（バージョン間・端末間） ================= */
function storeSize(){try{return JSON.stringify(store).length;}catch(e){return 0;}}
function buildTransferCard(box){
  box.appendChild(el('div','palcat','データの引き継ぎ'));
  box.appendChild(el('div','refnote','⚠ <b>自動保存は「このHTMLファイル1つごと」に分かれています</b>。ブラウザの保存領域はファイル（オリジン）単位なので、<b>新しいバージョンのファイルを開くと前のデータは見えません</b>（消えたわけではなく、古いファイルを開けば残っています）。下のコピー／貼り付けで引き継いでください。'));
  const st=el('div','grid2',
    '<span class="g-k">自動保存</span><span class="g-v">'+(canLS?'✓ 有効（このファイル内）':'✗ 使えません')+'</span>'+
    '<span class="g-k">データ量</span><span class="g-v">'+(storeSize()/1024).toFixed(1)+' KB</span>'+
    '<span class="g-k">シナリオ数</span><span class="g-v">'+store.scenarios.length+'</span>');
  box.appendChild(st);
  const mt=el('div','menulist');
  mt.appendChild(btn('📋 全データをコピー（クリップボード）',()=>{
    const txt=JSON.stringify(store);
    const ta=$('xferBox');ta.value=txt;ta.select();
    const done=()=>alert('コピーしました。新しいバージョンのファイルを開いて、同じ画面の「貼り付けて復元」に貼ってください。');
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done).catch(()=>{try{document.execCommand('copy');done();}catch(e){alert('自動コピーに失敗しました。下の欄を長押しして手動でコピーしてください。');}});
    else{try{document.execCommand('copy');done();}catch(e){alert('下の欄を長押ししてコピーしてください。');}}}));
  box.appendChild(mt);
  const ta=document.createElement('textarea');ta.id='xferBox';ta.rows=3;
  ta.placeholder='ここに前のバージョンでコピーしたデータを長押し→貼り付けして、下のボタンを押してください';
  ta.style.cssText='width:100%;box-sizing:border-box;margin:8px 0;padding:10px;border:1px solid var(--line);border-radius:10px;font-family:var(--mono);font-size:11px;background:#fff;color:var(--ink);resize:vertical';
  box.appendChild(ta);
  const mt2=el('div','menulist');
  const b2=btn('📥 貼り付けて復元（現在のデータを置き換え）',()=>{
    const v=$('xferBox').value.trim();
    if(!v){alert('上の欄にデータを貼り付けてください。');return;}
    let d;try{d=JSON.parse(v);}catch(e){alert('データを読み取れませんでした。全文が貼り付けられているか確認してください。');return;}
    if(!d||!Array.isArray(d.scenarios)||!d.scenarios.length){alert('シナリオデータが見つかりませんでした。');return;}
    if(!confirm('現在の'+store.scenarios.length+'件のデータを、貼り付けた'+d.scenarios.length+'件で置き換えます。よろしいですか？'))return;
    adoptStore(d);});
  b2.classList.add('solid');mt2.appendChild(b2);
  mt2.appendChild(btn('➕ 貼り付けて追加（現在のデータは残す）',()=>{
    const v=$('xferBox').value.trim();if(!v){alert('上の欄にデータを貼り付けてください。');return;}
    let d;try{d=JSON.parse(v);}catch(e){alert('データを読み取れませんでした。');return;}
    if(!d||!Array.isArray(d.scenarios)){alert('シナリオデータが見つかりません。');return;}
    d.scenarios.forEach(sc=>{const c2=reidScenario(migrateScenario(clone(sc)));c2.name=(sc.name||'読込')+'（追加）';store.scenarios.push(c2);});
    saveStore();closeSheet();render();alert(d.scenarios.length+'件を追加しました。');}));
  box.appendChild(mt2);
  box.appendChild(el('div','refnote','💡 機種変更やPCとの往復なら <b>💾 JSONダウンロード</b>、同じ端末でのバージョン乗り換えなら <b>コピー／貼り付け</b> が手軽です。どちらも中身は同じJSONです。'));}
function adoptStore(d){
  d.scenarios=d.scenarios.map(sc=>migrateScenario(sc));
  store=d;if(!store.activeId||!store.scenarios.find(x=>x.id===store.activeId))store.activeId=store.scenarios[0].id;
  state=store.scenarios.find(x=>x.id===store.activeId)||store.scenarios[0];
  view.sel=null;saveStore();closeSheet();render();
  alert('復元しました（'+store.scenarios.length+'件）。');}
/* ================= IO ================= */
function dl(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);}
function exportJson(){const data=JSON.stringify(store,null,1);dl(new Blob([data],{type:'application/json'}),`madori_v6_${new Date().toISOString().slice(0,10)}.json`);}
function exportSvg(){renderSheet();const c=sheet.cloneNode(true);c.setAttribute('xmlns',SVGNS);dl(new Blob([new XMLSerializer().serializeToString(c)],{type:'image/svg+xml'}),`madori_${state.name}_${F().name}.svg`);}
function exportPng(){const s=new XMLSerializer().serializeToString(sheet),img=new Image(),blob=new Blob([s],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
  img.onload=()=>{const sc=2,cv=document.createElement('canvas');cv.width=sheet.width.baseVal.value*sc;cv.height=sheet.height.baseVal.value*sc;const ctx=cv.getContext('2d');ctx.fillStyle='#FBFCFD';ctx.fillRect(0,0,cv.width,cv.height);ctx.scale(sc,sc);ctx.drawImage(img,0,0);URL.revokeObjectURL(url);cv.toBlob(b=>dl(b,`madori_${state.name}_${F().name}.png`),'image/png');};
  img.onerror=()=>{URL.revokeObjectURL(url);alert('画像化に失敗しました。SVG出力をご利用ください。');};img.src=url;}
$('fileInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{try{let raw=String(rd.result||'').replace(/^\uFEFF/,'').trim();
    const data=JSON.parse(raw);
    /* 受け付ける形： {scenarios:[...]} / [シナリオ配列] / 単一シナリオ */
    let scs=Array.isArray(data)?data:(Array.isArray(data.scenarios)?data.scenarios:[data]);
    scs=scs.filter(sc=>sc&&Array.isArray(sc.floors));
    if(!scs.length)throw new Error('シナリオが1件も見つかりませんでした（floors を持つデータがありません）');
    scs=scs.map(sc=>migrateScenario(sc));
    scs.forEach((sc,i)=>{if(!sc.id)sc.id=nid('s');if(!sc.name)sc.name='読込'+(i+1);});
    store={scenarios:scs,activeId:scs[0].id,mode:(data.mode||(store&&store.mode)||'hybrid')};
    /* uid衝突回避 */
    let mx=0;const scan=s2=>{String(s2).replace(/\d+$/,m=>mx=Math.max(mx,+m));};
    scs.forEach(sc=>{scan(sc.id);sc.floors.forEach(fl=>{scan(fl.id);fl.rooms.forEach(r=>scan(r.id));fl.elems.forEach(e2=>scan(e2.id));});});
    uid=mx+1;
    state=scs[0];if(!state.activeFloorId||!state.floors.find(f2=>f2.id===state.activeFloorId))state.activeFloorId=state.floors[0].id;
    view.sel=null;closeSheet();render();saveStore();
    alert(scs.length+'件のシナリオを読み込みました。');
  }catch(err){alert('読み込みに失敗しました：'+err.message+'\n\nこのアプリが書き出したJSONか確認してください。ファイルが大きい場合はメニューの「データの引き継ぎ」でコピー＆貼り付けもお試しください。');}};
  rd.readAsText(f);e.target.value='';};
