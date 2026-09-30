const tabId = Number(new URLSearchParams(location.search).get("tabId"));
document.querySelector("#tab").textContent = tabId;

// Answer the openers' pings, as the full extension's side panel does
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.command === "ping" && (request.tabId === undefined || request.tabId === tabId)) {
    sendResponse("pong");
  }
});

// Stands in for the full extension's side panel app booting
const container = document.querySelector("#container");
for (let i = 0; i < 2000; i++) {
  const row = document.createElement("div");
  row.textContent = `Panel row ${i}`;
  container.append(row);
}
