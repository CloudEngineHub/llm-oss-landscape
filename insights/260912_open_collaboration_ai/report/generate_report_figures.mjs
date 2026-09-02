#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const figureRoot = path.join(here, "figures");

const palette = {
  paper: "#fbfaf6",
  ink: "#172033",
  quiet: "#667085",
  line: "#d7dbe5",
  purple: "#7058ff",
  pink: "#ed94d7",
  blue: "#92c7f6",
  cyan: "#8de2e8",
  palePurple: "#ece9ff",
  palePink: "#fde8f7",
  paleBlue: "#e4f2ff",
  white: "#ffffff",
};

const figureKeys = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12A", "12A.1", "12B", "12B.1", "12C", "13"];

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function clean(value) {
  return String(value ?? "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replaceAll("**", "")
    .replaceAll("`", "")
    .trim();
}

function splitRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => clean(cell));
}

function isSeparator(row) {
  return row.every((cell) => /^:?-{3,}:?$/.test(cell.replaceAll(" ", "")));
}

function parseReportFigures(markdown) {
  const lines = markdown.split(/\r?\n/);
  const figures = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^###\s+(?:Figure|图)\s+(12A\.1|12B\.1|12A|12B|12C|\d{2}|13)\s*[·.]?\s*(.*)$/i);
    if (!heading) continue;
    const key = heading[1].toUpperCase();
    const title = clean(heading[2]);
    const tables = [];
    const paragraphs = [];
    i += 1;
    let paragraph = [];
    while (i < lines.length && !/^#{1,3}\s+/.test(lines[i])) {
      const line = lines[i].trim();
      if (line.startsWith("|") && line.endsWith("|")) {
        if (paragraph.length) {
          paragraphs.push(paragraph.join(" "));
          paragraph = [];
        }
        const rows = [];
        while (i < lines.length) {
          const candidate = lines[i].trim();
          if (!(candidate.startsWith("|") && candidate.endsWith("|"))) break;
          const row = splitRow(candidate);
          if (!isSeparator(row)) rows.push(row);
          i += 1;
        }
        if (rows.length) tables.push({ header: rows[0], rows: rows.slice(1) });
        continue;
      }
      if (!line && paragraph.length) {
        paragraphs.push(paragraph.join(" "));
        paragraph = [];
      } else if (line && line !== "---") {
        paragraph.push(clean(line));
      }
      i += 1;
    }
    if (paragraph.length) paragraphs.push(paragraph.join(" "));
    figures.set(key, { key, title, tables, paragraphs });
    i -= 1;
  }
  return figures;
}

function numberValue(value) {
  const text = String(value ?? "").replaceAll(",", "");
  const pct = text.match(/(-?\d+(?:\.\d+)?)\s*%/);
  if (pct) return Number(pct[1]);
  const ratio = text.match(/(-?\d+(?:\.\d+)?)\s*\//);
  if (ratio) return Number(ratio[1]);
  const number = text.match(/-?\d+(?:\.\d+)?/);
  return number ? Number(number[0]) : 0;
}

function wrapWords(value, maxChars) {
  const text = clean(value);
  if (!text) return [];
  const hasSpaces = text.includes(" ");
  if (!hasSpaces) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChars) chunks.push(text.slice(i, i + maxChars));
    return chunks;
  }
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

function textBlock(x, y, value, options = {}) {
  const { size = 24, weight = 400, fill = palette.ink, width = 50, lineHeight = 1.25, anchor = "start" } = options;
  const lines = Array.isArray(value) ? value : wrapWords(value, width);
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, PingFang SC, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * lineHeight}">${esc(line)}</tspan>`).join("")}</text>`;
}

