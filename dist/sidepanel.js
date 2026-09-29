document.querySelector("#tab").textContent = new URLSearchParams(
  location.search,
).get("tabId");

// Stands in for the full extension's side panel app booting
const container = document.querySelector("#container");
for (let i = 0; i < 2000; i++) {
  const row = document.createElement("div");
  row.textContent = `Panel row ${i}`;
  container.append(row);
}
