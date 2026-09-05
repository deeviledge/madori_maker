/* 01-model.js — データモデル・定数・パターンライブラリ・シナリオ生成
   ※ 元の1枚HTML(v43)から切り出し。classicスクリプトとして順番に読み込む前提で、
     関数・変数はグローバル共有のまま（ESモジュール化していない）。 */
/* ================= 定数・データモデル ================= */
const TATAMI=1.62,TSUBO=3.305785,SVGNS='http://www.w3.org/2000/svg';
const SPACE={
 '自宅内部':{color:'#34506B',flags:{own:1,rental:0,far:1,bcr:1,reg:1},sym:''},
 '賃貸':{color:'#0E7C86',flags:{own:0,rental:1,far:1,bcr:1,reg:1},sym:''},
 '外廊下':{color:'#8A7BA8',flags:{own:0,rental:0,far:0,bcr:1,reg:0},sym:'corridor'},
 'EV':{color:'#5F7482',flags:{own:0,rental:0,far:0,bcr:1,reg:0},sym:'elevator'},
 '外階段':{color:'#7A8794',flags:{own:0,rental:0,far:0,bcr:0,reg:0},sym:'extstair'},
 'ベランダ':{color:'#6E8BB0',flags:{own:0,rental:0,far:0,bcr:0,reg:0},sym:''},
 '共用その他':{color:'#9AA5AF',flags:{own:0,rental:0,far:1,bcr:1,reg:1},sym:''},
 'その他':{color:'#A67C3D',flags:{own:0,rental:0,far:0,bcr:0,reg:0},sym:''}};
/* 用途区分ごとの参考寸法。mode:'both'=W×Dを適用 / 'short'=短辺（幅・奥行）だけ適用 */
const ROOMREF={
 '外廊下':{title:'共用廊下の有効幅',mode:'short',items:[['750 最小',.75],['900 実務最小',.9],['1200 片廊下法定',1.2],['1400 ゆとり',1.4],['1600 中廊下法定',1.6]],note:'共同住宅の共用廊下は、その階の居室床面積合計が100㎡を超える場合、住戸が片側のみなら有効1200mm以上、両側なら1600mm以上（施行令119条）。手すり・パイプの出っ張りは有効幅から引くこと。'},
 '自宅内部':{title:'よくある居室・水回り（壁芯）',mode:'both',items:[['内廊下 910幅',.91,3.64],['トイレ 910×1365',.91,1.365],['洗面脱衣 1820×1820',1.82,1.82],['浴室1坪 1820×1820',1.82,1.82],['4.5畳 2730×2730',2.73,2.73],['6畳 2730×3640',2.73,3.64],['8畳 3640×3640',3.64,3.64],['10畳 3640×4550',3.64,4.55],['LDK16畳 3640×7280',3.64,7.28],['LDK20畳 4550×7280',4.55,7.28]],note:'尺モジュール（910mm）基準の壁芯寸法。内廊下は壁芯910mm（有効約780mm）が標準、車いす対応なら1820mm。'},
 '賃貸':{title:'賃貸住戸の目安（壁芯）',mode:'both',items:[['1R 20㎡ 3640×5460',3.64,5.46],['1K 25㎡ 3640×6825',3.64,6.825],['1DK 30㎡ 4550×6825',4.55,6.825],['1LDK 35㎡ 4550×7735',4.55,7.735],['2LDK 45㎡ 5460×8190',5.46,8.19]],note:'単身向けは20〜25㎡がボリュームゾーン。間口3640mm（壁芯）を割るとベッドとクローゼットの同居が厳しくなる。'},
 'EV':{title:'EVシャフト（壁芯）',mode:'both',items:[['ホームEV 3人 1350×1200',1.35,1.2],['共同住宅 6人 1650×1500',1.65,1.5],['9人 1750×1650',1.75,1.65],['11人担架 1800×2100',1.8,2.1]],note:'担架対応（11人乗り）は奥行2100mm必要。ピット深さ・オーバーヘッドも断面で確認を。'},
 '外階段':{title:'屋外階段（壁芯）',mode:'both',items:[['直階段 1200×3640',1.2,3.64],['直階段 1400×3640',1.4,3.64],['かね折れ 1800×2400',1.8,2.4],['折返し 2000×2800',2.0,2.8]],note:'共同住宅の屋外直通階段は有効幅750mm以上、実務は900〜1200mm。'},
 'ベランダ':{title:'バルコニー奥行',mode:'short',items:[['900 最小',.9],['1000 不算入上限',1.0],['1200 物干し可',1.2],['1500 ゆとり',1.5],['2000 屋外リビング',2.0]],note:'開放性のあるバルコニーは先端から1m以内が床面積不算入。1mを超える部分は算入なので、超過分を設備の「加算」で補正する手もあります。'},
 '共用その他':{title:'共用部の目安',mode:'both',items:[['ゴミ置場 1820×1820',1.82,1.82],['メーターボックス 910×455',.91,.455],['自転車置場1台 600×1900',.6,1.9],['エントランス 1820×2730',1.82,2.73]],note:''}};
/* ================= パターンライブラリ（設備本体サイズ＋必要な空間サイズ） =================
   e:[設備kind, W, D]（設備に適用）  r:[空間W, 空間D]（部屋に適用）  n:名称  note:メモ  */
