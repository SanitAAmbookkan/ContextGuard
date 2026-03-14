let API_URL = "http://localhost:3000";
let mutedTabs = new Map(); // tabId -> expiryTime

// Listen to tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Common status check
  if (changeInfo.status === 'complete' || changeInfo.url) {
    if (tab.url && !tab.url.startsWith("chrome://")) {
      checkCurrentTab();
    }
  }
});

// Listen to active tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  checkCurrentTab();
});

// Periodic polling and global timer
setInterval(() => {
  // 1. Tick Timer
  chrome.storage.local.get(['sessionActive', 'timeLeft', 'mode', 'prefs'], (res) => {
    if (res.sessionActive && res.timeLeft !== undefined && res.mode !== 'paused') {
      if (res.timeLeft > 0) {
        chrome.storage.local.set({ timeLeft: res.timeLeft - 1 });
      } else {
        const newMode = res.mode === 'focus' ? 'break' : 'focus';
        let newTime = 25 * 60; // default focus fallback
        if (newMode === 'break') {
          newTime = (res.prefs?.breakDuration || 5) * 60;
        } else {
          // If we had a way to store original focus duration, we'd use it. For now, defaulting back.
          // In a real app, transitioning from Break -> Focus means defining a new task.
          // We'll just reset sessionActive to false.
          chrome.storage.local.set({ sessionActive: false, mode: 'focus', timeLeft: 0 });
          return;
        }
        chrome.storage.local.set({ mode: newMode, timeLeft: newTime });
      }
    }
  });

  // 3. Sync to Backend for Mobile/Dashboard (every 5 ticks to save bandwidth)
  chrome.storage.local.get(['sessionActive', 'timeLeft', 'activeTask', 'mode'], (res) => {
    if (res.sessionActive && Math.floor(Date.now() / 1000) % 5 === 0) {
      fetch(`${API_URL}/sync-timer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timeRemaining: res.timeLeft, 
          activeTask: res.activeTask, 
          mode: res.mode 
        })
      }).catch(() => {});
    }
  });

  // 4. Check tab distractions
  checkCurrentTab();
}, 2000); // Check and tick every 2 seconds





function checkCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      const tab = tabs[0];
      if (tab.url && !tab.url.startsWith("chrome://")) {
        // 1. Ensure content script is injected
        chrome.tabs.sendMessage(tab.id, { type: "PING" }, (resp) => {
          if (chrome.runtime.lastError) {
             console.log(`[Extension] Injecting content script into tab ${tab.id}`);
             chrome.scripting.insertCSS({
               target: { tabId: tab.id },
               files: ["content.css"]
             }).catch(() => {}); // Ignore if already present
             chrome.scripting.executeScript({
               target: { tabId: tab.id },
               files: ["content.js"]
             }).then(() => {
               // Give a tiny bit of time for script to initialize listeners
               setTimeout(() => processTabCheck(tab), 100);
             });

          } else {
             processTabCheck(tab);
          }
        });
      }
    }
  });
}

function processTabCheck(tab) {
  const hostname = new URL(tab.url).hostname;
  chrome.storage.local.get(['blockedSites', 'activeTask', 'sessionActive'], (result) => {
    if (!result.sessionActive || !result.activeTask) return;

    const blocked = result.blockedSites || [];
    
    // Hard block
    if (blocked.includes(hostname) && !hostname.includes("youtube.com")) {
      chrome.tabs.sendMessage(tab.id, { type: "SHOW_BLOCK" }).catch(() => {});
      return;
    }
    
    // YouTube Smart Integration
    if (hostname.includes("youtube.com")) {
      const isVideo = tab.url.includes("/watch") || tab.url.includes("/shorts/");
      
      if (isVideo) {
        chrome.tabs.sendMessage(tab.id, { type: "GET_YOUTUBE_CONTEXT" }, (response) => {
          if (chrome.runtime.lastError) return;
          
          if (response && response.context) {
            checkDistraction(response.context, result.activeTask, tab.id);
          } else {
            console.log(`[Extension] YouTube Video loading... holding AI check`);
            // Don't fallback to tab.title for YT videos - it's often outdated during navigation
          }
        });
      } else {

        // Just enable Focus Mode on Home/Search (No AI block)
        chrome.tabs.sendMessage(tab.id, { type: "ENABLE_YOUTUBE_FOCUS", task: result.activeTask })
        .catch(() => {});
      }
    } else {
      // Normal site - Skip generic or very short titles to avoid random blocks
      const genericTitles = ['google', 'loading', 'new tab', 'search', 'home', 'inbox', 'gmail', 'mail', 'dashboard', 'settings'];
      const titleLower = tab.title.toLowerCase();
      
      if (tab.title.length < 5 || genericTitles.some(g => titleLower.includes(g))) {
        chrome.tabs.sendMessage(tab.id, { type: "PING" }).catch(() => {});
        return;
      }

      checkDistraction(tab.title, result.activeTask, tab.id);
    }
  });
}


async function checkDistraction(tabTitle, taskDescription, tabId) {
  // Check if tab is muted
  if (mutedTabs.has(tabId)) {
    if (Date.now() < mutedTabs.get(tabId)) {
      console.log(`[Extension] Tab ${tabId} is muted. Skipping check.`);
      return;
    } else {
      mutedTabs.delete(tabId);
    }
  }

  try {
    const res = await fetch(`${API_URL}/analyze-tab`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: taskDescription, tab_title: tabTitle })
    });
    
    if (res.ok) {
      const data = await res.json();
      
      // Prevent notification spam - only show if action or score changed significantly
      chrome.storage.local.get(['lastAction'], (res) => {
        if (res.lastAction !== data.action) {
          chrome.storage.local.set({ lastAction: data.action });
          
          chrome.notifications.create({
            type: "basic",
            iconUrl: "favicon.svg",
            title: `ContextGuard: ${data.action.toUpperCase()}`,
            message: `Task: ${taskDescription}\nScore: ${data.similarity_score.toFixed(3)}\nAction: ${data.action}`,
            priority: 2
          });
        }
      });

      console.log(`[Extension] AI Result for "${tabTitle.substring(0, 40)}...": Score=${data.similarity_score.toFixed(3)}, Action=${data.action.toUpperCase()}`);

      if (data.action === 'block') {

        console.log(`[Extension] Sending SHOW_DISTRACTION_WARNING to tab ${tabId}`);
        chrome.tabs.sendMessage(tabId, {
          type: "SHOW_DISTRACTION_WARNING",
          score: data.similarity_score,
          task: taskDescription
        }).then(() => console.log("[Extension] Message delivered successfully"))
        .catch((err) => console.error("[Extension] Message delivery FAILED", err));
      } else if (data.action === 'warn') {
        console.log(`[Extension] Sending SHOW_WARNING_OVERRIDE to tab ${tabId}`);
        chrome.tabs.sendMessage(tabId, {
          type: "SHOW_WARNING_OVERRIDE",
          score: data.similarity_score,
          task: taskDescription
        }).then(() => console.log("[Extension] Message delivered successfully"))
        .catch((err) => console.error("[Extension] Message delivery FAILED", err));
      } else if (data.action === 'allow') {
        console.log(`[Extension] Sending ENABLE_YOUTUBE_FOCUS to tab ${tabId}`);
        chrome.tabs.sendMessage(tabId, { type: "ENABLE_YOUTUBE_FOCUS", task: taskDescription })
        .catch(() => {});
      }
    }
  } catch (error) {
    console.error("AI check error", error);
  }
}
// Message listener for popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_SESSION") {
    chrome.storage.local.set({
      sessionActive: true,
      activeTask: message.task,
      timeLeft: message.duration,
      totalSessionTime: message.duration,
      mode: 'focus',
      prefs: message.prefs,
      blockedSites: []
    });

    fetch(`${API_URL}/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user-1', task: message.task })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.session) {
        chrome.storage.local.set({ currentSessionId: data.session._id });
        sendResponse({ success: true });
      }
    })
    .catch(err => console.error("Start session failed", err));

    return true; // async response
  }

  if (message.type === "STOP_SESSION") {
    chrome.storage.local.get(['currentSessionId'], (res) => {
      chrome.storage.local.set({ sessionActive: false, activeTask: "", timeLeft: 0, currentSessionId: null });
      
      if (res.currentSessionId) {
        fetch(`${API_URL}/end-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: res.currentSessionId })
        })
        .then(() => sendResponse({ success: true }))
        .catch(err => console.error("End session failed", err));
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (message.type === "LOG_DISTRACTION") {
    // Mute this tab for 5 minutes (PRD: Allow temporarily / Continue anyway)
    if (sender.tab) {
      mutedTabs.set(sender.tab.id, Date.now() + 5 * 60 * 1000);
    }
    
    chrome.storage.local.get(['currentSessionId'], (res) => {
      fetch(`${API_URL}/log-distraction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: 'user-1', 
          url: message.url, 
          title: message.title 
        })
      }).catch(err => console.error("Log distraction failed", err));
    });
  }

  if (message.type === "START_BREAK") {
    chrome.storage.local.get(['prefs'], (res) => {
      const breakSecs = (res.prefs?.breakDuration || 5) * 60;
      chrome.storage.local.set({ mode: 'break', timeLeft: breakSecs });
    });
  }

  if (message.type === "CLOSE_TAB" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }
});
