(function (global) {
  'use strict';

  const PGS = (global.PGS = global.PGS || {});

  const DEADZONE = 0.18;
  const NAV_THRESHOLD = 0.55;
  const NAV_REPEAT_DELAY = 0.2;

  class GamepadController {
    constructor() {
      this.moveX = 0;
      this.moveZ = 0;
      this.connected = false;
      this.prevButtons = [];
      this.navCooldown = 0;
      this.focusedEl = null;

      global.addEventListener('gamepadconnected', () => {
        this.connected = true;
      });
      global.addEventListener('gamepaddisconnected', () => {
        this.connected = false;
        this.clearFocus();
      });
    }

    getActivePad() {
      if (!navigator.getGamepads) return null;
      const pads = navigator.getGamepads();
      for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].connected) return pads[i];
      }
      return null;
    }

    justPressed(pad, idx) {
      const cur = !!(pad.buttons[idx] && pad.buttons[idx].pressed);
      const prev = !!this.prevButtons[idx];
      return cur && !prev;
    }

    isPressed(pad, idx) {
      return !!(pad.buttons[idx] && pad.buttons[idx].pressed);
    }

    clearFocus() {
      if (this.focusedEl) {
        this.focusedEl.classList.remove('gp-focus');
        this.focusedEl = null;
      }
    }

    getActiveOverlayId(stateName) {
      if (stateName === 'menu') return 'menu-overlay';
      if (stateName === 'gear') return 'gear-overlay';
      if (stateName === 'paused') return 'pause-overlay';
      if (stateName === 'levelup') return 'levelup-overlay';
      if (stateName === 'rune_pick') return 'rune-overlay';
      if (stateName === 'gameover') return 'gameover-overlay';
      if (stateName === 'math-question' || stateName === 'math-reward') return 'math-action-overlay';
      return null;
    }

    getNavigableElements(overlayId) {
      const root = document.getElementById(overlayId);
      if (!root || root.classList.contains('hidden')) return [];
      const nodes = root.querySelectorAll('button:not(:disabled)');
      return Array.from(nodes).filter((el) => el.offsetParent !== null);
    }

    setFocus(el) {
      if (this.focusedEl && this.focusedEl !== el) {
        this.focusedEl.classList.remove('gp-focus');
      }
      this.focusedEl = el || null;
      if (this.focusedEl) {
        this.focusedEl.classList.add('gp-focus');
        this.focusedEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }

    update(dt, stateName) {
      const pad = this.getActivePad();
      if (!pad) {
        this.moveX = 0;
        this.moveZ = 0;
        return;
      }
      this.connected = true;

      // 讀取左類比搖桿 + 十字鍵
      let ax = pad.axes[0] || 0;
      let az = pad.axes[1] || 0;
      if (Math.hypot(ax, az) < DEADZONE) {
        ax = 0;
        az = 0;
      }

      const dUp = this.isPressed(pad, 12);
      const dDown = this.isPressed(pad, 13);
      const dLeft = this.isPressed(pad, 14);
      const dRight = this.isPressed(pad, 15);

      if (stateName === 'playing') {
        this.clearFocus();
        if (this.justPressed(pad, 9) || this.justPressed(pad, 8)) {
          if (this.onPauseToggle) this.onPauseToggle();
          this.prevButtons = pad.buttons.map((b) => !!b.pressed);
          return;
        }
        let mx = ax;
        let mz = az;
        if (dLeft) mx -= 1;
        if (dRight) mx += 1;
        if (dUp) mz -= 1;
        if (dDown) mz += 1;
        const len = Math.hypot(mx, mz);
        if (len > 1) {
          mx /= len;
          mz /= len;
        }
        this.moveX = mx;
        this.moveZ = mz;
      } else {
        this.moveX = 0;
        this.moveZ = 0;
        this.handleMenuInput(pad, dt, stateName, dUp, dDown, dLeft, dRight, ax, az);
      }

      this.prevButtons = pad.buttons.map((b) => !!b.pressed);
    }

    handleMenuInput(pad, dt, stateName, dUp, dDown, dLeft, dRight, ax, az) {
      const overlayId = this.getActiveOverlayId(stateName);
      if (!overlayId) return;

      const items = this.getNavigableElements(overlayId);
      if (!items.length) return;

      if (!this.focusedEl || !items.includes(this.focusedEl)) {
        this.setFocus(items[0]);
      }

      this.navCooldown = Math.max(0, this.navCooldown - dt);

      const moveDir =
        dUp || az < -NAV_THRESHOLD
          ? -1
          : dDown || az > NAV_THRESHOLD
            ? 1
            : dLeft || ax < -NAV_THRESHOLD
              ? -1
              : dRight || ax > NAV_THRESHOLD
                ? 1
                : 0;

      const dpadJust =
        this.justPressed(pad, 12) ||
        this.justPressed(pad, 13) ||
        this.justPressed(pad, 14) ||
        this.justPressed(pad, 15);

      if (moveDir !== 0 && (dpadJust || this.navCooldown <= 0)) {
        const curIdx = Math.max(0, items.indexOf(this.focusedEl));
        const nextIdx = (curIdx + moveDir + items.length) % items.length;
        this.setFocus(items[nextIdx]);
        this.navCooldown = NAV_REPEAT_DELAY;
      }

      // A 鍵 (0) 或 Start 鍵 (9) 確認點擊
      if (this.justPressed(pad, 0) || this.justPressed(pad, 9)) {
        if (this.focusedEl) this.focusedEl.click();
      }

      // B 鍵 (1) 取消／略過／恢復
      if (this.justPressed(pad, 1) || (stateName === 'paused' && (this.justPressed(pad, 8) || this.justPressed(pad, 9)))) {
        if (stateName === 'paused') {
          const res = document.getElementById('resume-btn');
          if (res) res.click();
        } else if (stateName === 'rune_pick') {
          const skip = document.getElementById('rune-skip-btn');
          if (skip) skip.click();
        } else if (stateName === 'gameover') {
          const back = document.getElementById('back-menu-btn');
          if (back) back.click();
        }
      }

      // LB (4) / RB (5) 在主選單快速切換武器分類頁籤
      if (stateName === 'menu' && (this.justPressed(pad, 4) || this.justPressed(pad, 5))) {
        const tabs = Array.from(document.querySelectorAll('#cat-tabs .cat-tab'));
        if (tabs.length) {
          const activeIdx = Math.max(0, tabs.findIndex((t) => t.classList.contains('active')));
          const step = this.justPressed(pad, 5) ? 1 : -1;
          const nextTab = tabs[(activeIdx + step + tabs.length) % tabs.length];
          if (nextTab) nextTab.click();
        }
      }
    }
  }

  PGS.GamepadController = GamepadController;
})(window);