const PATLIB=[
 {id:'toilet',label:'トイレ',rtype:'自宅内部',items:[
  {n:'タンク式 標準',e:['toilet',.45,.75],r:[.91,1.365],note:'便器 幅450×奥行750。空間は910×1365（半間×1.5尺グリッド）が実質最小。'},
  {n:'タンクレス',e:['toilet',.4,.65],r:[.91,1.365],note:'奥行650前後。手洗いは別置きが前提。'},
  {n:'手洗いカウンター付',e:['toilet',.45,.75],r:[.91,1.82],note:'奥行1820で小型手洗いカウンターが入る。賃貸の差別化に有効。'},
  {n:'ゆとり（車いす配慮）',e:['toilet',.45,.75],r:[1.82,1.82],note:'1820×1820。介助スペースと横手すりが確保できる。'}]},
 {id:'washroom',label:'洗面台・洗面脱衣',rtype:'自宅内部',items:[
  {n:'洗面台750（賃貸標準）',e:['washbasin75',.75,.55],r:[1.365,1.82],note:'洗面台幅750。脱衣を兼ねるなら1365×1820が下限。'},
  {n:'洗面台900',e:['washbasin',.9,.55],r:[1.82,1.82],note:'幅900は最も汎用。1坪（1820角）が戸建の標準。'},
  {n:'洗面台1200 ダブルボウル',e:['washbasin',1.2,.6],r:[1.82,2.73],note:'2人同時使用。奥行600、前面に800以上の動作スペース。'},
  {n:'ランドリー兼用',e:['washbasin',.9,.55],r:[1.82,2.73],note:'洗濯機＋室内干し＋収納を入れるなら1820×2730が快適。'}]},
 {id:'laundry',label:'洗濯機',rtype:'自宅内部',items:[
  {n:'縦型 標準',e:['washer',.65,.65],r:[.91,.91],note:'本体640×640前後。防水パン640×640、周囲に各50mmの逃げ。'},
  {n:'ドラム式',e:['washer',.65,.75],r:[.91,1.0],note:'奥行750前後。扉の開閉に前方600mm以上必要。'},
  {n:'ドラム式＋乾燥機積み',e:['washer',.7,.8],r:[1.0,1.0],note:'防水パン800×740サイズ。搬入経路の有効幅も確認を。'}]},
 {id:'bath',label:'浴室（ユニットバス）',rtype:'自宅内部',items:[
  {n:'UB 1216（賃貸標準）',e:['bath1216',1.6,1.2],r:[1.82,1.365],note:'単身向け賃貸の定番。内寸1200×1600。'},
  {n:'UB 1317',e:['bath1216',1.7,1.3],r:[1.82,1.82],note:'1216より洗い場が広い。コンパクト戸建向け。'},
  {n:'UB 1616（1坪）',e:['bath1616',1.6,1.6],r:[1.82,1.82],note:'戸建の標準。構造芯1820×1820に収まる。'},
  {n:'UB 1620',e:['bath1616',2.0,1.6],r:[2.275,1.82],note:'洗い場が広い1.25坪級。'},
  {n:'UB 1818',e:['bath1818',1.8,1.8],r:[2.02,2.02],note:'注意：構造フレーム2020mm必要。1820グリッドを破るので構造確認必須。'}]},
 {id:'kitchen',label:'キッチン',rtype:'自宅内部',items:[
  {n:'ミニキッチン1200（賃貸）',e:['minikitchen',1.2,.6],r:[1.82,1.82],note:'単身向け。前面通路700以上。'},
  {n:'I型 2550 壁付',e:['kitchen',2.55,.65],r:[2.73,2.73],note:'最も一般的。背面通路800〜1000。'},
  {n:'I型 2550 対面',e:['kitchen',2.55,.65],r:[2.73,3.64],note:'対面はカウンター＋通路で奥行がもう1間必要。'},
  {n:'I型 3000',e:['kitchen',3.0,.65],r:[3.185,2.73],note:'ワークトップに余裕。食洗機・広いシンクを入れやすい。'},
  {n:'L型',e:['kitchenL',2.55,.65],r:[2.73,2.73],note:'コーナーがデッドになりやすい。回転収納で対策。'},
  {n:'アイランド',e:['kitchen',2.4,.9],r:[3.64,3.64],note:'四周に通路が要る。両側800以上＝実質1間角＋α。'}]},
 {id:'dining',label:'ダイニングテーブル',rtype:'自宅内部',items:[
  {n:'2人 800×800',e:['dining4',.8,.8],r:[2.275,2.275],note:'テーブル＋椅子引き代600×2で最低2275角。'},
  {n:'4人 1350×800',e:['dining4',1.35,.8],r:[2.73,2.73],note:'最も一般的。周囲に900の通路が理想。'},
  {n:'6人 1800×900',e:['dining6',1.8,.9],r:[3.185,2.73],note:'6人掛けは幅1800が下限。'},
  {n:'8人 2400×900',e:['dining6',2.4,.9],r:[3.64,3.185],note:'来客の多い家向け。'}]},
 {id:'living',label:'ソファ・ローテーブル・TV台',rtype:'自宅内部',items:[
  {n:'2Pソファ＋小テーブル',e:['sofa2',1.6,.85],r:[2.73,2.73],note:'ソファ1600、ローテーブル800×500、TVまで2000。'},
  {n:'3Pソファ＋標準テーブル',e:['sofa3',2.0,.9],r:[3.64,2.73],note:'ソファ2000、ローテーブル1200×600、TVまで2200〜2500。'},
  {n:'カウチL＋大テーブル',e:['sofaL',2.6,1.7],r:[3.64,3.64],note:'L型は短辺側の回遊が死ぬので壁付け推奨。'},
  {n:'ローテーブル 標準1200',e:['lowtable',1.2,.6],r:null,note:'ソファとの間隔300〜400mm。ソファ幅の60〜70%が目安。'},
  {n:'TVボード 1800（55型）',e:['tv',1.8,.4],r:null,note:'視聴距離は画面高さの約1.5倍。55型なら約2000mm。'},
  {n:'TVボード 2100（65型）',e:['tv',2.1,.4],r:null,note:'65型は視聴距離約2400mm確保を。'}]},
 {id:'bedroom',label:'ベッド・寝室',rtype:'自宅内部',items:[
  {n:'シングル 1台（4.5畳）',e:['bedS',.97,1.95],r:[2.73,2.73],note:'ベッド970×1950。4.5畳で片側通路＋小物家具。'},
  {n:'シングル 2台（6畳）',e:['bedS',.97,1.95],r:[2.73,3.64],note:'2台並べて間に通路。子供室の標準。'},
  {n:'セミダブル（6畳）',e:['bedSD',1.2,1.95],r:[2.73,3.64],note:'ベッド1200×1950。一人でゆったり。'},
  {n:'ダブル（6畳）',e:['bedD',1.4,1.95],r:[2.73,3.64],note:'ベッド1400×1950。片側寄せなら6畳で成立。'},
  {n:'ダブル＋両側通路（8畳）',e:['bedD',1.4,1.95],r:[3.64,3.64],note:'両サイド600以上。夫婦寝室の快適下限。'},
  {n:'クイーン（8畳）',e:['bedQ',1.6,1.95],r:[3.64,3.64],note:'ベッド1600×1950。8畳でぎりぎり両側通路。'},
  {n:'キング（10畳・主寝室）',e:['bedQ',1.8,1.95],r:[3.64,4.55],note:'ベッド1800×1950。主寝室は10畳＋WICが理想形。'},
  {n:'ベビーベッド併設',e:['crib',1.2,.7],r:[3.64,4.55],note:'ダブル＋ベビーベッドで10畳相当。'}]},
 {id:'closet',label:'クローゼット・WIC',rtype:'自宅内部',items:[
  {n:'クローゼット 半間',e:['closet91',.91,.91],r:null,note:'奥行910が標準。455では服が入らない。'},
  {n:'クローゼット 1間',e:['closet91',1.82,.91],r:null,note:'ハンガーパイプ1800分。'},
  {n:'WIC 2畳（I型）',e:['wic',1.82,1.82],r:[1.82,1.82],note:'片側ハンガー＋通路600。'},
  {n:'WIC 3畳（II型）',e:['wic',1.82,2.73],r:[1.82,2.73],note:'両側ハンガー、通路800以上が快適。'},
  {n:'WIC 4.5畳（ウォークスルー）',e:['wic',2.73,2.73],r:[2.73,2.73],note:'寝室と洗面をつなぐ動線に。'},
  {n:'押入 1間',e:['oshiire',1.82,.91],r:null,note:'布団収納は奥行910必須。'}]},
 {id:'entrance',label:'玄関・シューズ',rtype:'自宅内部',items:[
  {n:'賃貸コンパクト',e:['shoebox',.8,.4],r:[1.365,1.365],note:'土間＋上がり框の最小構成。'},
  {n:'戸建 標準',e:['shoebox',1.2,.4],r:[1.82,1.82],note:'土間1820×910＋ホール。'},
  {n:'シューズクローク付',e:['shoebox',1.82,.91],r:[1.82,2.73],note:'SC（土間収納）1820×910を並列。'},
  {n:'ベビーカー・自転車も置ける',e:['shoebox',1.82,.91],r:[2.73,2.73],note:'土間を広く。宅配ボックス設置も想定。'}]},
 {id:'corridor',label:'廊下',rtype:'外廊下',items:[
  {n:'内廊下 910（標準）',e:null,r:[.91,3.64],note:'壁芯910＝有効約780。戸建の標準。'},
  {n:'内廊下 1000（ゆとり）',e:null,r:[1.0,3.64],note:'すれ違いはできないが圧迫感が減る。'},
  {n:'内廊下 1365（車いす）',e:null,r:[1.365,3.64],note:'有効1200以上。車いす直進可。'},
  {n:'共用 片廊下 1200（法定）',e:null,r:[1.2,7.28],note:'共同住宅・その階の居室100㎡超なら有効1200以上（施行令119条）。'},
  {n:'共用 片廊下 1400',e:null,r:[1.4,7.28],note:'手すり・PSの出っ張りを見込んだ実務値。'},
  {n:'共用 中廊下 1600（法定）',e:null,r:[1.6,7.28],note:'両側に住戸がある場合は有効1600以上。'}]},
 {id:'stair',label:'階段',rtype:'自宅内部',items:[
  {n:'直階段 910幅',e:['stair',.91,3.64],r:[.91,3.64],note:'有効750以上（法規）。910は最小構成。'},
  {n:'直階段 1200幅',e:['stair',1.2,3.6],r:[1.2,3.64],note:'有効850以上で快適。'},
  {n:'かね折れ 1間角',e:['lstair',1.82,1.82],r:[1.82,1.82],note:'回り部30度割り。間取りを乱しにくい。'},
  {n:'折返し 1820×2730',e:['switchback',1.82,2.73],r:[1.82,2.73],note:'尺モジュール標準。踊場付きで安全。'},
  {n:'螺旋 φ1600',e:['spiral',1.6,1.6],r:[1.82,1.82],note:'省スペースだが大型家具の搬入不可。主要階段には不向きな場合あり。'}]},
 {id:'ev',label:'エレベーター',rtype:'EV',items:[
  {n:'ホームEV 3人乗',e:null,r:[1.35,1.2],note:'自宅用。1350×1200前後。'},
  {n:'共同住宅 6人乗',e:null,r:[1.65,1.5],note:'小規模共同住宅の標準。'},
  {n:'9人乗',e:null,r:[1.75,1.65],note:'一般的な集合住宅仕様。'},
  {n:'11人乗 担架対応',e:null,r:[1.8,2.1],note:'奥行2100必要。介護・救急を想定するなら。'}]},
 {id:'balcony',label:'バルコニー',rtype:'ベランダ',items:[
  {n:'奥行900（最小）',e:null,r:[3.64,.9],note:'洗濯物を干すと通行が厳しい。'},
  {n:'奥行1000（不算入上限）',e:null,r:[3.64,1.0],note:'先端1mまでは床面積不算入（開放性の条件あり）。'},
  {n:'奥行1200（物干し快適）',e:null,r:[3.64,1.2],note:'超過200mm分は床面積算入。'},
  {n:'奥行2000（屋外リビング）',e:null,r:[3.64,2.0],note:'超過1000mm分が算入。容積に注意。'}]},
 {id:'unit',label:'賃貸住戸',rtype:'賃貸',items:[
  {n:'1R 20㎡',e:null,r:[3.64,5.46],note:'ボリュームゾーン。UB1216＋ミニキッチン。'},
  {n:'1K 25㎡',e:null,r:[3.64,6.825],note:'キッチンを廊下側に分離。'},
  {n:'1DK 30㎡',e:null,r:[4.55,6.825],note:'二人入居可。賃料単価は下がるが空室リスク低め。'},
  {n:'1LDK 35㎡',e:null,r:[4.55,7.735],note:'DINKS向け。'},
  {n:'2LDK 45㎡',e:null,r:[5.46,8.19],note:'ファミリー向け。長期入居が期待できる。'}]}
];
const CATLABEL={opening:'開口部',stair:'階段',water:'水回り',kitchen:'キッチン',storage:'収納',bed:'ベッド',living:'リビング家具',etc:'その他'};
const FLAGDEF=[['own','自宅専有'],['rental','賃貸'],['far','容積対象'],['bcr','建ぺい対象'],['reg','登記床']];
const ROOMSYM=[['','なし'],['stair','内階段(直線)'],['switchback','内階段(折返し)'],['lstair','内階段(かね折れ)'],['spiral','螺旋階段'],['extstair','外階段(直線)'],['extswitch','外階段(折返し)'],['extlstair','外階段(かね折れ)'],['elevator','EV'],['corridor','廊下ハッチ']];
/* 設備・家具ライブラリ（cat: opening/stair/water/kitchen/storage/bed/living/etc） */
const ELEM={
 door:{label:'ドア(開き)',w:.85,h:.85,cat:'opening',opening:1,sizes:[['片開き 780',0.78,0.78],['片開き 850',0.85,0.85],['トイレ 650',0.65,0.65]],note:'枠外寸で650〜850mmが一般的。トイレ・洗面は650〜750mm。'},
 sliding:{label:'引戸',w:1.65,h:.2,cat:'opening',opening:1,sizes:[['片引き 1200',1.2,0.2],['片引き 1650',1.65,0.2],['引違い 1820',1.82,0.2]],note:'片引きは1200〜1650mm。バリアフリーで採用増。'},
 folding:{label:'折戸(クローゼット)',w:1.2,h:.2,cat:'opening',opening:1,sizes:[['クロゼット 1650',1.65,0.2],['クロゼット 1800',1.8,0.2],['小型 900',0.9,0.2]],note:'折戸は開口を広く取れるが手前に人が立つスペースが必要。'},
 window:{label:'窓/サッシ',w:1.65,h:.2,cat:'opening',opening:1,sizes:[['腰窓 1200',1.2,0.2],['腰窓 1650',1.65,0.2],['小窓 600',0.6,0.2]],note:'サッシ呼称16509=幅1650。採光は居室床面積の1/7以上。'},
 fullwindow:{label:'掃き出し窓',w:2.55,h:.2,cat:'opening',opening:1,sizes:[['1690(1間弱)',1.69,0.2],['2550(1.5間)',2.55,0.2],['3420(2間)',3.42,0.2]],note:'バルコニー出入り用。16520/25620が代表サイズ。'},
 stair:{label:'内階段(直線)',w:1.2,h:3.6,cat:'stair',stair:1,sizes:[['幅910×3640',0.91,3.64],['幅1200×3600',1.2,3.6],['幅1365×3640',1.365,3.64]],note:'直階段は階高2900mmで蹴上190mm前後→15〜16段。有効幅は750mm以上(法規)、快適850mm〜。'},
 switchback:{label:'内階段(折返し)',w:2,h:2.6,cat:'stair',stair:1,sizes:[['1820×2730(半間×1.5間)',1.82,2.73],['2000×2600',2.0,2.6],['1820×3185',1.82,3.185]],note:'折返し(U字)は1820×2730mmが尺モジュール標準。踊場付きで安全性が高い。'},
 lstair:{label:'内階段(かね折れ/L字)',w:1.82,h:2.73,cat:'stair',stair:1,sizes:[['1間角 1820×1820',1.82,1.82],['1820×2730',1.82,2.73],['2000×2000',2.0,2.0],['1820×3640',1.82,3.64]],note:'かね折れ(L字)は隔間を乱さずに収まりやすい。回り部は30度割りが一般で、踏面の狭い側が危険なので手すりを内側に。'},
 spiral:{label:'螺旋階段',w:1.6,h:1.6,cat:'stair',stair:1,sizes:[['φ1400',1.4,1.4],['φ1600',1.6,1.6],['φ1800',1.8,1.8],['φ2000',2.0,2.0]],note:'螺旋はφ1400〜2000mm。省スペースだが大型家具の搬入不可。主要な直通階段には使えないケースが多いので確認を。'},
 extstair:{label:'外階段(直線)',w:1.4,h:3.6,cat:'stair',stair:1,ext:1,sizes:[['幅1200×3600',1.2,3.6],['幅1400×3640',1.4,3.64]],note:'共同住宅の屋外直通階段。有効幅750mm以上(2方向避難等の条件で緩和有)、実務は900〜1200mm。'},
 extlstair:{label:'外階段(かね折れ)',w:1.8,h:2.4,cat:'stair',stair:1,ext:1,sizes:[['1800×2400',1.8,2.4],['2000×2700',2.0,2.7]],note:'鉄骨のかね折れ。踊場奥行1200mm以上が目安。'},
 extswitch:{label:'外階段(折返し)',w:2.0,h:2.8,cat:'stair',stair:1,ext:1,sizes:[['1800×2800',1.8,2.8],['2000×3000',2.0,3.0]],note:'鉄骨階段の折返しは平面2000×2800mm前後が標準的。踊場奥行1200mm以上目安。'},
 bath1216:{label:'UB 1216',w:1.6,h:1.2,cat:'water',glyph:'bath',sizes:[['1116 (1100×1600)',1.6,1.1],['1216 (1200×1600)',1.6,1.2],['1317',1.7,1.3]],note:'単身向け賃貸の標準。設置には内寸+躯体クリアランス各50〜100mm必要。'},
 bath1616:{label:'UB 1616',w:1.6,h:1.6,cat:'water',glyph:'bath',sizes:[['1616 (1坪)',1.6,1.6],['1620',2.0,1.6],['1624',2.4,1.6]],note:'戸建・自宅の標準1坪タイプ。構造芯1820×1820mmに収まる。'},
 bath1818:{label:'UB 1818',w:1.8,h:1.8,cat:'water',glyph:'bath',sizes:[['1717',1.7,1.7],['1818 (1.25坪級)',1.8,1.8]],note:'要注意: 1818は構造フレーム2020mm必要で標準1間(1820)グリッドを破る。採用前に構造確認。'},
 toilet:{label:'トイレ',w:.9,h:1.35,cat:'water',sizes:[['0.4坪 780×1230',0.78,1.23],['0.5坪 910×1365',0.91,1.365],['ゆったり 910×1820',0.91,1.82]],note:'標準は内寸780×1230mm(0.4坪)。手洗い器付きなら0.5坪〜。'},
 washbasin:{label:'洗面台',w:.9,h:.55,cat:'water',sizes:[['600幅',0.6,0.55],['750幅',0.75,0.55],['900幅',0.9,0.55],['1200幅',1.2,0.55]],note:'間口600/750/900/1200mm、奥行500〜600mmが規格。'},
 washbasin75:{label:'洗面台750',w:.75,h:.55,cat:'water',glyph:'washbasin',sizes:[['750幅',0.75,0.55],['900幅',0.9,0.55],['1200幅(ダブル)',1.2,0.6]],note:'奥行は500〜600mmが標準。前方に600mm以上の動作スペースを。'},
 washer:{label:'洗濯機置場',w:.74,h:.74,cat:'water',sizes:[['防水パン640',0.64,0.64],['防水パン740',0.74,0.74],['ドラム式余裕800',0.8,0.72]],note:'防水パンは640/740/800mm角。ドラム式は幅640×奥行720mm程度＋放熱余裕。'},
 kitchen:{label:'キッチン I型2550',w:2.55,h:.65,cat:'kitchen',glyph:'kitchen',sizes:[['I型1800',1.8,0.65],['I型2250',2.25,0.65],['I型2550',2.55,0.65],['I型2700',2.7,0.65]],note:'I型は間口1800/2250/2550/2700mm、奥行650mmが規格。通路は800〜900mm確保。'},
 kitchenL:{label:'キッチン I型1800',w:1.8,h:.65,cat:'kitchen',glyph:'kitchen',sizes:[['I型 1800',1.8,0.65],['I型 2100',2.1,0.65],['I型 2550',2.55,0.65],['I型 3000',3.0,0.65]],note:'奥行は600〜650mmが標準。背後の通路は800〜1000mm確保。'},
 minikitchen:{label:'ミニキッチン1200',w:1.2,h:.55,cat:'kitchen',glyph:'kitchen',sizes:[['900幅',0.9,0.55],['1050幅',1.05,0.55],['1200幅',1.2,0.55],['1500幅',1.5,0.55]],note:'ワンルーム向け。間口900〜1500mm、奥行550mm。IH1口+小型冷蔵庫内蔵型が主流。'},
 cupboard:{label:'カップボード',w:1.8,h:.45,cat:'kitchen',sizes:[['1800×450',1.8,0.45],['2100×450',2.1,0.45],['2550×450',2.55,0.45],['1800×650(カウンター付)',1.8,0.65]],note:'奥行450mmが標準。カウンター付は650mm。キッチンとの間は900〜1000mm。'},
 fridge:{label:'冷蔵庫',w:.68,h:.72,cat:'kitchen',sizes:[['単身 480×590',0.48,0.59],['400L級 600×650',0.6,0.65],['500L級 685×700',0.685,0.7]],note:'ファミリー用500L級で幅685mm。放熱に左右5mm/上50mm余裕。'},
 closet:{label:'収納(600)',w:1.0,h:.6,cat:'storage',glyph:'closet',sizes:[['幅910×奥600',0.91,0.6],['幅1820×奥600',1.82,0.6]],note:'衣類向けクローゼットは奥行600mmで足りる(ハンガー掛け550mm)。'},
 closet91:{label:'収納(910)',w:1.0,h:.91,cat:'storage',glyph:'closet',sizes:[['半間 910×910',0.91,0.91],['1間 1820×910',1.82,0.91],['1.5間 2730×910',2.73,0.91]],note:'奥行910mmがハンガー収納の標準。455mmだと服が入らない。'},
 wic:{label:'WIC',w:1.8,h:1.6,cat:'storage',sizes:[['2畳 1820×1820',1.82,1.82],['1.5畳 1820×1365',1.82,1.365],['3畳 1820×2730',1.82,2.73]],note:'通路600mm+両側ハンガー550mm×2で内寸1700mm以上あるとU字使いできる。'},
 oshiire:{label:'押入',w:1.8,h:.9,cat:'storage',sizes:[['1間 1820×910',1.82,0.91],['半間 910×910',0.91,0.91],['天袋付 1820×910',1.82,0.91]],note:'布団収納は奥行910mm必須。'},
 shoebox:{label:'シューズボックス',w:1.2,h:.4,cat:'storage',glyph:'closet',sizes:[['800×400',0.8,0.4],['1200×400',1.2,0.4],['1600×400(トール)',1.6,0.4],['シューズクローゼット 1820×910',1.82,0.91]],note:'奥行350〜400mm。一人あたり15足目安。'},
 bedS:{label:'シングルベッド',w:.98,h:1.95,cat:'bed',glyph:'bed',sizes:[['S 980×1950',0.98,1.95],['ロング 980×2070',0.98,2.07]],note:'マットレス規格970〜980×1950mm。片側通路500mm以上確保。'},
 bedSD:{label:'セミダブル',w:1.2,h:1.95,cat:'bed',glyph:'bed',sizes:[['セミダブル 1200×1950',1.2,1.95],['セミダブルロング 1200×2050',1.2,2.05]],note:'幅1200mm。一人でゆったり、二人では狭い。'},
 bedD:{label:'ダブルベッド',w:1.4,h:1.95,cat:'bed',glyph:'bed',sizes:[['D 1400×1950',1.4,1.95],['ワイドD 1520×1950',1.52,1.95]],note:'ダブル1400mm幅。フレーム込は+50〜100mm見込む。'},
 bedQ:{label:'クイーンベッド',w:1.6,h:1.95,cat:'bed',glyph:'bed',sizes:[['クイーン 1600×1950',1.6,1.95],['キング 1800×1950',1.8,1.95]],note:'クイーンは幅1600mm。両サイドに600mm以上の通路を確保すると13畳前後必要。'},
 crib:{label:'ベビーベッド',w:.7,h:1.2,cat:'bed',glyph:'bed',sizes:[['標準 1200×700',1.2,0.7],['ミニ 900×600',0.9,0.6]],note:'使用期間は2〜3年。撤去後の家具配置も想定しておくと良い。'},
 sofa2:{label:'ソファ 2P',w:1.6,h:.85,cat:'living',glyph:'sofa',sizes:[['2P 1600×850',1.6,0.85],['2.5P 1800×900',1.8,0.9]],note:'2人掛け幅1400〜1700mm。ローテーブルとの間は300〜450mm。'},
 sofa3:{label:'ソファ 3P',w:2.2,h:.9,cat:'living',glyph:'sofa',sizes:[['3P 1900×900',1.9,0.9],['3P 2200×950',2.2,0.95]],note:'3人掛け幅1800〜2200mm、奥行850〜950mm。'},
 sofaL:{label:'カウチソファ L',w:2.5,h:1.6,cat:'living',glyph:'sofaL',sizes:[['カウチ 2400×1600',2.4,1.6],['カウチ 2600×1700',2.6,1.7],['大型 3000×1800',3.0,1.8]],note:'L形は短辺側の周回動線が死にやすい。壁付け推奨。'},
 dining4:{label:'ダイニング 4人',w:1.4,h:.8,cat:'living',glyph:'table',sizes:[['4人 1350×800',1.35,0.8],['4人 1500×850',1.5,0.85]],note:'1人分の目安は幅600×奥行400mm。椅子引きに後方750mm必要。'},
 dining6:{label:'ダイニング 6人',w:1.8,h:.9,cat:'living',glyph:'table',sizes:[['6人 1800×900',1.8,0.9],['6人 2000×950',2.0,0.95],['6人 2100×1000',2.1,1.0]],note:'6人掛けは1800×900mmが最小目安、ゆったりは2000mm以上。椅子込み占有は+750mm/辺。'},
 lowtable:{label:'ローテーブル',w:1.1,h:.55,cat:'living',glyph:'table',sizes:[['小 800×500',0.8,0.5],['標準 1000×500',1.0,0.5],['標準 1200×600',1.2,0.6],['大 1400×750',1.4,0.75]],note:'ソファとの間隔は300〜400mm。ソファ幅の60〜70%の長さがバランス良い。'},
 desk:{label:'デスク',w:1.2,h:.6,cat:'living',glyph:'desk',sizes:[['1000×600',1.0,0.6],['1200×600',1.2,0.6],['1400×700',1.4,0.7]],note:'在宅ワークは1200×600mm〜が快適。椅子後方600mm以上。'},
 chair:{label:'チェア',w:.5,h:.5,cat:'living',glyph:'chair',sizes:[['ダイニング 450×500',0.45,0.5],['アームチェア 600×600',0.6,0.6],['パーソナル 800×800',0.8,0.8]],note:'引き代として背後に600mm、通行も兼ねるなら900mm。'},
 tv:{label:'TVボード',w:1.8,h:.42,cat:'living',glyph:'tv',sizes:[['1500×400',1.5,0.4],['1800×420',1.8,0.42],['2000×450',2.0,0.45]],note:'TV幅+左右200mm以上。55型TV幅≒1240mm。視聴距離は画面高×3。'},
 piano:{label:'アップライトピアノ',w:1.5,h:.62,cat:'living',glyph:'desk',sizes:[['UP 1500×620',1.5,0.62],['グランドC3 1490×1860',1.49,1.86]],note:'アップライトは約1500×620mm・重量200kg超。床補強・壁から100mm離隔。'},
 aircon:{label:'エアコン',w:.8,h:.24,cat:'etc',glyph:'aircon',sizes:[['6畳用 780×230',0.78,0.23],['14畳用 900×250',0.9,0.25]],note:'室内機は幅800mm前後。据付板+左右50mm・上50mm離隔。'},
 balcony_wash:{label:'物干し',w:1.6,h:.3,cat:'etc',glyph:'aircon',sizes:[['1連 1800',1.8,0.1],['2連 2000',2.0,0.1],['コンパクト 1200',1.2,0.1]],note:'物干しは幅分のバルコニー奥行1200mm以上あると使いやすい。'}
};
const ELEMCATS=[['opening','開口部'],['stair','階段'],['water','水回り'],['kitchen','キッチン'],['storage','収納'],['bed','ベッド'],['living','リビング・家具'],['etc','その他']];
let uid=1;const nid=p=>(p||'o')+(uid++);const clone=o=>JSON.parse(JSON.stringify(o));
function rectPoly(x,y,w,h){return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];}
function room(name,type,x,y,w,h){const sp=SPACE[type];return {id:nid('r'),name,type,poly:rectPoly(x,y,w,h),flags:clone(sp.flags),sym:sp.sym};}
function elem(kind,x,y,w,h,props){const d=ELEM[kind];return {id:nid('e'),kind,x,y,w:w??d.w,h:h??d.h,rot:0,flip:0,props:props||{}};}
function defExtras(){return [{name:'地盤改良工事',amount:300},{name:'外構工事',amount:250},{name:'解体・引込・その他',amount:150}];}
function defFinance(){return {
 incomeSelf:900,incomePartner:720,multSalary:8,multCombined:10,
 equity:3000,loanCap:13000,
 loanType:'annuity',rateActual:0.9,rateScreen:3.5,years:35,dsrLimit:35,
 rateList:'0.6, 0.9, 1.5, 2.0',stressOn:0,stressAfter:10,stressAdd:1.0,
 monthlyRent:48,vacancy:5,rentDecline:0.5,mgmtFee:5,opex:10,taxAnnual:35,insAnnual:5,
 currentRent:20,
 dedOn:1,dedRate:0.7,dedYears:13,dedCap:4500,
 holdYears:35,landAppr:0.5,
 repairs:[{year:12,amount:150},{year:15,amount:350},{year:24,amount:450}]};}
