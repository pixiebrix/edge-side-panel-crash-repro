document.querySelector("#tab").textContent = new URLSearchParams(
  location.search,
).get("tabId");
