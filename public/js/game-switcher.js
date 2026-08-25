/* ==========================================================================
   Zack-Zhang1031 个人主页 - 游戏展示交互脚本
   功能：
     1. 首页作品卡片 - 右下角切换（视频/截图）
     2. 作品页游戏展示 - 右下角切换（视频/截图）
     3. 视频播放/暂停
     4. 静音控制
   ========================================================================== */

(function () {
  'use strict';

  // 每个游戏的状态
  var gameState = {};

  /**
   * 通用：在指定容器内切换显示区
   * @param {string} containerSel - 容器选择器 (class 或 data 属性)
   * @param {string} activeType - 目标类型 ('video' | 'shot')
   */
  function switchDisplay(container, activeType) {
    if (!container) return;

    var displays = container.querySelectorAll(':scope > .wm-display, :scope > .gs-display');
    displays.forEach(function (el) {
      el.classList.remove('wm-display--active', 'gs-display--active');
    });

    var newDisplay = container.querySelector(':scope > [data-type="' + activeType + '"]');
    if (newDisplay) {
      newDisplay.classList.add('wm-display--active', 'gs-display--active');
    }
  }

  /**
   * 通用：更新切换按钮的图标/文字
   */
  function updateToggleBtn(btn, currentType) {
    var icon = btn.querySelector('.wm-toggle-icon, .gct-icon');
    var label = btn.querySelector('.wm-toggle-label, .gct-label');

    if (currentType === 'video') {
      if (icon) icon.textContent = '🖼️';
      if (label) label.textContent = '截图';
    } else {
      if (icon) icon.textContent = '▶';
      if (label) label.textContent = '视频';
    }
  }

  // ============ 首页卡片切换 ============

  /**
   * 首页：切换右下角按钮模式
   */
  window.__toggleHCMode = function (gameId, btn) {
    var container = btn.closest('.work-media');
    if (!container) return;

    var currentActive = container.querySelector('.wm-display--active');
    var currentType = currentActive ? currentActive.getAttribute('data-type') : 'video';
    var nextType = currentType === 'video' ? 'shot' : 'video';

    // 如果从视频切走，暂停播放中的视频
    if (currentType === 'video') {
      pauseVideoIn(container);
    }

    switchDisplay(container, nextType);
    updateToggleBtn(btn, nextType);
  };

  /**
   * 首页：点击播放按钮 → 替换为真正的视频播放器
   */
  window.__toggleHC = function (gameId) {
    var container = document.querySelector('.work-media[data-media="' + gameId + '"]');
    if (!container) return;

    // TODO: 这里可以替换为真实的 <video> 或 B 站 iframe
    var activeDisplay = container.querySelector('.wm-display--active');
    if (!activeDisplay) return;

    var placeholder = activeDisplay.querySelector('.wm-video-placeholder');
    if (placeholder && !placeholder.dataset.replaced) {
      placeholder.dataset.replaced = 'true';
      placeholder.innerHTML =
        '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;color:#94a3b8;text-align:center;">' +
          '<div>' +
            '<p style="font-size:.9rem;margin:0 0 .5rem;">🎬 视频占位符</p>' +
            '<small style="opacity:.7;">将在此嵌入 B 站 / YouTube iframe</small>' +
          '</div>' +
        '</div>';
    }
  };

  // ============ 作品页切换 ============

  /**
   * 作品页：用户明确点击后才创建 video/source，避免首屏下载视频。
   */
  window.__loadGSVideo = function (gameId, btn) {
    if (!btn || btn.dataset.loaded === 'true') return;

    var videoSrc = btn.getAttribute('data-video');
    var posterSrc = btn.getAttribute('data-poster');
    if (!videoSrc) return;

    var video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = 'metadata';
    if (posterSrc) video.poster = posterSrc;

    var source = document.createElement('source');
    source.src = videoSrc;
    source.type = 'video/mp4';
    video.appendChild(source);
    video.appendChild(document.createTextNode('您的浏览器不支持视频播放。'));

    btn.dataset.loaded = 'true';
    btn.replaceWith(video);
    video.play().catch(function () {
      // 某些浏览器仍要求用户再次点击系统播放控件。
    });
  };

  /**
   * 作品页：切换右下角按钮模式
   */
  window.__toggleGSMode = function (gameId, btn) {
    var container = btn.closest('.gs-main');
    if (!container) return;

    var currentActive = container.querySelector('.gs-display--active');
    var currentType = currentActive ? currentActive.getAttribute('data-type') : 'video';
    var nextType = currentType === 'video' ? 'shot' : 'video';

    if (currentType === 'video') {
      pauseVideoIn(container);
    }

    switchDisplay(container, nextType);
    updateToggleBtn(btn, nextType);
  };

  /**
   * 作品页：点击播放按钮
   */
  window.__toggleGS = function (gameId) {
    var container = document.querySelector('.gs-main[data-media="' + gameId + '"]');
    if (!container) return;

    var activeDisplay = container.querySelector('.gs-display--active');
    if (!activeDisplay) return;

    var placeholder = activeDisplay.querySelector('.gs-video-placeholder');
    if (placeholder && !placeholder.dataset.replaced) {
      placeholder.dataset.replaced = 'true';
      placeholder.innerHTML =
        '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;color:#94a3b8;text-align:center;">' +
          '<div>' +
            '<p style="font-size:.95rem;margin:0 0 .5rem;">🎬 视频占位符</p>' +
            '<small style="opacity:.7;">将在此嵌入 B 站 / YouTube iframe</small>' +
          '</div>' +
        '</div>';
    }
  };

  /**
   * 作品页：静音切换
   */
  window.__toggleGSMute = function (gameId) {
    var container = document.querySelector('.gs-main[data-media="' + gameId + '"]');
    if (!container) return;

    var videoEl = container.querySelector('video');
    var btn = document.getElementById('mute-btn-' + gameId);

    if (videoEl) {
      videoEl.muted = !videoEl.muted;
      if (btn) {
        btn.textContent = videoEl.muted ? '🔊 开声音' : '🔇 静音';
      }
    } else {
      // 无视频元素时切换状态记忆
      gameState[gameId] = gameState[gameId] || { muted: true };
      gameState[gameId].muted = !gameState[gameId].muted;
      if (btn) {
        btn.textContent = gameState[gameId].muted ? '🔊 开声音' : '🔇 静音';
      }
    }
  };

  // ============ 辅助函数 ============

  /**
   * 切换视频静音（适用于真实 <video> 标签）
   * 同时支持首页卡片 (.work-media) 和作品页 (.gs-main)
   * @param {string} gameId - 游戏标识
   * @param {HTMLElement} btn - 被点击的按钮元素
   */
  window.__toggleVideoMute = function (gameId, btn) {
    var container = document.querySelector('.gs-main[data-media="' + gameId + '"]')
                 || document.querySelector('.work-media[data-media="' + gameId + '"]');
    if (!container) return;

    var video = container.querySelector('video');
    if (!video) return;

    video.muted = !video.muted;
    if (btn) {
      btn.textContent = video.muted ? '🔊 开声音' : '🔇 静音';
    }

    // 同步其他位置的静音按钮（首页和作品页可能同时存在）
    var allBtns = document.querySelectorAll('[onclick*="__toggleVideoMute(\'' + gameId + '\'"]');
    allBtns.forEach(function (b) {
      if (b !== btn) {
        b.textContent = video.muted ? '🔊 开声音' : '🔇 静音';
      }
    });
  };

  function pauseVideoIn(container) {
    var video = container.querySelector('video');
    if (video && !video.paused) {
      video.pause();
    }
  }

  // 初始化
  document.addEventListener('DOMContentLoaded', function () {
    // 绑定首页卡片播放按钮
    document.querySelectorAll('.wm-play').forEach(function (el) {
      // onclick 已在 HTML 中内联绑定
    });

    // 绑定作品页播放按钮
    document.querySelectorAll('.gs-video-play').forEach(function (el) {
      // onclick 已在 HTML 中内联绑定
    });
  });

})();
