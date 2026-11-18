(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  function writeSaveForUI(game) {
    try {
      global.localStorage.setItem('pgs_save_v1', JSON.stringify(game.save));
    } catch (_) {}
  }

  // 主選單標題：先畫在 240x44 的小畫布，再由 CSS 以 pixelated 放大，保持像素邊緣
  function drawRiceEar(ctx, x, y, flip) {
    const px = (dx, dy, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(flip ? x - dx - w + 1 : x + dx, y + dy, w, h);
    };
    px(5, 14, 2, 26, '#6ea044');
    for (let k = 0; k < 6; k++) {
      px(2, 4 + k * 2, 3, 2, k % 2 ? '#ffe49a' : '#ffd058');
      px(7, 5 + k * 2, 3, 2, k % 2 ? '#ffd058' : '#ffe49a');
    }
    px(5, 0, 2, 4, '#fff2c6');
    for (let i = 0; i < 5; i++) px(7 + i * 2, 30 - i * 2, 3, 2, '#8fc25a');
  }

  function drawMenuLogo(canvas) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 夜空底與田埂線
    ctx.fillStyle = '#18122a';
    ctx.fillRect(0, 0, 240, 44);
    for (let x = 0; x < 240; x += 6) {
      const h = 3 + ((x * 7) % 5);
      ctx.fillStyle = x % 12 ? '#2c4a30' : '#3c6a3a';
      ctx.fillRect(x, 44 - h, 4, h);
    }
    ctx.fillStyle = '#ffd058';
    ctx.fillRect(0, 0, 240, 2);
    ctx.fillRect(0, 42, 240, 2);
    drawRiceEar(ctx, 6, 2, false);
    drawRiceEar(ctx, 233, 2, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px "Microsoft JhengHei","Noto Sans TC",sans-serif';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0e0a1a';
    ctx.strokeText('數學倖存者・稻香北園', 120, 19, 188);
    const grad = ctx.createLinearGradient(0, 9, 0, 29);
    grad.addColorStop(0, '#fff2c6');
    grad.addColorStop(0.55, '#ffd058');
    grad.addColorStop(1, '#f0902c');
    ctx.fillStyle = grad;
    ctx.fillText('數學倖存者・稻香北園', 120, 19, 188);
    ctx.font = 'bold 8px monospace';
    ctx.lineWidth = 3;
    ctx.strokeText('MATH  SURVIVOR  SHOOTER', 120, 35);
    ctx.fillStyle = '#4ce0c0';
    ctx.fillText('MATH  SURVIVOR  SHOOTER', 120, 35);
  }

  class GameUI {
    constructor(iconDataUrls, runeDataUrls, gearDataUrls) {
      this.iconDataUrls = iconDataUrls;
      this.runeDataUrls = runeDataUrls || {};
      this.gearDataUrls = gearDataUrls || {};
      this.onPickChoice = null;
      this.selectedSlotId = 'weapon';
      this.selectedStatKey = 'atk';
      this.workshopTab = 'gear'; // gear | weapon | rune
      this.selectedWeaponId = 'revolver';
      this.selectedRuneId = 'fire';
      this.sellCardMode = false;

      this.els = {
        hud: document.getElementById('hud'),
        hpFill: document.getElementById('hp-fill'),
        hpGhost: document.getElementById('hp-ghost'),
        xpGhost: document.getElementById('xp-ghost'),
        menuLogo: document.getElementById('menu-logo'),
        hpText: document.getElementById('hp-text'),
        xpFill: document.getElementById('xp-fill'),
        levelText: document.getElementById('level-text'),
        timeText: document.getElementById('time-text'),
        killsText: document.getElementById('kills-text'),
        goldText: document.getElementById('gold-text'),
        weaponBar: document.getElementById('weapon-bar'),
        pauseBtn: document.getElementById('pause-btn'),
        muteBtn: document.getElementById('mute-btn'),
        mathQuizBanner: document.getElementById('math-quiz-banner'),
        mathQuizHeading: document.getElementById('math-quiz-heading'),
        mathQuizTime: document.getElementById('math-quiz-time'),
        mathQuizPrompt: document.getElementById('math-quiz-prompt'),
        mathQuizFeedback: document.getElementById('math-quiz-feedback'),
        mathBuffHud: document.getElementById('math-buff-hud'),
        mathBuffTime: document.getElementById('math-buff-time'),
        mathComboHud: document.getElementById('math-combo-hud'),
        mathComboCount: document.getElementById('math-combo-count'),
        mathComboBonus: document.getElementById('math-combo-bonus'),
        bossHud: document.getElementById('boss-hud'),
        bossName: document.getElementById('boss-name'),
        bossShieldStatus: document.getElementById('boss-shield-status'),
        bossHpFill: document.getElementById('boss-hp-fill'),
        bossWarningBanner: document.getElementById('boss-warning-banner'),
        bossWarningName: document.getElementById('boss-warning-name'),
        bossWarningTime: document.getElementById('boss-warning-time'),
        mathHarvestHud: document.getElementById('math-harvest-hud'),
        mathHarvestRule: document.getElementById('math-harvest-rule'),
        mathHarvestCount: document.getElementById('math-harvest-count'),
        mathToast: document.getElementById('math-toast'),
        mathActionOverlay: document.getElementById('math-action-overlay'),
        mathActionTitle: document.getElementById('math-action-title'),
        mathActionPrompt: document.getElementById('math-action-prompt'),
        mathActionMessage: document.getElementById('math-action-message'),
        mathChoiceList: document.getElementById('math-choice-list'),

        menuOverlay: document.getElementById('menu-overlay'),
        stageGrid: document.getElementById('stage-grid'),
        catTabs: document.getElementById('cat-tabs'),
        starterGrid: document.getElementById('starter-grid'),
        starterRuneBar: document.getElementById('starter-rune-bar'),
        metaGold: document.getElementById('meta-gold'),
        metaBest: document.getElementById('meta-best'),
        upgradeList: document.getElementById('upgrade-list'),
        mathBandSetting: document.getElementById('math-band-setting'),
        mathFrequencySetting: document.getElementById('math-frequency-setting'),
        mathPauseSetting: document.getElementById('math-pause-setting'),
        damageNumbersSetting: document.getElementById('damage-numbers-setting'),
        mathGrowthPanel: document.getElementById('math-growth-panel'),
        openExploreBtn: document.getElementById('open-explore-btn'),
        communityTitle: document.getElementById('community-title'),
        openGearBtn: document.getElementById('open-gear-btn'),
        startBtn: document.getElementById('start-btn'),

        gearOverlay: document.getElementById('gear-overlay'),
        wsTabs: document.getElementById('ws-tabs'),
        wsLeftTitle: document.getElementById('ws-left-title'),
        gearTotals: document.getElementById('gear-totals'),
        gearSlots: document.getElementById('gear-slots'),
        gearEditor: document.getElementById('gear-editor'),
        gearBag: document.getElementById('gear-bag'),
        cardBag: document.getElementById('card-bag'),
        cardBagTitle: document.getElementById('card-bag-title'),
        cardSellToggleBtn: document.getElementById('card-sell-toggle-btn'),
        closeGearBtn: document.getElementById('close-gear-btn'),

        levelupOverlay: document.getElementById('levelup-overlay'),
        choiceList: document.getElementById('choice-list'),

        runeOverlay: document.getElementById('rune-overlay'),
        runePickHeader: document.getElementById('rune-pick-header'),
        runeWeaponList: document.getElementById('rune-weapon-list'),
        runeSkipBtn: document.getElementById('rune-skip-btn'),

        gameoverOverlay: document.getElementById('gameover-overlay'),
        goStats: document.getElementById('go-stats'),
        goExploreBtn: document.getElementById('go-explore-btn'),
        retryBtn: document.getElementById('retry-btn'),
        backMenuBtn: document.getElementById('back-menu-btn'),
        stageClearOverlay: document.getElementById('stage-clear-overlay'),
        stageClearStats: document.getElementById('stage-clear-stats'),
        continueEndlessBtn: document.getElementById('continue-endless-btn'),
        stageClearMenuBtn: document.getElementById('stage-clear-menu-btn'),

        pauseOverlay: document.getElementById('pause-overlay'),
        pauseStats: document.getElementById('pause-stats'),
        pauseWeapons: document.getElementById('pause-weapons'),
        resumeBtn: document.getElementById('resume-btn'),
        pauseHomeBtn: document.getElementById('pause-home-btn'),

        joyZone: document.getElementById('joy-zone'),
        joyKnob: document.getElementById('joy-knob'),
      };
    }

    bindGame(game) {
      this.game = game;
      drawMenuLogo(this.els.menuLogo);

      if (this.els.mathBandSetting) {
        this.els.mathBandSetting.addEventListener('change', () => {
          const settings = game.save.mathSettings;
          settings.band = this.els.mathBandSetting.value;
          if (!settings.pauseTouched) settings.pauseOnAnswer = settings.band === 'low';
          writeSaveForUI(game);
          this.renderMathSettings(game);
        });
      }
      if (this.els.mathFrequencySetting) {
        this.els.mathFrequencySetting.addEventListener('change', () => {
          game.save.mathSettings.frequency = this.els.mathFrequencySetting.value;
          writeSaveForUI(game);
          this.renderMathSettings(game);
        });
      }
      if (this.els.mathPauseSetting) {
        this.els.mathPauseSetting.addEventListener('change', () => {
          game.save.mathSettings.pauseOnAnswer = this.els.mathPauseSetting.checked;
          game.save.mathSettings.pauseTouched = true;
          writeSaveForUI(game);
          this.renderMathSettings(game);
        });
      }

      if (this.els.damageNumbersSetting) {
        this.els.damageNumbersSetting.addEventListener('change', () => {
          game.showDamageNumbers = this.els.damageNumbersSetting.checked;
          game.save.showDamageNumbers = game.showDamageNumbers;
          writeSaveForUI(game);
        });
      }

      this.els.muteBtn.addEventListener('click', () => {
        const muted = game.audio.toggleMute();
        this.els.muteBtn.textContent = muted ? '音效: 關' : '音效: 開';
      });

      if (this.els.pauseBtn) {
        this.els.pauseBtn.addEventListener('click', () => game.togglePause());
      }
      if (this.els.resumeBtn) {
        this.els.resumeBtn.addEventListener('click', () => game.resumeFromPause());
      }
      if (this.els.pauseHomeBtn) {
        this.els.pauseHomeBtn.addEventListener('click', () => game.abortToMenu());
      }
      if (this.els.cardSellToggleBtn) {
        this.els.cardSellToggleBtn.addEventListener('click', () => {
          this.sellCardMode = !this.sellCardMode;
          this.renderGearWorkshop(game);
        });
      }

      this.els.startBtn.addEventListener('click', () => {
        this.els.menuOverlay.classList.add('hidden');
        this.els.hud.classList.remove('hidden');
        game.startRun(game.selectedStarter);
      });

      this.els.retryBtn.addEventListener('click', () => {
        this.els.gameoverOverlay.classList.add('hidden');
        game.startRun(game.selectedStarter);
      });

      this.els.backMenuBtn.addEventListener('click', () => {
        this.els.gameoverOverlay.classList.add('hidden');
        this.els.hud.classList.add('hidden');
        this.els.menuOverlay.classList.remove('hidden');
        game.stateName = 'menu';
        this.renderMenu(game);
      });

      if (this.els.continueEndlessBtn) {
        this.els.continueEndlessBtn.addEventListener('click', () => game.continueEndless());
      }
      if (this.els.stageClearMenuBtn) {
        this.els.stageClearMenuBtn.addEventListener('click', () => game.returnToMenuFromStageClear());
      }

      if (PGS.CommunityExplore) {
        this.explore = new PGS.CommunityExplore(game, this);
      }

      if (this.els.openExploreBtn) {
        this.els.openExploreBtn.addEventListener('click', () => {
          if (this.explore) this.explore.open();
        });
      }

      if (this.els.goExploreBtn) {
        this.els.goExploreBtn.addEventListener('click', () => {
          this.els.gameoverOverlay.classList.add('hidden');
          this.els.hud.classList.add('hidden');
          this.els.menuOverlay.classList.remove('hidden');
          game.stateName = 'menu';
          this.renderMenu(game);
          if (this.explore) this.explore.open();
        });
      }

      this.els.openGearBtn.addEventListener('click', () => {
        this.els.menuOverlay.classList.add('hidden');
        this.els.gearOverlay.classList.remove('hidden');
        game.stateName = 'gear';
        this.renderGearWorkshop(game);
      });

      this.els.closeGearBtn.addEventListener('click', () => {
        this.els.gearOverlay.classList.add('hidden');
        this.els.menuOverlay.classList.remove('hidden');
        game.stateName = 'menu';
        this.renderMenu(game);
      });

      this._bindJoystick(game);
      this.renderMenu(game);
    }

    _bindJoystick(game) {
      const zone = this.els.joyZone;
      const knob = this.els.joyKnob;
      let activeId = null;

      const updateStick = (clientX, clientY) => {
        const rect = zone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = rect.width * 0.42;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const d = Math.hypot(dx, dy);
        if (d > maxR) {
          dx = (dx / d) * maxR;
          dy = (dy / d) * maxR;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        game.joyVec.x = dx / maxR;
        game.joyVec.z = dy / maxR;
      };

      const resetStick = () => {
        activeId = null;
        knob.style.transform = 'translate(0px, 0px)';
        game.joyVec.x = 0;
        game.joyVec.z = 0;
      };

      zone.addEventListener('pointerdown', (e) => {
        activeId = e.pointerId;
        zone.setPointerCapture(activeId);
        updateStick(e.clientX, e.clientY);
      });
      zone.addEventListener('pointermove', (e) => {
        if (e.pointerId === activeId) updateStick(e.clientX, e.clientY);
      });
      zone.addEventListener('pointerup', (e) => {
        if (e.pointerId === activeId) resetStick();
      });
      zone.addEventListener('pointercancel', resetStick);
    }

    renderMenu(game) {
      this.els.metaGold.textContent = `金幣：${game.save.gold}`;
      this.els.metaBest.textContent = `最佳生存：${formatTime(game.save.bestTime)} ｜ 最高擊殺：${game.save.bestKills}`;
      if (this.els.openExploreBtn) {
        const free = game.save.freeExplores || 0;
        const unlockedCount = (game.save.unlockedWeapons.length - 4) + (game.save.unlockedRunes.length - 2);
        const totalUnlocks = (PGS.Weapons.ALL_IDS.length - 4) + (PGS.Runes.ALL_IDS.length - 2);
        this.els.openExploreBtn.textContent = `嘉義北社尾社區探索（已解鎖 ${Math.max(0, unlockedCount)}/${totalUnlocks} ｜ 免費券 ${free} 次）`;
      }
      if (this.els.communityTitle) {
        const title = game.save.communityAtlas?.title || '';
        this.els.communityTitle.textContent = title ? `社區圖鑑稱號：${title}` : '社區圖鑑稱號：尚未取得';
      }

      // 關卡選擇
      this.els.stageGrid.innerHTML = '';
      for (const st of PGS.Gear.STAGES) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `starter-card${game.selectedStageId === st.id ? ' selected' : ''}`;
        card.innerHTML = `
          <div class="starter-name">${st.name}</div>
          ${game.save.stageClears?.includes(st.id) ? '<div class="stage-clear-badge">★ 已通關</div>' : ''}
          <div class="starter-desc">${st.desc}</div>
        `;
        card.addEventListener('click', () => {
          game.selectedStageId = st.id;
          this.renderMenu(game);
        });
        this.els.stageGrid.appendChild(card);
      }

      // 分類篩選頁籤
      if (!this.activeCategory) this.activeCategory = '全部';
      this.els.catTabs.innerHTML = '';
      for (const cat of PGS.Weapons.CATEGORIES) {
        const count =
          cat === '全部'
            ? PGS.Weapons.ALL_IDS.length
            : PGS.Weapons.ALL_IDS.filter((id) => PGS.Weapons.DEFS[id].category === cat).length;
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = `cat-tab${this.activeCategory === cat ? ' active' : ''}`;
        tab.textContent = `${cat} (${count})`;
        tab.addEventListener('click', () => {
          this.activeCategory = cat;
          this.renderMenu(game);
        });
        this.els.catTabs.appendChild(tab);
      }

      // 初始武器選擇卡（未解鎖者禁止選取）
      this.els.starterGrid.innerHTML = '';
      for (const id of PGS.Weapons.ALL_IDS) {
        const def = PGS.Weapons.DEFS[id];
        if (this.activeCategory !== '全部' && def.category !== this.activeCategory) continue;
        const unlocked = game.isWeaponUnlocked(id);
        const card = document.createElement('button');
        card.type = 'button';
        card.disabled = !unlocked;
        card.className = `starter-card${game.selectedStarter === id && unlocked ? ' selected' : ''}`;
        if (!unlocked) card.style.opacity = '0.48';
        card.innerHTML = `
          <div class="starter-head">
            <img src="${this.iconDataUrls[id]}" alt="${def.name}" class="pixel-icon" />
            <div>
              <div class="starter-name">${def.name}${unlocked ? '' : ' 🔒'}</div>
            <div class="starter-tag">${unlocked ? def.tag : `未解鎖｜${def.unlockHint || '社區探索新據點'}`}</div>
            </div>
          </div>
          <div class="starter-desc">${def.desc}</div>
        `;
        if (unlocked) {
          card.addEventListener('click', () => {
            game.selectedStarter = id;
            this.renderMenu(game);
          });
        }
        this.els.starterGrid.appendChild(card);
      }

      // 起始符文選擇（未解鎖者禁止選取）
      this.els.starterRuneBar.innerHTML = '';
      const noneBtn = document.createElement('button');
      noneBtn.type = 'button';
      noneBtn.className = `rune-btn${!game.selectedStarterRune ? ' selected' : ''}`;
      noneBtn.textContent = '無起始符文';
      noneBtn.addEventListener('click', () => {
        game.selectedStarterRune = null;
        this.renderMenu(game);
      });
      this.els.starterRuneBar.appendChild(noneBtn);

      for (const rId of PGS.Runes.ALL_IDS) {
        const rDef = PGS.Runes.DEFS[rId];
        const unlocked = game.isRuneUnlocked(rId);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.disabled = !unlocked;
        btn.className = `rune-btn${game.selectedStarterRune === rId && unlocked ? ' selected' : ''}`;
        if (!unlocked) btn.style.opacity = '0.48';
        btn.title = unlocked ? rDef.desc : `${rDef.desc}（未解鎖：${rDef.unlockHint || '社區探索解鎖'}）`;
        btn.innerHTML = `
          <img src="${this.runeDataUrls[rId]}" alt="${rDef.name}" class="rune-mini-icon" />
          <span>${rDef.short}｜${rDef.name.replace('之符文', '').replace('符文', '')}${unlocked ? '' : ' 🔒'}</span>
        `;
        if (unlocked) {
          btn.addEventListener('click', () => {
            game.selectedStarterRune = rId;
            this.renderMenu(game);
          });
        }
        this.els.starterRuneBar.appendChild(btn);
      }

      // 局外強化商店
      const metaDefs = [
        { key: 'might', label: '火力改造', desc: '全武器傷害 +10%/級' },
        { key: 'vitality', label: '裝甲強化', desc: '最大生命 +20/級' },
        { key: 'haste', label: '戰術推進', desc: '移動速度 +8%/級' },
      ];
      this.els.upgradeList.innerHTML = '';
      for (const m of metaDefs) {
        const lv = game.save.upgrades[m.key] || 0;
        const cost = 30 + lv * 25;
        const maxed = lv >= 5;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'upgrade-btn';
        btn.disabled = maxed || game.save.gold < cost;
        btn.innerHTML = `
          <span><strong>${m.label}</strong> Lv.${lv}/5（${m.desc}）</span>
          <span class="cost">${maxed ? '已滿級' : `${cost} 金幣`}</span>
        `;
        btn.addEventListener('click', () => {
          if (game.buyMetaUpgrade(m.key)) this.renderMenu(game);
        });
        this.els.upgradeList.appendChild(btn);
      }
      this.renderMathSettings(game);
    }

    renderMathSettings(game) {
      const settings = game.save.mathSettings;
      if (this.els.mathBandSetting) this.els.mathBandSetting.value = settings.band;
      if (this.els.mathFrequencySetting) this.els.mathFrequencySetting.value = settings.frequency;
      if (this.els.mathPauseSetting) this.els.mathPauseSetting.checked = settings.pauseOnAnswer;
      if (this.els.damageNumbersSetting) this.els.damageNumbersSetting.checked = game.showDamageNumbers !== false;
      this.updateMathGrowth(game);
    }

    updateMathGrowth(game) {
      const target = this.els.mathGrowthPanel;
      if (!target || !game.save.mathStats) return;
      const stats = game.save.mathStats;
      const topics = Object.entries(stats.byTopic || {})
        .filter(([, row]) => row && Number(row.attempts) > 0)
        .sort((a, b) => {
          const aRate = Number(a[1].firstTryCorrect || 0) / Math.max(1, Number(a[1].questions || 0));
          const bRate = Number(b[1].firstTryCorrect || 0) / Math.max(1, Number(b[1].questions || 0));
          return aRate - bRate || Number(b[1].attempts) - Number(a[1].attempts);
        });
      if (!topics.length) {
        target.innerHTML = '完成戰鬥題目後，這裡會記下各題型的作答次數。<p>最近可以再練習：完成戰鬥題目後顯示</p>';
        return;
      }
      const labels = topics.slice(0, 4).map(([id]) => PGS.MathQuest.TOPIC_LABELS[id] || id);
      target.innerHTML = `
        <div>累計題數：${Number(stats.questions) || 0}；第一次答對：${Number(stats.firstTryCorrect) || 0}</div>
        <ul>${topics.map(([id, row]) => `<li>${PGS.MathQuest.TOPIC_LABELS[id] || id}：作答 ${Number(row.attempts) || 0} 次</li>`).join('')}</ul>
        <p>最近可以再練習：${labels[0]}</p>
      `;
    }

    renderGearWorkshop(game) {
      // 工坊分頁標籤（裝備槽位 / 武器強化 / 符文強化）
      if (this.els.wsTabs) {
        this.els.wsTabs.innerHTML = '';
        const tabs = [
          { key: 'gear', label: '裝備槽位' },
          { key: 'weapon', label: '武器強化' },
          { key: 'rune', label: '符文強化' },
        ];
        for (const t of tabs) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `cat-tab${this.workshopTab === t.key ? ' active' : ''}`;
          btn.textContent = t.label;
          btn.addEventListener('click', () => {
            this.workshopTab = t.key;
            this.renderGearWorkshop(game);
          });
          this.els.wsTabs.appendChild(btn);
        }
      }

      if (this.workshopTab !== 'gear') {
        this._renderCollectionWorkshop(game);
        return;
      }
      this.els.gearSlots.style.display = '';
      if (this.els.wsLeftTitle) this.els.wsLeftTitle.textContent = '裝備倉庫（點擊穿戴至上方選中槽位）';

      const totals = PGS.Gear.computeTotalStats(game.save);
      const fmt = (v, unit = '') => `${v >= 0 ? '+' : ''}${v}${unit}`;
      const tierBadge = (gear) => {
        const t = PGS.Gear.TIERS[gear?.tier || 'basic'] || PGS.Gear.TIERS.basic;
        return `<span style="color:${t.color};font-weight:700">[${t.label}]</span>`;
      };
      this.els.gearTotals.innerHTML = `
        <span>生命 ${fmt(totals.hp)}</span>
        <span>攻擊 ${fmt(totals.atk)}</span>
        <span>爆擊 ${fmt(totals.crit, '%')}</span>
        <span>防禦 ${fmt(totals.def)}</span>
        <span>減傷 ${fmt(totals.dr, '%')}</span>
        <span>攻速 ${fmt(totals.aspd, '%')}</span>
        <span>跑速 ${fmt(totals.mspd, '%')}</span>
      `;

      const byUid = new Map(game.save.gearBag.map((g) => [g.uid, g]));

      // 6 個裝備槽位
      this.els.gearSlots.innerHTML = '';
      for (const slot of PGS.Gear.SLOTS) {
        const uid = game.save.equipped[slot.id];
        const gear = uid ? byUid.get(uid) : null;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `gear-slot-btn${this.selectedSlotId === slot.id ? ' selected' : ''}`;
        btn.innerHTML = `
          <img src="${this.gearDataUrls[slot.type]}" alt="${slot.label}" class="pixel-icon-sm" />
          <strong>${slot.label}</strong>
          <span>${gear ? `${tierBadge(gear)} ${gear.name}` : '未裝備'}</span>
        `;
        btn.addEventListener('click', () => {
          this.selectedSlotId = slot.id;
          const typeDef = PGS.Gear.TYPES[slot.type];
          this.selectedStatKey = typeDef.stats[0].key;
          this.renderGearWorkshop(game);
        });
        this.els.gearSlots.appendChild(btn);
      }

      // 選中槽位的算式編輯器
      const curSlot = PGS.Gear.SLOTS.find((s) => s.id === this.selectedSlotId) || PGS.Gear.SLOTS[0];
      const curUid = game.save.equipped[curSlot.id];
      const curGear = curUid ? byUid.get(curUid) : null;
      const typeDef = PGS.Gear.TYPES[curSlot.type];
      if (!typeDef.stats.some((s) => s.key === this.selectedStatKey)) {
        this.selectedStatKey = typeDef.stats[0].key;
      }

      this.els.gearEditor.innerHTML = '';
      if (!curGear) {
        this.els.gearEditor.innerHTML = `<div class="choice-desc">「${curSlot.label}」目前空著，請從下方裝備倉庫點選穿戴。</div>`;
      } else {
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.innerHTML = `<strong>${curSlot.label}：${tierBadge(curGear)} ${curGear.name}</strong>`;
        const unequipBtn = document.createElement('button');
        unequipBtn.type = 'button';
        unequipBtn.className = 'cat-tab';
        unequipBtn.textContent = '卸下';
        unequipBtn.addEventListener('click', () => {
          game.unequipSlot(curSlot.id);
          this.renderGearWorkshop(game);
        });
        header.appendChild(unequipBtn);
        this.els.gearEditor.appendChild(header);

        for (const st of typeDef.stats) {
          const cards = curGear.statCards[st.key] || [];
          const baseVal = (curGear.baseStats && curGear.baseStats[st.key]) || 0;
          const evalRes = PGS.Gear.evalCardFormula(cards);
          const totalStatVal = baseVal + (evalRes.valid ? evalRes.value : 0);
          const row = document.createElement('div');
          row.className = `stat-formula-row${this.selectedStatKey === st.key ? ' selected' : ''}`;
          row.addEventListener('click', () => {
            this.selectedStatKey = st.key;
            this.renderGearWorkshop(game);
          });

          const left = document.createElement('div');
          left.className = 'formula-cards';
          const labelSpan = document.createElement('span');
          labelSpan.style.minWidth = '110px';
          const hint = st.lowerIsBetter ? '<br><small style="color:#9aa4b2">(越負減傷越多)</small>' : '';
          labelSpan.innerHTML = `<strong>${st.label}</strong> <small style="color:#ffd058">基礎${fmt(baseVal, st.unit)}</small>${hint}`;
          left.appendChild(labelSpan);

          for (let idx = 0; idx < PGS.Gear.MAX_CARDS_PER_STAT; idx++) {
            const c = cards[idx];
            if (c) {
              const cardBtn = document.createElement('button');
              cardBtn.type = 'button';
              cardBtn.className = `math-card ${c.kind}`;
              cardBtn.textContent = c.val;
              cardBtn.title = '點擊拆回牌庫';
              cardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedStatKey = st.key;
                game.removeCardFromStat(curGear.uid, st.key, idx);
                this.renderGearWorkshop(game);
              });
              left.appendChild(cardBtn);
            } else {
              const empty = document.createElement('span');
              empty.className = 'math-slot-empty';
              empty.textContent = '+';
              left.appendChild(empty);
            }
          }

          const right = document.createElement('div');
          const isGood = st.lowerIsBetter ? totalStatVal <= 0 : totalStatVal >= 0;
          right.innerHTML = evalRes.valid
            ? `= <strong style="color:${isGood ? '#4ce0c0' : '#ff6e6e'}">${fmt(totalStatVal, st.unit)}</strong>`
            : `<span style="color:#ffd058;font-size:12px">(${evalRes.reason})</span>`;

          row.appendChild(left);
          row.appendChild(right);
          this.els.gearEditor.appendChild(row);
        }
      }

      // 裝備倉庫（僅顯示符合當前槽位類型的裝備）
      this.els.gearBag.innerHTML = '';
      const compatible = game.save.gearBag.filter((g) => g.type === curSlot.type);
      if (!compatible.length) {
        this.els.gearBag.innerHTML = '<span class="choice-desc">尚無此類裝備，打怪會隨機掉落！</span>';
      } else {
        for (const g of compatible) {
          const equippedIn = PGS.Gear.SLOTS.find((s) => game.save.equipped[s.id] === g.uid);
          const baseDesc = typeDef.stats
            .map((s) => `${s.label}${fmt((g.baseStats && g.baseStats[s.key]) || 0, s.unit)}`)
            .join(' ');
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'bag-item-btn';
          btn.title = `初始數值：${baseDesc}`;
          btn.innerHTML = `
            <img src="${this.gearDataUrls[g.type]}" alt="" class="rune-mini-icon" />
            <span>${tierBadge(g)} ${g.name} <small style="color:#9aa4b2">(${baseDesc})</small>${equippedIn ? ` [${equippedIn.label}]` : ''}</span>
          `;
          btn.addEventListener('click', () => {
            game.equipGear(curSlot.id, g.uid);
            this.renderGearWorkshop(game);
          });
          this.els.gearBag.appendChild(btn);
        }
      }

      // 數字／運算牌庫
      this._renderCardBag(game, !!curGear, (c) => {
        if (!curGear) return;
        game.insertCardToStat(curGear.uid, this.selectedStatKey, c.uid);
        this.renderGearWorkshop(game);
      });
    }

    _renderCardBag(game, hasTarget, onInsert) {
      if (this.els.cardSellToggleBtn) {
        this.els.cardSellToggleBtn.textContent = this.sellCardMode ? '販賣模式：開（+5金幣）' : '販賣模式：關';
        this.els.cardSellToggleBtn.className = `cat-tab${this.sellCardMode ? ' active' : ''}`;
      }
      if (this.els.cardBagTitle) {
        this.els.cardBagTitle.textContent = this.sellCardMode
          ? `數字／運算牌庫（點擊賣出 +5 金幣｜目前 ${game.save.gold} 金幣）`
          : '數字／運算牌庫（點擊放入選中算式）';
      }
      this.els.cardBag.innerHTML = '';
      if (!game.save.cards.length) {
        this.els.cardBag.innerHTML = '<span class="choice-desc">牌庫空了，進關卡打怪就會掉落數字與運算牌！</span>';
        return;
      }
      for (const c of game.save.cards) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `math-card ${c.kind}`;
        btn.textContent = c.val;
        if (this.sellCardMode) {
          btn.style.outline = '2px solid #ffd058';
          btn.title = '點擊販賣獲得 +5 金幣';
          btn.addEventListener('click', () => {
            game.sellCard(c.uid);
            this.renderGearWorkshop(game);
          });
        } else {
          btn.disabled = !hasTarget;
          btn.addEventListener('click', () => onInsert(c));
        }
        this.els.cardBag.appendChild(btn);
      }
    }

    _renderCollectionWorkshop(game) {
      const isWeapon = this.workshopTab === 'weapon';
      this.els.gearSlots.style.display = 'none';
      this.els.gearTotals.innerHTML = isWeapon
        ? '<span>選擇已解鎖武器，裝入數字與運算牌強化其核心機制數值</span>'
        : '<span>選擇已解鎖符文，裝入數字與運算牌強化其觸發數值</span>';
      if (this.els.wsLeftTitle) {
        this.els.wsLeftTitle.textContent = isWeapon ? '已解鎖武器（點擊編輯算式）' : '已解鎖符文（點擊編輯算式）';
      }

      const fmt = (v, unit = '') => `${v}${unit}`;
      let targetId = isWeapon ? this.selectedWeaponId : this.selectedRuneId;
      if (isWeapon && !game.isWeaponUnlocked(targetId)) {
        targetId = game.save.unlockedWeapons[0];
        this.selectedWeaponId = targetId;
      } else if (!isWeapon && !game.isRuneUnlocked(targetId)) {
        targetId = game.save.unlockedRunes[0];
        this.selectedRuneId = targetId;
      }

      const def = isWeapon ? PGS.Weapons.DEFS[targetId] : PGS.Runes.DEFS[targetId];
      const slotDefs = def ? (isWeapon ? PGS.Weapons.getCardStats(def) : def.cardStats || []) : [];
      if (!slotDefs.some((s) => s.key === this.selectedStatKey) && slotDefs.length) {
        this.selectedStatKey = slotDefs[0].key;
      }
      const cardMap = (isWeapon ? game.save.weaponCards[targetId] : game.save.runeCards[targetId]) || {};

      this.els.gearEditor.innerHTML = '';
      if (!def) {
        this.els.gearEditor.innerHTML = '<div class="choice-desc">尚無已解鎖項目</div>';
      } else {
        const header = document.createElement('div');
        header.innerHTML = `<strong>${def.name}</strong> <small style="color:#9aa4b2">${def.desc}</small>`;
        this.els.gearEditor.appendChild(header);

        for (const st of slotDefs) {
          const cards = cardMap[st.key] || [];
          const evalRes = PGS.Gear.evalCardFormula(cards);
          let finalVal = st.base + (evalRes.valid ? evalRes.value : 0);
          if (st.min != null) finalVal = Math.max(st.min, finalVal);
          if (st.max != null) finalVal = Math.min(st.max, finalVal);
          if (st.round) finalVal = Math.round(finalVal);
          else finalVal = Math.round(finalVal * 10) / 10;

          const row = document.createElement('div');
          row.className = `stat-formula-row${this.selectedStatKey === st.key ? ' selected' : ''}`;
          row.addEventListener('click', () => {
            this.selectedStatKey = st.key;
            this.renderGearWorkshop(game);
          });

          const left = document.createElement('div');
          left.className = 'formula-cards';
          const labelSpan = document.createElement('span');
          labelSpan.style.minWidth = '118px';
          labelSpan.innerHTML = `<strong>${st.label}</strong> <small style="color:#ffd058">基礎${fmt(st.base, st.unit)}</small>`;
          left.appendChild(labelSpan);

          for (let idx = 0; idx < PGS.Gear.MAX_CARDS_PER_STAT; idx++) {
            const c = cards[idx];
            if (c) {
              const cardBtn = document.createElement('button');
              cardBtn.type = 'button';
              cardBtn.className = `math-card ${c.kind}`;
              cardBtn.textContent = c.val;
              cardBtn.title = '點擊拆回牌庫';
              cardBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectedStatKey = st.key;
                game.removeCardFromCollection(this.workshopTab, targetId, st.key, idx);
                this.renderGearWorkshop(game);
              });
              left.appendChild(cardBtn);
            } else {
              const empty = document.createElement('span');
              empty.className = 'math-slot-empty';
              empty.textContent = '+';
              left.appendChild(empty);
            }
          }

          const right = document.createElement('div');
          right.innerHTML = evalRes.valid
            ? `= <strong style="color:${finalVal >= st.base ? '#4ce0c0' : '#ff6e6e'}">${fmt(finalVal, st.unit)}</strong>`
            : `<span style="color:#ffd058;font-size:12px">(${evalRes.reason})</span>`;

          row.appendChild(left);
          row.appendChild(right);
          this.els.gearEditor.appendChild(row);
        }
      }

      // 左欄清單：已解鎖武器或符文
      this.els.gearBag.innerHTML = '';
      const ids = isWeapon ? PGS.Weapons.ALL_IDS : PGS.Runes.ALL_IDS;
      for (const id of ids) {
        const unlocked = isWeapon ? game.isWeaponUnlocked(id) : game.isRuneUnlocked(id);
        if (!unlocked) continue;
        const item = isWeapon ? PGS.Weapons.DEFS[id] : PGS.Runes.DEFS[id];
        const iconUrl = isWeapon ? this.iconDataUrls[id] : this.runeDataUrls[id];
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bag-item-btn';
        if (id === targetId) btn.style.borderColor = '#4ce0c0';
        btn.innerHTML = `
          <img src="${iconUrl}" alt="" class="rune-mini-icon" />
          <span>${item.name}</span>
        `;
        btn.addEventListener('click', () => {
          if (isWeapon) this.selectedWeaponId = id;
          else this.selectedRuneId = id;
          this.selectedStatKey = '';
          this.renderGearWorkshop(game);
        });
        this.els.gearBag.appendChild(btn);
      }

      // 數字／運算牌庫
      this._renderCardBag(game, !!def, (c) => {
        if (!def) return;
        game.insertCardToCollection(this.workshopTab, targetId, this.selectedStatKey, c.uid);
        this.renderGearWorkshop(game);
      });
    }

    syncAll(game) {
      this.updateHud(game);
    }

    updateHud(game) {
      const p = game.player;
      const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
      const xpPct = Math.max(0, Math.min(100, (p.xp / p.nextXp) * 100));

      this.els.hpFill.style.width = `${hpPct}%`;
      this.els.hpGhost.style.width = `${hpPct}%`;
      this.els.hpText.textContent = `HP ${Math.ceil(p.hp)} / ${p.maxHp}`;
      this.els.xpFill.style.width = `${xpPct}%`;
      this.els.xpGhost.style.width = `${xpPct}%`;
      this.els.levelText.textContent = `LV ${p.level}`;
      this.els.timeText.textContent = formatTime(game.elapsed);
      this.els.killsText.textContent = `擊殺 ${game.kills}`;
      this.els.goldText.textContent = `金幣 +${game.runGold}`;

      if (this.els.mathComboHud) {
        this.els.mathComboHud.classList.toggle('hidden', game.stateName === 'menu' || game.stateName === 'gameover');
        if (this.els.mathComboCount) this.els.mathComboCount.textContent = String(game.mathCombo || 0);
        if (this.els.mathComboBonus) this.els.mathComboBonus.textContent = `｜本局加成 +${Math.round((game.comboDamageBonus || 0) * 100)}%`;
      }
      this.updateBossHud(game);

      // 答題獎勵「加速」：顯示剩餘秒數（沒有加速時隱藏）
      const buffSeconds = game.mathBuffTimer > 0 ? Math.ceil(game.mathBuffTimer) : 0;
      if (buffSeconds !== this._buffSeconds) {
        this._buffSeconds = buffSeconds;
        if (this.els.mathBuffHud) {
          this.els.mathBuffHud.classList.toggle('hidden', buffSeconds <= 0);
          if (buffSeconds > 0) this.els.mathBuffTime.textContent = String(buffSeconds);
        }
      }

      // 戰鬥中極簡武器圖示列（只顯示槍枝圖案＋符文小標籤）。
      // 先組好字串，內容真的改變才寫入 DOM：每幀重寫會讓共鳴標籤的 title 提示永遠出不來，也浪費效能。
      const weaponBarHtml = game.weapons
        .map((w) => {
          const def = w.def;
          const primeInfo = w.id === 'prime_rifle'
            ? `<div class="w-sub">序 ${w.shotCount || 0}｜下個質數 ${PGS.Weapons.nextPrimeAfter(w.shotCount || 0)}</div>`
            : w.id === 'solar_laser'
              ? `<div class="w-sub">蓄能 ${Math.min(3, Math.floor(w.solarCharge || 0))}/3</div>`
              : '';
          const runeHtml = (w.runes || [])
            .map((rId) => {
              const rDef = PGS.Runes.DEFS[rId];
              return `<span class="rune-pill" style="background:${rDef.cssColor}">${rDef.short}</span>`;
            })
            .join('');
          const resonanceHtml = (game.getWeaponResonances ? game.getWeaponResonances(w) : [])
            .map((resonance) => `<div class="resonance-pill" title="${resonance.name}：${resonance.desc}">${resonance.name}</div>`)
            .join('');
          return `
            <div class="w-slot" title="${def.name} Lv.${w.level}">
              <img src="${this.iconDataUrls[w.id]}" alt="${def.name}" class="pixel-icon-sm" />
              ${runeHtml ? `<div class="w-runes">${runeHtml}</div>` : ''}
              ${primeInfo}
              ${resonanceHtml}
            </div>
          `;
        })
        .join('');
      if (weaponBarHtml !== this._weaponBarHtml) {
        this._weaponBarHtml = weaponBarHtml;
        this.els.weaponBar.innerHTML = weaponBarHtml;
      }
    }

    showLevelUp(choices, onPick) {
      this.onPickChoice = (idx) => {
        if (choices[idx]) onPick(choices[idx]);
      };
      this.els.choiceList.innerHTML = '';
      choices.forEach((c, idx) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'choice-card';
        const iconHtml = c.iconId
          ? `<img src="${this.iconDataUrls[c.iconId]}" alt="" class="pixel-icon" />`
          : c.runeId
            ? `<img src="${this.runeDataUrls[c.runeId]}" alt="" class="pixel-icon" />`
            : `<div class="passive-badge">+</div>`;
        card.innerHTML = `
          <div class="choice-key">[${idx + 1}]</div>
          ${iconHtml}
          <div class="choice-body">
            <div class="choice-tag">${c.tag}</div>
            <div class="choice-title">${c.title}</div>
            <div class="choice-desc">${c.desc}</div>
          </div>
        `;
        card.addEventListener('click', () => this.onPickChoice(idx));
        this.els.choiceList.appendChild(card);
      });
      this.els.levelupOverlay.classList.remove('hidden');
    }

    pickChoice(idx) {
      if (this.onPickChoice) this.onPickChoice(idx);
    }

    hideLevelUp() {
      this.onPickChoice = null;
      this.els.levelupOverlay.classList.add('hidden');
    }

    showRunePick(runeId, weapons, onSelectWeapon, onSkip) {
      const rDef = PGS.Runes.DEFS[runeId];
      this.els.runePickHeader.innerHTML = `
        <img src="${this.runeDataUrls[runeId]}" alt="${rDef.name}" class="pixel-icon" />
        <div>
          <h2 style="margin:0">拾獲【${rDef.name}】</h2>
          <div class="choice-desc">${rDef.desc}</div>
        </div>
      `;

      this.els.runeWeaponList.innerHTML = '';
      weapons.forEach((w) => {
        const hasRune = w.runes.includes(runeId);
        const isFull = w.runes.length >= PGS.Runes.MAX_PER_WEAPON;
        const disabled = hasRune || isFull;

        const runeBadges = w.runes
          .map((id) => {
            const rd = PGS.Runes.DEFS[id];
            return `<span class="rune-pill" style="background:${rd.cssColor}">${rd.short}</span>`;
          })
          .join('');
        const currentResonances = this.game && this.game.getWeaponResonances ? this.game.getWeaponResonances(w) : [];
        const previewResonances = PGS.Runes.getResonances([...w.runes, runeId])
          .filter((resonance) => !currentResonances.some((current) => current.id === resonance.id));
        const resonanceNotes = [...currentResonances, ...previewResonances]
          .map((resonance, index) => `
            <div class="resonance-note">
              <strong>${index < currentResonances.length ? '已啟動' : '鑲嵌後觸發'}：${resonance.name}</strong>
              <span>${resonance.desc}</span>
            </div>
          `)
          .join('');

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'choice-card';
        card.disabled = disabled;
        card.innerHTML = `
          <img src="${this.iconDataUrls[w.id]}" alt="${w.def.name}" class="pixel-icon" />
          <div class="choice-body">
            <div class="choice-title">${w.def.name} Lv.${w.level} (${w.runes.length}/3)</div>
            <div class="w-runes">${runeBadges || '<span class="choice-desc">尚未鑲嵌符文</span>'}</div>
            ${resonanceNotes}
            ${hasRune ? '<div class="choice-tag">已鑲嵌此符文</div>' : isFull ? '<div class="choice-tag">符文槽已滿 (3/3)</div>' : ''}
          </div>
        `;
        if (!disabled) {
          card.addEventListener('click', () => onSelectWeapon(w));
        }
        this.els.runeWeaponList.appendChild(card);
      });

      this.els.runeSkipBtn.onclick = () => onSkip();
      this.els.runeOverlay.classList.remove('hidden');
    }

    hideRunePick() {
      this.els.runeOverlay.classList.add('hidden');
    }

    renderMathChoices(question, onSelect, disabledIndex = -1) {
      const list = this.els.mathChoiceList;
      list.innerHTML = '';
      question.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'math-answer-option';
        button.disabled = index === disabledIndex;
        button.innerHTML = `<span class="math-choice-key">${index + 1}.</span><span></span>`;
        button.querySelector('span:last-child').textContent = choice;
        button.addEventListener('click', () => onSelect(index));
        list.appendChild(button);
      });
    }

    showMathQuestion(question, paused, timeLeft, kind = 'normal') {
      if (this.els.mathQuizHeading) this.els.mathQuizHeading.textContent = kind === 'boss' ? '頭目算式閘門' : '算式閘門';
      this.els.mathQuizPrompt.textContent = question.prompt;
      this.els.mathQuizFeedback.textContent = '';
      this.els.mathQuizBanner.classList.remove('hidden');
      this.updateMathTimer(timeLeft);
      if (paused) {
        this.els.mathActionTitle.textContent = kind === 'boss' ? '頭目算式閘門：選一個答案' : '算式閘門：選一個答案';
        this.els.mathActionPrompt.textContent = question.prompt;
        this.els.mathActionMessage.textContent = '按 1–4、手把方向鍵，或點擊選答案。';
        this.renderMathChoices(question, (index) => this.game.answerMathChoice(index));
        this.els.mathActionOverlay.classList.remove('hidden');
      } else {
        this.hideMathAction();
      }
    }

    showMathHint(hint, paused, disabledIndex) {
      this.els.mathQuizFeedback.textContent = hint;
      if (paused) {
        this.els.mathActionMessage.textContent = hint;
        const buttons = this.els.mathChoiceList.querySelectorAll('.math-answer-option');
        if (buttons[disabledIndex]) buttons[disabledIndex].disabled = true;
      }
    }

    showMathExplanation(question, paused, reason) {
      const answer = question.choices[question.answerIndex];
      const lead = reason === 'time' ? '時間到了。' : '再試一次後，來看看解法。';
      const message = `${lead}正確答案是「${answer}」。${question.explanation}`;
      this.els.mathQuizFeedback.textContent = message;
      this.els.mathQuizTime.textContent = '解說 3 秒';
      if (paused) {
        this.els.mathActionTitle.textContent = '看解說，再繼續';
        this.els.mathActionPrompt.textContent = question.prompt;
        this.els.mathActionMessage.textContent = message;
        this.els.mathChoiceList.innerHTML = '';
        this.els.mathActionOverlay.classList.remove('hidden');
      }
    }

    showMathReward(question) {
      this.els.mathQuizPrompt.textContent = question.prompt;
      this.els.mathQuizFeedback.textContent = `答對了！${question.explanation}`;
      this.els.mathActionTitle.textContent = '答對了！選一份獎勵';
      this.els.mathActionPrompt.textContent = question.prompt;
      this.els.mathActionMessage.textContent = `正確答案：${question.choices[question.answerIndex]}。${question.explanation}`;
      this.els.mathChoiceList.innerHTML = '';
      const rewards = [
        ['恢復生命', '回復最大生命值的 30%'],
        ['收下金幣', '本局金幣 +10'],
        ['加速 20 秒', '攻速與移動速度提升 20%'],
      ];
      rewards.forEach(([title, description], index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'math-answer-option';
        button.innerHTML = `<span class="math-choice-key">${index + 1}.</span><strong></strong><br><small></small>`;
        button.querySelector('strong').textContent = title;
        button.querySelector('small').textContent = description;
        button.addEventListener('click', () => this.game.chooseMathReward(index));
        this.els.mathChoiceList.appendChild(button);
      });
      this.els.mathActionOverlay.classList.remove('hidden');
    }

    showBossWarning(name, seconds) {
      if (!this.els.bossWarningBanner) return;
      this.els.bossWarningName.textContent = `${name} 即將出現`;
      this.updateBossWarning(seconds);
      this.els.bossWarningBanner.classList.remove('hidden');
    }

    updateBossWarning(seconds) {
      if (this.els.bossWarningTime) this.els.bossWarningTime.textContent = String(Math.max(1, Math.ceil(seconds)));
    }

    hideBossWarning() {
      this.els.bossWarningBanner?.classList.add('hidden');
    }

    updateBossHud(game) {
      const boss = game.bossEnemy;
      if (!this.els.bossHud) return;
      const visible = Boolean(game.bossEncounterActive && boss && boss.hp > 0);
      this.els.bossHud.classList.toggle('hidden', !visible);
      if (!visible) return;
      this.els.bossName.textContent = boss.bossName || game.boss?.name || '關卡頭目';
      const hpPct = Math.max(0, Math.min(100, (boss.hp / Math.max(1, boss.maxHp)) * 100));
      this.els.bossHpFill.style.width = `${hpPct}%`;
      this.els.bossShieldStatus.textContent = boss.shielded
        ? '算式護盾：啟動'
        : `護盾破裂：${Math.ceil(boss.shieldTimer || 0)} 秒`;
    }

    updateMathTimer(seconds) {
      this.els.mathQuizTime.textContent = `剩餘 ${Math.ceil(seconds)} 秒`;
    }

    hideMathAction() {
      this.els.mathActionOverlay.classList.add('hidden');
      this.els.mathChoiceList.innerHTML = '';
    }

    hideMathBanner() {
      this.els.mathQuizBanner.classList.add('hidden');
      if (this.els.mathQuizHeading) this.els.mathQuizHeading.textContent = '算式閘門';
      this.els.mathQuizFeedback.textContent = '';
      this.els.mathQuizTime.textContent = '';
    }

    showHarvestTask(task) {
      this.els.mathHarvestRule.textContent = `${task.rule.label}｜限時 25 秒`;
      this.updateHarvestTask(task);
      this.els.mathHarvestHud.classList.remove('hidden');
    }

    updateHarvestTask(task) {
      if (!task || !task.rule) return;
      this.els.mathHarvestRule.textContent = `${task.rule.label}｜剩 ${Math.ceil(task.timer)} 秒`;
      this.els.mathHarvestCount.textContent = `${task.collected} / 5`;
    }

    hideHarvestTask() {
      this.els.mathHarvestHud.classList.add('hidden');
    }

    showMathToast(message) {
      if (!this.els.mathToast) return;
      global.clearTimeout(this.mathToastTimer);
      this.els.mathToast.textContent = message;
      this.els.mathToast.classList.remove('hidden');
      this.mathToastTimer = global.setTimeout(() => this.els.mathToast.classList.add('hidden'), 2600);
    }

    renderMathRunSummary(game) {
      const topics = Object.values(game.mathRun.topics || {});
      const topicRows = topics.map((topic) => `<li>${topic.label}：作答 ${topic.attempts} 次、第一次答對 ${topic.firstTryCorrect} 題</li>`).join('');
      const mistakes = game.mathRun.mistakes || [];
      const mistakeRows = mistakes.map((item) => `<li><strong>${item.prompt}</strong><br>正確答案：${item.answer}<br>${item.explanation}</li>`).join('');
      return `<section class="math-run-summary"><h3>本局數學紀錄</h3>
        <div>題數：${game.mathRun.questions}；第一次答對：${game.mathRun.firstTryCorrect}</div>
        <div>最高連擊：${Number(game.mathRun.highestCombo) || 0}</div>
        ${topicRows ? `<ul>${topicRows}</ul>` : '<div>本局還沒有完成數學題目。</div>'}
        ${mistakeRows ? `<h4>可以再練習</h4><ul>${mistakeRows}</ul>` : '<div>本局沒有錯題紀錄。</div>'}
      </section>`;
    }

    showGameOver(game) {
      this.els.goStats.innerHTML = `
        <div>生存時間：<strong>${formatTime(game.elapsed)}</strong></div>
        <div>總擊殺數：<strong>${game.kills}</strong></div>
        <div>到達等級：<strong>LV ${game.player.level}</strong></div>
        <div>本局獲得金幣：<strong>+${game.runGold}</strong>（總計 ${game.save.gold}）</div>
        <div>社區探索券：<strong>+1 次</strong>（目前共 ${game.save.freeExplores || 0} 次）</div>
      `;
      this.els.goStats.innerHTML += this.renderMathRunSummary(game);
      if (this.els.goExploreBtn) {
        this.els.goExploreBtn.textContent = `前往北社尾社區探索（免費 ${game.save.freeExplores || 0} 次）`;
      }
      this.els.gameoverOverlay.classList.remove('hidden');
    }

    showStageClear(game, reward) {
      const cardText = reward.card.kind === 'num' ? `數字牌 ${reward.card.val}` : `運算牌 ${reward.card.val}`;
      this.els.stageClearStats.innerHTML = `
        <div>關卡：<strong>${game.getStage().name}</strong></div>
        <div>頭目：<strong>${game.boss?.name || '關卡頭目'}</strong></div>
        <div>本局獲得金幣：<strong>+${game.runGold}</strong>（總計 ${game.save.gold}）</div>
        <div>通關獎勵：金幣 +${reward.bonusGold}、${cardText}</div>
        <div>總擊殺數：<strong>${game.kills}</strong>；到達等級：<strong>LV ${game.player.level}</strong></div>
      `;
      this.els.stageClearStats.innerHTML += this.renderMathRunSummary(game);
      this.els.stageClearOverlay.classList.remove('hidden');
    }

    hideStageClear() {
      this.els.stageClearOverlay?.classList.add('hidden');
    }

    showPause(game) {
      const stage = game.getStage();
      const p = game.player;
      const critPct = Math.round(p.critChance || 0);
      const dmgRedPct = Math.round(p.dr || 0);
      const flatAtk = p.flatAtk || 0;
      const envTags = [];
      if (p.inSwamp) envTags.push('沼澤減速');
      if (p.inPoison) envTags.push('毒霧中毒');
      if (p.inIce || p.chillTimer > 0) envTags.push('緩攻');
      if (p.paralyzeTimer > 0) envTags.push('麻痺');
      if (p.stunTimer > 0) envTags.push('暈眩');
      if (p.bleedTimer > 0) envTags.push('出血');
      if (p.burnTimer > 0) envTags.push('燃燒');
      const terrainNames = (stage.terrains || [])
        .map((k) => PGS.Gear.TERRAINS?.[k]?.label || k)
        .join('、');
      const activeResonances = game.getActiveResonances ? game.getActiveResonances() : [];
      const resonanceMarkup = activeResonances.length
        ? activeResonances.map((resonance) => `<div class="resonance-note"><strong>${resonance.name}</strong><span>${resonance.desc}</span></div>`).join('')
        : '尚未啟動';
      this.els.pauseStats.innerHTML = `
        <div>關卡：<strong>${stage.name}</strong></div>
        <div>地形環境：<strong>${terrainNames || '無'}</strong></div>
        <div>生存時間：<strong>${formatTime(game.elapsed)}</strong></div>
        <div>等級 / 擊殺：<strong>LV ${p.level} / ${game.kills} 隻</strong></div>
        <div>本局金幣：<strong>+${game.runGold}</strong></div>
        <div>生命：<strong>${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}</strong></div>
        <div>攻擊加成：<strong>${flatAtk >= 0 ? '+' : ''}${flatAtk}（×${p.globalDamageMult.toFixed(2)}）</strong></div>
        <div>攻速 / 暴擊：<strong>×${p.globalRateMult.toFixed(2)} / ${critPct}%</strong></div>
        <div>減傷 / 跑速：<strong>${dmgRedPct > 0 ? '+' : ''}${dmgRedPct}% / ${p.speed.toFixed(1)}</strong></div>
        <div>當前環境狀態：<strong>${envTags.length ? envTags.join('、') : '正常'}</strong></div>
        <div class="pause-resonances"><strong>已啟動共鳴</strong>${resonanceMarkup}</div>
      `;

      this.els.pauseWeapons.innerHTML = game.weapons
        .map((w) => {
          const runeBadges = (w.runes || [])
            .map((id) => {
              const rd = PGS.Runes.DEFS[id];
              return `<span class="rune-pill" style="background:${rd.cssColor}">${rd.short}</span>`;
            })
            .join('');
          return `
            <div class="w-chip" title="${w.def.name}">
              <img src="${this.iconDataUrls[w.id]}" alt="${w.def.name}" class="pixel-icon" />
              <div>
                <div class="w-lv">${w.def.name} Lv.${w.level}</div>
                <div class="w-runes">${runeBadges || '<span class="choice-desc">無符文</span>'}</div>
              </div>
            </div>
          `;
        })
        .join('');

      this.els.pauseOverlay.classList.remove('hidden');
    }

    hidePause() {
      if (this.els.pauseOverlay) {
        this.els.pauseOverlay.classList.add('hidden');
      }
    }
  }

  PGS.GameUI = GameUI;
})(window);
