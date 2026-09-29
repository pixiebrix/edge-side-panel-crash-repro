// Mirrors how the extension opens its side panel: setOptions (not awaited), then open()
async function openSidePanel(tabId) {
  void chrome.sidePanel.setOptions({
    tabId,
    enabled: true,
    path: `sidepanel.html?tabId=${tabId}`,
  });

  try {
    await chrome.sidePanel.open({ tabId });
  } catch (error) {
    // Expected for the no-gesture calls relayed from the content script
    console.log("sidePanel.open failed:", error.message);
  }
}

chrome.tabs.onCreated.addListener(({ id }) => {
  if (id) {
    void chrome.sidePanel.setOptions({
      tabId: id,
      path: `sidepanel.html?tabId=${id}`,
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender) => {
  if (request.command === "open" && sender.tab?.id) {
    void openSidePanel(sender.tab.id);
  }
});

// The full extension keeps an offscreen document open from startup
void chrome.offscreen
  .createDocument({
    url: "offscreen.html",
    reasons: ["DOM_PARSER"],
    justification: "Hosts a sandboxed frame, as the full extension does",
  })
  .catch((error) => console.log("offscreen:", error.message));

console.log("Background script loaded.");