function baseSvg(title, body, height = 900, subtitle = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="${height}" viewBox="0 0 1600 ${height}" role="img" aria-label="${esc(title)}"><rect width="1600" height="${height}" fill="${palette.paper}"/><rect x="64" y="54" width="10" height="58" rx="5" fill="${palette.purple}"/>${textBlock(100, 96, title, { size: 42, weight: 600, width: 60 })}${subtitle ? textBlock(100, 137, subtitle, { size: 18, fill: palette.quiet, width: 120 }) : ""}<line x1="64" y1="166" x2="1536" y2="166" stroke="${palette.line}"/>${body}</svg>`;
}

function roundedRect(x, y, width, height, fill, stroke = palette.line, radius = 18) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
}

function barFigure(figure, options = {}) {
  const { tableIndex = 0, labelIndex = 0, valueIndex = 1, max = null, color = palette.purple, suffix = "" } = options;
  const table = figure.tables[tableIndex] ?? { rows: [] };
  const rows = table.rows;
  const values = rows.map((row) => numberValue(row[valueIndex]));
  const ceiling = max ?? Math.max(...values, 1);
  const startY = 220;
  const rowHeight = Math.min(92, 590 / Math.max(rows.length, 1));
  const body = rows.map((row, index) => {
    const value = values[index];
    const y = startY + index * rowHeight;
    const width = Math.max(4, (value / ceiling) * 760);
    return `${textBlock(90, y + 28, row[labelIndex], { size: 22, weight: 600, width: 29 })}<rect x="520" y="${y}" width="760" height="36" rx="18" fill="#e9e7e1"/><rect x="520" y="${y}" width="${width}" height="36" rx="18" fill="${color}"/>${textBlock(1310, y + 29, `${row[valueIndex]}${suffix}`, { size: 22, weight: 600, width: 18 })}`;
  }).join("");
  return baseSvg(figure.title, body);
}

function renderLandscape(layer, projects, language) {
  const groups = new Map();
  const selected = projects.filter(
    (row) => row.landscape_layer === layer && row.landscape_action !== "remove",
  );
  for (const project of selected) {
    const section = project.landscape_section || (language === "zh" ? "其他" : "Other");
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(project.repo_name.split("/").at(-1));
  }
  const entries = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const columns = [[], [], [], []];
  const weights = [0, 0, 0, 0];
  for (const entry of entries) {
    const target = weights.indexOf(Math.min(...weights));
    columns[target].push(entry);
    weights[target] += 2 + Math.ceil(entry[1].length / 2);
  }
  const accents = layer === "Agent Infra" ? [palette.pink, palette.palePink] : [palette.blue, palette.paleBlue];
  const body = columns.map((column, columnIndex) => {
    let y = 210;
    return column.map(([section, names]) => {
      const nameRows = Math.ceil(names.length / 2);
      const height = 74 + nameRows * 31;
      const x = 64 + columnIndex * 378;
      const items = names.map((name, index) => {
        const ix = index % 2;
        const iy = Math.floor(index / 2);
        return textBlock(x + 22 + ix * 174, y + 72 + iy * 31, name, { size: 15, width: 18, fill: palette.ink });
      }).join("");
      const result = `${roundedRect(x, y, 350, height, palette.white, accents[0], 16)}<rect x="${x}" y="${y}" width="350" height="44" rx="16" fill="${accents[1]}"/><rect x="${x}" y="${y + 28}" width="350" height="16" fill="${accents[1]}"/>${textBlock(x + 18, y + 29, section, { size: 17, weight: 600, width: 34 })}${items}`;
      y += height + 18;
      return result;
    }).join("");
  }).join("");
  const title = `${layer} Landscape 2026`;
  const subtitle = language === "zh" ? `${selected.length} 个入选项目 · 按当前全景图分区排列` : `${selected.length} selected projects · grouped by current landscape section`;
  return baseSvg(title, body, 1040, subtitle);
}

function renderFigure02(figure) {
  const colors = [palette.pink, palette.purple, palette.blue, palette.cyan, "#b6b2aa"];
  const panels = figure.tables.slice(0, 2).map((table, panelIndex) => {
    const x = 70 + panelIndex * 770;
    const total = table.rows.reduce((sum, row) => sum + numberValue(row[3]), 0) || 1;
    let y = 240;
    const rows = table.rows.map((row, index) => {
      const value = numberValue(row[3]);
      const width = (value / total) * 430;
      const item = `${textBlock(x + 18, y + 29, row[0], { size: 22, weight: 600, width: 22 })}<rect x="${x + 240}" y="${y}" width="430" height="34" rx="17" fill="#e8e6e0"/><rect x="${x + 240}" y="${y}" width="${width}" height="34" rx="17" fill="${colors[index % colors.length]}"/>${textBlock(x + 690, y + 28, row[4], { size: 21, weight: 600, width: 8 })}`;
      y += 88;
      return item;
    }).join("");
    return `${roundedRect(x, 202, 720, 560, palette.white)}${textBlock(x + 18, 188, panelIndex === 0 ? "Agent Infra" : "Model Infra", { size: 26, weight: 600, width: 20 })}${rows}`;
  }).join("");
  return baseSvg(figure.title, panels);
}

function renderFigure04(figure) {
  const rows = figure.tables[0]?.rows ?? [];
  const max = Math.max(...rows.map((row) => numberValue(row[4])), 1);
  const body = rows.map((row, index) => {
    const y = 220 + index * 100;
    const width = numberValue(row[4]) / max * 640;
    return `${textBlock(85, y + 27, row[0], { size: 21, weight: 600, width: 25 })}${textBlock(360, y + 27, row[1], { size: 16, fill: palette.quiet, width: 34 })}<rect x="760" y="${y}" width="640" height="34" rx="17" fill="#e8e6e0"/><rect x="760" y="${y}" width="${width}" height="34" rx="17" fill="${palette.purple}"/>${textBlock(1425, y + 28, row[4], { size: 22, weight: 600, width: 10 })}`;
  }).join("");
  return baseSvg(figure.title, body);
}

function renderFigure05(figure) {
  const rows = figure.tables[0]?.rows ?? [];
  const body = rows.map((row, index) => {
    const cx = 430 + index * 740;
    const value = numberValue(row[3]);
    const color = index === 0 ? palette.purple : palette.blue;
    return `${textBlock(cx, 285, row[0], { size: 31, weight: 600, width: 25, anchor: "middle" })}<circle cx="${cx}" cy="495" r="135" fill="none" stroke="#e8e6e0" stroke-width="42"/><circle cx="${cx}" cy="495" r="135" fill="none" stroke="${color}" stroke-width="42" stroke-linecap="round" transform="rotate(-90 ${cx} 495)" stroke-dasharray="${value * 8.48} 848"/>${textBlock(cx, 520, `${row[3]}`, { size: 54, weight: 600, width: 12, anchor: "middle" })}${textBlock(cx, 690, `${row[1]} / ${row[2]}`, { size: 22, fill: palette.quiet, width: 24, anchor: "middle" })}`;
  }).join("");
  return baseSvg(figure.title, body);
}

function renderFigure06(figure) {
  const table = figure.tables[0] ?? { rows: [] };
  const colors = [palette.pink, palette.blue, palette.purple, palette.ink, "#aaa69d"];
  const totals = [table.rows.reduce((s, r) => s + numberValue(r[1]), 0), table.rows.reduce((s, r) => s + numberValue(r[2]), 0)];
  const labels = [table.header[1], table.header[2]];
  let body = "";
  for (let group = 0; group < 2; group += 1) {
    const y = 300 + group * 210;
    body += textBlock(100, y + 35, labels[group], { size: 28, weight: 600, width: 22 });
    let x = 360;
    table.rows.forEach((row, index) => {
      const value = numberValue(row[group + 1]);
      const width = value / totals[group] * 1050;
      body += `<rect x="${x}" y="${y}" width="${width}" height="70" fill="${colors[index]}"/>`;
      if (width > 115) body += textBlock(x + width / 2, y + 44, `${row[0]} ${value}`, { size: 17, weight: 600, width: 18, anchor: "middle", fill: index === 3 ? palette.white : palette.ink });
      x += width;
    });
  }
  return baseSvg(figure.title, body);
}

function renderFigure07(figure) {
  const rows = figure.tables[0]?.rows ?? [];
  const colors = [palette.palePurple, palette.paleBlue, palette.palePink, "#e7f5ee", "#f5eee3"];
  const body = rows.map((row, index) => {
    const x = 74 + index * 300;
    const arrow = index < rows.length - 1 ? `<path d="M ${x + 260} 445 H ${x + 290}" stroke="${palette.purple}" stroke-width="5"/><path d="M ${x + 280} 433 L ${x + 294} 445 L ${x + 280} 457" fill="none" stroke="${palette.purple}" stroke-width="5"/>` : "";
    return `${roundedRect(x, 270, 260, 350, colors[index % colors.length], palette.line, 24)}${textBlock(x + 24, 333, `0${index + 1}`, { size: 18, weight: 600, fill: palette.purple, width: 5 })}${textBlock(x + 24, 395, row[0], { size: 28, weight: 600, width: 18 })}${textBlock(x + 24, 474, row[1], { size: 48, weight: 600, width: 8 })}${textBlock(x + 24, 545, row[2], { size: 17, fill: palette.quiet, width: 24 })}${arrow}`;
  }).join("");
  return baseSvg(figure.title, body);
}

function renderFigure08(figure) {
  const panels = figure.tables.slice(0, 2).map((table, panelIndex) => {
    const x = 70 + panelIndex * 770;
    const values = table.rows.map((row) => numberValue(row[3] ?? row[2]));
    const max = Math.max(...values, 1);
    const rows = table.rows.map((row, index) => {
      const y = 250 + index * 90;
      const width = values[index] / max * 390;
      return `${textBlock(x + 18, y + 27, `${row[0]}. ${row[1]}`, { size: 18, weight: 600, width: 30 })}<rect x="${x + 300}" y="${y}" width="390" height="32" rx="16" fill="#e8e6e0"/><rect x="${x + 300}" y="${y}" width="${width}" height="32" rx="16" fill="${panelIndex === 0 ? palette.purple : palette.blue}"/>${textBlock(x + 710, y + 27, row[3] ?? row[2], { size: 18, weight: 600, width: 12 })}`;
    }).join("");
    return `${roundedRect(x, 205, 720, 570, palette.white)}${textBlock(x + 20, 195, panelIndex === 0 ? "OpenRouter" : "ZenMux", { size: 25, weight: 600, width: 20 })}${rows}`;
  }).join("");
  return baseSvg(figure.title, panels);
}

function renderFigure09(figure) {
  const rows = figure.tables[0]?.rows ?? [];
  const colors = [palette.palePurple, palette.paleBlue, palette.palePink, "#e7f5ee"];
  const body = rows.map((row, index) => {
    const x = 70 + index * 380;
    return `${roundedRect(x, 230, 350, 510, colors[index], palette.line, 22)}${textBlock(x + 24, 285, row[0], { size: 24, weight: 600, width: 22 })}${textBlock(x + 24, 350, row[1].replaceAll(";", "\n"), { size: 18, weight: 600, width: 30 })}${textBlock(x + 24, 500, row[2], { size: 16, fill: palette.quiet, width: 34, lineHeight: 1.35 })}`;
  }).join("");
  return baseSvg(figure.title, body);
}

function renderFigure10(figure) {
  return barFigure(figure, { max: 100, color: palette.purple });
}

function renderFigure11(figure) {
  return barFigure(figure, { max: 100, color: palette.pink });
}

function renderFigure12A(figure) {
  const rows = figure.tables[0]?.rows ?? [];
  const body = rows.map((row, index) => {
    const x = 66 + index * 382;
    return `${roundedRect(x, 215, 350, 570, palette.white, index === 2 ? palette.pink : palette.line, 22)}${textBlock(x + 22, 260, `0${index + 1}`, { size: 17, weight: 600, fill: palette.purple, width: 5 })}${textBlock(x + 22, 318, row[0], { size: 23, weight: 600, width: 25 })}${textBlock(x + 22, 450, row[2], { size: 33, weight: 600, fill: palette.purple, width: 16 })}${textBlock(x + 22, 500, "Named Agent / App", { size: 15, fill: palette.quiet, width: 24 })}${textBlock(x + 22, 575, row[3], { size: 29, weight: 600, width: 16 })}${textBlock(x + 22, 620, "GitHub User", { size: 15, fill: palette.quiet, width: 24 })}${textBlock(x + 22, 690, row[4], { size: 24, weight: 600, fill: "#488dcc", width: 16 })}${textBlock(x + 22, 730, "Repository team", { size: 15, fill: palette.quiet, width: 24 })}`;
  }).join("");
  return baseSvg(figure.title, body);
}

function renderFigure12A1(figure) {
  const table = figure.tables[0] ?? { rows: [] };
  const body = table.rows.map((row, index) => {
    const y = 235 + index * 135;
    const issues = numberValue(row[1]);
    const prs = numberValue(row[2]);
    return `${textBlock(80, y + 26, row[0], { size: 21, weight: 600, width: 31 })}<rect x="600" y="${y}" width="${issues * 7}" height="30" rx="15" fill="${palette.blue}"/>${textBlock(610 + issues * 7, y + 25, row[1], { size: 18, weight: 600, width: 10 })}<rect x="600" y="${y + 43}" width="${prs * 7}" height="30" rx="15" fill="${palette.pink}"/>${textBlock(610 + prs * 7, y + 68, row[2], { size: 18, weight: 600, width: 10 })}`;
  }).join("");
  const legend = `<circle cx="620" cy="810" r="10" fill="${palette.blue}"/>${textBlock(640, 817, table.header[1] ?? "Issues", { size: 17, width: 12 })}<circle cx="800" cy="810" r="10" fill="${palette.pink}"/>${textBlock(820, 817, table.header[2] ?? "Pull requests", { size: 17, width: 18 })}`;
  return baseSvg(figure.title, body + legend);
}

function renderFigure12B(figure) {
  const rows = figure.tables[0]?.rows ?? [];
  const body = rows.map((row, index) => {
    const x = 80 + index * 500;
    const value = numberValue(row[1]);
    return `${roundedRect(x, 250, 440, 430, index === 2 ? palette.palePink : palette.white, index === 2 ? palette.pink : palette.line, 24)}${textBlock(x + 30, 365, row[1], { size: 58, weight: 600, fill: palette.purple, width: 12 })}${textBlock(x + 30, 450, row[0], { size: 22, weight: 600, width: 34 })}<rect x="${x + 30}" y="590" width="360" height="20" rx="10" fill="#e8e6e0"/><rect x="${x + 30}" y="590" width="${value * 3.6}" height="20" rx="10" fill="${palette.purple}"/>${textBlock(x + 30, 645, row[2], { size: 15, fill: palette.quiet, width: 34 })}`;
  }).join("");
  return baseSvg(figure.title, body);
}

function renderFigure12B1(figure) {
  const rows = figure.tables[0]?.rows ?? [];
  const colors = [palette.purple, palette.pink, palette.blue, "#aaa69d"];
  let x = 80;
  let body = "";
  rows.forEach((row, index) => {
    const share = numberValue(row[2]);
    const width = share * 14.4;
    body += `<rect x="${x}" y="340" width="${width}" height="110" fill="${colors[index]}"/>`;
    x += width;
  });
  body += rows.map((row, index) => {
    const x0 = 80 + index * 370;
    return `${textBlock(x0, 580, row[2], { size: 36, weight: 600, fill: colors[index], width: 12 })}${textBlock(x0, 635, row[0], { size: 18, weight: 600, width: 31 })}${textBlock(x0, 720, `${row[1]} lines`, { size: 16, fill: palette.quiet, width: 18 })}`;
  }).join("");
  return baseSvg(figure.title, body);
}

function renderFigure12C(figure) {
  const rows = figure.tables[0]?.rows ?? [];
  const body = rows.map((row, index) => {
    const x = 75 + index * 300;
    const on = /public|on|plugins|mit|开放|开/i.test(row[1]) && !/off|关闭/i.test(row[1]);
    return `${roundedRect(x, 300, 260, 310, on ? palette.paleBlue : "#eeeae3", on ? palette.blue : palette.line, 22)}${textBlock(x + 24, 380, row[0], { size: 22, weight: 600, width: 20 })}${textBlock(x + 24, 500, row[1], { size: 29, weight: 600, fill: on ? "#377fbb" : palette.quiet, width: 18 })}`;
  }).join("");
  return baseSvg(figure.title, body);
}

function renderFigure13(figure) {
  return barFigure(figure, { max: 12, color: palette.purple });
}

function renderFigure(figure) {
  switch (figure.key) {
    case "02": return renderFigure02(figure);
    case "03": return barFigure(figure, { valueIndex: 2, color: palette.blue });
    case "04": return renderFigure04(figure);
    case "05": return renderFigure05(figure);
    case "06": return renderFigure06(figure);
    case "07": return renderFigure07(figure);
    case "08": return renderFigure08(figure);
    case "09": return renderFigure09(figure);
    case "10": return renderFigure10(figure);
    case "11": return renderFigure11(figure);
    case "12A": return renderFigure12A(figure);
    case "12A.1": return renderFigure12A1(figure);
    case "12B": return renderFigure12B(figure);
    case "12B.1": return renderFigure12B1(figure);
    case "12C": return renderFigure12C(figure);
    case "13": return renderFigure13(figure);
    default: return baseSvg(figure.title, textBlock(100, 260, figure.paragraphs[0] ?? "", { size: 24, width: 90 }));
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (char !== "\r") cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows.filter((values) => values.length).map((values) => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""])));
}

export async function generateReportFigures() {
  const projects = parseCsv(await readFile(path.join(root, "data/agentic-ai-projects.csv"), "utf8"));
  const sources = {
    en: path.join(here, "open-source-collaboration-report.en.md"),
    zh: path.join(here, "open-source-collaboration-report.zh-CN.md"),
  };
  const output = new Map();
  for (const [language, source] of Object.entries(sources)) {
    const dir = path.join(figureRoot, language);
    await mkdir(dir, { recursive: true });
    const figures = parseReportFigures(await readFile(source, "utf8"));
    const assets = new Map();
    const agentMap = renderLandscape("Agent Infra", projects, language);
    const modelMap = renderLandscape("Model Infra", projects, language);
    assets.set("01-agent", agentMap);
    assets.set("01-model", modelMap);
    await writeFile(path.join(dir, "figure-01-agent-infra.svg"), agentMap, "utf8");
    await writeFile(path.join(dir, "figure-01-model-infra.svg"), modelMap, "utf8");
    for (const key of figureKeys.filter((item) => item !== "01")) {
      const figure = figures.get(key);
      if (!figure) continue;
      const svg = renderFigure(figure);
      assets.set(key, svg);
      const safeKey = key.toLowerCase().replaceAll(".", "-");
      await writeFile(path.join(dir, `figure-${safeKey}.svg`), svg, "utf8");
    }
    output.set(language, assets);
  }
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const figures = await generateReportFigures();
  for (const [language, assets] of figures) console.log(`${language}: ${assets.size} SVG figures`);
}