function migrateFinance(g){const d=defFinance();if(!g)return d;const o=Object.assign(d,g);
 if(g.rateActual==null&&g.rate!=null)o.rateActual=g.rate;
 if(!g.loanType)o.loanType='annuity';
 if(g.dedOn==null)o.dedOn=1;
 if(!g.rateList)o.rateList=d.rateList;
 if(!Array.isArray(o.repairs))o.repairs=defFinance().repairs;
 return o;}
function seedDesign(){return {settings:{wallOut:.15,wallIn:.10,floorH:2.9,rise:.19},floors:[
 {id:nid('f'),name:'4F',footW:8.19,footH:9.1,rooms:[room('LDK','自宅内部',0,0,5.2,7.7),room('書斎','自宅内部',5.2,2.2,2.99,3.0),room('トイレ','自宅内部',5.2,5.2,1.4,2.5),room('パントリー','自宅内部',6.6,5.2,1.59,2.5),room('ベランダ','ベランダ',5.2,0,2.99,2.2),room('EV','EV',0,7.7,1.6,1.4),room('外廊下','外廊下',1.6,7.7,4.7,1.4),room('外階段','外階段',6.3,7.7,1.89,1.4)],elems:[elem('kitchen',.3,6.9),elem('switchback',3.1,5.4,2,2.2),elem('cupboard',.3,6.1),elem('fridge',2.2,6.1),elem('sofa3',.4,2.6),elem('lowtable',.6,3.7),elem('dining6',2.6,.9),elem('tv',.3,.15),elem('fullwindow',.2,3.2,.2,2.55),elem('desk',5.5,2.4),elem('door',4.5,5.0,.85,.85,{hinge:0})]},
 {id:nid('f'),name:'3F',footW:8.19,footH:9.1,rooms:[room('浴室','自宅内部',0,0,2.73,2.0),room('洗面脱衣','自宅内部',0,2.0,2.73,1.5),room('ランドリー','自宅内部',0,3.5,2.73,1.2),room('ベッドルーム②','自宅内部',0,4.7,2.73,3.0),room('ベッドルーム①','自宅内部',2.73,0,2.73,3.2),room('ホール・階段','自宅内部',2.73,3.2,2.73,2.5),room('玄関','自宅内部',2.73,5.7,2.73,2.0),room('マスターベッドルーム','自宅内部',5.46,0,2.73,4.7),room('WIC','自宅内部',5.46,4.7,2.73,1.5),room('トイレ','自宅内部',5.46,6.2,1.36,1.5),room('納戸','自宅内部',6.82,6.2,1.37,1.5),room('EV','EV',0,7.7,1.6,1.4),room('外廊下','外廊下',1.6,7.7,4.7,1.4),room('外階段','外階段',6.3,7.7,1.89,1.4)],elems:[elem('bath1616',.1,.2),elem('washbasin',.2,2.2),elem('washer',1.8,2.15),elem('switchback',2.83,3.3,2.0,2.3),elem('toilet',5.55,6.3),elem('bedD',5.65,.3),elem('bedS',2.85,.3),elem('bedS',.15,4.9),elem('wic',5.55,4.75,2.5,1.35),elem('shoebox',3.0,7.2)]},
 {id:nid('f'),name:'2F',footW:8.19,footH:9.1,rooms:[room('賃貸201','賃貸',0,0,2.5,7.7),room('賃貸202','賃貸',2.845,0,2.5,7.7),room('賃貸203','賃貸',5.69,0,2.5,7.7),room('EV','EV',0,7.7,1.6,1.4),room('外廊下','外廊下',1.6,7.7,4.7,1.4),room('外階段','外階段',6.3,7.7,1.89,1.4)],elems:[elem('bath1216',.1,.15),elem('minikitchen',.15,7.0),elem('bedS',1.35,2.2),elem('bath1216',2.95,.15),elem('minikitchen',3.0,7.0),elem('bath1216',5.79,.15),elem('minikitchen',5.85,7.0)]},
 {id:nid('f'),name:'1F',footW:8.19,footH:9.1,rooms:[room('賃貸101','賃貸',0,0,2.5,7.7),room('賃貸102','賃貸',2.845,0,2.5,7.7),room('賃貸103','賃貸',5.69,0,2.5,7.7),room('EV','EV',0,7.7,1.6,1.4),room('外廊下','外廊下',1.6,7.7,4.7,1.4),room('外階段','外階段',6.3,7.7,1.89,1.4)],elems:[elem('bath1216',.1,.15),elem('minikitchen',.15,7.0),elem('bath1216',2.95,.15),elem('minikitchen',3.0,7.0),elem('bath1216',5.79,.15),elem('minikitchen',5.85,7.0)]}
],activeFloorId:null};}
function seedInvest(){return {settings:{wallOut:.15,wallIn:.10,floorH:2.9,rise:.19},floors:[
 {id:nid('f'),name:'3F',footW:8.19,footH:9.1,rooms:[room('賃貸301','賃貸',0,0,2.5,7.7),room('賃貸302','賃貸',2.845,0,2.5,7.7),room('賃貸303','賃貸',5.69,0,2.5,7.7),room('EV','EV',0,7.7,1.6,1.4),room('外廊下','外廊下',1.6,7.7,4.7,1.4),room('外階段','外階段',6.3,7.7,1.89,1.4)],elems:[elem('bath1216',.1,.15),elem('minikitchen',.15,7.0),elem('bath1216',2.95,.15),elem('minikitchen',3.0,7.0),elem('bath1216',5.79,.15),elem('minikitchen',5.85,7.0)]},
 {id:nid('f'),name:'2F',footW:8.19,footH:9.1,rooms:[room('賃貸201','賃貸',0,0,2.5,7.7),room('賃貸202','賃貸',2.845,0,2.5,7.7),room('賃貸203','賃貸',5.69,0,2.5,7.7),room('EV','EV',0,7.7,1.6,1.4),room('外廊下','外廊下',1.6,7.7,4.7,1.4),room('外階段','外階段',6.3,7.7,1.89,1.4)],elems:[elem('bath1216',.1,.15),elem('minikitchen',.15,7.0),elem('bath1216',2.95,.15),elem('minikitchen',3.0,7.0),elem('bath1216',5.79,.15),elem('minikitchen',5.85,7.0)]},
 {id:nid('f'),name:'1F',footW:8.19,footH:9.1,rooms:[room('賃貸101','賃貸',0,0,2.5,7.7),room('賃貸102','賃貸',2.845,0,2.5,7.7),room('賃貸103','賃貸',5.69,0,2.5,7.7),room('EV','EV',0,7.7,1.6,1.4),room('外廊下','外廊下',1.6,7.7,4.7,1.4),room('外階段','外階段',6.3,7.7,1.89,1.4)],elems:[elem('bath1216',.1,.15),elem('minikitchen',.15,7.0),elem('bath1216',2.95,.15),elem('minikitchen',3.0,7.0),elem('bath1216',5.79,.15),elem('minikitchen',5.85,7.0)]}
],activeFloorId:null};}
function seedHome(){return {settings:{wallOut:.15,wallIn:.10,floorH:2.9,rise:.19},floors:[
 {id:nid('f'),name:'2F',footW:9.1,footH:8.19,rooms:[room('主寝室','自宅内部',0,0,3.64,3.5),room('子供室1','自宅内部',3.64,0,2.73,3.5),room('子供室2','自宅内部',6.37,0,2.73,3.5),room('ホール・階段','自宅内部',3.64,3.5,2.73,2.5),room('WIC','自宅内部',0,3.5,3.64,2.0),room('トイレ','自宅内部',6.37,3.5,1.5,2.0),room('バルコニー','ベランダ',0,6.0,9.1,2.19)],elems:[elem('switchback',3.84,3.7,2.0,2.2),elem('bedD',.3,.3),elem('bedS',3.9,.3),elem('bedS',6.6,.3),elem('wic',.3,3.7,3.0,1.6),elem('toilet',6.5,3.7)]},
 {id:nid('f'),name:'1F',footW:9.1,footH:8.19,rooms:[room('LDK','自宅内部',0,0,5.46,6.0),room('和室','自宅内部',5.46,0,3.64,3.5),room('浴室','自宅内部',5.46,3.5,1.82,2.0),room('洗面脱衣','自宅内部',7.28,3.5,1.82,2.0),room('玄関・ホール','自宅内部',5.46,5.5,3.64,2.69),room('トイレ','自宅内部',0,6.0,1.5,2.19),room('階段','自宅内部',1.5,6.0,2.73,2.19)],elems:[elem('switchback',1.7,6.0,2.0,2.0),elem('kitchen',.3,.3),elem('dining6',2.6,1.2),elem('sofa3',.4,3.5),elem('tv',.3,5.6),elem('bath1616',5.56,3.6),elem('washbasin',7.4,3.6),elem('toilet',.2,6.1),elem('shoebox',7.0,6.0)]}
],activeFloorId:null};}
function makeScenarioMode(name,m){let d;if(m==='invest')d=seedInvest();else if(m==='home')d=seedHome();else d=seedDesign();
 d.activeFloorId=d.floors[0].id;
 const sc=Object.assign(d,{id:nid('s'),name,land:{W:9.0,D:11.0,areaManual:null,bcrLimit:80,farLimit:300,mode:'rect',poly:null,youto:'近商',road:6.0,bouka:'準防火',kuiki:'市街化',setto:6.0,setback:0.5,saiken:'可',jyoken:'なし',hLimit:0,minArea:0,floorsPlan:4,priceManual:null},price:{landUnitMode:'tsubo',landUnit:250,buildingUnit:105,ancillaryPct:15,perFloor:{},extras:defExtras(),misc:null},finance:defFinance(),loans:defLoans(),activeLoanId:null,tax:defTax(),rent:defRent(),sched:defSched(),exit:defExit()});
 if(m==='invest'){sc.activeLoanId=sc.loans.find(L=>L.type==='apart')?.id||sc.loans[0].id;sc.finance.dedOn=0;}
 if(m==='home'){sc.activeLoanId=(sc.loans.find(L=>L.type==='jutaku'&&/自宅|フラット/.test((L.name||'')+(L.product||'')))||sc.loans.find(L=>L.type==='jutaku')||sc.loans[0]).id;sc.tax.rentalTaxOn=0;}
 return sc;}
