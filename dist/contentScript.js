// The extension page (editor.html) asks this tab to show the panel. As in the full extension, the
// content script pings the panel, then asks the service worker to open it, without a user gesture
chrome.runtime.onMessage.addListener((request) => {
  if (request.command === "relay-open") {
    void chrome.runtime.sendMessage({ command: "ping" }).catch(() => {});
    void chrome.runtime.sendMessage({ command: "open" });
    void chrome.runtime.sendMessage({ command: "open" });
  }

  if (request.command === "show-dialog") {
    showOpenDialog();
  }
});

// The full extension's fallback when open() needs a user gesture: a shadow-DOM dialog on the page
function showOpenDialog() {
  if (document.querySelector("#repro-dialog-host")) {
    return;
  }

  const host = document.createElement("div");
  host.id = "repro-dialog-host";
  const shadow = host.attachShadow({ mode: "closed" });
  const dialog = document.createElement("dialog");
  const button = document.createElement("button");
  button.textContent = "Open Sidebar";
  button.addEventListener("click", () => {
    void chrome.runtime.sendMessage({ command: "open" });
    dialog.close();
  });
  dialog.append(button);
  shadow.append(dialog);
  document.body.append(host);
  dialog.showModal();
}
