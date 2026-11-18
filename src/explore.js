(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const MAP_W = 480;
  const MAP_H = 350;

  // 地圖像素美術用的 Bayer 抖動表與雜湊亂數（固定種子，每次開啟畫面一致）
  const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  function hash2(x, y) {
    const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return v - Math.floor(v);
  }

  const LOCATIONS = [
    {
      id: 'beiyuan_gate',
      name: '北園國小校門口',
      address: '北社尾路 168 號',
      npc: '警衛林伯伯 ＆ 導護阿姨',
      desc: '放學鐘聲響了，校門口排起長長的路隊。幫忙指揮交通，就能跟警衛室借到連射裝備！',
      x: 151,
      y: 167,
      color: '#4ce0c0',
      categoryLabel: '連射武器',
      rewards: [
        { type: 'weapon', id: 'nailgun' },
        { type: 'weapon', id: 'pulse_rifle' },
        { type: 'weapon', id: 'minigun' },
      ],
      minigame: 'crossing',
      minigameTitle: '放學路隊交通指揮',
      minigameHint: '綠燈亮起時點擊「放行路隊」，讓 5 位小朋友平安過馬路（紅燈時別按喔）！',
      atlasIcon: 'gate',
      atlasKnowledge: '北園國小位於北社尾路，學校於 1922 年創校。',
      mathConcept: '分類計數、規則判斷',
    },
    {
      id: 'beiyuan_slide',
      name: '北園國小旋轉溜滑梯',
      address: '北園國小校園沙坑區',
      npc: '自然科陳老師',
      desc: '兩層樓高的旋轉溜滑梯與白色大沙坑是北園國小的招牌！陳老師正在調整太陽光實驗器材。',
      x: 137,
      y: 119,
      color: '#76e8ff',
      categoryLabel: '狙擊武器',
      rewards: [
        { type: 'weapon', id: 'cryo_beam' },
        { type: 'weapon', id: 'railgun' },
        { type: 'weapon', id: 'gravity_gun' },
      ],
      minigame: 'prism',
      minigameTitle: '自然課沙坑聚光鏡',
      minigameHint: '左右移動稜鏡滑桿，讓陽光焦點對準沙坑標靶 3 次！',
      atlasIcon: 'playground',
      atlasKnowledge: '校園有兩層樓特色溜滑梯與沙坑，也有彩虹階梯。',
      mathConcept: '位置、距離與估測',
    },
    {
      id: 'wenju_shop',
      name: '北園國中旁文具店',
      address: '北園街東側巷口',
      npc: '文具店阿美姐',
      desc: '開學前文具店總是擠滿買鉛筆與美勞材料的學生，幫阿美姐把貨架整理整齊吧！',
      x: 196,
      y: 107,
      color: '#f28bff',
      categoryLabel: '特殊武器',
      rewards: [
        { type: 'weapon', id: 'sawblade_gun' },
        { type: 'weapon', id: 'plasma_arc' },
        { type: 'weapon', id: 'swarm_missile' },
      ],
      minigame: 'sort',
      minigameTitle: '文具店快速理貨',
      minigameHint: '依照上方提示的順序，點選貨架上對應的 5 樣文具！',
      atlasIcon: 'pencil',
      atlasKnowledge: '整理物品時可以按種類分類，再依提示順序完成任務。',
      mathConcept: '分類、排序',
    },
    {
      id: 'park',
      name: '北社尾公園涼亭',
      address: '北社尾路鄰里公園',
      npc: '早起運動的阿嬤',
      desc: '公園老樹下阿嬤正忙著收成剛摘下的嘉義椪柑，幫忙拿竹籃接住掉下來的橘子！',
      x: 118,
      y: 187,
      color: '#ff964f',
      categoryLabel: '散彈武器',
      rewards: [
        { type: 'weapon', id: 'shotgun' },
        { type: 'weapon', id: 'dragon_breath' },
        { type: 'weapon', id: 'sonic_blaster' },
      ],
      minigame: 'catch',
      minigameTitle: '公園接嘉義椪柑',
      minigameHint: '用左右按鈕（或鍵盤 A / D）移動竹籃，接住 8 顆椪柑，閃開枯樹枝！',
      atlasIcon: 'park',
      atlasKnowledge: '學區有稻田，常見白鷺鷥；觀察生物時可以練習分類計數。',
      mathConcept: '分類計數、加減',
    },
    {
      id: 'wang_ancestral',
      name: '王姓宗祠旁老街五金行',
      address: '北社尾路 210 號一帶',
      npc: '五金行阿明師傅',
      desc: '紅磚合院宗祠旁的老五金行什麼工具都有！幫忙算對客人找零，師傅就送你強力爆破裝備。',
      x: 185,
      y: 179,
      color: '#ff6b6b',
      categoryLabel: '爆破武器',
      rewards: [
        { type: 'weapon', id: 'launcher' },
        { type: 'weapon', id: 'cluster_mortar' },
      ],
      minigame: 'math',
      minigameTitle: '五金行算找零',
      minigameHint: '算出正確的找零金額，連續答對 3 題就過關！',
      atlasIcon: 'tools',
      atlasKnowledge: '五金行與人物是遊戲情境；找零可用付款金額減去商品總價。',
      mathConcept: '加法、減法與金額',
    },
    {
      id: 'baoan_temple',
      name: '北社尾保安宮',
      address: '自由路 245 號（保生大帝）',
      npc: '保安宮廟公伯伯',
      desc: '香火鼎盛的保安宮是北社尾的信仰中心。誠心向保生大帝擲筊祈福，求得平安符文！',
      x: 454,
      y: 322,
      color: '#ffe45e',
      categoryLabel: '光／吸血符文',
      rewards: [
        { type: 'rune', id: 'light' },
        { type: 'rune', id: 'vampire' },
      ],
      minigame: 'bobe',
      minigameTitle: '廟埕擲筊祈福',
      minigameHint: '游標進入綠色誠心區時按下「擲筊」，累計擲出 3 次聖筊！',
      atlasIcon: 'temple',
      atlasKnowledge: '學區有宗祠與廟宇；本據點的角色和小遊戲都是虛構情境。',
      mathConcept: '位置判斷、次數統計',
    },
    {
      id: 'zhenbei_temple',
      name: '北社尾鎮北宮',
      address: '北社尾路 702 之 1 號（城隍廟）',
      npc: '陣頭鼓手大師兄',
      desc: '鎮北宮廟埕傳來陣陣大鼓聲，跟著節拍敲出氣勢，大師兄會把冰鎮冬瓜茶與震波符文交給你！',
      x: 52,
      y: 215,
      color: '#d29bff',
      categoryLabel: '冰／震符文',
      rewards: [
        { type: 'rune', id: 'ice' },
        { type: 'rune', id: 'quake' },
      ],
      minigame: 'drum',
      minigameTitle: '廟會大鼓節奏',
      minigameHint: '鼓點進入圓圈時按下「敲大鼓」（或空白鍵），成功敲中 6 下！',
      atlasIcon: 'drum',
      atlasKnowledge: '學區有宗祠與廟宇；本據點的角色和小遊戲都是虛構情境。',
      mathConcept: '節奏規律、次數統計',
    },
    {
      id: 'rice_festival',
      name: '北園稻香藝田音樂祭',
      address: '北園國小北側田園',
      npc: '茶藝社小小司茶人 ＆ 管樂團',
      desc: '北園國小最具代表性的特色活動！在收割後的稻田中一邊泡茶、一邊吹奏管樂與敲響太鼓！',
      x: 310,
      y: 82,
      color: '#a8e05f',
      categoryLabel: '校本活動補給（運算牌）',
      rewards: [],
      supplyType: 'op_card',
      supplyLabel: '🎁 +35 金幣 ＋ 隨機運算牌',
      minigame: 'drum',
      minigameTitle: '稻田音樂祭合奏',
      minigameHint: '跟著節拍敲響太鼓 6 下，幫稻香藝田音樂祭暖場！',
      atlasIcon: 'festival',
      atlasKnowledge: '校訂課程名稱是「稻香北園」；音樂祭是遊戲設計的虛構活動。',
      mathConcept: '節奏規律、次數統計',
    },
    {
      id: 'beishewei_market',
      name: '北社尾傳統早市＆米糕攤',
      address: '北社尾路與北興街早市',
      npc: '早市米糕阿伯 ＆ 菜攤阿姨',
      desc: '在地人早晨必逛的傳統市集！招牌 Q 彈米糕淋上香噴噴肉滷汁，還能順便添購社區裝備。',
      x: 258,
      y: 175,
      color: '#ffaa5e',
      categoryLabel: '早市補給（隨機裝備）',
      rewards: [],
      supplyType: 'gear',
      supplyLabel: '🎁 +35 金幣 ＋ 隨機局外裝備',
      minigame: 'math',
      minigameTitle: '早市買菜算找零',
      minigameHint: '幫忙碌的米糕與菜攤算出正確找零金額，答對 3 題！',
      atlasIcon: 'market',
      atlasKnowledge: '購物時可以先加總商品價格，再用付款金額減掉總價。',
      mathConcept: '加法、減法與金額',
    },
    {
      id: 'shixian_library',
      name: '世賢圖書館',
      address: '世賢路一段（嘉義市立圖書館世賢分館）',
      npc: '圖書館志工姐姐',
      desc: '西區居民與北園學子最愛的閱讀基地！幫忙把新進的繪本與自然科學書歸位上架吧。',
      x: 262,
      y: 310,
      color: '#6ecbff',
      categoryLabel: '文教補給（數字／運算牌）',
      rewards: [],
      supplyType: 'mixed_card',
      supplyLabel: '🎁 +35 金幣 ＋ 隨機算式牌',
      minigame: 'sort',
      minigameTitle: '圖書館新書上架',
      minigameHint: '依照上方提示順序點選對應圖示，幫忙把 5 樣教材書本歸位！',
      atlasIcon: 'library',
      atlasKnowledge: '把書依主題分類並排好順序，可以練習分類和排序。',
      mathConcept: '分類、排序',
    },
    {
      id: 'shixian_bikeway',
      name: '世賢路自行車道・彩繪驛站',
      address: '世賢路一段林蔭自行車道',
      npc: '北園校友單車學長',
      desc: '沿著世賢路林蔭綠廊騎車，還能看見北園國小大型「彩色調色盤與彩虹階梯」的藝術牆面！',
      x: 298,
      y: 266,
      color: '#5ce6b8',
      categoryLabel: '生態補給（數字牌）',
      rewards: [],
      supplyType: 'num_card',
      supplyLabel: '🎁 +35 金幣 ＋ 隨機數字牌',
      minigame: 'catch',
      minigameTitle: '林蔭單車接補給',
      minigameHint: '移動竹籃接住 8 顆沿途掉落的嘉義椪柑補給，閃開枯樹枝！',
      atlasIcon: 'bike',
      atlasKnowledge: '移動路線可以用距離和方向描述；本據點的角色與活動都是虛構情境。',
      mathConcept: '位置、距離與方向',
    },
    {
      id: 'one_mu_field',
      name: '校內一畝田',
      address: '北園國小校園',
      npc: '一畝田種植小隊',
      desc: '用秧苗排出整齊的長方形陣列，看看幾行幾列能剛好排滿。',
      x: 145,
      y: 148,
      color: '#b9e96f',
      categoryLabel: '分數分裂槍／稻穗符文',
      rewards: [{ type: 'weapon', id: 'fraction_splitter' }, { type: 'rune', id: 'rice' }],
      minigame: 'array',
      minigameTitle: '插秧陣列',
      minigameHint: '看秧苗總數，選出能排成長方形的行數 × 列數。答對 3 題即可過關。',
      atlasIcon: 'rice',
      atlasKnowledge: '「一畝田」供 4～6 年級學生插秧，種植台南 11 號稻米。',
      mathConcept: '乘法陣列、面積',
    },
    {
      id: 'rice_drying_yard',
      name: '稻穀埕',
      address: '北園國小一畝田旁',
      npc: '稻穀秤重小幫手',
      desc: '把幾袋稻穀放上秤，算出總重量（中高年級要換算公斤和公克）。',
      x: 173,
      y: 158,
      color: '#eacb77',
      categoryLabel: '廟會鞭炮連發器',
      rewards: [{ type: 'weapon', id: 'firecracker_launcher' }],
      minigame: 'weight',
      minigameTitle: '曬穀秤重',
      minigameHint: '低年級直接加減公斤；中高年級先把公斤換成公克再相加。連續完成 3 題。',
      atlasIcon: 'scale',
      atlasKnowledge: '一畝田旁有半露天的「稻穀埕」。',
      mathConcept: '重量加減（中高年級含公斤與公克換算）',
    },
    {
      id: 'water_recycling_center',
      name: '水資源回收中心',
      address: '嘉義市水資源回收中心（遊戲據點）',
      npc: '水循環學習夥伴',
      desc: '先排對水循環步驟，再算出要倒的水量（低年級用杯數、中高年級用公升和毫升）。',
      x: 205,
      y: 145,
      color: '#65dfff',
      categoryLabel: '水圳高壓水槍／水之符文',
      rewards: [{ type: 'weapon', id: 'canal_water_cannon' }, { type: 'rune', id: 'water' }],
      minigame: 'water',
      minigameTitle: '水循環與容量',
      minigameHint: '先排出水循環順序，再算出水量；低年級算杯數，中高年級要換算公升與毫升。',
      atlasIcon: 'water',
      atlasKnowledge: '學校曾與嘉義市水資源回收中心合作「水循環及利用」課程。',
      mathConcept: '水循環順序、容量（中高年級含公升與毫升換算）',
    },
    {
      id: 'solar_roof',
      name: '屋頂太陽光電',
      address: '北園國小校舍屋頂（遊戲據點）',
      npc: '光電資料整理員',
      desc: '閱讀一週發電量長條圖，依序找出最多、最少、相差和總和。',
      x: 174,
      y: 112,
      color: '#ffe278',
      categoryLabel: '太陽光電雷射／光電符文',
      rewards: [{ type: 'weapon', id: 'solar_laser' }, { type: 'rune', id: 'solar' }],
      minigame: 'solar',
      minigameTitle: '一週發電量圖表',
      minigameHint: '讀長條圖，回答最多、最少、相差多少與總和；圖表數字是練習用資料。',
      atlasIcon: 'sun',
      atlasKnowledge: '學校屋頂設有太陽光電系統，並搭配能源教育；圖表數字是遊戲練習資料。',
      mathConcept: '長條圖判讀、比較與加法',
    },
    {
      id: 'rainbow_stairs',
      name: '彩虹階梯',
      address: '北園國小校園',
      npc: '階梯規律觀察員',
      desc: '沿著彩虹階梯找數字規律，推算下一階的數字。',
      x: 122,
      y: 98,
      color: '#f28bff',
      categoryLabel: '質數節拍步槍',
      rewards: [{ type: 'weapon', id: 'prime_rifle' }],
      minigame: 'sequence',
      minigameTitle: '階梯數列規律',
      minigameHint: '依年級段找數列規律：低中年級是加減規律，高年級有質數和每次乘同一個數，連續答對 3 題。',
      atlasIcon: 'stairs',
      atlasKnowledge: '校園有彩虹階梯；數字階梯的題目是遊戲設計。',
      mathConcept: '加減規律、質數與等比數列',
    },
    {
      id: 'egret_rice_field',
      name: '白鷺鷥稻田觀察',
      address: '北社尾學區稻田（遊戲據點）',
      npc: '田間觀察記錄員',
      desc: '短暫觀察白鷺鷥、候鳥和麻雀，再填出各種鳥的數量。',
      x: 222,
      y: 100,
      color: '#f4fff0',
      categoryLabel: '白鷺鷥追蹤弩',
      rewards: [{ type: 'weapon', id: 'egret_homing_bow' }],
      minigame: 'birds',
      minigameTitle: '稻田觀察與統計',
      minigameHint: '記住短暫出現的鳥群，完成數量統計並找出最多的一種。',
      atlasIcon: 'egret',
      atlasKnowledge: '學區稻田常見白鷺鷥，冬季有候鳥，夏天可以聽見蟬鳴。',
      mathConcept: '分類計數、統計與比較',
    },
    {
      id: 'school_history_wall',
      name: '百年校史牆',
      address: '北園國小校園（遊戲據點）',
      npc: '校史時間軸整理員',
      desc: '依年級段算年紀、經過的年數或週年，完成時間軸題目即可領取補給。',
      x: 108,
      y: 204,
      color: '#ffb76e',
      categoryLabel: '校史補給（運算牌）',
      rewards: [],
      supplyType: 'op_card',
      supplyLabel: '🎁 +35 金幣 ＋ 隨機運算牌',
      minigame: 'history',
      minigameTitle: '百年校史時間軸',
      minigameHint: '低年級算年紀的加減；中高年級用 1922 年創校算經過的年數或週年。',
      atlasIcon: 'timeline',
      atlasKnowledge: '北園國小於 1922 年創校；「校史牆」是遊戲設計的虛構據點。',
      mathConcept: '年紀加減、年代減法、週年加法',
    },
  ];

  class CommunityExplore {
    constructor(game, ui) {
      this.game = game;
      this.ui = ui;

      this.els = {
        overlay: document.getElementById('explore-overlay'),
        canvas: document.getElementById('explore-canvas'),
        closeBtn: document.getElementById('close-explore-btn'),
        ticketBadge: document.getElementById('explore-tickets'),
        goldBadge: document.getElementById('explore-gold'),
        progressBadge: document.getElementById('explore-progress'),
        locTitle: document.getElementById('explore-loc-title'),
        locMeta: document.getElementById('explore-loc-meta'),
        locDesc: document.getElementById('explore-loc-desc'),
        locRewards: document.getElementById('explore-loc-rewards'),
        actionBtn: document.getElementById('explore-action-btn'),
        quickList: document.getElementById('explore-quick-list'),

        mgModal: document.getElementById('explore-mg-modal'),
        mgTitle: document.getElementById('explore-mg-title'),
        mgHint: document.getElementById('explore-mg-hint'),
        mgStage: document.getElementById('explore-mg-stage'),
        mgCancelBtn: document.getElementById('explore-mg-cancel-btn'),
        zoomInBtn: document.getElementById('explore-zoom-in'),
        zoomOutBtn: document.getElementById('explore-zoom-out'),
        zoomResetBtn: document.getElementById('explore-zoom-reset'),
        atlasBtn: document.getElementById('explore-atlas-btn'),
        atlasModal: document.getElementById('explore-atlas-modal'),
        atlasCloseBtn: document.getElementById('explore-atlas-close-btn'),
        atlasGrid: document.getElementById('explore-atlas-grid'),
        atlasProgress: document.getElementById('explore-atlas-progress'),
      };

      this.ctx = this.els.canvas ? this.els.canvas.getContext('2d') : null;
      if (this.ctx) {
        this.ctx.imageSmoothingEnabled = false;
      }

      this.isOpen = false;
      this.rafId = 0;
      this.lastTime = 0;
      this.animTime = 0;

      this.player = { x: 151, y: 167, vx: 0, vy: 0, dir: 'down', walkTimer: 0 };
      this.cam = { x: MAP_W / 2, y: MAP_H / 2, zoom: 1, minZoom: 1, maxZoom: 3.5, followPlayer: true };
      this.dragState = null;
      this.moveTarget = null;
      this.keys = {};
      this.nearbyLoc = null;
      this.activeMiniGameCleanup = null;
      this.baseMapCanvas = this.buildBaseMap();

      this.bindEvents();
    }

    bindEvents() {
      if (!this.els.overlay) return;

      this.els.closeBtn.addEventListener('click', () => this.close());
      if (this.els.atlasBtn) this.els.atlasBtn.addEventListener('click', () => this.openAtlas());
      if (this.els.atlasCloseBtn) this.els.atlasCloseBtn.addEventListener('click', () => this.closeAtlas());
      this.els.actionBtn.addEventListener('click', () => {
        if (this.nearbyLoc) this.tryStartMiniGame(this.nearbyLoc);
      });
      this.els.mgCancelBtn.addEventListener('click', () => this.closeMiniGame());

      // 地圖拖曳平移可視範圍 / 短按點擊移動或直接點據點走過去
      this.els.canvas.addEventListener('pointerdown', (e) => {
        if (!this.isOpen || !this.els.mgModal.classList.contains('hidden')) return;
        this.els.canvas.setPointerCapture(e.pointerId);
        this.dragState = {
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          camX: this.cam.x,
          camY: this.cam.y,
          moved: false,
        };
      });

      this.els.canvas.addEventListener('pointermove', (e) => {
        if (!this.dragState || e.pointerId !== this.dragState.pointerId) return;
        const dxScreen = e.clientX - this.dragState.startX;
        const dyScreen = e.clientY - this.dragState.startY;
        if (!this.dragState.moved && Math.hypot(dxScreen, dyScreen) > 5) {
          this.dragState.moved = true;
          this.cam.followPlayer = false;
          this.els.canvas.classList.add('dragging');
        }
        if (this.dragState.moved) {
          const rect = this.els.canvas.getBoundingClientRect();
          const scaleX = MAP_W / rect.width;
          const scaleY = MAP_H / rect.height;
          this.cam.x = this.dragState.camX - (dxScreen * scaleX) / this.cam.zoom;
          this.cam.y = this.dragState.camY - (dyScreen * scaleY) / this.cam.zoom;
          this.clampCamera();
        }
      });

      const endPointer = (e) => {
        if (!this.dragState || e.pointerId !== this.dragState.pointerId) return;
        const wasMoved = this.dragState.moved;
        this.dragState = null;
        this.els.canvas.classList.remove('dragging');
        if (wasMoved || !this.isOpen || !this.els.mgModal.classList.contains('hidden')) return;

        const rect = this.els.canvas.getBoundingClientRect();
        const sx = (e.clientX - rect.left) * (MAP_W / rect.width);
        const sy = (e.clientY - rect.top) * (MAP_H / rect.height);
        const world = this.screenToWorld(sx, sy);

        let snapped = null;
        const snapDist = 24 / Math.sqrt(this.cam.zoom);
        for (const loc of LOCATIONS) {
          if (Math.hypot(world.x - loc.x, world.y - loc.y) <= snapDist) {
            snapped = { x: loc.x, y: loc.y };
            break;
          }
        }
        this.moveTarget = snapped || {
          x: Math.max(14, Math.min(MAP_W - 14, world.x)),
          y: Math.max(16, Math.min(MAP_H - 14, world.y)),
        };
        this.cam.followPlayer = true;
      };
      this.els.canvas.addEventListener('pointerup', endPointer);
      this.els.canvas.addEventListener('pointercancel', endPointer);

      // 滑鼠滾輪以游標為中心放大縮小
      this.els.canvas.addEventListener('wheel', (e) => {
        if (!this.isOpen || !this.els.mgModal.classList.contains('hidden')) return;
        e.preventDefault();
        const rect = this.els.canvas.getBoundingClientRect();
        const sx = (e.clientX - rect.left) * (MAP_W / rect.width);
        const sy = (e.clientY - rect.top) * (MAP_H / rect.height);
        const factor = e.deltaY < 0 ? 1.25 : 0.8;
        this.zoomAt(this.cam.zoom * factor, sx, sy);
      }, { passive: false });

      if (this.els.zoomInBtn) {
        this.els.zoomInBtn.addEventListener('click', () => {
          this.zoomAt(this.cam.zoom * 1.35, MAP_W / 2, MAP_H / 2);
        });
      }
      if (this.els.zoomOutBtn) {
        this.els.zoomOutBtn.addEventListener('click', () => {
          this.zoomAt(this.cam.zoom / 1.35, MAP_W / 2, MAP_H / 2);
        });
      }
      if (this.els.zoomResetBtn) {
        this.els.zoomResetBtn.addEventListener('click', () => {
          this.cam.zoom = 1;
          this.cam.x = MAP_W / 2;
          this.cam.y = MAP_H / 2;
          this.cam.followPlayer = true;
          this.clampCamera();
        });
      }

      window.addEventListener('keydown', (e) => {
        if (!this.isOpen) return;
        const code = e.code;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
          if (this.els.mgModal.classList.contains('hidden')) {
            e.preventDefault();
          }
        }
        this.keys[code] = true;

        if (code === 'Escape') {
          if (this.els.atlasModal && !this.els.atlasModal.classList.contains('hidden')) {
            this.closeAtlas();
          } else if (!this.els.mgModal.classList.contains('hidden')) {
            this.closeMiniGame();
          } else {
            this.close();
          }
          return;
        }

        if ((code === 'Space' || code === 'Enter' || code === 'KeyE') && this.els.mgModal.classList.contains('hidden')) {
          if (this.nearbyLoc && !this.els.actionBtn.disabled) {
            this.tryStartMiniGame(this.nearbyLoc);
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });
    }

    open() {
      if (!this.els.overlay) return;
      this.isOpen = true;
      this.keys = {};
      this.moveTarget = null;
      this.els.overlay.classList.remove('hidden');
      this.els.mgModal.classList.add('hidden');
      this.closeAtlas();
      this.renderHeaderStats();
      this.renderQuickList();
      this.updateNearbyLocation(true);
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }

    close() {
      this.isOpen = false;
      this.closeMiniGame();
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
      this.els.overlay.classList.add('hidden');
      this.closeAtlas();
      this.ui.renderMenu(this.game);
    }

    isRewardUnlocked(r) {
      return r.type === 'weapon'
        ? this.game.isWeaponUnlocked(r.id)
        : this.game.isRuneUnlocked(r.id);
    }

    getRewardName(r) {
      if (r.type === 'weapon') return PGS.Weapons.DEFS[r.id]?.name || r.id;
      return PGS.Runes.DEFS[r.id]?.name || r.id;
    }

    getNextLockedReward(loc) {
      return loc.rewards.find((r) => !this.isRewardUnlocked(r)) || null;
    }

    getAtlasSave() {
      if (!this.game.save.communityAtlas || typeof this.game.save.communityAtlas !== 'object') {
        this.game.save.communityAtlas = { collected: [], rewardsClaimed: [], title: '' };
      }
      const atlas = this.game.save.communityAtlas;
      if (!Array.isArray(atlas.collected)) atlas.collected = [];
      if (!Array.isArray(atlas.rewardsClaimed)) atlas.rewardsClaimed = [];
      if (typeof atlas.title !== 'string') atlas.title = '';
      const validIds = new Set(LOCATIONS.map((location) => location.id));
      atlas.collected = [...new Set(atlas.collected.filter((id) => validIds.has(id)))];
      return atlas;
    }

    openAtlas() {
      if (!this.els.atlasModal) return;
      this.renderAtlas();
      this.els.atlasModal.classList.remove('hidden');
    }

    closeAtlas() {
      if (this.els.atlasModal) this.els.atlasModal.classList.add('hidden');
    }

    createAtlasIcon(kind, asCanvas = false) {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const pixel = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
      const green = '#8fcf62';
      const pale = '#ffe8b4';
      const blue = '#65dfff';
      const red = '#e96a57';
      if (!asCanvas) pixel(0, 0, 16, 16, '#231c3d');

      if (['gate', 'library', 'market', 'temple', 'festival'].includes(kind)) {
        pixel(2, 4, 12, 2, kind === 'temple' ? '#e88b2e' : red);
        pixel(3, 6, 10, 8, '#d8bd91');
        pixel(5, 8, 2, 2, blue);
        pixel(9, 8, 2, 2, blue);
        pixel(7, 10, 2, 4, '#503d5e');
        if (kind === 'temple' || kind === 'festival') pixel(6, 2, 4, 2, '#ffe45e');
        if (kind === 'library') { pixel(4, 7, 2, 5, blue); pixel(7, 7, 2, 5, green); pixel(10, 7, 2, 5, '#eab65e'); }
        if (kind === 'market') { pixel(3, 5, 3, 2, '#ffe45e'); pixel(6, 5, 3, 2, pale); pixel(9, 5, 3, 2, '#59cfad'); }
        if (kind === 'festival') pixel(7, 5, 2, 2, '#704b36');
      } else if (kind === 'rice' || kind === 'egret') {
        pixel(1, 13, 14, 2, '#7e5f3c');
        pixel(4, 7, 1, 6, green); pixel(7, 5, 1, 8, green); pixel(10, 8, 1, 5, green);
        pixel(2, 8, 3, 1, '#c0e47b'); pixel(5, 6, 3, 1, '#c0e47b'); pixel(8, 9, 3, 1, '#c0e47b');
        if (kind === 'egret') { pixel(10, 3, 4, 2, pale); pixel(12, 2, 2, 2, pale); pixel(14, 3, 1, 1, '#ffb447'); }
      } else if (kind === 'scale' || kind === 'tools') {
        pixel(7, 3, 2, 8, pale); pixel(3, 5, 10, 2, '#e5ba62');
        pixel(3, 7, 1, 3, blue); pixel(12, 7, 1, 3, blue); pixel(5, 11, 6, 2, red);
        if (kind === 'tools') { pixel(2, 2, 3, 2, red); pixel(3, 4, 2, 8, pale); }
      } else if (kind === 'water') {
        pixel(7, 2, 2, 3, blue); pixel(5, 5, 6, 4, blue); pixel(4, 8, 8, 3, blue);
        pixel(2, 12, 4, 2, '#408fc0'); pixel(9, 12, 5, 2, '#408fc0');
      } else if (kind === 'sun') {
        pixel(6, 5, 4, 6, '#ffe278'); pixel(4, 7, 8, 2, '#ffe278');
        pixel(7, 2, 2, 2, '#ffb447'); pixel(7, 12, 2, 2, '#ffb447');
        pixel(2, 7, 2, 2, '#ffb447'); pixel(12, 7, 2, 2, '#ffb447');
        pixel(4, 4, 2, 2, '#ffb447'); pixel(10, 4, 2, 2, '#ffb447');
      } else if (kind === 'stairs' || kind === 'playground') {
        const colors = ['#ed6a5a', '#f4a942', '#f4df5e', '#73c980', '#65bce8', '#b77bdb'];
        colors.forEach((color, i) => pixel(i * 2 + 2, 12 - i, 3, 3, color));
        if (kind === 'playground') { pixel(3, 4, 2, 7, pale); pixel(5, 9, 8, 2, '#f28bff'); pixel(11, 11, 2, 3, '#f28bff'); }
      } else if (kind === 'pencil') {
        pixel(3, 11, 3, 3, pale); pixel(5, 9, 3, 3, '#ffe45e'); pixel(7, 7, 3, 3, '#ffe45e');
        pixel(9, 5, 3, 3, red); pixel(11, 3, 2, 3, red);
      } else if (kind === 'park' || kind === 'bike') {
        pixel(7, 6, 2, 8, '#8c5e42'); pixel(4, 4, 8, 5, green); pixel(2, 7, 4, 3, green); pixel(10, 7, 4, 3, green);
        if (kind === 'bike') { pixel(1, 12, 4, 1, blue); pixel(11, 12, 4, 1, blue); pixel(4, 10, 1, 3, pale); pixel(11, 10, 1, 3, pale); pixel(5, 10, 6, 1, red); }
      } else if (kind === 'drum') {
        pixel(4, 5, 8, 2, '#e7bf73'); pixel(3, 7, 10, 5, red); pixel(4, 12, 8, 2, '#e7bf73');
        pixel(2, 3, 1, 8, pale); pixel(13, 3, 1, 8, pale);
      } else if (kind === 'timeline') {
        pixel(3, 2, 2, 12, pale); pixel(5, 3, 7, 2, blue); pixel(5, 7, 9, 2, green); pixel(5, 11, 6, 2, red);
      }
      return asCanvas ? canvas : canvas.toDataURL();
    }

    renderAtlas() {
      if (!this.els.atlasGrid) return;
      const atlas = this.getAtlasSave();
      const collected = new Set(atlas.collected);
      if (this.els.atlasProgress) {
        this.els.atlasProgress.textContent = `已收集 ${collected.size} / ${LOCATIONS.length} 張`;
      }
      this.els.atlasGrid.innerHTML = '';
      for (const loc of LOCATIONS) {
        const isCollected = collected.has(loc.id);
        const card = document.createElement('article');
        card.className = `atlas-card${isCollected ? ' collected' : ' uncollected'}`;
        const icon = document.createElement('img');
        icon.className = `atlas-icon${isCollected ? '' : ' silhouette'}`;
        icon.src = this.createAtlasIcon(loc.atlasIcon);
        icon.alt = isCollected ? `${loc.name}像素圖示` : '未收集圖鑑剪影';
        card.appendChild(icon);

        const title = document.createElement('h3');
        title.textContent = loc.name;
        card.appendChild(title);
        const status = document.createElement('span');
        status.className = 'atlas-status';
        status.textContent = isCollected ? '已收集' : '尚未收集';
        card.appendChild(status);

        const fact = document.createElement('p');
        fact.textContent = loc.atlasKnowledge;
        card.appendChild(fact);
        const concept = document.createElement('p');
        concept.className = 'atlas-concept';
        concept.textContent = `數學概念：${loc.mathConcept}`;
        card.appendChild(concept);
        const fiction = document.createElement('small');
        fiction.className = 'atlas-fiction';
        fiction.textContent = '遊戲情境為虛構';
        card.appendChild(fiction);
        if (!isCollected) {
          const hint = document.createElement('p');
          hint.className = 'atlas-hint';
          hint.textContent = `提示：走到「${loc.name}」附近完成小遊戲。`;
          card.appendChild(hint);
        }
        this.els.atlasGrid.appendChild(card);
      }
    }

    collectAtlasCard(loc) {
      const atlas = this.getAtlasSave();
      const isNew = !atlas.collected.includes(loc.id);
      const milestoneRewards = [];
      if (isNew) atlas.collected.push(loc.id);
      const count = new Set(atlas.collected).size;
      if (isNew) {
        for (const threshold of [6, 12, 18]) {
          const key = String(threshold);
          if (count < threshold || atlas.rewardsClaimed.includes(key)) continue;
          atlas.rewardsClaimed.push(key);
          if (threshold === 6) {
            this.game.save.gold += 50;
            milestoneRewards.push('圖鑑滿 6 張：金幣 +50');
          } else if (threshold === 12) {
            const supply = this.game.grantExploreSupply('gear');
            milestoneRewards.push(`圖鑑滿 12 張：隨機裝備「${supply.gear.name}」`);
          } else {
            this.game.save.gold += 100;
            atlas.title = '北社尾探索達人';
            milestoneRewards.push('圖鑑滿 18 張：金幣 +100，獲得稱號「北社尾探索達人」');
          }
        }
        if (typeof this.game.persistSave === 'function') this.game.persistSave();
        if (this.ui && typeof this.ui.renderMenu === 'function') this.ui.renderMenu(this.game);
      }
      return { isNew, count, loc, milestoneRewards };
    }

    createAtlasNotice(result) {
      if (!result.isNew) return null;
      const notice = document.createElement('div');
      notice.className = 'mg-atlas-notice';
      const title = document.createElement('strong');
      title.textContent = `圖鑑新增：${result.loc.name}（${result.count} / ${LOCATIONS.length}）`;
      notice.appendChild(title);
      if (result.milestoneRewards.length) {
        const rewards = document.createElement('p');
        rewards.textContent = result.milestoneRewards.join('；');
        notice.appendChild(rewards);
      }
      return notice;
    }

    renderHeaderStats() {
      const free = this.game.save.freeExplores || 0;
      const gold = this.game.save.gold || 0;
      const unlockedW = this.game.save.unlockedWeapons.length;
      const unlockedR = this.game.save.unlockedRunes.length;
      const totalUnlock = (unlockedW - 4) + (unlockedR - 2);
      const totalUnlockable = (PGS.Weapons.ALL_IDS.length - 4) + (PGS.Runes.ALL_IDS.length - 2);

      this.els.ticketBadge.textContent = `免費探索券：${free} 次`;
      this.els.goldBadge.textContent = `金幣：${gold}（加碼 ${this.game.getExploreCost()} 金幣/次）`;
      this.els.progressBadge.textContent = `社區解鎖進度：${Math.max(0, totalUnlock)} / ${totalUnlockable}`;
    }

    renderQuickList() {
      this.els.quickList.innerHTML = '';
      for (const loc of LOCATIONS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'explore-quick-btn' + (this.nearbyLoc?.id === loc.id ? ' active' : '');
        if (loc.rewards.length > 0) {
          const doneCount = loc.rewards.filter((r) => this.isRewardUnlocked(r)).length;
          btn.innerHTML = `<span>${loc.name}</span><small>${doneCount}/${loc.rewards.length}</small>`;
        } else {
          btn.innerHTML = `<span>${loc.name}</span><small>補給</small>`;
        }
        btn.addEventListener('click', () => {
          this.moveTarget = { x: loc.x, y: loc.y };
          this.cam.followPlayer = true;
        });
        this.els.quickList.appendChild(btn);
      }
    }

    updateNearbyLocation(force = false) {
      let closest = null;
      let minDist = 30;
      for (const loc of LOCATIONS) {
        const d = Math.hypot(this.player.x - loc.x, this.player.y - loc.y);
        if (d < minDist) {
          minDist = d;
          closest = loc;
        }
      }

      if (!force && closest?.id === this.nearbyLoc?.id) return;
      this.nearbyLoc = closest;
      this.renderQuickList();

      if (!closest) {
        this.els.locTitle.textContent = '漫步在嘉義市西區・北社尾社區';
        this.els.locMeta.textContent = '使用 WASD / 方向鍵移動，或直接點擊地圖上的據點走過去';
        this.els.locDesc.textContent = '走近北園國小、保安宮、鎮北宮、北社尾公園或老街五金行，即可觸發溫馨社區小遊戲解鎖武器與符文！';
        this.els.locRewards.innerHTML = '';
        this.els.actionBtn.disabled = true;
        this.els.actionBtn.textContent = '請先走到社區據點旁';
        return;
      }

      this.els.locTitle.textContent = `${closest.name}（${closest.categoryLabel}）`;
      this.els.locMeta.textContent = `${closest.address} ｜ 遇見虛構角色：${closest.npc}`;
      this.els.locDesc.textContent = closest.desc;

      this.els.locRewards.innerHTML = '';
      if (closest.rewards.length > 0) {
        for (const r of closest.rewards) {
          const unlocked = this.isRewardUnlocked(r);
          const tag = document.createElement('span');
          tag.className = 'explore-reward-tag ' + (unlocked ? 'unlocked' : 'locked');
          tag.textContent = `${unlocked ? '✓ ' : '🔒 '}${this.getRewardName(r)}`;
          this.els.locRewards.appendChild(tag);
        }
      } else if (closest.supplyLabel) {
        const tag = document.createElement('span');
        tag.className = 'explore-reward-tag unlocked';
        tag.textContent = closest.supplyLabel;
        this.els.locRewards.appendChild(tag);
      }

      const nextLocked = this.getNextLockedReward(closest);
      const free = this.game.save.freeExplores || 0;
      const cost = this.game.getExploreCost();
      const canPlay = this.game.canStartExploreMiniGame();

      this.els.actionBtn.disabled = !canPlay;
      if (!canPlay) {
        this.els.actionBtn.textContent = `探索券與金幣不足（需 ${cost} 金幣或完成 1 場戰鬥）`;
      } else if (closest.supplyType) {
        this.els.actionBtn.textContent = free > 0
          ? `開始幫忙：${closest.minigameTitle}（領取補給｜消耗 1 次免費探索）`
          : `開始幫忙：${closest.minigameTitle}（領取補給｜花費 ${cost} 金幣）`;
      } else if (nextLocked) {
        this.els.actionBtn.textContent = free > 0
          ? `開始幫忙：${closest.minigameTitle}（消耗 1 次免費探索）`
          : `開始幫忙：${closest.minigameTitle}（花費 ${cost} 金幣）`;
      } else {
        this.els.actionBtn.textContent = free > 0
          ? `再幫一次（已全解鎖，改領 30 金幣＋運算牌｜消耗 1 次免費）`
          : `再幫一次（已全解鎖，改領 30 金幣＋運算牌｜${cost} 金幣）`;
      }
    }

    tryStartMiniGame(loc) {
      if (!this.game.canStartExploreMiniGame()) return;
      const paidType = this.game.consumeExploreCost();
      if (!paidType) return;

      this.game.audio.playLevelUp();
      this.renderHeaderStats();
      this.openMiniGame(loc);
    }

    openMiniGame(loc) {
      this.closeMiniGame();
      this.els.mgTitle.textContent = `${loc.name} — ${loc.minigameTitle}`;
      this.els.mgHint.textContent = loc.minigameHint;
      this.els.mgStage.innerHTML = '';
      this.els.mgModal.classList.remove('hidden');

      const onWin = () => {
        this.game.audio.playLevelUp();
        this.grantLocationReward(loc);
      };

      switch (loc.minigame) {
        case 'crossing':
          this.activeMiniGameCleanup = this.runCrossingGame(this.els.mgStage, onWin);
          break;
        case 'prism':
          this.activeMiniGameCleanup = this.runPrismGame(this.els.mgStage, onWin);
          break;
        case 'sort':
          this.activeMiniGameCleanup = this.runSortGame(this.els.mgStage, onWin);
          break;
        case 'catch':
          this.activeMiniGameCleanup = this.runCatchGame(this.els.mgStage, onWin);
          break;
        case 'math':
          this.activeMiniGameCleanup = this.runMathGame(this.els.mgStage, onWin, loc.id);
          break;
        case 'bobe':
          this.activeMiniGameCleanup = this.runBobeGame(this.els.mgStage, onWin);
          break;
        case 'drum':
          this.activeMiniGameCleanup = this.runDrumGame(this.els.mgStage, onWin);
          break;
        case 'array':
          this.activeMiniGameCleanup = this.runArrayGame(this.els.mgStage, onWin);
          break;
        case 'weight':
          this.activeMiniGameCleanup = this.runWeightGame(this.els.mgStage, onWin);
          break;
        case 'water':
          this.activeMiniGameCleanup = this.runWaterGame(this.els.mgStage, onWin);
          break;
        case 'solar':
          this.activeMiniGameCleanup = this.runSolarGame(this.els.mgStage, onWin);
          break;
        case 'sequence':
          this.activeMiniGameCleanup = this.runSequenceGame(this.els.mgStage, onWin);
          break;
        case 'birds':
          this.activeMiniGameCleanup = this.runBirdGame(this.els.mgStage, onWin);
          break;
        case 'history':
          this.activeMiniGameCleanup = this.runHistoryGame(this.els.mgStage, onWin);
          break;
      }
    }

    closeMiniGame() {
      if (this.activeMiniGameCleanup) {
        this.activeMiniGameCleanup();
        this.activeMiniGameCleanup = null;
      }
      if (this.els.mgModal) {
        this.els.mgModal.classList.add('hidden');
      }
    }

    grantLocationReward(loc) {
      if (this.activeMiniGameCleanup) {
        this.activeMiniGameCleanup();
        this.activeMiniGameCleanup = null;
      }

      const atlasResult = this.collectAtlasCard(loc);
      const nextLocked = this.getNextLockedReward(loc);
      const fictionalNpc = `${loc.npc}（虛構角色）`;
      let msgHtml = '';

      if (loc.supplyType) {
        const supply = this.game.grantExploreSupply(loc.supplyType);
        const rewardText = supply.gear
          ? `裝備【${supply.gear.name}】`
          : (supply.card.kind === 'num' ? `數字牌 [${supply.card.val}]` : `運算牌 [${supply.card.val}]`);
        msgHtml = `
          <div class="mg-result">
            <div class="mg-result-badge">🎁 社區補給達成！</div>
            <h3>獲得：+${supply.bonusGold} 金幣 ＆ ${rewardText}</h3>
            <p>${fictionalNpc} 感謝你的幫忙，記得回算式工坊把新拿到的戰利品裝上去喔！</p>
            <button id="mg-done-btn" class="primary-btn" type="button">收下補給！回到社區</button>
          </div>
        `;
      } else if (nextLocked) {
        if (nextLocked.type === 'weapon') {
          this.game.unlockWeapon(nextLocked.id);
        } else {
          this.game.unlockRune(nextLocked.id);
        }
        const name = this.getRewardName(nextLocked);
        const typeLabel = nextLocked.type === 'weapon' ? '新武器' : '新符文';
        msgHtml = `
          <div class="mg-result">
            <div class="mg-result-badge">🎉 解鎖成功！</div>
            <h3>獲得${typeLabel}：【${name}】</h3>
            <p>${fictionalNpc} 笑著向你道謝，並把這個好寶貝交到你手上！現在可以回主選單或工坊裝備囉。</p>
            <button id="mg-done-btn" class="primary-btn" type="button">太棒了！回到社區</button>
          </div>
        `;
      } else {
        const bonus = this.game.grantExploreBonus();
        const cardLabel = bonus.card.kind === 'num' ? `數字牌 [${bonus.card.val}]` : `運算牌 [${bonus.card.val}]`;
        msgHtml = `
          <div class="mg-result">
            <div class="mg-result-badge">🌟 社區好夥伴！</div>
            <h3>獲得謝禮：+${bonus.bonusGold} 金幣 ＆ ${cardLabel}</h3>
            <p>這個據點的裝備都已經解鎖完畢，${fictionalNpc} 特別準備了點心金幣與算式牌給你！</p>
            <button id="mg-done-btn" class="primary-btn" type="button">收下謝禮！回到社區</button>
          </div>
        `;
      }

      this.els.mgStage.innerHTML = msgHtml;
      const atlasNotice = this.createAtlasNotice(atlasResult);
      if (atlasNotice) this.els.mgStage.prepend(atlasNotice);
      this.els.mgStage.querySelector('#mg-done-btn').addEventListener('click', () => {
        this.closeMiniGame();
        this.renderHeaderStats();
        this.renderQuickList();
        this.updateNearbyLocation(true);
      });
    }

    // =========================================================
    // 7 個台灣國小社區日常小遊戲
    // =========================================================

    getGradeBand() {
      const band = this.game.save.mathSettings && this.game.save.mathSettings.band;
      return PGS.ExploreQuest.BANDS.includes(band) ? band : 'middle';
    }

    runQuestionSeries(container, questions, onWin, options = {}) {
      let index = 0;
      let finished = false;
      let keyHandler;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.removeEventListener('keydown', keyHandler);
        onWin();
      };
      const renderQuestion = () => {
        if (index >= questions.length) {
          finish();
          return;
        }
        const question = questions[index];
        let mistakes = 0;
        container.innerHTML = `
          <div class="mg-box">
            <div class="mg-status">${options.statusLabel || '挑戰進度'}：${index + 1} / ${questions.length}</div>
            <div class="mg-visual"></div>
            <p class="mg-question"></p>
            <div class="ma-opts"></div>
            <p class="mg-sub" role="status" aria-live="polite">選出正確答案；也可用鍵盤 1–4 作答。</p>
          </div>
        `;
        const visual = container.querySelector('.mg-visual');
        const prompt = container.querySelector('.mg-question');
        const choices = container.querySelector('.ma-opts');
        const feedback = container.querySelector('.mg-sub');
        prompt.textContent = question.prompt;
        if (options.renderExtra) options.renderExtra(visual, question, index);
        else visual.remove();
        question.choices.forEach((choice, choiceIndex) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'secondary-btn mg-answer-btn';
          button.dataset.choiceIndex = String(choiceIndex);
          button.innerHTML = `<span class="mg-choice-number"></span><span></span>`;
          button.querySelector('.mg-choice-number').textContent = `${choiceIndex + 1}.`;
          button.querySelector('span:last-child').textContent = choice;
          button.addEventListener('click', () => {
            if (finished || button.disabled) return;
            if (choice === question.answer) {
              this.game.audio.playGem();
              index += 1;
              renderQuestion();
              return;
            }
            mistakes += 1;
            if (mistakes === 1) {
              feedback.textContent = `再試一次。提示：${question.hint}`;
              return;
            }
            feedback.textContent = `解法：正確答案是「${question.answer}」。${question.explanation}`;
            choices.querySelectorAll('button').forEach((item) => { item.disabled = true; });
            const retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'primary-btn mg-retry-btn';
            retry.textContent = '看懂了，再試一次';
            retry.addEventListener('click', () => {
              mistakes = 0;
              choices.querySelectorAll('button').forEach((item) => { item.disabled = false; });
              retry.remove();
              feedback.textContent = '再選一次；答對後繼續下一題。';
              choices.querySelector('button')?.focus();
            });
            choices.appendChild(retry);
            retry.focus();
          });
          choices.appendChild(button);
        });
      };
      keyHandler = (event) => {
        if (finished || !/^Digit[1-4]$/.test(event.code)) return;
        if (!container.isConnected) return;
        const button = container.querySelector(`[data-choice-index="${Number(event.code.slice(-1)) - 1}"]`);
        if (button && !button.disabled) {
          event.preventDefault();
          button.click();
        }
      };
      window.addEventListener('keydown', keyHandler);
      renderQuestion();
      return () => {
        finished = true;
        window.removeEventListener('keydown', keyHandler);
      };
    }

    renderArrayPreview(container, question) {
      const label = document.createElement('p');
      label.className = 'mg-sub';
      label.textContent = `秧苗總數：${question.count} 株`;
      const grid = document.createElement('div');
      grid.className = 'array-seedling-grid';
      grid.setAttribute('aria-label', `${question.rows} 行、${question.columns} 列秧苗陣列`);
      grid.style.gridTemplateColumns = `repeat(${question.columns}, 16px)`;
      for (let i = 0; i < question.count; i++) {
        const seedling = document.createElement('span');
        seedling.textContent = '🌱';
        seedling.setAttribute('aria-hidden', 'true');
        grid.appendChild(seedling);
      }
      container.append(label, grid);
    }

    runArrayGame(container, onWin) {
      const band = this.getGradeBand();
      const seed = Math.floor(Math.random() * 0x7fffffff);
      const questions = Array.from({ length: 3 }, (_, i) => PGS.ExploreQuest.generateArrayQuestion(band, seed + i));
      return this.runQuestionSeries(container, questions, onWin, {
        statusLabel: '插秧陣列',
        renderExtra: (visual, question) => this.renderArrayPreview(visual, question),
      });
    }

    runWeightGame(container, onWin) {
      const band = this.getGradeBand();
      const seed = Math.floor(Math.random() * 0x7fffffff);
      const questions = Array.from({ length: 3 }, (_, i) => PGS.ExploreQuest.generateWeightQuestion(band, seed + i));
      return this.runQuestionSeries(container, questions, onWin, { statusLabel: '秤重換算' });
    }

    runWaterGame(container, onWin) {
      const band = this.getGradeBand();
      const seed = Math.floor(Math.random() * 0x7fffffff);
      const questions = [
        PGS.ExploreQuest.generateWaterCycleQuestion(band, seed),
        PGS.ExploreQuest.generateVolumeQuestion(band, seed + 1),
        PGS.ExploreQuest.generateVolumeQuestion(band, seed + 2),
      ];
      return this.runQuestionSeries(container, questions, onWin, { statusLabel: '水循環與容量' });
    }

    drawSolarChart(container, canvas, values) {
      canvas.width = 360;
      canvas.height = 170;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', '一週太陽光電發電量長條圖；下方也列有每日數值。');
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#141025';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const max = Math.max(...values.map((item) => item.value));
      const chartTop = 16;
      const chartBottom = 136;
      const chartHeight = chartBottom - chartTop;
      const slot = 330 / values.length;
      const barWidth = Math.max(12, Math.floor(slot * 0.58));
      ctx.strokeStyle = '#776b9c';
      ctx.beginPath();
      ctx.moveTo(20, chartBottom);
      ctx.lineTo(350, chartBottom);
      ctx.stroke();
      values.forEach((item, index) => {
        const x = 24 + index * slot + (slot - barWidth) / 2;
        const h = Math.max(4, (item.value / max) * chartHeight);
        ctx.fillStyle = '#f6cc58';
        ctx.fillRect(x, chartBottom - h, barWidth, h);
        ctx.fillStyle = '#ffe8b4';
        ctx.font = '10px sans-serif';
        ctx.fillText(String(item.value), x, Math.max(11, chartBottom - h - 4));
        ctx.fillText(item.day, x - 2, 153);
      });
      const data = document.createElement('p');
      data.className = 'chart-data-list';
      data.textContent = values.map((item) => `${item.day} ${item.value} 度`).join('　');
      container.append(canvas, data);
    }

    runSolarGame(container, onWin) {
      const band = this.getGradeBand();
      const chart = PGS.ExploreQuest.generateSolarSet(band, Math.floor(Math.random() * 0x7fffffff));
      return this.runQuestionSeries(container, chart.questions, onWin, {
        statusLabel: '圖表判讀',
        renderExtra: (visual) => {
          const canvas = document.createElement('canvas');
          canvas.className = 'solar-chart';
          this.drawSolarChart(visual, canvas, chart.values);
        },
      });
    }

    runSequenceGame(container, onWin) {
      const band = this.getGradeBand();
      const seed = Math.floor(Math.random() * 0x7fffffff);
      const questions = Array.from({ length: 3 }, (_, i) => PGS.ExploreQuest.generateSequenceQuestion(band, seed + i));
      return this.runQuestionSeries(container, questions, onWin, { statusLabel: '階梯找規律' });
    }

    runBirdGame(container, onWin) {
      const band = this.getGradeBand();
      const seed = Math.floor(Math.random() * 0x7fffffff);
      const flock = PGS.ExploreQuest.generateBirdSet(band, seed);
      let countdown = null;
      let timeout = null;
      let quizCleanup = null;
      container.innerHTML = `
        <div class="mg-box bird-observation-box">
          <div class="mg-status">稻田觀察</div>
          <p class="mg-question">準備好後按「開始觀察」。鳥群會出現 4 秒，請記住種類和數量。</p>
          <div class="bird-flock hidden" aria-label="短暫出現的鳥群"></div>
          <p class="mg-sub" role="status" aria-live="polite">觀察期間會顯示鳥群；接著依記憶填寫統計題。</p>
          <button class="primary-btn bird-start-btn" type="button">開始觀察</button>
        </div>
      `;
      const flockEl = container.querySelector('.bird-flock');
      const statusEl = container.querySelector('.mg-sub');
      const startBtn = container.querySelector('.bird-start-btn');
      startBtn.addEventListener('click', () => {
        if (timeout) return;
        startBtn.disabled = true;
        flockEl.classList.remove('hidden');
        flock.sightings.forEach((sighting) => {
          const bird = document.createElement('span');
          bird.textContent = sighting.icon;
          bird.setAttribute('aria-hidden', 'true');
          flockEl.appendChild(bird);
        });
        let seconds = 4;
        statusEl.textContent = `請觀察鳥群：還有 ${seconds} 秒`;
        countdown = window.setInterval(() => {
          seconds -= 1;
          if (seconds > 0) statusEl.textContent = `請觀察鳥群：還有 ${seconds} 秒`;
        }, 1000);
        timeout = window.setTimeout(() => {
          if (countdown) window.clearInterval(countdown);
          countdown = null;
          const questions = flock.questions;
          quizCleanup = this.runQuestionSeries(container, questions, onWin, { statusLabel: '觀察統計' });
        }, 4000);
      });
      return () => {
        if (countdown) window.clearInterval(countdown);
        if (timeout) window.clearTimeout(timeout);
        if (quizCleanup) quizCleanup();
      };
    }

    runHistoryGame(container, onWin) {
      const band = this.getGradeBand();
      const seed = Math.floor(Math.random() * 0x7fffffff);
      const questions = Array.from({ length: 3 }, (_, i) => PGS.ExploreQuest.generateHistoryQuestion(band, seed + i));
      return this.runQuestionSeries(container, questions, onWin, { statusLabel: '校史時間軸' });
    }

    // 1. 北園國小校門：放學路隊交通指揮
    runCrossingGame(container, onWin) {
      let crossed = 0;
      let isGreen = true;
      let msg = '綠燈亮了！快讓小朋友過馬路！';

      container.innerHTML = `
        <div class="mg-box">
          <div class="mg-status" id="cr-status">已安全護送：0 / 5 位</div>
          <div class="cr-road">
            <div id="cr-light" class="cr-light green">綠燈通行</div>
            <div id="cr-kids" class="cr-kids">🧒 👧 🧒</div>
          </div>
          <p id="cr-msg" class="mg-sub">${msg}</p>
          <button id="cr-go-btn" class="primary-btn" type="button">🚩 揮旗放行路隊</button>
        </div>
      `;

      const statusEl = container.querySelector('#cr-status');
      const lightEl = container.querySelector('#cr-light');
      const msgEl = container.querySelector('#cr-msg');
      const btn = container.querySelector('#cr-go-btn');

      const timer = setInterval(() => {
        isGreen = Math.random() < 0.58;
        lightEl.className = 'cr-light ' + (isGreen ? 'green' : 'red');
        lightEl.textContent = isGreen ? '🟢 綠燈通行' : '🔴 紅燈停下';
        msgEl.textContent = isGreen ? '就是現在，舉旗放行！' : '有車經過！先等一下別按！';
      }, 950);

      btn.addEventListener('click', () => {
        if (isGreen) {
          crossed += 1;
          this.game.audio.playGem();
          statusEl.textContent = `已安全護送：${crossed} / 5 位`;
          msgEl.textContent = '太好了！小朋友開心地揮手說謝謝～';
          if (crossed >= 5) {
            clearInterval(timer);
            onWin();
          }
        } else {
          msgEl.textContent = '嗶嗶！紅燈要停下喔，再等下一個綠燈！';
        }
      });

      return () => clearInterval(timer);
    }

    // 2. 北園國小旋轉溜滑梯沙坑：自然課聚光鏡
    runPrismGame(container, onWin) {
      let hits = 0;
      let target = 30 + Math.floor(Math.random() * 45);
      let hold = 0;

      container.innerHTML = `
        <div class="mg-box">
          <div class="mg-status" id="pr-status">聚光完成：0 / 3 次</div>
          <div class="pr-track">
            <div id="pr-target" class="pr-target" style="left:${target}%"></div>
            <div id="pr-beam" class="pr-beam" style="left:50%">☀️</div>
          </div>
          <input id="pr-slider" type="range" min="5" max="95" value="50" class="pr-slider" />
          <p id="pr-msg" class="mg-sub">拖曳滑桿把太陽焦點對準金色標靶！</p>
        </div>
      `;

      const statusEl = container.querySelector('#pr-status');
      const targetEl = container.querySelector('#pr-target');
      const beamEl = container.querySelector('#pr-beam');
      const slider = container.querySelector('#pr-slider');
      const msgEl = container.querySelector('#pr-msg');

      const tick = setInterval(() => {
        const val = Number(slider.value);
        beamEl.style.left = `${val}%`;
        if (Math.abs(val - target) <= 6) {
          hold += 1;
          msgEl.textContent = `對準了！穩住稜鏡… (${hold}/6)`;
          if (hold >= 6) {
            hits += 1;
            hold = 0;
            this.game.audio.playGem();
            statusEl.textContent = `聚光完成：${hits} / 3 次`;
            if (hits >= 3) {
              clearInterval(tick);
              onWin();
              return;
            }
            target = 15 + Math.floor(Math.random() * 70);
            targetEl.style.left = `${target}%`;
            msgEl.textContent = '漂亮！請對準下一個沙坑標靶！';
          }
        } else {
          hold = 0;
          msgEl.textContent = '拖曳滑桿把太陽焦點對準金色標靶！';
        }
      }, 150);

      return () => clearInterval(tick);
    }

    // 3. 北園國中旁文具店：快速理貨
    runSortGame(container, onWin) {
      const items = [
        { id: 'pencil', icon: '✏️', name: '鉛筆' },
        { id: 'ruler', icon: '📏', name: '直尺' },
        { id: 'scissors', icon: '✂️', name: '剪刀' },
        { id: 'book', icon: '📓', name: '筆記本' },
        { id: 'glue', icon: '🧴', name: '膠水' },
        { id: 'paint', icon: '🎨', name: '水彩' },
      ];
      const order = [...items].sort(() => Math.random() - 0.5).slice(0, 5);
      const gridItems = [...items].sort(() => Math.random() - 0.5);
      let step = 0;

      container.innerHTML = `
        <div class="mg-box">
          <div class="mg-status" id="st-status">請依序點選：${order.map((x, i) => `<span class="st-q" data-i="${i}">${x.icon}${x.name}</span>`).join(' → ')}</div>
          <div id="st-grid" class="st-grid"></div>
          <p id="st-msg" class="mg-sub">目前要找的是：${order[0].icon} ${order[0].name}</p>
        </div>
      `;

      const statusEl = container.querySelector('#st-status');
      const gridEl = container.querySelector('#st-grid');
      const msgEl = container.querySelector('#st-msg');

      const refreshQueue = () => {
        statusEl.querySelectorAll('.st-q').forEach((el, i) => {
          el.style.opacity = i < step ? '0.35' : i === step ? '1' : '0.7';
          el.style.textDecoration = i < step ? 'line-through' : 'none';
        });
      };
      refreshQueue();

      for (const item of gridItems) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'st-btn';
        b.innerHTML = `<span style="font-size:22px">${item.icon}</span><span>${item.name}</span>`;
        b.addEventListener('click', () => {
          if (item.id === order[step].id) {
            this.game.audio.playGem();
            step += 1;
            refreshQueue();
            if (step >= order.length) {
              onWin();
            } else {
              msgEl.textContent = `下一個要找：${order[step].icon} ${order[step].name}`;
            }
          } else {
            msgEl.textContent = `拿錯囉！阿美姐需要的是 ${order[step].icon} ${order[step].name}`;
          }
        });
        gridEl.appendChild(b);
      }

      return () => {};
    }

    // 4. 北社尾公園：接嘉義椪柑
    runCatchGame(container, onWin) {
      let basketX = 50;
      let score = 0;
      const drops = [];
      let spawnCd = 0;

      container.innerHTML = `
        <div class="mg-box">
          <div class="mg-status" id="ct-status">已接住椪柑：0 / 8 顆</div>
          <div id="ct-area" class="ct-area">
            <div id="ct-basket" class="ct-basket" style="left:50%">🧺</div>
          </div>
          <div class="ct-controls">
            <button id="ct-left" class="secondary-btn" type="button">◀ 往左</button>
            <button id="ct-right" class="secondary-btn" type="button">往右 ▶</button>
          </div>
        </div>
      `;

      const statusEl = container.querySelector('#ct-status');
      const areaEl = container.querySelector('#ct-area');
      const basketEl = container.querySelector('#ct-basket');
      let moveDir = 0;

      const leftBtn = container.querySelector('#ct-left');
      const rightBtn = container.querySelector('#ct-right');
      leftBtn.addEventListener('pointerdown', () => { moveDir = -1; });
      leftBtn.addEventListener('pointerup', () => { moveDir = 0; });
      leftBtn.addEventListener('pointerleave', () => { moveDir = 0; });
      rightBtn.addEventListener('pointerdown', () => { moveDir = 1; });
      rightBtn.addEventListener('pointerup', () => { moveDir = 0; });
      rightBtn.addEventListener('pointerleave', () => { moveDir = 0; });

      const onKey = (e) => {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') basketX = Math.max(10, basketX - 10);
        if (e.code === 'ArrowRight' || e.code === 'KeyD') basketX = Math.min(90, basketX + 10);
      };
      window.addEventListener('keydown', onKey);

      const tick = setInterval(() => {
        if (moveDir !== 0) {
          basketX = Math.max(10, Math.min(90, basketX + moveDir * 4.5));
        }
        basketEl.style.left = `${basketX}%`;

        spawnCd -= 1;
        if (spawnCd <= 0) {
          spawnCd = 11;
          const isBad = Math.random() < 0.25;
          const el = document.createElement('div');
          el.className = 'ct-drop';
          el.textContent = isBad ? '🪵' : '🍊';
          const x = 10 + Math.random() * 80;
          el.style.left = `${x}%`;
          el.style.top = '0%';
          areaEl.appendChild(el);
          drops.push({ el, x, y: 0, bad: isBad, speed: 3.2 + Math.random() * 1.4 });
        }

        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.y += d.speed;
          d.el.style.top = `${d.y}%`;
          if (d.y >= 80 && d.y <= 94 && Math.abs(d.x - basketX) <= 12) {
            d.el.remove();
            drops.splice(i, 1);
            if (d.bad) {
              score = Math.max(0, score - 1);
            } else {
              score += 1;
              this.game.audio.playGem();
            }
            statusEl.textContent = `已接住椪柑：${score} / 8 顆`;
            if (score >= 8) {
              clearInterval(tick);
              window.removeEventListener('keydown', onKey);
              onWin();
              return;
            }
          } else if (d.y > 100) {
            d.el.remove();
            drops.splice(i, 1);
          }
        }
      }, 50);

      return () => {
        clearInterval(tick);
        window.removeEventListener('keydown', onKey);
      };
    }

    // 5. 王姓宗祠旁老街五金行：算找零
    runMathGame(container, onWin, locationId) {
      const band = this.getGradeBand();
      const seed = Math.floor(Math.random() * 0x7fffffff);
      const itemNames = locationId === 'wang_ancestral' ? ['螺絲', '膠帶'] : ['青菜', '米糕'];
      const questions = Array.from({ length: 3 }, (_, i) => {
        const q = PGS.ExploreQuest.generateChangeQuestion(band, seed + i);
        q.prompt = `買了 ${q.prices[0]} 元的${itemNames[0]}與 ${q.prices[1]} 元的${itemNames[1]}，付 ${q.paid} 元，應找回多少元？`;
        return q;
      });
      return this.runQuestionSeries(container, questions, onWin, { statusLabel: '找零練習' });
    }

    // 6. 北社尾保安宮：廟埕擲筊祈福
    runBobeGame(container, onWin) {
      let holy = 0;
      let cursor = 10;
      let dir = 1;

      container.innerHTML = `
        <div class="mg-box">
          <div class="mg-status" id="bb-status">已獲得聖筊：0 / 3 次</div>
          <div class="bb-result" id="bb-icon">🌙 🌙</div>
          <div class="bb-bar">
            <div class="bb-zone"></div>
            <div id="bb-cursor" class="bb-cursor"></div>
          </div>
          <p id="bb-msg" class="mg-sub">游標進到中間綠色誠心區時按下「擲筊」！</p>
          <button id="bb-throw-btn" class="primary-btn" type="button">🙏 誠心擲筊</button>
        </div>
      `;

      const statusEl = container.querySelector('#bb-status');
      const iconEl = container.querySelector('#bb-icon');
      const cursorEl = container.querySelector('#bb-cursor');
      const msgEl = container.querySelector('#bb-msg');
      const btn = container.querySelector('#bb-throw-btn');

      const tick = setInterval(() => {
        cursor += dir * 3.6;
        if (cursor >= 95) { cursor = 95; dir = -1; }
        if (cursor <= 5) { cursor = 5; dir = 1; }
        cursorEl.style.left = `${cursor}%`;
      }, 30);

      btn.addEventListener('click', () => {
        if (cursor >= 36 && cursor <= 64) {
          holy += 1;
          this.game.audio.playGem();
          iconEl.textContent = '🌙 ☀️（聖筊！）';
          statusEl.textContent = `已獲得聖筊：${holy} / 3 次`;
          msgEl.textContent = '保生大帝允筊！太靈驗了！';
          if (holy >= 3) {
            clearInterval(tick);
            onWin();
          }
        } else {
          iconEl.textContent = Math.random() < 0.5 ? '🌙 🌙（笑筊）' : '☀️ ☀️（陰筊）';
          msgEl.textContent = '心再定一點，抓準中間綠色區再擲一次！';
        }
      });

      return () => clearInterval(tick);
    }

    // 7. 北社尾鎮北宮：廟會大鼓節奏
    runDrumGame(container, onWin) {
      let hits = 0;
      let noteX = 92;

      container.innerHTML = `
        <div class="mg-box">
          <div class="mg-status" id="dr-status">大鼓合奏：0 / 6 拍</div>
          <div class="dr-lane">
            <div class="dr-target">🥁</div>
            <div id="dr-note" class="dr-note" style="left:92%">●</div>
          </div>
          <p id="dr-msg" class="mg-sub">紅點滑進左邊大鼓區時點擊「敲大鼓」（或按空白鍵）！</p>
          <button id="dr-hit-btn" class="primary-btn" type="button">🥁 咚！敲大鼓</button>
        </div>
      `;

      const statusEl = container.querySelector('#dr-status');
      const noteEl = container.querySelector('#dr-note');
      const msgEl = container.querySelector('#dr-msg');
      const btn = container.querySelector('#dr-hit-btn');

      const tick = setInterval(() => {
        noteX -= 2.4;
        if (noteX < 4) noteX = 94;
        noteEl.style.left = `${noteX}%`;
      }, 35);

      const tryHit = () => {
        if (noteX >= 8 && noteX <= 26) {
          hits += 1;
          noteX = 94;
          this.game.audio.playGem();
          statusEl.textContent = `大鼓合奏：${hits} / 6 拍`;
          msgEl.textContent = '咚！！節奏超穩！';
          if (hits >= 6) {
            clearInterval(tick);
            window.removeEventListener('keydown', onKey);
            onWin();
          }
        } else {
          msgEl.textContent = '差一點點！等紅點進入左邊圓圈再敲～';
        }
      };

      const onKey = (e) => {
        if (e.code === 'Space') {
          e.preventDefault();
          tryHit();
        }
      };

      btn.addEventListener('click', tryHit);
      window.addEventListener('keydown', onKey);

      return () => {
        clearInterval(tick);
        window.removeEventListener('keydown', onKey);
      };
    }

    // =========================================================
    // 社區地圖更新與像素繪圖
    // =========================================================

    loop(now) {
      if (!this.isOpen) return;
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.animTime += dt;

      if (this.els.mgModal.classList.contains('hidden')) {
        this.updatePlayer(dt);
      }
      this.updateAmbient(dt);
      this.renderMap();
      this.rafId = requestAnimationFrame((t) => this.loop(t));
    }

    updatePlayer(dt) {
      let dx = 0;
      let dy = 0;
      if (this.keys.KeyW || this.keys.ArrowUp) dy -= 1;
      if (this.keys.KeyS || this.keys.ArrowDown) dy += 1;
      if (this.keys.KeyA || this.keys.ArrowLeft) dx -= 1;
      if (this.keys.KeyD || this.keys.ArrowRight) dx += 1;

      if (dx !== 0 || dy !== 0) {
        this.moveTarget = null;
        this.cam.followPlayer = true;
        const len = Math.hypot(dx, dy);
        dx /= len;
        dy /= len;
      } else if (this.moveTarget) {
        const tx = this.moveTarget.x - this.player.x;
        const ty = this.moveTarget.y - this.player.y;
        const dist = Math.hypot(tx, ty);
        if (dist <= 3) {
          this.moveTarget = null;
        } else {
          dx = tx / dist;
          dy = ty / dist;
        }
      }

      if (dx !== 0 || dy !== 0) {
        const speed = 105;
        const oldX = this.player.x;
        const oldY = this.player.y;
        const nx = Math.max(14, Math.min(MAP_W - 14, oldX + dx * speed * dt));
        const ny = Math.max(16, Math.min(MAP_H - 14, oldY + dy * speed * dt));

        if (!this.hitsObstacle(nx, this.player.y)) this.player.x = nx;
        if (!this.hitsObstacle(this.player.x, ny)) this.player.y = ny;

        if (this.moveTarget && Math.abs(this.player.x - oldX) < 0.05 && Math.abs(this.player.y - oldY) < 0.05) {
          this.moveTarget = null;
        }

        if (Math.abs(dx) > Math.abs(dy)) {
          this.player.dir = dx > 0 ? 'right' : 'left';
        } else {
          this.player.dir = dy > 0 ? 'down' : 'up';
        }
        this.player.walkTimer += dt * 10;
      } else {
        this.player.walkTimer = 0;
      }

      this.updateNearbyLocation(false);
    }

    _pointInPoly(x, y, poly) {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    hitsObstacle(x, y) {
      if (!this.buildingColliders) return false;
      if (PGS.ExploreQuest && typeof PGS.ExploreQuest.isBlocked === 'function') {
        return PGS.ExploreQuest.isBlocked(x, y, this.buildingColliders, 3);
      }
      const r = 3;
      const probes = [[x, y], [x - r, y], [x + r, y], [x, y - r], [x, y + r]];
      for (const c of this.buildingColliders) {
        if (x + r < c.minX || x - r > c.maxX || y + r < c.minY || y - r > c.maxY) continue;
        for (const [px, py] of probes) {
          if (this._pointInPoly(px, py, c.p)) return true;
        }
      }
      return false;
    }

    _pxLine(ctx, x0, y0, x1, y1, size, color) {
      ctx.fillStyle = color;
      let dx = Math.abs(x1 - x0);
      let dy = Math.abs(y1 - y0);
      let sx = x0 < x1 ? 1 : -1;
      let sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      const half = Math.floor(size / 2);
      while (true) {
        ctx.fillRect(x0 - half, y0 - half, size, size);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
      }
    }

    // ===== 地圖美術：地面兩幀（稻浪／水流）＋上層（道路、建築、樹木）預先畫在離屏畫布 =====

    // 沿折線每隔 spacing 取樣；offset 為第一個取樣點的距離
    _walkPath(points, spacing, offset, fn) {
      let d0 = 0;
      let next = offset;
      for (let i = 0; i < points.length - 1; i++) {
        const x0 = points[i][0];
        const y0 = points[i][1];
        const x1 = points[i + 1][0];
        const y1 = points[i + 1][1];
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len === 0) continue;
        while (next < d0 + len) {
          const t = (next - d0) / len;
          fn(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, (x1 - x0) / len, (y1 - y0) / len);
          next += spacing;
        }
        d0 += len;
      }
    }

    _fillDisc(ctx, cx, cy, r, color) {
      ctx.fillStyle = color;
      for (let dy = -r; dy <= r; dy++) {
        const half = Math.round(Math.sqrt(r * r - dy * dy));
        ctx.fillRect(cx - half, cy + dy, half * 2, 1);
      }
    }

    // 暖色草地底圖（Bayer 抖動三階）＋草叢與小野花，只畫一次
    _paintGrassBase() {
      const c = document.createElement('canvas');
      c.width = MAP_W;
      c.height = MAP_H;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(MAP_W, MAP_H);
      const d = img.data;
      const G = [[88, 140, 66], [103, 158, 74], [121, 175, 86]];
      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          const bay = BAYER4[(y & 3) * 4 + (x & 3)];
          const n = 0.5 + 0.5 * Math.sin(x * 0.045 + Math.sin(y * 0.03) * 2) * Math.cos(y * 0.05);
          const v = n * 0.6 + hash2(x >> 3, y >> 3) * 0.4;
          const level = Math.max(0, Math.min(2, Math.floor(v * 2.4 + (bay - 0.5) * 0.9)));
          const i = (y * MAP_W + x) * 4;
          d[i] = G[level][0];
          d[i + 1] = G[level][1];
          d[i + 2] = G[level][2];
          d[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      for (let k = 0; k < 420; k++) {
        const x = Math.floor(hash2(k, 3) * MAP_W);
        const y = Math.floor(hash2(k, 17) * MAP_H);
        ctx.fillStyle = '#4d7f3c';
        ctx.fillRect(x, y + 1, 3, 1);
        ctx.fillStyle = '#8fc468';
        ctx.fillRect(x + 1, y, 1, 2);
      }
      const petals = ['#fff3c8', '#ffc4d4', '#ffe066'];
      for (let k = 0; k < 90; k++) {
        ctx.fillStyle = petals[k % 3];
        ctx.fillRect(Math.floor(hash2(k, 41) * MAP_W), Math.floor(hash2(k, 59) * MAP_H), 2, 2);
      }
      return c;
    }

    _polyPath(ctx, pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.closePath();
    }

    // 公園／綠地／稻田（稻株行列，第 2 幀整體左右偏 1px 與稻畦位移，形成微風搖曳）
    _paintAreas(ctx, mapData, frame) {
      const areaColors = { park: '#7fbf5e', school: '#78b85a', green: '#6dab50', pitch: '#c47255' };
      for (const a of mapData.areas || []) {
        if (!a.p || a.p.length < 3) continue;
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;
        for (const pt of a.p) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[1] > maxY) maxY = pt[1];
        }
        const x0 = Math.max(0, Math.floor(minX));
        const x1 = Math.min(MAP_W, Math.ceil(maxX));
        const y0 = Math.max(0, Math.floor(minY));
        const y1 = Math.min(MAP_H, Math.ceil(maxY));
        if (x1 <= x0 || y1 <= y0) continue;

        ctx.save();
        this._polyPath(ctx, a.p);
        ctx.clip();
        if (a.k === 'farm') {
          ctx.fillStyle = '#a9c04c';
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
          for (let y = y0 - (y0 % 6); y < y1; y += 6) {
            const row = (y / 6) | 0;
            ctx.fillStyle = row & 1 ? '#98b340' : '#b6cc5a';
            ctx.fillRect(x0, y, x1 - x0, 3);
            const start = x0 - (x0 % 5) + (row & 1 ? 2 : 0) + frame;
            ctx.fillStyle = '#6f9a2e';
            for (let x = start; x < x1; x += 5) ctx.fillRect(x, y + 1, 2, 2);
            ctx.fillStyle = '#e0ee8a';
            for (let x = start; x < x1; x += 5) ctx.fillRect(x + (frame ? 1 : 0), y, 1, 1);
          }
        } else {
          ctx.fillStyle = areaColors[a.k] || '#6dab50';
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          for (let y = y0 - (y0 % 8); y < y1; y += 8) ctx.fillRect(x0, y, x1 - x0, 4);
        }
        ctx.restore();

        if (a.k === 'farm') {
          // 田埂：土色邊線與淺色高光
          ctx.save();
          this._polyPath(ctx, a.p);
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#c4a468';
          ctx.stroke();
          ctx.lineWidth = 1;
          ctx.strokeStyle = '#e6cf94';
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    // 水圳：草岸、深藍水道、淺藍水心與流動亮點（亮點位置隨幀移動）
    _paintWater(ctx, mapData, frame) {
      for (const w of mapData.waterways || []) {
        for (let i = 0; i < w.length - 1; i++) {
          this._pxLine(ctx, w[i][0], w[i][1], w[i + 1][0], w[i + 1][1], 9, '#8cae5c');
        }
        for (let i = 0; i < w.length - 1; i++) {
          this._pxLine(ctx, w[i][0], w[i][1], w[i + 1][0], w[i + 1][1], 7, '#2b5a8e');
        }
        for (let i = 0; i < w.length - 1; i++) {
          this._pxLine(ctx, w[i][0], w[i][1], w[i + 1][0], w[i + 1][1], 5, '#3f8fd2');
        }
        this._walkPath(w, 12, frame ? 6 : 0, (x, y, dx, dy) => {
          if (x < 0 || y < 0 || x > MAP_W || y > MAP_H) return;
          ctx.fillStyle = '#d4f2ff';
          ctx.fillRect(Math.round(x - dx * 1.5), Math.round(y - dy * 1.5), 3, 1);
          ctx.fillStyle = '#7fcdf5';
          ctx.fillRect(Math.round(x + dx * 4), Math.round(y + dy * 4 + 1), 2, 1);
        });
      }
    }

    buildGroundFrames(mapData) {
      const grass = this._paintGrassBase();
      const frames = [];
      for (let f = 0; f < 2; f++) {
        const c = document.createElement('canvas');
        c.width = MAP_W;
        c.height = MAP_H;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(grass, 0, 0);
        if (mapData) {
          this._paintAreas(ctx, mapData, f);
          this._paintWater(ctx, mapData, f);
        }
        frames.push(c);
      }
      return frames;
    }

    _drawTree(ctx, tx, ty, seed) {
      const variant = seed % 11;
      const pal = variant === 0
        ? ['#8a3f5a', '#c8607e', '#e88aa4', '#ffc8d6']
        : variant === 3
          ? ['#3a5e2e', '#58802f', '#86a63c', '#b8cf62']
          : ['#2a6636', '#3f8f48', '#68b95a', '#a6dc7a'];
      ctx.fillStyle = 'rgba(18,14,28,0.32)';
      ctx.fillRect(tx - 5, ty + 1, 11, 3);
      ctx.fillStyle = '#4a2f20';
      ctx.fillRect(tx - 2, ty - 5, 4, 7);
      ctx.fillStyle = '#6e4a32';
      ctx.fillRect(tx - 1, ty - 5, 2, 7);
      this._fillDisc(ctx, tx, ty - 10, 6, '#1e2d2a');
      this._fillDisc(ctx, tx, ty - 10, 5, pal[0]);
      this._fillDisc(ctx, tx - 1, ty - 11, 4, pal[1]);
      this._fillDisc(ctx, tx - 2, ty - 12, 2, pal[2]);
      ctx.fillStyle = pal[3];
      ctx.fillRect(tx - 3, ty - 13, 2, 1);
    }

    // 找出可種樹的草地點：避開稻田、水圳、道路、建築與據點
    _collectTreeSpots(mapData) {
      const segs = [];
      for (const r of mapData.roads || []) {
        for (let i = 0; i < r.p.length - 1; i++) {
          const a = r.p[i];
          const b = r.p[i + 1];
          if (Math.max(a[0], b[0]) < -10 || Math.min(a[0], b[0]) > MAP_W + 10) continue;
          if (Math.max(a[1], b[1]) < -10 || Math.min(a[1], b[1]) > MAP_H + 10) continue;
          segs.push([a[0], a[1], b[0], b[1], r.k === 'tertiary' ? 9 : 6.5]);
        }
      }
      const waterSegs = [];
      for (const w of mapData.waterways || []) {
        for (let i = 0; i < w.length - 1; i++) waterSegs.push([w[i][0], w[i][1], w[i + 1][0], w[i + 1][1], 8]);
      }
      const nearSeg = (x, y, list) => {
        for (const s of list) {
          const dx = s[2] - s[0];
          const dy = s[3] - s[1];
          const l2 = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (y - s[1]) * dy) / l2));
          if (Math.hypot(x - (s[0] + dx * t), y - (s[1] + dy * t)) < s[4]) return true;
        }
        return false;
      };
      const farms = (mapData.areas || []).filter((a) => a.k === 'farm' && a.p && a.p.length >= 3);
      const spots = [];
      for (let gy = 14; gy < MAP_H - 6; gy += 15) {
        for (let gx = 8; gx < MAP_W - 8; gx += 16) {
          const k = gx * 31 + gy;
          if (hash2(gx, gy) > 0.5) continue;
          const x = Math.round(gx + (hash2(k, 1) - 0.5) * 9);
          const y = Math.round(gy + (hash2(k, 2) - 0.5) * 7);
          if (LOCATIONS.some((loc) => Math.hypot(loc.x - x, loc.y - y) < 17)) continue;
          if (this.buildingColliders.some((c) => x > c.minX - 5 && x < c.maxX + 5 && y > c.minY - 3 && y < c.maxY + 9)) continue;
          if (nearSeg(x, y, segs) || nearSeg(x, y - 4, segs) || nearSeg(x, y, waterSegs)) continue;
          if (farms.some((f) => this._pointInPoly(x, y, f.p))) continue;
          spots.push({ x, y, seed: Math.floor(hash2(k, 9) * 1000) });
        }
      }
      // 稻田裡可供白鷺鷥散步的點
      const farmSpots = [];
      for (let gy = 12; gy < MAP_H - 10; gy += 7) {
        for (let gx = 12; gx < MAP_W - 10; gx += 7) {
          if (nearSeg(gx, gy, segs) || nearSeg(gx, gy, waterSegs)) continue;
          if (farms.some((f) => this._pointInPoly(gx, gy, f.p))) farmSpots.push({ x: gx, y: gy });
        }
      }
      return { spots, farmSpots };
    }

    buildBaseMap() {
      const mapData = PGS.BeisheweiMapData;
      this.groundFrames = this.buildGroundFrames(mapData);

      const off = document.createElement('canvas');
      off.width = MAP_W;
      off.height = MAP_H;
      const ctx = off.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      if (!mapData) return off;

      // 1. 真實 OSM 街道：路緣深色 → 柏油深灰 → 主要道路白色虛線標線；小徑為土色
      const roadOrder = ['service', 'path', 'residential', 'tertiary', 'secondary', 'primary'];
      const roadStyles = {
        primary: { curb: 11, fill: 7, color: '#4c505c', lane: '#f4f0dc' },
        secondary: { curb: 9, fill: 6, color: '#4a4e5a', lane: '#f4f0dc' },
        tertiary: { curb: 8, fill: 5, color: '#4a4e5a', lane: '#f4f0dc' },
        residential: { curb: 6, fill: 4, color: '#444854', lane: null },
        service: { curb: 4, fill: 2, color: '#3f434e', lane: null },
        path: { curb: 4, fill: 2, color: '#b89f76', lane: null, curbColor: '#8a7452' },
      };

      for (const kind of roadOrder) {
        const st = roadStyles[kind];
        for (const r of mapData.roads || []) {
          if (r.k !== kind) continue;
          for (let i = 0; i < r.p.length - 1; i++) {
            this._pxLine(ctx, r.p[i][0], r.p[i][1], r.p[i + 1][0], r.p[i + 1][1], st.curb, st.curbColor || '#262a33');
          }
        }
      }
      for (const kind of roadOrder) {
        const st = roadStyles[kind];
        for (const r of mapData.roads || []) {
          if (r.k !== kind) continue;
          for (let i = 0; i < r.p.length - 1; i++) {
            this._pxLine(ctx, r.p[i][0], r.p[i][1], r.p[i + 1][0], r.p[i + 1][1], st.fill, st.color);
          }
          if (st.lane) {
            this._walkPath(r.p, 10, 0, (x, y, dx, dy) => {
              if (x < -6 || y < -6 || x > MAP_W + 6 || y > MAP_H + 6) return;
              this._pxLine(ctx, Math.round(x), Math.round(y), Math.round(x + dx * 5), Math.round(y + dy * 5), 1, st.lane);
            });
          }
        }
      }

      // 2. 真實 OSM 建築輪廓（2.5D 像素逐層疊高）：屋頂顏色依類型區分
      const fillPoly = (pts, ox, oy, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(pts[0][0] + ox, pts[0][1] + oy);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] + ox, pts[i][1] + oy);
        ctx.closePath();
        ctx.fill();
      };

      const sortedBuildings = (mapData.buildings || [])
        .filter((b) => b.p && b.p.length >= 3)
        .map((b) => {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          let sumX = 0;
          for (const pt of b.p) {
            if (pt[0] < minX) minX = pt[0];
            if (pt[0] > maxX) maxX = pt[0];
            if (pt[1] < minY) minY = pt[1];
            if (pt[1] > maxY) maxY = pt[1];
            sumX += pt[0];
          }
          return { b, minX, maxX, minY, maxY, seed: Math.abs(Math.round(sumX + maxY)) };
        })
        .sort((a, c) => a.maxY - c.maxY);

      this.buildingColliders = sortedBuildings.map((item) => ({
        minX: item.minX,
        maxX: item.maxX,
        minY: item.minY,
        maxY: item.maxY,
        p: item.b.p,
      }));

      const houseWalls = ['#e6d3b0', '#d9c19a', '#efe2c6', '#cdb892'];
      const houseRoofs = ['#c4533a', '#d67a3c', '#6f8da8', '#a07052'];
      for (const item of sortedBuildings) {
        const { b, seed } = item;
        const isTemple = b.k === 'temple';
        const isSchool = b.k === 'school';
        const height = isTemple ? 11 : isSchool ? 9 : 5 + (seed % 4);
        const wallColor = isTemple ? '#b8392a' : isSchool ? '#e8d8b0' : houseWalls[seed % houseWalls.length];
        const windowColor = isTemple ? '#f0b04e' : '#7fb0d4';
        const roofColor = isTemple ? '#d8572f' : isSchool ? '#cf5f45' : houseRoofs[(seed >> 1) % houseRoofs.length];
        const roofEdge = isTemple ? '#ffd870' : '#3f2f2a';

        // 地面斜長影子
        fillPoly(b.p, Math.round(height * 0.45), Math.round(height * 0.35), 'rgba(18,14,28,0.4)');

        // 牆腳暗邊（先畫在最底層），再逐層向上疊出牆面高度
        fillPoly(b.p, 0, 0, '#5b4a40');
        for (let z = 1; z < height; z++) {
          const isWinBand = z === 3 || z === 6;
          fillPoly(b.p, 0, -z, isWinBand ? windowColor : wallColor);
        }
        // 頂層屋頂＋瓦片橫紋
        fillPoly(b.p, 0, -height, roofColor);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(b.p[0][0], b.p[0][1] - height);
        for (let i = 1; i < b.p.length; i++) ctx.lineTo(b.p[i][0], b.p[i][1] - height);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = 'rgba(40,16,12,0.2)';
        for (let y = Math.floor(item.minY - height); y < item.maxY - height; y += 3) {
          ctx.fillRect(item.minX, y, item.maxX - item.minX, 1);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(item.minX, Math.floor(item.minY - height), item.maxX - item.minX, 1);
        ctx.restore();
        ctx.strokeStyle = roofEdge;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.p[0][0], b.p[0][1] - height);
        for (let i = 1; i < b.p.length; i++) ctx.lineTo(b.p[i][0], b.p[i][1] - height);
        ctx.closePath();
        ctx.stroke();

        // 廟宇：疊第二層飛簷屋脊、金色寶頂與兩盞紅燈籠
        if (isTemple) {
          let cx = 0, cy = 0;
          for (const pt of b.p) { cx += pt[0]; cy += pt[1]; }
          cx /= b.p.length; cy /= b.p.length;
          const inner = b.p.map((pt) => [Math.round(cx + (pt[0] - cx) * 0.58), Math.round(cy + (pt[1] - cy) * 0.58)]);
          for (let z = height + 1; z <= height + 3; z++) {
            fillPoly(inner, 0, -z, '#a82f24');
          }
          fillPoly(inner, 0, -(height + 4), '#f2b749');
          ctx.fillStyle = '#ffd25a';
          ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - height - 9, 2, 5);
          ctx.fillStyle = '#d6302a';
          ctx.fillRect(Math.round(item.minX) - 2, Math.round(item.maxY) - 6, 3, 4);
          ctx.fillRect(Math.round(item.maxX) - 1, Math.round(item.maxY) - 6, 3, 4);
          ctx.fillStyle = '#ffd25a';
          ctx.fillRect(Math.round(item.minX) - 2, Math.round(item.maxY) - 7, 3, 1);
          ctx.fillRect(Math.round(item.maxX) - 1, Math.round(item.maxY) - 7, 3, 1);
        }
      }

      // 3. 北園國小校門：兩根門柱、橫樑與升旗桿（純裝飾，不影響碰撞）
      const gate = LOCATIONS.find((loc) => loc.id === 'beiyuan_gate');
      if (gate) {
        const gx = gate.x;
        const gy = gate.y + 8;
        ctx.fillStyle = 'rgba(18,14,28,0.35)';
        ctx.fillRect(gx - 12, gy + 1, 26, 3);
        ctx.fillStyle = '#d9c8a2';
        ctx.fillRect(gx - 12, gy - 12, 4, 14);
        ctx.fillRect(gx + 8, gy - 12, 4, 14);
        ctx.fillStyle = '#c4533a';
        ctx.fillRect(gx - 13, gy - 15, 6, 3);
        ctx.fillRect(gx + 7, gy - 15, 6, 3);
        ctx.fillStyle = '#4a4e5a';
        ctx.fillRect(gx - 8, gy - 6, 16, 1);
        ctx.fillStyle = '#8a6a48';
        ctx.fillRect(gx + 15, gy - 22, 1, 24);
        ctx.fillStyle = '#e8483c';
        ctx.fillRect(gx + 16, gy - 22, 6, 4);
      }

      // 4. 像素行道樹（樹冠＋陰影），依 y 由後往前畫；順便取得稻田散步點
      const { spots, farmSpots } = this._collectTreeSpots(mapData);
      spots.sort((a, c) => a.y - c.y);
      for (const s of spots) this._drawTree(ctx, s.x, s.y, s.seed);
      this.farmSpots = farmSpots;

      // 5. 真實 OSM 路名標籤（綠底路牌）
      ctx.font = 'bold 9px sans-serif';
      // 記下路牌佔用的矩形（地圖座標），據點名稱牌會避開它們，免得「路名」和「據點名」疊在一起。
      this.roadLabelRects = [];
      for (const lb of mapData.roadLabels || []) {
        const tw = ctx.measureText(lb.n).width;
        this.roadLabelRects.push({ x: lb.x - tw / 2 - 3, y: lb.y - 7, w: tw + 6, h: 12 });
        ctx.fillStyle = '#16382f';
        ctx.fillRect(lb.x - tw / 2 - 3, lb.y - 7, tw + 6, 12);
        ctx.fillStyle = '#e6d9a8';
        ctx.fillRect(lb.x - tw / 2 - 3, lb.y - 7, tw + 6, 1);
        ctx.fillRect(lb.x - tw / 2 - 3, lb.y + 4, tw + 6, 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(lb.n, lb.x - tw / 2, lb.y + 3);
      }

      this.setupAmbient(mapData);
      return off;
    }

    // ===== 裝飾性小生物：白鷺鷥在稻田散步、居民沿道路來回走、一隻白鷺鷥飛過 =====
    setupAmbient(mapData) {
      const spots = this.farmSpots || [];
      this.egrets = [];
      for (let i = 0; i < 3 && spots.length > 3; i++) {
        const s = spots[Math.floor((spots.length * (i + 0.5)) / 3)];
        this.egrets.push({ x: s.x, y: s.y, tx: s.x, ty: s.y, wait: i * 0.7, dir: 1, sy: s.y });
      }

      // 居民：挑畫面內較長的次要道路片段
      const shirts = ['#e05a4a', '#4a8ae0', '#e0b84a', '#7a5ac8'];
      const candidates = [];
      for (const r of mapData.roads || []) {
        if (r.k !== 'tertiary' && r.k !== 'residential') continue;
        let run = [];
        const flush = () => {
          if (run.length >= 4) candidates.push(run);
          run = [];
        };
        for (const pt of r.p) {
          if (pt[0] > 16 && pt[0] < MAP_W - 16 && pt[1] > 20 && pt[1] < MAP_H - 16) run.push(pt);
          else flush();
        }
        flush();
      }
      const pathLen = (p) => p.reduce((sum, pt, i) => (i ? sum + Math.hypot(pt[0] - p[i - 1][0], pt[1] - p[i - 1][1]) : 0), 0);
      candidates.sort((a, c) => pathLen(c) - pathLen(a));
      this.npcs = candidates.slice(0, 3).map((path, i) => {
        const len = pathLen(path);
        return { path, len, s: len * (0.2 + i * 0.25), dir: i % 2 ? -1 : 1, speed: 11 + i * 3, shirt: shirts[i], x: path[0][0], y: path[0][1] };
      });

      this.flyer = { x: -30, y: 70, speed: 30, phase: 0 };
    }

    updateAmbient(dt) {
      for (const e of this.egrets || []) {
        if (e.wait > 0) {
          e.wait -= dt;
          continue;
        }
        const dx = e.tx - e.x;
        const dy = e.ty - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 1.5) {
          const near = (this.farmSpots || []).filter((s) => Math.hypot(s.x - e.x, s.y - e.y) < 60);
          const pick = near.length ? near[Math.floor(Math.random() * near.length)] : { x: e.x, y: e.y };
          e.tx = pick.x;
          e.ty = pick.y;
          e.wait = 1 + Math.random() * 2.5;
        } else {
          e.x += (dx / d) * 9 * dt;
          e.y += (dy / d) * 9 * dt;
          e.dir = dx >= 0 ? 1 : -1;
        }
      }
      for (const n of this.npcs || []) {
        n.s += n.dir * n.speed * dt;
        if (n.s <= 0) { n.s = 0; n.dir = 1; }
        if (n.s >= n.len) { n.s = n.len; n.dir = -1; }
        let rest = n.s;
        for (let i = 0; i < n.path.length - 1; i++) {
          const a = n.path[i];
          const b = n.path[i + 1];
          const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (rest <= seg || i === n.path.length - 2) {
            const t = seg ? Math.min(1, rest / seg) : 0;
            n.x = a[0] + (b[0] - a[0]) * t;
            n.y = a[1] + (b[1] - a[1]) * t;
            break;
          }
          rest -= seg;
        }
      }
      const f = this.flyer;
      if (f) {
        f.x += f.speed * dt;
        f.phase += dt * 6;
        if (f.x > MAP_W + 30) {
          f.x = -30;
          f.y = 40 + Math.random() * 220;
        }
      }
    }

    drawAmbient(ctx) {
      const dark = '#2b2438';
      for (const e of this.egrets || []) {
        const x = Math.round(e.x);
        const y = Math.round(e.y);
        const s = e.dir;
        const peck = e.wait > 0 && Math.sin(this.animTime * 7 + x) > 0.2;
        ctx.fillStyle = 'rgba(18,14,28,0.35)';
        ctx.fillRect(x - 3, y + 1, 7, 2);
        ctx.fillStyle = dark;
        ctx.fillRect(x - 1, y - 2, 1, 3);
        ctx.fillRect(x + 1, y - 2, 1, 3);
        ctx.fillRect(x - 4, y - 7, 8, 5);
        ctx.fillStyle = '#fbfbf4';
        ctx.fillRect(x - 3, y - 6, 6, 3);
        ctx.fillStyle = '#dfe4e8';
        ctx.fillRect(x - 3, y - 4, 4, 1);
        const hx = x + s * 3;
        if (peck) {
          ctx.fillStyle = dark;
          ctx.fillRect(hx - 1, y - 6, 3, 5);
          ctx.fillStyle = '#fbfbf4';
          ctx.fillRect(hx, y - 5, 1, 3);
          ctx.fillStyle = '#ffb447';
          ctx.fillRect(hx + s, y - 2, 2, 1);
        } else {
          ctx.fillStyle = dark;
          ctx.fillRect(hx - 1, y - 11, 3, 6);
          ctx.fillStyle = '#fbfbf4';
          ctx.fillRect(hx, y - 10, 1, 4);
          ctx.fillRect(hx, y - 11, 2, 2);
          ctx.fillStyle = '#ffb447';
          ctx.fillRect(hx + s, y - 10, 2, 1);
        }
      }
      for (const n of this.npcs || []) {
        const x = Math.round(n.x);
        const y = Math.round(n.y);
        const step = Math.floor(this.animTime * 6 + n.speed) & 1;
        ctx.fillStyle = 'rgba(18,14,28,0.35)';
        ctx.fillRect(x - 3, y + 1, 7, 2);
        ctx.fillStyle = '#2b3a58';
        ctx.fillRect(x - 2, y - 2, 2, 3 + step);
        ctx.fillRect(x + 1, y - 2, 2, 4 - step);
        ctx.fillStyle = n.shirt;
        ctx.fillRect(x - 2, y - 7, 5, 5);
        ctx.fillStyle = '#ffd5a8';
        ctx.fillRect(x - 2, y - 10, 5, 3);
        ctx.fillStyle = '#3a2a24';
        ctx.fillRect(x - 2, y - 11, 5, 2);
      }
      const f = this.flyer;
      if (f) {
        const x = Math.round(f.x);
        const y = Math.round(f.y + Math.sin(f.phase * 0.5) * 2);
        ctx.fillStyle = 'rgba(18,14,28,0.28)';
        ctx.fillRect(x - 3, y + 14, 8, 2);
        ctx.fillStyle = dark;
        ctx.fillRect(x - 6, y - 1, 13, 5);
        ctx.fillStyle = '#fbfbf4';
        ctx.fillRect(x - 5, y, 11, 3);
        ctx.fillRect(x + 5, y - 2, 2, 2);
        ctx.fillStyle = '#ffb447';
        ctx.fillRect(x + 7, y - 2, 2, 1);
        const up = Math.floor(f.phase) & 1;
        ctx.fillStyle = dark;
        ctx.fillRect(x - 5, up ? y - 6 : y + 3, 7, 4);
        ctx.fillStyle = '#fbfbf4';
        ctx.fillRect(x - 4, up ? y - 5 : y + 3, 5, 3);
      }
    }

    // ===== 據點標記：會上下跳動的像素圖示＋名稱牌（含避讓）＋通關星星 =====
    _getMarkerIcon(loc) {
      this._markerIcons = this._markerIcons || {};
      const key = loc.atlasIcon || loc.id;
      if (this._markerIcons[key]) return this._markerIcons[key];
      const src = this.createAtlasIcon(loc.atlasIcon || 'gate', true);
      const c = document.createElement('canvas');
      c.width = 18;
      c.height = 18;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      const sctx = src.getContext('2d');
      const sd = sctx.getImageData(0, 0, 16, 16).data;
      const solid = (x, y) => x >= 0 && y >= 0 && x < 16 && y < 16 && sd[(y * 16 + x) * 4 + 3] > 20;
      ctx.fillStyle = '#18122a';
      for (let y = -1; y <= 16; y++) {
        for (let x = -1; x <= 16; x++) {
          if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) ctx.fillRect(x + 1, y + 1, 1, 1);
        }
      }
      ctx.drawImage(src, 1, 1);
      this._markerIcons[key] = c;
      return c;
    }

    _drawStar(ctx, cx, cy, size) {
      const rows = ['..X..', '.XXX.', 'XXXXX', '.XXX.', 'X...X'];
      const px = size / 5;
      for (let r = 0; r < 5; r++) {
        for (let k = 0; k < 5; k++) {
          if (rows[r][k] !== 'X') continue;
          ctx.fillStyle = '#18122a';
          ctx.fillRect(cx - size / 2 + k * px - px * 0.35, cy - size / 2 + r * px - px * 0.35, px * 1.7, px * 1.7);
        }
      }
      for (let r = 0; r < 5; r++) {
        for (let k = 0; k < 5; k++) {
          if (rows[r][k] !== 'X') continue;
          ctx.fillStyle = r < 2 ? '#fff2a0' : '#ffd23c';
          ctx.fillRect(cx - size / 2 + k * px, cy - size / 2 + r * px, px + 0.2, px + 0.2);
        }
      }
    }

    drawLocationMarkers(ctx, invScale) {
      const t = this.animTime;
      const pulse = Math.sin(t * 4) * 2;
      const landmarkIds = ['beiyuan_gate', 'baoan_temple', 'zhenbei_temple'];
      const target = this.moveTarget;
      const items = LOCATIONS.map((loc, i) => {
        const done = loc.rewards.length > 0 && loc.rewards.every((r) => this.isRewardUnlocked(r));
        const isNear = this.nearbyLoc?.id === loc.id;
        const isTarget = !!target && target.x === loc.x && target.y === loc.y;
        const landmark = landmarkIds.includes(loc.id);
        const size = (landmark ? 20 : 16) * invScale;
        const gap = 3 * invScale;
        return {
          loc,
          i,
          done,
          isNear,
          landmark,
          focus: isNear || isTarget,
          size,
          bounce: Math.abs(Math.sin(t * 3 + i * 0.9)) * 3 * invScale * (isNear ? 1.6 : 1),
          // 以不含跳動的位置計算版面，避免名稱牌跟著抖動
          rect: { x: loc.x - size / 2 - invScale, y: loc.y - gap - size - invScale, w: size + 2 * invScale, h: size + 2 * invScale + gap },
        };
      });

      // 先畫圖示（y 小的先畫，下方的壓在上方的前面）
      for (const it of items.slice().sort((a, c) => a.loc.y - c.loc.y)) {
        const { loc, size, bounce } = it;
        ctx.fillStyle = 'rgba(18,14,28,0.4)';
        ctx.fillRect(loc.x - 5 * invScale, loc.y - 1.5 * invScale, 10 * invScale, 3 * invScale);
        ctx.fillStyle = loc.color;
        ctx.fillRect(loc.x - 4 * invScale, loc.y - 1 * invScale, 8 * invScale, 2 * invScale);
        if (it.focus) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2 * invScale;
          ctx.beginPath();
          ctx.ellipse(loc.x, loc.y, (9 + pulse * 0.4) * invScale, (4.5 + pulse * 0.2) * invScale, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        const icon = this._getMarkerIcon(loc);
        const full = size + 2 * invScale;
        ctx.drawImage(icon, loc.x - full / 2, loc.y - 3 * invScale - full - bounce + invScale, full, full);
        if (it.done) {
          this._drawStar(ctx, loc.x + size / 2 + 1 * invScale, loc.y - 3 * invScale - size - bounce, 7 * invScale);
        }
      }

      // 再畫名稱牌：縮小時只顯示附近／選取／地標，放大後才顯示全部；重疊就換位置或略過
      const fontPx = Math.max(7, Math.round(9 * invScale));
      ctx.font = `bold ${fontPx}px sans-serif`;
      const showAll = this.cam.zoom >= 1.7;
      const placed = items.map((it) => it.rect).concat(this.roadLabelRects || []);
      const overlaps = (r) => placed.some((p) => r.x < p.x + p.w && r.x + r.w > p.x && r.y < p.y + p.h && r.y + r.h > p.y);
      const rank = (it) => (it.focus ? 0 : it.landmark ? 1 : 2);
      const order = items.slice().sort((a, c) => rank(a) - rank(c) || a.i - c.i);
      for (const it of order) {
        if (!(it.focus || it.landmark || showAll)) continue;
        const { loc } = it;
        const label = it.done ? `★ ${loc.name}` : loc.name;
        const w = ctx.measureText(label).width + 6 * invScale;
        const h = fontPx + 4 * invScale;
        const pad = 2 * invScale;
        const r = it.rect;
        const candidates = [
          { x: loc.x - w / 2, y: r.y - h - pad },
          { x: loc.x - w / 2, y: loc.y + 3 * invScale },
          { x: r.x + r.w + pad, y: r.y + (r.h - h) / 2 },
          { x: r.x - w - pad, y: r.y + (r.h - h) / 2 },
          // 四個基本位置都被擋住時（例如旁邊有路牌），再往更上方、更下方找
          { x: loc.x - w / 2, y: r.y - 2 * h - 2 * pad },
          { x: loc.x - w / 2, y: loc.y + 3 * invScale + h + pad },
        ].map((c) => ({ x: c.x, y: c.y, w, h }));
        let pick = candidates.find((c) => !overlaps(c));
        if (!pick) {
          if (!it.focus) continue;
          pick = candidates[0];
        }
        placed.push(pick);
        ctx.fillStyle = 'rgba(24,18,42,0.92)';
        ctx.fillRect(pick.x, pick.y, w, h);
        ctx.fillStyle = it.done ? '#4ce0c0' : loc.color;
        ctx.fillRect(pick.x, pick.y, w, invScale);
        ctx.fillRect(pick.x, pick.y + h - invScale, w, invScale);
        ctx.fillStyle = it.focus ? '#ffffff' : it.done ? '#9cf0dc' : '#ffe8b4';
        ctx.fillText(label, pick.x + 3 * invScale, pick.y + h - 3.2 * invScale);
      }
    }

    screenToWorld(sx, sy) {
      return {
        x: this.cam.x + (sx - MAP_W / 2) / this.cam.zoom,
        y: this.cam.y + (sy - MAP_H / 2) / this.cam.zoom,
      };
    }

    clampCamera() {
      const halfW = (MAP_W / 2) / this.cam.zoom;
      const halfH = (MAP_H / 2) / this.cam.zoom;
      if (halfW >= MAP_W / 2) {
        this.cam.x = MAP_W / 2;
      } else {
        this.cam.x = Math.max(halfW, Math.min(MAP_W - halfW, this.cam.x));
      }
      if (halfH >= MAP_H / 2) {
        this.cam.y = MAP_H / 2;
      } else {
        this.cam.y = Math.max(halfH, Math.min(MAP_H - halfH, this.cam.y));
      }
    }

    zoomAt(nextZoom, sx, sy) {
      const clamped = Math.max(this.cam.minZoom, Math.min(this.cam.maxZoom, nextZoom));
      const worldBefore = this.screenToWorld(sx, sy);
      this.cam.zoom = clamped;
      this.cam.x = worldBefore.x - (sx - MAP_W / 2) / this.cam.zoom;
      this.cam.y = worldBefore.y - (sy - MAP_H / 2) / this.cam.zoom;
      this.cam.followPlayer = false;
      this.clampCamera();
    }

    renderMap() {
      const ctx = this.ctx;
      if (!ctx) return;

      if (this.cam.followPlayer && this.cam.zoom > 1) {
        this.cam.x += (this.player.x - this.cam.x) * 0.14;
        this.cam.y += (this.player.y - this.cam.y) * 0.14;
        this.clampCamera();
      }

      ctx.clearRect(0, 0, MAP_W, MAP_H);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(MAP_W / 2, MAP_H / 2);
      ctx.scale(this.cam.zoom, this.cam.zoom);
      ctx.translate(-this.cam.x, -this.cam.y);

      // 地面兩幀（稻浪、水流）每 0.5 秒切換，其上疊道路／建築／樹木的預繪層
      const frame = this.groundFrames ? this.groundFrames[Math.floor(this.animTime / 0.5) & 1] : null;
      if (frame) {
        ctx.drawImage(frame, 0, 0);
      } else {
        ctx.fillStyle = '#5d9244';
        ctx.fillRect(0, 0, MAP_W, MAP_H);
      }
      if (this.baseMapCanvas) ctx.drawImage(this.baseMapCanvas, 0, 0);

      const invScale = 1 / Math.sqrt(this.cam.zoom);
      const pulse = Math.sin(this.animTime * 4) * 2;

      // 9. 裝飾小生物與社區據點標記
      this.drawAmbient(ctx);
      this.drawLocationMarkers(ctx, invScale);

      // 10. 點擊移動目標點
      if (this.moveTarget) {
        ctx.strokeStyle = '#4ce0c0';
        ctx.lineWidth = 1.5 * invScale;
        ctx.beginPath();
        ctx.arc(this.moveTarget.x, this.moveTarget.y, (5 + pulse * 0.5) * invScale, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 11. 主角像素小人
      const px = Math.round(this.player.x);
      const py = Math.round(this.player.y);
      const bob = Math.sin(this.player.walkTimer) * 1.5;
      // 影子
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(px - 5, py + 4, 10, 4);
      // 身體（藍衣小學生/倖存者）
      ctx.fillStyle = '#47a3ff';
      ctx.fillRect(px - 4, py - 4 + bob, 8, 8);
      // 頭
      ctx.fillStyle = '#ffd5a8';
      ctx.fillRect(px - 4, py - 10 + bob, 8, 6);
      // 黃色小學生帽
      ctx.fillStyle = '#ffe45e';
      ctx.fillRect(px - 5, py - 12 + bob, 10, 3);
      // 眼睛
      ctx.fillStyle = '#18122a';
      if (this.player.dir === 'left') {
        ctx.fillRect(px - 3, py - 8 + bob, 2, 2);
      } else if (this.player.dir === 'right') {
        ctx.fillRect(px + 1, py - 8 + bob, 2, 2);
      } else {
        ctx.fillRect(px - 2, py - 8 + bob, 1.5, 2);
        ctx.fillRect(px + 1, py - 8 + bob, 1.5, 2);
      }

      ctx.restore();
    }
  }

  CommunityExplore.LOCATIONS = LOCATIONS;
  PGS.CommunityExplore = CommunityExplore;
})(window);