function defLoans(){return [
 {id:nid('L'),name:'横浜銀行',product:'住宅ローン(賃貸併用)',type:'jutaku',rate:0.9,rateScreen:3.5,years:35,method:'annuity',dsrLimit:35,includeRentPct:0,capAmount:13000,feePct:2.2,note:'自宅50%以上が条件。賃料合算は個別審査。'},
 {id:nid('L'),name:'フラット35',product:'住宅ローン(自宅・全期間固定)',type:'jutaku',rate:1.8,rateScreen:1.8,years:35,method:'annuity',dsrLimit:35,includeRentPct:0,capAmount:8000,feePct:1.5,note:'通常の自宅向け住宅ローン（賃貸併用専用ではない）。全期間固定で金利変動リスクなし。借入上限8,000万・自宅利用が前提。'},
 {id:nid('L'),name:'スルガ銀行',product:'アパートローン',type:'apart',rate:2.5,rateScreen:3.5,years:30,method:'annuity',dsrLimit:40,includeRentPct:70,capAmount:16000,feePct:2.2,note:'賃料の70%程度を収入合算可。金利は属性次第。'},
 {id:nid('L'),name:'千葉銀行',product:'プロパー融資',type:'proper',rate:1.5,rateScreen:2.5,years:30,method:'annuity',dsrLimit:40,includeRentPct:100,capAmount:15000,feePct:1.1,note:'事業性評価。DSCR 1.2以上目安。'}];}
