const tabId = Number(new URLSearchParams(location.search).get("tabId"));

// Stands in for the full extension's editor state, which is large
const registry = Array.from({ length: 300_000 }, (_, i) => ({
  id: `brick-${i}`,
  schema: { type: "object", properties: { value: { type: "string" } }, index: i },
}));

// Stands in for the editor computing brick types while the panel opens
function computeTypes() {
  let checksum = 0;
  const deadline = performance.now() + 1500;
  while (performance.now() < deadline) {
    for (const brick of registry) {
      checksum += JSON.stringify(brick.schema).length;
    }
  }

  return checksum;
}

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
  console.log("types checksum", computeTypes());
});
