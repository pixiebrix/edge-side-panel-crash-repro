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

async function pingSidePanel(attempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      if ((await chrome.runtime.sendMessage({ command: "ping", tabId })) === "pong") {
        return true;
      }
    } catch {
      // No listener yet
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

document.querySelector("#open").addEventListener("click", async () => {
  // The full extension awaits the inspected tab's URL here, so the click's gesture may expire
  await chrome.tabs.get(tabId);

  // The host tab's content script installs the panel and asks the worker to open it too
  void chrome.tabs.sendMessage(tabId, { command: "relay-open" });

  const initiallyOpen = pingSidePanel(1);
  void chrome.sidePanel.setOptions({
    tabId,
    enabled: true,
    path: `sidepanel.html?tabId=${tabId}`,
  });

  setTimeout(() => console.log("types checksum", computeTypes()), 600);

  try {
    await chrome.sidePanel.open({ tabId });
  } catch (error) {
    console.log("sidePanel.open failed:", error.message);
    if (!(await initiallyOpen)) {
      void chrome.tabs.sendMessage(tabId, { command: "show-dialog" });
    }

    return;
  }

  await pingSidePanel(50);
});