function defTax(){return {marginalRate:33,rentalTaxOn:1,bodyYears:22,equipPct:20,equipYears:15,bldRatioManual:null,
 entity:'personal',corpRate:34,salaryIncome:1620,carryLoss:1,bizTaxOn:0,capexOn:0};}
/* 構造（工法）：法定耐用年数（住宅用・躯体）と概算坪単価の目安 */
const STRUCTURES=[
 {v:'wood',label:'木造',years:22,unit:77,loanYears:35,note:'法定耐用年数22年。坪単価が最も安く、アパート・戸建の主流。'},
 {v:'lgs19',label:'軽量鉄骨（骨格材 肉厚3mm以下）',years:19,unit:80,loanYears:20,note:'プレハブ系。法定19年。'},
 {v:'lgs27',label:'軽量鉄骨（肉厚3〜4mm）',years:27,unit:88,loanYears:27,note:'法定27年。'},
 {v:'hgs',label:'重量鉄骨（肉厚4mm超）',years:34,unit:100,loanYears:34,note:'法定34年。3〜4階の共同住宅・店舗併用に多い。'},
 {v:'rc',label:'RC（鉄筋コンクリート）',years:47,unit:110,loanYears:45,note:'法定47年。耐久・遮音・耐火に優れ、長期融資も取りやすい。'},
 {v:'wrc',label:'WRC（壁式鉄筋コンクリート）',years:47,unit:108,loanYears:45,note:'低層向けのRC。法定47年。'},
 {v:'src',label:'SRC（鉄骨鉄筋コンクリート）',years:47,unit:125,loanYears:45,note:'法定47年。中高層向け。坪単価は最も高い。'}];
