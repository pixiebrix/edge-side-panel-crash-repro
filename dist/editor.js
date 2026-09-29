const tabId = Number(new URLSearchParams(location.search).get("tabId"));

document.querySelector("#open").addEventListener("click", async () => {
  // Same sequence as the service worker's openSidePanel, with this click's user gesture
  void chrome.sidePanel.setOptions({
    tabId,
    enabled: true,
    path: `sidepanel.html?tabId=${tabId}`,
  });

  try {
    await chrome.sidePanel.open({ tabId });
  } catch (error) {
    console.log("sidePanel.open failed:", error.message);
  }

  await chrome.tabs.sendMessage(tabId, { command: "relay-open" });
});
