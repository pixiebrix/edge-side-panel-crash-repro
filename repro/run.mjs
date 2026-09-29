// Repeatedly opens the extension side panel on Microsoft Edge and counts renderer crashes.
// Usage: node repro/run.mjs [iterations=30] [channel=msedge]
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

// Lets Playwright attach to the side panel, which it otherwise ignores (microsoft/playwright#26693)
process.env.PW_CHROMIUM_ATTACH_TO_OTHER = "1";

const iterations = Number(process.argv[2] ?? 30);
const channel = process.argv[3] ?? "msedge";
const extensionPath = path.resolve(import.meta.dirname, "../dist");
const headless = process.env.HEADLESS === "1";

const server = http.createServer((_request, response) => {
  response.writeHead(200, { "content-type": "text/html" });
  response.end("<!doctype html><title>Host</title><h1>Host page</h1>");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const hostUrl = `http://127.0.0.1:${server.address().port}/`;

const tally = { opened: 0, crashed: 0, noPanel: 0, error: 0 };

for (let i = 1; i <= iterations; i++) {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "edge-repro-"));
  const context = await chromium.launchPersistentContext(profile, {
    channel,
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      "--disable-features=ExtensionDisableUnsupportedDeveloper",
      ...(headless ? ["--headless=new"] : []),
      // Edge's own log, appended to browser.log after each run
      ...(process.env.EDGE_LOGGING === "1"
        ? ["--enable-logging", `--log-file=${path.join(profile, "edge.log")}`]
        : []),
    ],
  });

  const crashes = [];
  let outcome;
  try {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    const extensionId = worker.url().split("/")[2];

    // The host tab starts on an extension page, then navigates to the site, as in our E2E suite
    const host = context.pages()[0] ?? (await context.newPage());
    await host.goto(`chrome-extension://${extensionId}/options.html`);
    await host.goto(hostUrl);

    const cdp = await context.newCDPSession(host);
    cdp.on("Target.targetCrashed", (event) => crashes.push(`targetCrashed errorCode=${event.errorCode}`));
    await cdp.send("Target.setDiscoverTargets", { discover: true });

    const editor = await context.newPage();
    editor.on("crash", () => crashes.push("extension page crashed"));
    await editor.goto(`chrome-extension://${extensionId}/editor.html`);
    const tabId = await editor.evaluate(
      async (url) => (await chrome.tabs.query({ url }))[0].id,
      hostUrl,
    );
    await editor.goto(`chrome-extension://${extensionId}/editor.html?tabId=${tabId}`);

    // Switch tabs a few times, as the E2E flow does, ending on the host: the panel renders for the active tab
    for (let switches = 0; switches < 3; switches++) {
      await editor.bringToFront();
      await host.bringToFront();
    }

    await editor.click("#open");

    const deadline = Date.now() + 10_000;
    let panel;
    while (!panel && crashes.length === 0 && Date.now() < deadline) {
      panel = context.pages().find((page) => page.url().includes("/sidepanel.html"));
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // A crash can land just after the panel appears
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (crashes.length > 0) {
      outcome = "crashed";
    } else if (panel) {
      outcome = "opened";
    } else {
      outcome = "noPanel";
    }
  } catch (error) {
    outcome = crashes.length > 0 ? "crashed" : "error";
    crashes.push(`error: ${error.message.split("\n")[0]}`);
  }

  tally[outcome]++;
  console.log(`#${i} ${outcome}${crashes.length > 0 ? ` (${crashes.join("; ")})` : ""}`);
  await context.close().catch(() => {});
  if (process.env.EDGE_LOGGING === "1") {
    const log = await fs.readFile(path.join(profile, "edge.log"), "utf8").catch(() => "");
    await fs.appendFile("browser.log", `=== run ${i} ${outcome}\n${log}`);
  }

  await fs.rm(profile, { recursive: true, force: true });
}

server.close();
const version = await getBrowserVersion();
console.log(`RESULT ${version} ${JSON.stringify(tally)}`);
process.exitCode = tally.crashed > 0 ? 1 : 0;

async function getBrowserVersion() {
  const browser = await chromium.launch({ channel, headless: true }).catch(() => null);
  const version = browser?.version() ?? "unknown";
  await browser?.close();
  return `${channel} ${version}`;
}