function structInfo(v){return STRUCTURES.find(s=>s.v===v)||STRUCTURES[0];}
function defExit(){return {holdYears:10,exitCapRate:7.0,capRateStress:1.0,sellCostPct:4,longTerm:1,acqYear:2026,landRatioForDepr:null};}
function defJudge(){return {roiPass:3.0,berPass:80};}
function defRent(){return {units:{},override:null,curve:{r1:1.0,r2:0.7,r3:0.4}};}
function defSched(){let m=0;const it=(name,start,dur,cost,cat,task)=>({id:nid('T'),name,start,dur,cost:cost||0,cat,task:task||'',done:0});
 return {startLabel:'2026-08',items:[
  it('土地探し・現地調査',0,3,0,'land','エリア/坪単価/ハザード確認、買付準備'),
  it('買付・売買契約',3,1,750,'land','手付金(土地価格の10%目安)。ローン特約必須'),
  it('融資事前審査→本審査',3,2,0,'loan','複数行同時打診。50%要件の図面確認'),
  it('土地決済・所有権移転',5,1,6900,'land','残代金+仲介手数料+登記費用'),
  it('地盤調査・基本設計',5,2,150,'design','SS/SDS試験。綱島は軟弱地盤想定'),
  it('実施設計・確認申請',7,2,350,'design','設計料の中間金。長期優良等の申請判断'),
  it('請負契約・着工',9,1,3300,'build','着手金(工事費30%)。地鎮祭'),
  it('上棟',12,1,3300,'build','中間金(30%)。つなぎ融資利息に注意'),
  it('竣工・引渡・登記',16,1,4900,'build','残金(40%)+建物登記+火災保険'),
  it('入居募集(竣工2ヶ月前〜)',14,3,60,'lease','AD/広告料1ヶ月分×6戸目安。管理会社選定'),
  it('入居開始・返済開始',17,1,0,'lease','家賃入金開始。住宅ローン控除の確定申告(翌年)')]};}
