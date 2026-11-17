(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const MAP_W = 480;
  const MAP_H = 350;

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
          if (!this.els.mgModal.classList.contains('hidden')) {
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

    renderHeaderStats() {
      const free = this.game.save.freeExplores || 0;
      const gold = this.game.save.gold || 0;
      const unlockedW = this.game.save.unlockedWeapons.length;
      const unlockedR = this.game.save.unlockedRunes.length;
      const totalUnlock = (unlockedW - 4) + (unlockedR - 2);

      this.els.ticketBadge.textContent = `免費探索券：${free} 次`;
      this.els.goldBadge.textContent = `金幣：${gold}（加碼 ${this.game.getExploreCost()} 金幣/次）`;
      this.els.progressBadge.textContent = `社區解鎖進度：${Math.max(0, totalUnlock)} / 18`;
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
      this.els.locMeta.textContent = `${closest.address} ｜ 遇見：${closest.npc}`;
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
          this.activeMiniGameCleanup = this.runMathGame(this.els.mgStage, onWin);
          break;
        case 'bobe':
          this.activeMiniGameCleanup = this.runBobeGame(this.els.mgStage, onWin);
          break;
        case 'drum':
          this.activeMiniGameCleanup = this.runDrumGame(this.els.mgStage, onWin);
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

      const nextLocked = this.getNextLockedReward(loc);
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
            <p>${loc.npc} 感謝你的幫忙，記得回算式工坊把新拿到的戰利品裝上去喔！</p>
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
            <p>${loc.npc} 笑著向你道謝，並把這個好寶貝交到你手上！現在可以回主選單或工坊裝備囉。</p>
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
            <p>這個據點的裝備都已經解鎖完畢，${loc.npc} 特別準備了點心金幣與算式牌給你！</p>
            <button id="mg-done-btn" class="primary-btn" type="button">收下謝禮！回到社區</button>
          </div>
        `;
      }

      this.els.mgStage.innerHTML = msgHtml;
      document.getElementById('mg-done-btn').addEventListener('click', () => {
        this.closeMiniGame();
        this.renderHeaderStats();
        this.renderQuickList();
        this.updateNearbyLocation(true);
      });
    }

    // =========================================================
    // 7 個台灣國小社區日常小遊戲
    // =========================================================

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
    runMathGame(container, onWin) {
      let solved = 0;

      const makeQuestion = () => {
        const a = 12 + Math.floor(Math.random() * 35);
        const b = 8 + Math.floor(Math.random() * 30);
        const paid = a + b <= 50 ? 50 : 100;
        const ans = paid - (a + b);
        const opts = new Set([ans]);
        while (opts.size < 4) {
          const wrong = Math.max(1, ans + (Math.floor(Math.random() * 11) - 5));
          opts.add(wrong);
        }
        return {
          text: `鄰居買了 ${a} 元螺絲與 ${b} 元膠帶，付了 ${paid} 元，請問要找多少元？`,
          ans,
          choices: [...opts].sort(() => Math.random() - 0.5),
        };
      };

      const renderQ = () => {
        const q = makeQuestion();
        container.innerHTML = `
          <div class="mg-box">
            <div class="mg-status">五金行櫃檯進度：${solved} / 3 題</div>
            <p class="mg-question">${q.text}</p>
            <div id="ma-opts" class="ma-opts"></div>
            <p id="ma-msg" class="mg-sub">點選正確的找零金額</p>
          </div>
        `;
        const optsEl = container.querySelector('#ma-opts');
        const msgEl = container.querySelector('#ma-msg');

        for (const c of q.choices) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'secondary-btn';
          btn.textContent = `${c} 元`;
          btn.addEventListener('click', () => {
            if (c === q.ans) {
              this.game.audio.playGem();
              solved += 1;
              if (solved >= 3) {
                onWin();
              } else {
                renderQ();
              }
            } else {
              msgEl.textContent = `算錯囉！提示：先算 ${q.text.match(/\d+/g)[0]} + ${q.text.match(/\d+/g)[1]} 再相減！`;
            }
          });
          optsEl.appendChild(btn);
        }
      };

      renderQ();
      return () => {};
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

    buildBaseMap() {
      const off = document.createElement('canvas');
      off.width = MAP_W;
      off.height = MAP_H;
      const ctx = off.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // 1. 嘉義北社尾聚落底色（綠地＋像素草點紋理）
      ctx.fillStyle = '#3b6842';
      ctx.fillRect(0, 0, MAP_W, MAP_H);
      ctx.fillStyle = '#44764a';
      for (let py = 2; py < MAP_H; py += 6) {
        for (let px = (py % 12 === 2 ? 2 : 5); px < MAP_W; px += 8) {
          ctx.fillRect(px, py, 2, 2);
        }
      }

      const mapData = PGS.BeisheweiMapData;
      if (!mapData) return off;

      // 2. 真實 OSM 綠地／公園／農田／運動場
      const areaColors = {
        park: '#4f9154',
        school: '#5b8f5a',
        farm: '#5a8042',
        pitch: '#c47255',
        green: '#477c4c',
      };
      for (const a of mapData.areas || []) {
        if (!a.p || a.p.length < 3) continue;
        ctx.fillStyle = areaColors[a.k] || '#477c4c';
        ctx.beginPath();
        ctx.moveTo(a.p[0][0], a.p[0][1]);
        for (let i = 1; i < a.p.length; i++) ctx.lineTo(a.p[i][0], a.p[i][1]);
        ctx.closePath();
        ctx.fill();
      }

      // 3. 真實水圳／水道（像素藍）
      for (const w of mapData.waterways || []) {
        for (let i = 0; i < w.length - 1; i++) {
          this._pxLine(ctx, w[i][0], w[i][1], w[i + 1][0], w[i + 1][1], 5, '#2b5888');
          this._pxLine(ctx, w[i][0], w[i][1], w[i + 1][0], w[i + 1][1], 3, '#4da6e8');
        }
      }

      // 4. 真實 OSM 街道（先畫路緣深色，再畫柏油路面，最後主幹道畫黃線）
      const roadOrder = ['service', 'path', 'residential', 'tertiary', 'secondary', 'primary'];
      const roadStyles = {
        primary: { curb: 11, fill: 7, color: '#5d637a', center: '#e8bf54' },
        secondary: { curb: 9, fill: 6, color: '#575d72', center: '#e8bf54' },
        tertiary: { curb: 8, fill: 5, color: '#555b70', center: null },
        residential: { curb: 6, fill: 4, color: '#4e5468', center: null },
        service: { curb: 4, fill: 2, color: '#474d60', center: null },
        path: { curb: 4, fill: 2, color: '#8a7b64', center: null },
      };

      for (const kind of roadOrder) {
        const st = roadStyles[kind];
        for (const r of mapData.roads || []) {
          if (r.k !== kind) continue;
          for (let i = 0; i < r.p.length - 1; i++) {
            this._pxLine(ctx, r.p[i][0], r.p[i][1], r.p[i + 1][0], r.p[i + 1][1], st.curb, '#2a2d3d');
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
          if (st.center) {
            for (let i = 0; i < r.p.length - 1; i++) {
              this._pxLine(ctx, r.p[i][0], r.p[i][1], r.p[i + 1][0], r.p[i + 1][1], 1, st.center);
            }
          }
        }
      }

      // 5. 真實 OSM 建築輪廓（2.5D 像素逐層疊高）
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

      for (const item of sortedBuildings) {
        const { b, seed } = item;
        const height = b.k === 'temple' ? 11 : b.k === 'school' ? 9 : 5 + (seed % 4);
        const wallColor = b.k === 'temple' ? '#9e3328' : b.k === 'school' ? '#9e8468' : '#7a6558';
        const windowColor = b.k === 'temple' ? '#c94c3d' : '#a8c2d8';
        const roofColor = b.k === 'temple' ? '#e88b2e' : b.k === 'school' ? '#c9624a' : (seed % 2 === 0 ? '#c49a76' : '#a8846c');
        const roofEdge = b.k === 'temple' ? '#ffe066' : '#5c463a';

        // 地面斜長影子
        fillPoly(b.p, Math.round(height * 0.45), Math.round(height * 0.35), 'rgba(18,14,28,0.42)');

        // 逐層向上疊出牆面高度
        for (let z = 1; z < height; z++) {
          const isWinBand = z === 3 || z === 6;
          fillPoly(b.p, 0, -z, isWinBand ? windowColor : wallColor);
        }

        // 頂層屋頂
        fillPoly(b.p, 0, -height, roofColor);
        ctx.strokeStyle = roofEdge;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b.p[0][0], b.p[0][1] - height);
        for (let i = 1; i < b.p.length; i++) ctx.lineTo(b.p[i][0], b.p[i][1] - height);
        ctx.closePath();
        ctx.stroke();

        // 廟宇加疊第二層飛簷屋脊
        if (b.k === 'temple') {
          let cx = 0, cy = 0;
          for (const pt of b.p) { cx += pt[0]; cy += pt[1]; }
          cx /= b.p.length; cy /= b.p.length;
          const inner = b.p.map((pt) => [Math.round(cx + (pt[0] - cx) * 0.58), Math.round(cy + (pt[1] - cy) * 0.58)]);
          for (let z = height + 1; z <= height + 3; z++) {
            fillPoly(inner, 0, -z, '#b83c2e');
          }
          fillPoly(inner, 0, -(height + 4), '#f2b749');
        }
      }

      // 5.5 公園與綠地 2.5D 像素行道樹
      const drawTree = (tx, ty) => {
        ctx.fillStyle = 'rgba(18,14,28,0.35)';
        ctx.fillRect(tx - 2, ty + 1, 7, 3);
        ctx.fillStyle = '#5a3b28';
        ctx.fillRect(tx - 1, ty - 3, 2, 5);
        ctx.fillStyle = '#245832';
        ctx.fillRect(tx - 4, ty - 7, 8, 5);
        ctx.fillStyle = '#388547';
        ctx.fillRect(tx - 3, ty - 10, 6, 4);
        ctx.fillStyle = '#59b562';
        ctx.fillRect(tx - 2, ty - 11, 4, 2);
      };
      for (const a of mapData.areas || []) {
        if (a.k !== 'park' && a.k !== 'school') continue;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const pt of a.p) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] < minY) minY = pt[1];
          if (pt[1] > maxY) maxY = pt[1];
        }
        for (let ty = minY + 10; ty < maxY - 6; ty += 16) {
          for (let tx = minX + 10; tx < maxX - 6; tx += 18) {
            if (((tx + ty) % 3) === 0) drawTree(tx, ty);
          }
        }
      }

      // 6. 真實 OSM 路名標籤
      ctx.font = 'bold 9px sans-serif';
      for (const lb of mapData.roadLabels || []) {
        const tw = ctx.measureText(lb.n).width;
        ctx.fillStyle = 'rgba(24,18,42,0.78)';
        ctx.fillRect(lb.x - tw / 2 - 2, lb.y - 6, tw + 4, 11);
        ctx.fillStyle = '#ffe8b4';
        ctx.fillText(lb.n, lb.x - tw / 2, lb.y + 3);
      }

      return off;
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

      if (this.baseMapCanvas) {
        ctx.drawImage(this.baseMapCanvas, 0, 0);
      } else {
        ctx.fillStyle = '#3b6842';
        ctx.fillRect(0, 0, MAP_W, MAP_H);
      }

      const invScale = 1 / Math.sqrt(this.cam.zoom);

      // 9. 畫 7 個據點標記與狀態燈
      const pulse = Math.sin(this.animTime * 4) * 2;
      for (const loc of LOCATIONS) {
        const done = loc.rewards.length > 0 && loc.rewards.every((r) => this.isRewardUnlocked(r));
        const isNear = this.nearbyLoc?.id === loc.id;

        ctx.fillStyle = isNear ? '#ffffff' : loc.color;
        ctx.beginPath();
        ctx.arc(loc.x, loc.y, (isNear ? 8 + pulse * 0.4 : 6) * invScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#18122a';
        ctx.beginPath();
        ctx.arc(loc.x, loc.y, 3.5 * invScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `bold ${Math.max(5, Math.round(9 * invScale))}px sans-serif`;
        const label = done ? `✓ ${loc.name}` : loc.name;
        const tw = ctx.measureText(label).width;
        const boxH = 11 * invScale;
        ctx.fillStyle = 'rgba(24,18,42,0.82)';
        ctx.fillRect(loc.x - tw / 2 - 3 * invScale, loc.y - 20 * invScale, tw + 6 * invScale, boxH);
        ctx.fillStyle = done ? '#4ce0c0' : '#ffe8b4';
        ctx.fillText(label, loc.x - tw / 2, loc.y - 11.5 * invScale);
      }

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

  PGS.CommunityExplore = CommunityExplore;
})(window);
