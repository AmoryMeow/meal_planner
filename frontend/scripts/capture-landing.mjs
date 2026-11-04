import { spawn } from "node:child_process";
import { mkdir, rm, unlink, writeFile } from "node:fs/promises";

const demoEmail = "landing-demo@mealendar.local";
const demoPassword = process.env.DEMO_USER_PASSWORD;
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const appUrl = (process.env.APP_URL ?? "http://localhost").replace(/\/$/, "");
const outputPath = new URL("../public/landing/", import.meta.url);
const profilePath = `/tmp/mealendar-landing-capture-${process.pid}`;
const debuggingPort = 9333;

if (!demoPassword) {
  throw new Error("Set DEMO_USER_PASSWORD before capturing landing screenshots.");
}

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

await rm(profilePath, { recursive: true, force: true }).catch(() => undefined);
await mkdir(outputPath, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--hide-scrollbars",
    "--lang=en-US",
    "--no-default-browser-check",
    "--no-first-run",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profilePath}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" }
);

const debuggerUrl = `http://127.0.0.1:${debuggingPort}`;

const waitForDebugger = async () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${debuggerUrl}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error("Chrome debugging endpoint did not start.");
};

class CdpClient {
  constructor(url) {
    this.sequence = 0;
    this.pending = new Map();
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

const evaluate = (client, expression) =>
  client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });

const waitFor = async (client, expression, label) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const result = await evaluate(client, expression);
    if (result.result.value) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${label}.`);
};

const setViewport = (client, width, height, mobile = false) =>
  client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: mobile ? 2 : 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });

const navigate = async (client, path) => {
  await client.send("Page.navigate", { url: `${appUrl}${path}` });
  await waitFor(
    client,
    `location.pathname === ${JSON.stringify(path)}`,
    `navigation to ${path}`
  );
  await waitFor(
    client,
    "Boolean(document.body && document.body.children.length)",
    "page content"
  );
  await sleep(1800);
};

const selectTheme = async (client, theme) => {
  const result = await evaluate(
    client,
    `document.documentElement.dataset.theme === ${JSON.stringify(theme)}`
  );
  if (!result.result.value) {
    await evaluate(
      client,
      `document.querySelector('button[aria-label^="Switch to"]')?.click()`
    );
  }
  await waitFor(
    client,
    `document.documentElement.dataset.theme === ${JSON.stringify(theme)}`,
    `${theme} theme`
  );
  await sleep(250);
};

const prepareScreenshot = async client => {
  await evaluate(
    client,
    `(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('body *').forEach(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (
          style.position === 'fixed' &&
          Number.parseFloat(style.right) <= 24 &&
          Number.parseFloat(style.bottom) <= 24 &&
          rect.width <= 100 &&
          rect.height <= 100
        ) {
          element.style.display = 'none';
        }
      });
      return true;
    })()`
  );
  await sleep(250);
};

const capture = async (client, filename) => {
  await prepareScreenshot(client);
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(new URL(filename, outputPath), Buffer.from(result.data, "base64"));
  console.log(`Captured ${filename}`);
};

const captureTheme = async (client, theme) => {
  await setViewport(client, 1440, 1000);
  await navigate(client, "/home");
  await selectTheme(client, theme);
  await capture(client, `weekly-plan-${theme}.png`);

  await navigate(client, "/meals");
  await capture(client, `meals-${theme}.png`);

  await navigate(client, "/plans");
  await waitFor(
    client,
    `Boolean(document.querySelector('a[aria-label="Open Family"]'))`,
    "Family plan link"
  );
  const familyHref = await evaluate(
    client,
    `document.querySelector('a[aria-label="Open Family"]').getAttribute('href')`
  );
  await navigate(client, familyHref.result.value);
  await capture(client, `groups-${theme}.png`);

  await navigate(client, "/shopping-list");
  await capture(client, `shopping-list-${theme}.png`);

  await setViewport(client, 390, 844, true);
  await navigate(client, "/home");
  await capture(client, `weekly-plan-mobile-${theme}.png`);
};

try {
  await waitForDebugger();
  const targetResponse = await fetch(`${debuggerUrl}/json/new?about:blank`, {
    method: "PUT",
  });
  const target = await targetResponse.json();
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");
  await client.send("Emulation.setLocaleOverride", { locale: "en-US" });
  await client.send("Network.setExtraHTTPHeaders", {
    headers: { "Accept-Language": "en-US,en;q=0.9" },
  });
  await setViewport(client, 1440, 1000);

  await navigate(client, "/");
  for (const theme of ["light", "dark"]) {
    await selectTheme(client, theme);
    await waitFor(
      client,
      `document.querySelector('img[alt^="Mealendar weekly calendar"]')
        ?.getAttribute('src')
        ?.endsWith('weekly-plan-${theme}.png')`,
      `${theme} landing screenshot`
    );
    console.log(`Verified ${theme} landing screenshot`);
  }

  await navigate(client, "/login");
  await waitFor(client, "Boolean(document.querySelector('form'))", "login form");
  await evaluate(
    client,
    `(() => {
      const setValue = (selector, value) => {
        const input = document.querySelector(selector);
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        ).set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('[name="email"]', ${JSON.stringify(demoEmail)});
      setValue('[name="password"]', ${JSON.stringify(demoPassword)});
      document.querySelector('form').requestSubmit();
      return true;
    })()`
  );
  await waitFor(client, "location.pathname === '/home'", "successful login");
  await sleep(2000);

  await captureTheme(client, "light");
  await captureTheme(client, "dark");
  client.close();

  for (const legacyFile of [
    "weekly-plan.png",
    "weekly-plan-mobile.png",
    "meals.png",
    "groups.png",
    "shopping-list.png",
  ]) {
    await unlink(new URL(legacyFile, outputPath)).catch(() => undefined);
  }
} finally {
  chrome.kill("SIGTERM");
  await sleep(1000);
  await rm(profilePath, { recursive: true, force: true }).catch(() => undefined);
}