function makeScenario(name){const d=seedDesign();d.activeFloorId=d.floors[0].id;return Object.assign(d,{id:nid('s'),name,land:{W:9.0,D:11.0,areaManual:null,bcrLimit:80,farLimit:300,mode:'rect',poly:null,youto:'近商',road:6.0,bouka:'準防火',kuiki:'市街化',setto:6.0,setback:0.5,saiken:'可',jyoken:'なし',hLimit:0,minArea:0,floorsPlan:4,priceManual:null},price:{landUnitMode:'tsubo',landUnit:250,buildingUnit:105,ancillaryPct:15,perFloor:{},extras:defExtras(),misc:null},finance:defFinance(),loans:defLoans(),activeLoanId:null,tax:defTax(),rent:defRent(),sched:defSched(),exit:defExit()});}
function migrateScenario(sc){sc.finance=migrateFinance(sc.finance);
 if(!sc.tax)sc.tax=defTax();
 if(!sc.tax.entity)sc.tax.entity='personal';
 if(sc.tax.corpRate==null)sc.tax.corpRate=34;
 if(sc.tax.salaryIncome==null)sc.tax.salaryIncome=(+sc.finance.incomeSelf||0)+(+sc.finance.incomePartner||0);
 if(sc.tax.carryLoss==null)sc.tax.carryLoss=1;
 if(sc.tax.bizTaxOn==null)sc.tax.bizTaxOn=0;
 if(sc.tax.capexOn==null)sc.tax.capexOn=0;
 if(!sc.exit)sc.exit=defExit();
 if(!sc.judge)sc.judge=defJudge();
 if(sc.judge.roiPass==null)sc.judge.roiPass=3.0;
 if(sc.judge.berPass==null)sc.judge.berPass=80;
 if(!sc.land)sc.land={W:9,D:11,areaManual:null};
 if(sc.land.bcrLimit==null)sc.land.bcrLimit=80;
 if(sc.land.farLimit==null)sc.land.farLimit=300;
 if(!sc.land.mode)sc.land.mode='rect';
 if(sc.land.poly===undefined)sc.land.poly=null;
 if(!sc.land.youto)sc.land.youto='近商';
 if(sc.land.road==null)sc.land.road=6.0;
 if(!sc.land.bouka)sc.land.bouka='準防火';
 if(!sc.land.kuiki)sc.land.kuiki='市街化';
 if(sc.land.setto==null)sc.land.setto=6.0;
 if(sc.land.setback==null)sc.land.setback=0.5;
 if(sc.structure==null)sc.structure='wood';
 if(!sc.land.saiken)sc.land.saiken='可';
 if(!sc.land.jyoken)sc.land.jyoken='なし';
 if(sc.land.hLimit==null)sc.land.hLimit=0;
 if(sc.land.minArea==null)sc.land.minArea=0;
 if(sc.land.floorsPlan==null)sc.land.floorsPlan=(sc.floors?sc.floors.length:4);
 if(sc.land.priceManual===undefined)sc.land.priceManual=null;
 if(!sc.price)sc.price={landUnitMode:'tsubo',landUnit:250,buildingUnit:105,ancillaryPct:15,perFloor:{},extras:defExtras(),misc:null};
 if(!sc.price.perFloor)sc.price.perFloor={};
 if(!Array.isArray(sc.price.extras))sc.price.extras=defExtras();
 if(sc.price.landUnitMode==null)sc.price.landUnitMode='tsubo';
 if(sc.price.landUnit==null)sc.price.landUnit=250;
 if(sc.price.buildingUnit==null)sc.price.buildingUnit=105;
 if(sc.price.ancillaryPct==null)sc.price.ancillaryPct=15;
 if(sc.price.misc===undefined)sc.price.misc=null;
 if(!Array.isArray(sc.loans)||!sc.loans.length)sc.loans=defLoans();
 sc.loans.forEach(L=>{if(!L.id)L.id=nid('L');if(!L.type)L.type='jutaku';if(!L.method)L.method='annuity';if(L.feePct==null)L.feePct=2.2;if(L.includeRentPct==null)L.includeRentPct=0;});
 if(!sc.activeLoanId||!sc.loans.find(L=>L.id===sc.activeLoanId))sc.activeLoanId=sc.loans[0].id;
 if(!sc.tax)sc.tax=defTax();
 if(!sc.rent)sc.rent=defRent();
 if(!sc.rent.curve)sc.rent.curve={r1:1.0,r2:0.7,r3:0.4};
 if(!sc.rent.units)sc.rent.units={};
 if(!sc.sched)sc.sched=defSched();
 sc.floors.forEach(fl=>{fl.elems=(fl.elems||[]).map(e2=>{if(e2.kind==='bath')e2.kind='bath1818';return e2;});fl.rooms.forEach(r=>{if(!r.wallE)r.wallE={};});});
 return sc;}
