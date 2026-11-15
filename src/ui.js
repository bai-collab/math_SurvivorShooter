(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  function formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  class GameUI {
    constructor(iconDataUrls, runeDataUrls, gearDataUrls) {
      this.iconDataUrls = iconDataUrls;
      this.runeDataUrls = runeDataUrls || {};
      this.gearDataUrls = gearDataUrls || {};
      this.onPickChoice = null;
      this.selectedSlotId = 'weapon';
      this.selectedStatKey = 'atk';

      this.els = {
        hud: document.getElementById('hud'),
        hpFill: document.getElementById('hp-fill'),
        hpText: document.getElementById('hp-text'),
        xpFill: document.getElementById('xp-fill'),
        levelText: document.getElementById('level-text'),
        timeText: document.getElementById('time-text'),
        killsText: document.getElementById('kills-text'),
        goldText: document.getElementById('gold-text'),
        weaponBar: document.getElementById('weapon-bar'),
        pauseBtn: document.getElementById('pause-btn'),
        muteBtn: document.getElementById('mute-btn'),

        menuOverlay: document.getElementById('menu-overlay'),
        stageGrid: document.getElementById('stage-grid'),
        catTabs: document.getElementById('cat-tabs'),
        starterGrid: document.getElementById('starter-grid'),
        starterRuneBar: document.getElementById('starter-rune-bar'),
        metaGold: document.getElementById('meta-gold'),
        metaBest: document.getElementById('meta-best'),
        upgradeList: document.getElementById('upgrade-list'),
        openGearBtn: document.getElementById('open-gear-btn'),
        startBtn: document.getElementById('start-btn'),

        gearOverlay: document.getElementById('gear-overlay'),
        gearTotals: document.getElementById('gear-totals'),
        gearSlots: document.getElementById('gear-slots'),
        gearEditor: document.getElementById('gear-editor'),
        gearBag: document.getElementById('gear-bag'),
        cardBag: document.getElementById('card-bag'),
        closeGearBtn: document.getElementById('close-gear-btn'),

        levelupOverlay: document.getElementById('levelup-overlay'),
        choiceList: document.getElementById('choice-list'),

        runeOverlay: document.getElementById('rune-overlay'),
        runePickHeader: document.getElementById('rune-pick-header'),
        runeWeaponList: document.getElementById('rune-weapon-list'),
        runeSkipBtn: document.getElementById('rune-skip-btn'),

        gameoverOverlay: document.getElementById('gameover-overlay'),
        goStats: document.getElementById('go-stats'),
        retryBtn: document.getElementById('retry-btn'),
        backMenuBtn: document.getElementById('back-menu-btn'),

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

      // 關卡選擇
      this.els.stageGrid.innerHTML = '';
      for (const st of PGS.Gear.STAGES) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `starter-card${game.selectedStageId === st.id ? ' selected' : ''}`;
        card.innerHTML = `
          <div class="starter-name">${st.name}</div>
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

      // 18 把初始武器選擇卡
      this.els.starterGrid.innerHTML = '';
      for (const id of PGS.Weapons.ALL_IDS) {
        const def = PGS.Weapons.DEFS[id];
        if (this.activeCategory !== '全部' && def.category !== this.activeCategory) continue;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `starter-card${game.selectedStarter === id ? ' selected' : ''}`;
        card.innerHTML = `
          <div class="starter-head">
            <img src="${this.iconDataUrls[id]}" alt="${def.name}" class="pixel-icon" />
            <div>
              <div class="starter-name">${def.name}</div>
              <div class="starter-tag">${def.tag}</div>
            </div>
          </div>
          <div class="starter-desc">${def.desc}</div>
        `;
        card.addEventListener('click', () => {
          game.selectedStarter = id;
          this.renderMenu(game);
        });
        this.els.starterGrid.appendChild(card);
      }

      // 起始符文選擇
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
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `rune-btn${game.selectedStarterRune === rId ? ' selected' : ''}`;
        btn.title = rDef.desc;
        btn.innerHTML = `
          <img src="${this.runeDataUrls[rId]}" alt="${rDef.name}" class="rune-mini-icon" />
          <span>${rDef.short}｜${rDef.name.replace('之符文', '').replace('符文', '')}</span>
        `;
        btn.addEventListener('click', () => {
          game.selectedStarterRune = rId;
          this.renderMenu(game);
        });
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
    }

    renderGearWorkshop(game) {
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
      this.els.cardBag.innerHTML = '';
      if (!game.save.cards.length) {
        this.els.cardBag.innerHTML = '<span class="choice-desc">牌庫空了，進關卡打怪就會掉落數字與運算牌！</span>';
      } else {
        for (const c of game.save.cards) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `math-card ${c.kind}`;
          btn.textContent = c.val;
          btn.disabled = !curGear;
          btn.addEventListener('click', () => {
            if (!curGear) return;
            game.insertCardToStat(curGear.uid, this.selectedStatKey, c.uid);
            this.renderGearWorkshop(game);
          });
          this.els.cardBag.appendChild(btn);
        }
      }
    }

    syncAll(game) {
      this.updateHud(game);
    }

    updateHud(game) {
      const p = game.player;
      const hpPct = Math.max(0, Math.min(100, (p.hp / p.maxHp) * 100));
      const xpPct = Math.max(0, Math.min(100, (p.xp / p.nextXp) * 100));

      this.els.hpFill.style.width = `${hpPct}%`;
      this.els.hpText.textContent = `HP ${Math.ceil(p.hp)} / ${p.maxHp}`;
      this.els.xpFill.style.width = `${xpPct}%`;
      this.els.levelText.textContent = `LV ${p.level}`;
      this.els.timeText.textContent = formatTime(game.elapsed);
      this.els.killsText.textContent = `擊殺 ${game.kills}`;
      this.els.goldText.textContent = `金幣 +${game.runGold}`;

      // 戰鬥中極簡武器圖示列（只顯示槍枝圖案＋符文小標籤）
      this.els.weaponBar.innerHTML = game.weapons
        .map((w) => {
          const def = w.def;
          const runeHtml = (w.runes || [])
            .map((rId) => {
              const rDef = PGS.Runes.DEFS[rId];
              return `<span class="rune-pill" style="background:${rDef.cssColor}">${rDef.short}</span>`;
            })
            .join('');
          return `
            <div class="w-slot" title="${def.name} Lv.${w.level}">
              <img src="${this.iconDataUrls[w.id]}" alt="${def.name}" class="pixel-icon-sm" />
              ${runeHtml ? `<div class="w-runes">${runeHtml}</div>` : ''}
            </div>
          `;
        })
        .join('');
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

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'choice-card';
        card.disabled = disabled;
        card.innerHTML = `
          <img src="${this.iconDataUrls[w.id]}" alt="${w.def.name}" class="pixel-icon" />
          <div class="choice-body">
            <div class="choice-title">${w.def.name} Lv.${w.level} (${w.runes.length}/3)</div>
            <div class="w-runes">${runeBadges || '<span class="choice-desc">尚未鑲嵌符文</span>'}</div>
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

    showGameOver(game) {
      this.els.goStats.innerHTML = `
        <div>生存時間：<strong>${formatTime(game.elapsed)}</strong></div>
        <div>總擊殺數：<strong>${game.kills}</strong></div>
        <div>到達等級：<strong>LV ${game.player.level}</strong></div>
        <div>本局獲得金幣：<strong>+${game.runGold}</strong>（總計 ${game.save.gold}）</div>
      `;
      this.els.gameoverOverlay.classList.remove('hidden');
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
      if (p.inIce) envTags.push('冰雪緩攻');
      if (p.paralyzeTimer > 0) envTags.push('雷擊麻痺');
      const terrainNames = (stage.terrains || [])
        .map((k) => PGS.Gear.TERRAINS?.[k]?.label || k)
        .join('、');
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
