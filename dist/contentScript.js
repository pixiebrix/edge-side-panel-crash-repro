// The extension page (editor.html) asks this tab to show the panel; the content script then asks
// the service worker twice, without a user gesture, as the full extension does
chrome.runtime.onMessage.addListener((request) => {
  if (request.command === "relay-open") {
    void chrome.runtime.sendMessage({ command: "open" });
    void chrome.runtime.sendMessage({ command: "open" });
  }
});