function reidScenario(sc){sc.id=nid('s');const map={};sc.floors.forEach(f=>{const of=f.id;f.id=nid('f');map[of]=f.id;f.rooms.forEach(r=>r.id=nid('r'));f.elems.forEach(e=>e.id=nid('e'));});sc.activeFloorId=sc.floors[0]?.id;if(sc.price&&sc.price.perFloor){const np={};for(const k in sc.price.perFloor)if(map[k])np[map[k]]=sc.price.perFloor[k];sc.price.perFloor=np;}return sc;}
let store,state,view;
function reseedUid(d){let mx=0;const scan=v=>{String(v).replace(/\d+$/,m2=>mx=Math.max(mx,+m2));};
 d.scenarios.forEach(sc=>{scan(sc.id);(sc.loans||[]).forEach(L=>scan(L.id));((sc.sched||{}).items||[]).forEach(t=>scan(t.id));sc.floors.forEach(fl=>{scan(fl.id);fl.rooms.forEach(r=>scan(r.id));fl.elems.forEach(e2=>scan(e2.id));});});
 uid=Math.max(uid,mx+1);}
function initStore(){
  const saved=(typeof loadStore==='function')?null:null; /* loadStoreは後方定義のため起動時に別途復元 */
  store={scenarios:[makeScenario('綱島プランA（木造4階）')],activeId:null,mode:'hybrid'};store.activeId=store.scenarios[0].id;state=store.scenarios[0];
  view={pxPerM:40,snap:1,grid:.1,showGrid:1,showLabels:1,showDim:1,showWall:1,wallMag:1,drawMode:0,locked:0,mode:'move',nudgePad:0,nudgeStep:.05,nudgePos:'br',padSize:'S',nudgeXY:null,selbarPos:'left',vtx:0,resizeMode:0,sel:null,tab:'plan'};}
function tryRestore(){const d=loadStore();if(!d)return;try{d.scenarios.forEach(migrateScenario);reseedUid(d);
  store=d;state=store.scenarios.find(x=>x.id===store.activeId)||store.scenarios[0];store.activeId=state.id;
  if(!state.activeFloorId||!state.floors.find(f=>f.id===state.activeFloorId))state.activeFloorId=state.floors[0].id;}catch(e){console.warn('restore failed',e);}}
