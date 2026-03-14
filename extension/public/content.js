// Content script to inject distraction warning overlay
if (window.HAS_CONTEXTGUARD_CONTENT_SCRIPT) {
  console.log("[Extension Content] script already active in this tab.");
} else {
  window.HAS_CONTEXTGUARD_CONTENT_SCRIPT = true;
  console.log("[Extension Content] script initializing...");
  
  // Inject critical animations and styles to ensure visibility even if content.css is missing
  const style = document.createElement("style");
  style.id = "cg-internal-styles";
  style.innerHTML = `
    @keyframes cgFadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.documentElement.appendChild(style);


let pauseInterval = null;

function enforceVideoPause() {
  if (!pauseInterval) {
    pauseInterval = setInterval(() => {
      if (document.getElementById("contextguard-overlay")) {
        document.querySelectorAll("video").forEach(v => v.pause());
      } else {
        clearInterval(pauseInterval);
        pauseInterval = null;
      }
    }, 500);
  }
}

// VISUAL HEARTBEAT FOR DIAGNOSTICS
function updateHeartbeat(score, action) {
  let hb = document.getElementById("cg-heartbeat");
  if (!hb) {
    hb = document.createElement("div");
    hb.id = "cg-heartbeat";
    hb.style.cssText = "position:fixed;bottom:10px;right:10px;width:10px;height:10px;border-radius:50%;z-index:2147483647;pointer-events:none;transition:all 0.3s;box-shadow:0 0 5px rgba(0,0,0,0.5);";
    document.documentElement.appendChild(hb);
  }
  
  let color = "#10b981"; // green (allow)
  if (action === 'warn') color = "#f59e0b"; // orange
  if (action === 'block') color = "#ef4444"; // red
  
  hb.style.background = color;
  hb.title = `ContextGuard: Score ${score} (${action})`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(`[Extension Content] Received message: ${message.type}`);
  
  if (message.type === "PING") {
    sendResponse({ pong: true });
    updateHeartbeat(1, "active");
    return true;
  }

  if (message.type === "GET_YOUTUBE_CONTEXT") {

    const titleEl = document.querySelector('h1.ytd-video-primary-info-renderer') || document.querySelector('h1.ytd-watch-metadata') || document.querySelector('h2.title.ytd-reel-player-header-renderer') || document.querySelector('h1.title.ytd-video-primary-info-renderer') || document.querySelector('#container > h1 > yt-formatted-string');
    const channelEl = document.querySelector('ytd-video-owner-renderer #channel-name #text') || document.querySelector('ytd-reel-channel-bar-renderer #text') || document.querySelector('#owner #channel-name a') || document.querySelector('#upload-info #channel-name');
    const descEl = document.querySelector('#description-inner yt-formatted-string') || document.querySelector('#description-text') || document.querySelector('.ytd-video-secondary-info-renderer #description') || document.querySelector('#expander #description');

    
    let context = document.title;
    if (titleEl && titleEl.innerText.trim()) {
      context = titleEl.innerText.trim();
      if (channelEl && channelEl.innerText.trim()) {
        context += " by " + channelEl.innerText.trim();
      }
      if (descEl && descEl.innerText.trim()) {
        const desc = descEl.innerText.trim().substring(0, 300);
        context += " | Description: " + desc;
      }
    }
    
    console.log(`[Extension] Scraped Context: "${context.substring(0, 100)}..."`);
    const isJustLoading = /^(?:\(\d+\)\s)?YouTube$/i.test(context.trim());
    if (isJustLoading) {
      sendResponse({ context: null });
    } else {
      sendResponse({ context });
    }
    return true;
  } else if (message.type === "SHOW_DISTRACTION_WARNING") {
    updateHeartbeat(message.score, 'block');
    enforceVideoPause();
    showOverlay(message.score, false, message.task);
  } else if (message.type === "SHOW_WARNING_OVERRIDE") {
    updateHeartbeat(message.score, 'warn');
    enforceVideoPause();
    showOverlay(message.score, true, message.task);
  } else if (message.type === "ENABLE_YOUTUBE_FOCUS") {
    updateHeartbeat(1, 'allow');
    const existing = document.getElementById("contextguard-overlay");
    if (existing) existing.remove();
    enableYouTubeFocus(message.task);
  }
});



function showOverlay(score, allowOverride, taskDesc = "") {
  console.log(`[Extension Content] Rendering Overlay: score=${score}, allowOverride=${allowOverride}`);
  
  const existing = document.getElementById("contextguard-overlay");
  if (existing) {
    // Check if we need to update data, otherwise return to prevent flicker
    const existingTask = existing.getAttribute("data-task");
    if (existingTask === taskDesc) return;
    existing.remove();
  }

  if (!document.body) {
    console.error("[Extension Content] No document.body found!");
    return;
  }


  const overlay = document.createElement("div");
  overlay.id = "contextguard-overlay";
  overlay.setAttribute("data-task", taskDesc);


  const container = document.createElement("div");
  container.className = "contextguard-container";

  const siteName = window.location.hostname;
  const titleText = allowOverride ? "Borderline Content" : "Distraction Detected";
  const descText = allowOverride 
    ? "This page might be drifting away from your task. Are you sure it's relevant?"
    : "This page appears unrelated to your current task.";


  let actionsHtml = "";
  if (allowOverride) {
    actionsHtml = `
      <button id="cg-return" class="cg-btn cg-primary" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;border:none;margin-right:8px;font-weight:bold;cursor:pointer;">Return to Focus</button>
      <button id="cg-override" class="cg-btn cg-secondary" style="background:#4b5563;color:white;padding:12px 24px;border-radius:8px;border:none;margin-right:8px;font-weight:bold;cursor:pointer;">Continue Anyway</button>
      <button id="cg-break-now" class="cg-btn cg-secondary" style="background:#10b981;color:white;padding:12px 24px;border-radius:8px;border:none;margin-right:8px;font-weight:bold;cursor:pointer;">Take Short Break</button>
    `;
  } else {
    actionsHtml = `
      <button id="cg-close" class="cg-btn cg-primary" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:8px;border:none;margin-right:8px;font-weight:bold;cursor:pointer;">Close Tab</button>
      <button id="cg-allow-temp" class="cg-btn cg-secondary" style="background:#4b5563;color:white;padding:12px 24px;border-radius:8px;border:none;margin-right:8px;font-weight:bold;cursor:pointer;">Allow Temporarily</button>
    `;
  }


  container.innerHTML = `
    <h1 class="contextguard-title" style="font-size:28px;margin-bottom:12px;font-weight:bold;color:white;">${titleText}</h1>
    <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.1);text-align:left;">
      <p style="color:#9ca3af;font-size:14px;margin:0 0 8px 0;"><strong>You opened:</strong> ${siteName}</p>
      <p style="color:#10b981;font-size:14px;margin:0;"><strong>Your task:</strong> ${taskDesc}</p>
    </div>
    <p class="contextguard-text" style="color:#e5e7eb;font-size:16px;margin-bottom:24px;line-height:1.5;">${descText}</p>
    <div class="contextguard-actions" style="display:flex;justify-content:center;flex-wrap:wrap;gap:8px;">${actionsHtml}</div>
  `;
  container.style.cssText = "background:#111827;padding:40px;border-radius:16px;max-width:500px;text-align:center;border:1px solid rgba(255,255,255,0.1);box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);";
  overlay.style.cssText = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:2147483647;font-family:sans-serif;";

  overlay.appendChild(container);
  document.body.appendChild(overlay);

  // Event Listeners
  const returnBtn = document.getElementById("cg-return");
  if (returnBtn) returnBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "CLOSE_TAB" });
  });

  const closeBtn = document.getElementById("cg-close");
  if (closeBtn) closeBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "CLOSE_TAB" });
  });

  const allowTempBtn = document.getElementById("cg-allow-temp");
  if (allowTempBtn) allowTempBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ 
      type: "LOG_DISTRACTION", 
      url: window.location.href, 
      title: document.title 
    });
    overlay.remove();
    document.querySelectorAll("video").forEach(v => v.play());
  });

  const breakBtn = document.getElementById("cg-break-now");
  if (breakBtn) breakBtn.addEventListener("click", () => {
     chrome.runtime.sendMessage({ type: "START_BREAK" });
     overlay.remove();
  });

  const overrideBtn = document.getElementById("cg-override");
  if (overrideBtn) overrideBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ 
      type: "LOG_DISTRACTION", 
      url: window.location.href, 
      title: document.title 
    });
    overlay.remove();
    document.querySelectorAll("video").forEach(v => v.play());
    enableYouTubeFocus(taskDesc);
  });


}

function enableYouTubeFocus(taskDesc = "") {
  if (!document.getElementById("cg-yt-focus-style")) {
    const style = document.createElement("style");
    style.id = "cg-yt-focus-style";
    style.innerHTML = `
      #secondary, #related { display: none !important; }
      #comments { display: none !important; }
      ytd-reel-shelf-renderer { display: none !important; }
      #primary.ytd-rich-grid-renderer { display: none !important; }
      .ytp-ce-element, .ytp-endscreen-content, .ytp-ce-video, .ytp-ce-playlist { display: none !important; }
      ytd-rich-section-renderer { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  // Inject focus banner if not exists
  if (!document.getElementById("cg-focus-banner") && taskDesc) {
    const banner = document.createElement("div");
    banner.id = "cg-focus-banner";
    banner.style.cssText = `
      position:fixed;top:20px;left:50%;transform:translateX(-50%);
      width:90%;max-width:600px;
      background:rgba(16, 185, 129, 0.1);
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
      border:1px solid rgba(16, 185, 129, 0.3);
      color:#fff;z-index:2147483647;
      display:flex;justify-content:space-between;align-items:center;
      padding:16px 24px;border-radius:16px;
      box-sizing:border-box;font-family:sans-serif;
      box-shadow:0 10px 30px -5px rgba(0,0,0,0.5);
      animation: cgSlideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    
    // Add animation style
    if (!document.getElementById("cg-anim-style")) {
      const s = document.createElement("style");
      s.id = "cg-anim-style";
      s.innerHTML = "@keyframes cgSlideDown { from { top: -100px; opacity: 0; } to { top: 20px; opacity: 1; } }";
      document.head.appendChild(s);
    }

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
         <div style="width:10px;height:10px;background:#10b981;border-radius:50%;box-shadow:0 0 10px #10b981;"></div>
         <div style="display:flex;flex-direction:column;">
            <span style="font-weight:700;font-size:11px;margin-bottom:2px;text-transform:uppercase;letter-spacing:0.05em;color:#10b981;">AI Focus Guardian Active</span>
            <span style="font-size:14px;color:rgba(255,255,255,0.9);">Current Task: <strong style="color:#fff;">${taskDesc}</strong></span>
         </div>
      </div>
      <div>
         <button id="cg-dismiss-banner" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:white;padding:8px 16px;border-radius:10px;cursor:pointer;font-weight:600;font-size:12px;transition:all 0.2s;">Minimize</button>
      </div>
    `;
    document.body.appendChild(banner);

    
    document.getElementById("cg-dismiss-banner").addEventListener("click", () => {
      banner.style.display = 'none';
    });
  }
}
} // end initialization block

