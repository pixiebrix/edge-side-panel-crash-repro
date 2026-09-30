// Like the full extension: the side panel is off globally, then enabled one tab at a time
void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
void chrome.sidePanel.setOptions({ enabled: false });

const panelPath = (tabId) => `sidepanel.html?tabId=${tabId}`;

chrome.tabs.onCreated.addListener(({ id }) => {
  if (id) {
    void chrome.sidePanel.setOptions({ tabId: id, path: panelPath(id) });
  }
});

// The full extension enables every open tab from an idle task queue after startup
setTimeout(async () => {
  for (const { id } of await chrome.tabs.query({})) {
    void chrome.sidePanel.setOptions({ tabId: id, path: panelPath(id), enabled: true });
  }
}, 500);

// The side panel answers pings once it boots; openers poll it, as the full extension's messenger does
async function pingSidePanel(tabId, attempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await chrome.runtime.sendMessage({ command: "ping", tabId });
      if (response === "pong") {
        return true;
      }
    } catch {
      // No listener yet
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

// Mirrors how the full extension opens its side panel, including the gesture fallback
async function openSidePanel(tabId) {
  const initiallyOpen = pingSidePanel(tabId, 1);
  void chrome.sidePanel.setOptions({ tabId, enabled: true, path: panelPath(tabId) });

  try {
    await chrome.sidePanel.open({ tabId });
  } catch (error) {
    console.log("sidePanel.open failed:", error.message);
    if (!(await initiallyOpen)) {
      // No gesture here, so ask the host page to show its "Open Sidebar" dialog
      void chrome.tabs.sendMessage(tabId, { command: "show-dialog" });
    }

    return;
  }

  await pingSidePanel(tabId, 50);
}

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.command === "open" && sender.tab?.id) {
    void openSidePanel(sender.tab.id);
  }
});

// The full extension keeps an offscreen document open from startup
void chrome.offscreen
  .createDocument({
    url: "offscreen.html",
    reasons: ["BLOBS", "USER_MEDIA"],
    justification: "Matches the full extension's offscreen document",
  })
  .catch((error) => console.log("offscreen:", error.message));

console.log("Background script loaded.");
