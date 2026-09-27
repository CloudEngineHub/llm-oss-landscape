import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import PptxGenJS from "pptxgenjs";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const SOURCE_URL = process.env.SLIDES_URL ??
  "https://insights.inclusion-ai.org/presentations/260910_inclusion/present";
const OUTPUT = path.join(import.meta.dirname, "Agent-进入开源协作之后-外滩大会-2026.pptx");
const NOTES_FILE = path.join(import.meta.dirname, "10min-collaboration-script.zh-CN.md");
const WORK_DIR = "/private/tmp/inclusion-slides-pptx";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9231;

const frames = [
  ["cover", 0, 0],
  ["agent-landscape", 0, 1],
  ["agent-landscape", 1, 1],
  ["agent-landscape", 2, 1],
  ["model-landscape", 0, 2],
  ["model-landscape", 1, 2],
  ["trend-observation", 0, 3],
  ["repository", 0, 4],
  ["flow", 0, 5],
  ["pressure", 0, 6],
  ["setup", 0, 7],
  ["public-work", 0, 8],
  ["review", 0, 9],
  ["lineage", 0, 10],
  ["lineage", 1, 10],
  ["lineage", 2, 10],
  ["close", 0, 11],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const targets = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((response) => response.json());
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(250);
  }
  throw new Error("Chrome DevTools endpoint did not become ready.");
}

class CdpSession {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

function extractNotes(markdown) {
  const sections = markdown.split(/^##\s+/m).slice(1);
  return sections.map((section) => section.replace(/^.*\n/, "").trim());
}

async function captureFrames() {
  await rm(WORK_DIR, { recursive: true, force: true });
  await mkdir(path.join(WORK_DIR, "profile"), { recursive: true });
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${path.join(WORK_DIR, "profile")}`,
    "about:blank",
  ], { stdio: "ignore" });

  try {
    const debuggerUrl = await waitForDebugger();
    const cdp = new CdpSession(debuggerUrl);
    await cdp.open();
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    for (let index = 0; index < frames.length; index += 1) {
      const [scene, build] = frames[index];
      const url = `${SOURCE_URL}#${scene}.${build}`;
      await cdp.send("Page.navigate", { url });
      await sleep(1800);
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const style = document.createElement('style');
          style.textContent = [
            '* { animation-delay: 0s !important; animation-duration: 0.001s !important; transition: none !important; }',
            'nav[aria-label="演示导航"] { display: none !important; }',
            '.pager button, button[aria-label="上一页"], button[aria-label="下一页"] { display: none !important; }',
            '[class*="copyEditor"], [class*="editorTrigger"] { display: none !important; }'
          ].join('');
          document.head.appendChild(style);
        })()`,
      });
      await sleep(250);
      const { data } = await cdp.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
        fromSurface: true,
      });
      const file = path.join(WORK_DIR, `slide-${String(index + 1).padStart(2, "0")}.png`);
      await writeFile(file, Buffer.from(data, "base64"));
    }
    cdp.close();
  } finally {
    chrome.kill("SIGTERM");
  }
}

async function buildDeck() {
  const notes = extractNotes(await readFile(NOTES_FILE, "utf8"));
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "夏小雅 · 蚂蚁开源";
  pptx.company = "Ant Open Source";
  pptx.subject = "外滩大会 2026 年 9 月";
  pptx.title = "Agent 进入开源协作之后";
  pptx.lang = "zh-CN";
  pptx.theme = {
    headFontFace: "Arial",
    bodyFontFace: "Arial",
    lang: "zh-CN",
  };

  for (let index = 0; index < frames.length; index += 1) {
    const imageFile = path.join(WORK_DIR, `slide-${String(index + 1).padStart(2, "0")}.png`);
    const slide = pptx.addSlide();
    slide.background = { color: "FBFAF6" };
    slide.addImage({ path: imageFile, x: 0, y: 0, w: 13.333, h: 7.5 });
    const sectionIndex = frames[index][2];
    if (notes[sectionIndex]) slide.addNotes(notes[sectionIndex]);
  }

  await pptx.writeFile({ fileName: OUTPUT });
  console.log(OUTPUT);
}

await captureFrames();
await buildDeck();
