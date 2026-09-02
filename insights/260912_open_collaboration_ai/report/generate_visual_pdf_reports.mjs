#!/usr/bin/env node

/**
 * Build bilingual publication PDFs from the canonical Markdown manuscripts.
 * Text stays selectable and charts are HTML/CSS views of the manuscript data.
 */

import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const publicDir = path.join(root, "apps/landscape-web/public");
const outputDir = path.join(publicDir, "reports");
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const editions = {
  en: {
    source: path.join(here, "open-source-collaboration-report.en.md"),
    html: path.join(outputDir, "agentic-open-source-collaboration-2026.en.html"),
    pdf: path.join(outputDir, "agentic-open-source-collaboration-2026.en.pdf"),
    lang: "en",
    reportLabel: "AGENTIC AI LANDSCAPE · RESEARCH REPORT 2026",
    producer: "Produced by Ant Open Source & InclusionAI · September 2026",
    contents: "Contents",
    scope: "Research frame",
    figure: "Figure",
    title: "State of Open-Source Collaboration in the Agentic Era",
  },
  zh: {
    source: path.join(here, "open-source-collaboration-report.zh-CN.md"),
    html: path.join(outputDir, "agentic-open-source-collaboration-2026.zh-CN.html"),
    pdf: path.join(outputDir, "agentic-open-source-collaboration-2026.zh-CN.pdf"),
    lang: "zh-CN",
    reportLabel: "AGENTIC AI LANDSCAPE · 2026 年研究报告",
    producer: "蚂蚁开源与 InclusionAI 联合出品 · 2026 年 9 月",
    contents: "目录",
    scope: "研究范围",
    figure: "图",
    title: "Agent 时代的开源协作",
  },
};

function esc(value = "") {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function inline(value = "") {
  const tokens = [];
  const hold = (html) => { tokens.push(html); return `@@H${tokens.length - 1}@@`; };
  let text = value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => hold(`<a href="${esc(href)}">${esc(label)}</a>`))
    .replace(/`([^`]+)`/g, (_, code) => hold(`<code>${esc(code)}</code>`));
  text = esc(text).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  tokens.forEach((token, index) => { text = text.replace(`@@H${index}@@`, token); });
  return text;
}

function plain(value = "") {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[`*_]/g, "").replace(/<[^>]+>/g, "").trim();
}

function splitTableRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function separatorRow(row) {
  return row.every((cell) => /^:?-{3,}:?$/.test(cell.replaceAll(" ", "")));
}

function parseBlocks(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i += 1; continue; }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { blocks.push({ type: "heading", level: heading[1].length, text: heading[2] }); i += 1; continue; }
    if (line === "---") { blocks.push({ type: "rule" }); i += 1; continue; }
    if (line.startsWith("|") && line.endsWith("|")) {
      const rows = [];
      while (i < lines.length) {
        const candidate = lines[i].trim();
        if (!(candidate.startsWith("|") && candidate.endsWith("|"))) break;
        const row = splitTableRow(candidate);
        if (!separatorRow(row)) rows.push(row);
        i += 1;
      }
      if (rows.length) blocks.push({ type: "table", headers: rows[0], rows: rows.slice(1) });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s+/, "")); i += 1; }
      blocks.push({ type: "list", items });
      continue;
    }
    const paragraph = [];
    while (i < lines.length) {
      const candidate = lines[i].trim();
      if (!candidate || /^(#{1,4})\s+/.test(candidate) || candidate === "---" || /^[-*]\s+/.test(candidate) || (candidate.startsWith("|") && candidate.endsWith("|"))) break;
      paragraph.push(candidate);
      i += 1;
    }
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") }); else i += 1;
  }
  return blocks;
}

function figureKey(title) {
  const match = title.match(/(?:Figure|图)\s+(12A\.1|12B\.1|12A|12B|12C|\d{2}|13)/i);
  return match ? match[1].toUpperCase() : null;
}

function number(value) {
  const match = plain(value).replaceAll(",", "").match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function percentage(value) {
  const match = plain(value).match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function ratioPercent(value) {
  const pct = percentage(value);
  if (pct !== null) return pct;
  const match = plain(value).match(/([\d,]+)\s*\/\s*([\d,]+)/);
  if (!match) return null;
  const denominator = Number(match[2].replaceAll(",", ""));
  return denominator ? Number(match[1].replaceAll(",", "")) / denominator * 100 : null;
}

function dataBar(label, value, max, accent = "purple", meta = "") {
  const width = max > 0 ? Math.max(1.5, value / max * 100) : 0;
  return `<div class="data-row" data-accent="${accent}"><div class="data-label"><strong>${inline(label)}</strong>${meta ? `<span>${inline(meta)}</span>` : ""}</div><div class="data-track"><i style="width:${width.toFixed(2)}%"></i></div><b>${inline(String(value))}</b></div>`;
}

function visualTable(table, options = {}) {
  const { compact = false, bars = false } = options;
  const numericColumns = table.headers.map((_, index) => table.rows.some((row) => percentage(row[index]) !== null));
  return `<div class="table-shell${compact ? " compact" : ""}"><table><thead><tr>${table.headers.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell, index) => {
    const pct = bars && numericColumns[index] ? percentage(cell) : null;
    return `<td${pct !== null ? ` class="bar-cell" style="--cell-bar:${Math.min(100, pct)}%"` : ""}>${inline(cell)}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderFigure(key, title, tables, notes, edition, assets) {
  if (!tables.length) return "";
  let visual = "";
  if (key === "01") {
    visual = `<div class="landscape-spreads"><figure><img src="${assets.agentMap}" alt="Agent Infra Landscape 2026"><figcaption>Agent Infra · 84 projects</figcaption></figure><figure><img src="${assets.modelMap}" alt="Model Infra Landscape 2026"><figcaption>Model Infra · 59 projects</figcaption></figure></div>${visualTable(tables[0], { compact: true })}`;
  } else if (key === "02") {
    visual = `<div class="dual-chart">${tables.slice(0, 2).map((table, tableIndex) => {
      const rankIndex = table.headers.findIndex((h) => /OpenRank share|OpenRank 占比/i.test(h));
      const projectIndex = table.headers.findIndex((h) => /Project share|项目占比/i.test(h));
      return `<article><h4>${tableIndex === 0 ? "Agent Infra" : "Model Infra"}</h4>${table.rows.map((row) => {
        const project = projectIndex >= 0 ? percentage(row[projectIndex]) ?? 0 : 0;
        const rank = rankIndex >= 0 ? percentage(row[rankIndex]) ?? 0 : 0;
        return `<div class="compare-row"><strong>${inline(row[0])}</strong><div><i class="project" style="width:${project}%"></i><i class="rank" style="width:${rank}%"></i></div><span>${project}% / ${rank}%</span></div>`;
      }).join("")}</article>`;
    }).join("")}</div><div class="legend"><span><i class="project"></i>Project share</span><span><i class="rank"></i>OpenRank share</span></div>`;
  } else if (key === "03") {
    visual = `<div class="tile-grid">${tables[0].rows.map((row, index) => `<article data-accent="${index < 2 ? "pink" : "purple"}"><strong>${inline(row[2])}</strong><h4>${inline(row[0])}</h4><p>${inline(row[1])}</p></article>`).join("")}</div>`;
  } else if (key === "04") {
    const table = tables[0];
    const values = table.rows.map((row) => number(row[row.length - 1]));
    const max = Math.max(...values);
    visual = `<div class="rank-bars">${table.rows.map((row, index) => dataBar(row[0], values[index], max, index < 3 ? "purple" : "blue", row[1])).join("")}</div>`;
  } else if (key === "05") {
    visual = `<div class="big-split">${tables[0].rows.map((row, index) => `<article data-accent="${index === 0 ? "pink" : "blue"}"><span>${inline(row[0])}</span><strong>${inline(row[3])}</strong><p>${inline(row[1])} / ${inline(row[2])}</p></article>`).join("")}</div>`;
  } else if (key === "06") {
    const table = tables[0];
    const totals = [1, 2].map((column) => table.rows.reduce((sum, row) => sum + number(row[column]), 0));
    visual = `<div class="stack-pair">${[1, 2].map((column, columnIndex) => `<article><h4>${inline(table.headers[column])}</h4><div class="stack">${table.rows.map((row, rowIndex) => `<i style="width:${number(row[column]) / totals[columnIndex] * 100}%" data-color="${rowIndex}"></i>`).join("")}</div><div class="stack-legend">${table.rows.map((row, rowIndex) => `<span><i data-color="${rowIndex}"></i>${inline(row[0])} <b>${inline(row[column])}</b></span>`).join("")}</div></article>`).join("")}</div>`;
  } else if (key === "07") {
    visual = `<div class="runtime-path">${tables[0].rows.map((row, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><strong>${inline(row[0])}</strong><b>${inline(row[1])}</b><p>${inline(row[2])}</p></article>`).join("")}</div>`;
  } else if (key === "08") {
    visual = `<div class="platform-panels">${tables.map((table, index) => `<article><h4>${index === 0 ? "OpenRouter" : "ZenMux"}</h4>${visualTable(table, { compact: true })}</article>`).join("")}</div>`;
  } else if (key === "09") {
    visual = `<div class="job-grid">${tables[0].rows.map((row, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h4>${inline(row[0])}</h4><strong>${inline(row[1])}</strong><p>${inline(row[2])}</p></article>`).join("")}</div>`;
  } else if (key === "10") {
    visual = `<div class="score-grid">${tables[0].rows.map((row, index) => `<article data-accent="${index < 4 ? "purple" : index < 6 ? "blue" : "pink"}"><strong>${inline(row[1])}</strong><span>${inline(row[0])}</span></article>`).join("")}</div>`;
  } else if (key === "11") {
    visual = `<div class="coverage-bars">${tables[0].rows.map((row) => { const pct = ratioPercent(row[1]) ?? 0; return `<div><strong>${inline(row[0])}</strong><span><i style="width:${pct}%"></i></span><b>${inline(row[1])}</b></div>`; }).join("")}</div>`;
  } else if (key === "12A") {
    const table = tables[0];
    visual = `<div class="stage-board">${table.rows.map((row, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h4>${inline(row[0])}</h4><div class="stage-metrics"><b data-kind="agent">${inline(row[2])}<small>Agent</small></b><b data-kind="user">${inline(row[3])}<small>User</small></b><b data-kind="team">${inline(row[4])}<small>Team</small></b></div><p>${inline(row[5])}</p></article>`).join("")}</div>${tables[1] ? `<div class="event-strip">${tables[1].rows.map((row) => `<span><b>${inline(row[1])}</b>${inline(row[0])}</span>`).join("")}</div>` : ""}`;
  } else if (key === "12A.1") {
    const table = tables[0];
    visual = `<div class="thread-bars">${table.rows.map((row) => `<article><h4>${inline(row[0])}</h4>${[1, 2].map((column) => `<div><span>${inline(table.headers[column])}</span><i><b style="width:${percentage(row[column]) ?? 0}%"></b></i><strong>${inline(row[column])}</strong></div>`).join("")}</article>`).join("")}</div>`;
  } else if (key === "12B") {
    visual = `<div class="metric-cards">${tables[0].rows.map((row, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><strong>${inline(row[1])}</strong><h4>${inline(row[0])}</h4><p>${inline(row[2])}</p></article>`).join("")}</div>`;
  } else if (key === "12B.1") {
    const summary = tables[0];
    visual = `<div class="lineage"><div class="lineage-stack">${summary.rows.map((row, index) => `<i data-color="${index}" style="width:${percentage(row[2]) ?? 0}%"></i>`).join("")}</div><div class="lineage-key">${summary.rows.map((row, index) => `<span><i data-color="${index}"></i><b>${inline(row[2])}</b>${inline(row[0])}</span>`).join("")}</div></div>${tables[1] ? visualTable(tables[1], { compact: true }) : ""}`;
  } else if (key === "12C") {
    visual = `<div class="surface-strip">${tables[0].rows.map((row) => `<article><span>${inline(row[0])}</span><strong>${inline(row[1])}</strong></article>`).join("")}</div>`;
  } else if (key === "13") {
    visual = `<div class="big-split controls">${tables[0].rows.map((row, index) => `<article data-accent="${index === 0 ? "pink" : "blue"}"><span>${inline(row[0])}</span><strong>${inline(row[1])}</strong></article>`).join("")}</div>`;
  } else visual = tables.map((table) => visualTable(table, { bars: true })).join("");
  const noteHtml = notes.length
    ? `<div class="figure-notes">${notes.map((note) => note.type === "paragraph"
      ? `<p>${inline(note.text)}</p>`
      : `<ul>${note.items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`).join("")}</div>`
    : "";
  return `<section class="figure-block" data-figure="${key}"><div class="figure-kicker">${esc(edition.figure)} ${esc(key)}</div><h3>${inline(title.replace(/^(?:Figure|图)\s+[^·]+·?\s*/i, ""))}</h3>${visual}${noteHtml}</section>`;
}

function fontFace(name, weight, data) {
  return `@font-face{font-family:${JSON.stringify(name)};src:url(data:font/woff2;base64,${data.toString("base64")}) format("woff2");font-style:normal;font-weight:${weight};font-display:block}`;
}

function css(fonts, language) {
  return `
    ${fontFace("Alibaba Report", 300, fonts.light)}${fontFace("Alibaba Report", 400, fonts.regular)}${fontFace("Alibaba Report", 500, fonts.medium)}${fontFace("Alibaba Report", 700, fonts.bold)}
    @page{size:A4 portrait;margin:17mm 17mm 18mm}:root{--ink:#171717;--paper:#fbfaf6;--white:#fff;--quiet:#686762;--line:#d7d4ca;--agent:#f3a1dc;--agent-soft:#fde7f6;--model:#9dceff;--model-soft:#e2f1ff;--signal:#7058ff;--signal-soft:#eae6ff;--sand:#ece9e1}
    *{box-sizing:border-box}html{background:var(--paper)}body{margin:0;background:var(--paper);color:var(--ink);font-family:${language === "zh" ? '"Alibaba Report","PingFang SC",sans-serif' : '"Helvetica Neue","Alibaba Report",Arial,sans-serif'};font-size:9.4pt;font-weight:400;line-height:1.58;-webkit-print-color-adjust:exact;print-color-adjust:exact}a{color:#5941e7;text-decoration:none}strong,b{font-weight:700}code{padding:.08em .28em;background:#ece9e2;border-radius:2px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.84em}p{margin:0 0 3.2mm;color:#44433f;orphans:3;widows:3}ul{margin:1mm 0 4mm;padding-left:5mm}li{margin:0 0 1.2mm}hr{margin:9mm 0;border:0;border-top:1px solid var(--line)}
    .cover{min-height:249mm;display:grid;grid-template-rows:auto 1fr auto;break-after:page}.cover-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:5mm;border-bottom:1.4px solid var(--ink)}.cover-head img{height:8mm;width:auto;object-fit:contain}.cover-head span{font-size:7.5pt;font-weight:700;letter-spacing:.12em}.cover-main{align-self:center}.cover-mark{width:13mm;height:13mm;margin-bottom:10mm}.cover h1{max-width:170mm;margin:0;font-size:37pt;font-weight:700;line-height:.98;letter-spacing:-.045em}.cover h1 em{display:block;color:var(--signal);font-style:normal}.cover-deck{max-width:142mm;margin:9mm 0 0;font-size:13pt;line-height:1.45}.cover-deck p:last-child{display:none}.cover-meta{padding:5mm 0 1mm;display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid var(--ink);color:var(--quiet);font-size:7.8pt}.cover-meta b{color:var(--ink)}
    .front-page{min-height:245mm;break-after:page}.front-page h2{margin:0 0 8mm;font-size:25pt}.scope-grid{display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid var(--ink);border-left:1px solid var(--line)}.scope-grid article{min-height:38mm;padding:5mm;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.scope-grid strong{display:block;color:var(--signal);font-size:28pt;line-height:1}.scope-grid span{display:block;margin-top:3mm;color:var(--quiet)}.contents-list{margin-top:13mm;display:grid;gap:0;border-top:1px solid var(--ink)}.contents-list h2{margin:5mm 0}.contents-list a{padding:3.3mm 1mm;display:grid;grid-template-columns:12mm 1fr auto;gap:3mm;border-bottom:1px solid var(--line);color:var(--ink)}.contents-list b{color:var(--signal)}.contents-list small{color:var(--quiet)}
    h1.chapter-title{margin:0 0 9mm;padding-top:2mm;font-size:31pt;line-height:1.02;letter-spacing:-.035em;break-before:page}.chapter-title::before{display:block;margin-bottom:8mm;color:var(--signal);font-size:8pt;font-weight:700;letter-spacing:.13em;content:attr(data-index)}.chapter-title::after{display:block;margin-top:7mm;border-bottom:1.4px solid var(--ink);content:""}h2{margin:9mm 0 4mm;font-size:20pt;line-height:1.12;letter-spacing:-.02em;break-after:avoid}h3{margin:7mm 0 3mm;font-size:14pt;line-height:1.25;letter-spacing:-.01em;break-after:avoid}h4{margin:0;font-size:9.4pt;line-height:1.25}.lede{font-size:11pt;line-height:1.55}.body-table{margin:4mm 0 7mm;break-inside:auto}
    .summary-section{break-before:page}.summary-section>h2{font-size:25pt}.summary-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.summary-cards article{min-height:70mm;padding:6mm;background:var(--white);border:1px solid var(--line);border-top:4mm solid var(--signal)}.summary-cards article:nth-child(2){border-top-color:var(--agent)}.summary-cards article:nth-child(3){border-top-color:var(--model)}.summary-cards h3{margin:0 0 4mm;font-size:14pt}.summary-cards p{font-size:9pt}.snapshot{margin-top:9mm;padding-top:5mm;border-top:1px solid var(--ink)}.snapshot ul{columns:2}
    .figure-block{margin:10mm 0 8mm;padding-top:6mm;border-top:1.5px solid var(--ink);break-before:page}.figure-kicker{margin-bottom:3mm;color:var(--signal);font-size:7.4pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.figure-block>h3{max-width:150mm;margin:0 0 6mm;font-size:22pt;line-height:1.08}.figure-notes{margin-top:5mm;padding-top:4mm;border-top:1px solid var(--line);columns:2;column-gap:8mm}.figure-notes p,.figure-notes li{font-size:8.2pt}.table-shell{margin:4mm 0 7mm;border:1px solid var(--line);background:var(--white);overflow:hidden}.table-shell table{width:100%;border-collapse:collapse;font-size:7.6pt}.table-shell thead{display:table-header-group}.table-shell tr{break-inside:avoid}.table-shell th,.table-shell td{padding:2.2mm 2.4mm;vertical-align:top;text-align:left;border-bottom:1px solid var(--line)}.table-shell th{background:#efede7;font-size:6.9pt;letter-spacing:.02em}.table-shell tbody tr:last-child td{border-bottom:0}.table-shell tbody tr:nth-child(even){background:#fcfbf8}.table-shell.compact table{font-size:7pt}.bar-cell{background:linear-gradient(90deg,var(--signal-soft) 0 var(--cell-bar),transparent var(--cell-bar))}
    .landscape-spreads{display:grid;gap:6mm}.landscape-spreads figure{margin:0;padding:2mm;background:#fff;border:1px solid var(--line)}.landscape-spreads figure+figure{break-before:page}.landscape-spreads img{width:100%;height:auto;display:block}.landscape-spreads figcaption{padding:2mm 1mm 1mm;font-size:7pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .dual-chart,.platform-panels,.stack-pair{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.dual-chart article,.platform-panels article,.stack-pair article{padding:5mm;background:#fff;border:1px solid var(--line)}.dual-chart h4,.platform-panels h4,.stack-pair h4{margin-bottom:5mm;font-size:12pt}.compare-row{margin:0 0 4mm;display:grid;grid-template-columns:28mm 1fr 23mm;gap:3mm;align-items:center;font-size:7.4pt}.compare-row>div{display:grid;gap:1.5mm}.compare-row i{height:3mm;display:block}.compare-row .project{background:var(--sand)}.compare-row .rank{background:var(--signal)}.compare-row span{text-align:right}.legend{margin-top:3mm;display:flex;gap:6mm;color:var(--quiet);font-size:7pt}.legend i{width:8mm;height:2mm;margin-right:2mm;display:inline-block}.legend .project{background:var(--sand)}.legend .rank{background:var(--signal)}
    .tile-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}.tile-grid article{min-height:36mm;padding:4mm;background:#fff;border:1px solid var(--line);border-top:3mm solid var(--signal)}.tile-grid article[data-accent=pink]{border-top-color:var(--agent)}.tile-grid article strong{display:block;color:var(--signal);font-size:22pt;line-height:1}.tile-grid article p{margin:2mm 0 0;color:var(--quiet);font-size:7.2pt}
    .rank-bars{display:grid;gap:3mm}.data-row{display:grid;grid-template-columns:48mm 1fr 18mm;gap:4mm;align-items:center}.data-label{display:flex;flex-direction:column}.data-label span{color:var(--quiet);font-size:6.8pt}.data-track{height:7mm;background:#ebe8e1}.data-track i{height:100%;display:block;background:var(--signal)}.data-row[data-accent=blue] .data-track i{background:var(--model)}.data-row>b{text-align:right;font-size:11pt}
    .big-split{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.big-split article{min-height:60mm;padding:7mm;background:var(--white);border:1px solid var(--line);border-top:5mm solid var(--agent)}.big-split article[data-accent=blue]{border-top-color:var(--model)}.big-split span{display:block;font-size:10pt;font-weight:700}.big-split strong{display:block;margin:6mm 0 2mm;color:var(--signal);font-size:38pt;line-height:1}.big-split p{color:var(--quiet)}.big-split.controls article{min-height:44mm}.big-split.controls strong{font-size:31pt}
    .stack{height:14mm;display:flex;background:#eee}.stack i[data-color="0"],.stack-legend i[data-color="0"],.lineage i[data-color="0"]{background:var(--model)}.stack i[data-color="1"],.stack-legend i[data-color="1"],.lineage i[data-color="1"]{background:var(--agent)}.stack i[data-color="2"],.stack-legend i[data-color="2"],.lineage i[data-color="2"]{background:var(--signal)}.stack i[data-color="3"],.stack-legend i[data-color="3"],.lineage i[data-color="3"]{background:#aaa69d}.stack i[data-color="4"],.stack-legend i[data-color="4"],.lineage i[data-color="4"]{background:#d8d4cb}.stack-legend{margin-top:4mm;display:grid;gap:2mm}.stack-legend span{font-size:7pt}.stack-legend i,.lineage-key i{width:3mm;height:3mm;margin-right:2mm;display:inline-block}.stack-legend b{float:right}
    .runtime-path{display:flex;align-items:stretch}.runtime-path article{position:relative;flex:1;padding:5mm 4mm;background:#fff;border:1px solid var(--line);border-right:0}.runtime-path article:last-child{border-right:1px solid var(--line)}.runtime-path article>span{color:var(--signal);font-size:7pt;font-weight:700}.runtime-path article>strong{display:block;margin:4mm 0 1mm;font-size:12pt}.runtime-path article>b{color:var(--signal);font-size:20pt}.runtime-path article p{margin:2mm 0 0;font-size:7pt}.runtime-path article:not(:last-child)::after{position:absolute;right:-2.6mm;top:50%;z-index:2;width:5mm;height:5mm;background:var(--signal);clip-path:polygon(0 0,100% 50%,0 100%);content:""}
    .job-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.job-grid article{min-height:55mm;padding:5mm;background:#fff;border:1px solid var(--line)}.job-grid article>span{color:var(--signal);font-size:7pt;font-weight:700}.job-grid h4{margin:4mm 0 2mm;font-size:13pt}.job-grid strong{font-size:8pt}.job-grid p{margin-top:3mm;font-size:8pt}
    .score-grid{display:grid;grid-template-columns:repeat(4,1fr);border-left:1px solid var(--line);border-top:1px solid var(--line)}.score-grid article{min-height:34mm;padding:4mm;background:#fff;border-right:1px solid var(--line);border-bottom:1px solid var(--line)}.score-grid strong{display:block;color:var(--signal);font-size:20pt;line-height:1}.score-grid article[data-accent=blue] strong{color:#3b88ce}.score-grid article[data-accent=pink] strong{color:#c43c9c}.score-grid span{display:block;margin-top:3mm;font-size:7pt}
    .coverage-bars{display:grid;gap:4mm}.coverage-bars>div{display:grid;grid-template-columns:44mm 1fr 28mm;gap:4mm;align-items:center}.coverage-bars span{height:8mm;background:#ebe8e1}.coverage-bars span i{height:100%;display:block;background:var(--signal)}.coverage-bars b{text-align:right}
    .stage-board{display:grid;gap:4mm}.stage-board article{padding:5mm;display:grid;grid-template-columns:10mm 38mm 1fr 55mm;gap:4mm;align-items:center;background:#fff;border:1px solid var(--line)}.stage-board article>span{color:var(--signal);font-size:7pt;font-weight:700}.stage-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm}.stage-metrics b{padding:3mm;background:var(--signal-soft);font-size:11pt}.stage-metrics b[data-kind=user]{background:var(--sand)}.stage-metrics b[data-kind=team]{background:var(--model-soft)}.stage-metrics small{display:block;margin-top:1mm;color:var(--quiet);font-size:6pt;font-weight:500}.stage-board p{margin:0;font-size:7.3pt}.event-strip{margin-top:5mm;display:grid;grid-template-columns:repeat(5,1fr);border:1px solid var(--line)}.event-strip span{padding:4mm;border-right:1px solid var(--line);font-size:6.7pt}.event-strip span:last-child{border-right:0}.event-strip b{display:block;color:var(--signal);font-size:17pt}
    .thread-bars{display:grid;gap:4mm}.thread-bars article{padding:4mm;background:#fff;border:1px solid var(--line)}.thread-bars h4{margin-bottom:3mm}.thread-bars article>div{display:grid;grid-template-columns:27mm 1fr 16mm;gap:3mm;align-items:center;font-size:7pt}.thread-bars i{height:4mm;background:#ebe8e1}.thread-bars i b{height:100%;display:block;background:var(--signal)}
    .metric-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.metric-cards article{min-height:57mm;padding:5mm;background:#fff;border:1px solid var(--line)}.metric-cards article>span{color:var(--signal);font-size:7pt;font-weight:700}.metric-cards article>strong{display:block;margin:5mm 0 3mm;color:var(--signal);font-size:29pt;line-height:1}.metric-cards h4{min-height:16mm}.metric-cards p{font-size:7pt}
    .lineage{padding:6mm;background:#fff;border:1px solid var(--line)}.lineage-stack{height:13mm;display:flex}.lineage-stack i{height:100%}.lineage-key{margin-top:5mm;display:grid;grid-template-columns:repeat(4,1fr);gap:3mm}.lineage-key span{font-size:6.8pt}.lineage-key b{display:block;font-size:13pt}.surface-strip{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid var(--line)}.surface-strip article{min-height:38mm;padding:4mm;border-right:1px solid var(--line)}.surface-strip article:last-child{border-right:0}.surface-strip span{display:block;color:var(--quiet);font-size:7pt}.surface-strip strong{display:block;margin-top:5mm;font-size:12pt}
    .method-list{columns:2;column-gap:9mm}.references{font-size:7.8pt}@media screen{body{max-width:210mm;margin:0 auto;padding:17mm;box-shadow:0 0 30px #0002}.cover,.front-page{min-height:auto;padding:14mm 0}}
  `;
}

function dataUri(buffer, mime) { return `data:${mime};base64,${buffer.toString("base64")}`; }

function collectFigure(blocks, start) {
  const heading = blocks[start];
  const tables = [];
  const notes = [];
  let end = start + 1;
  while (end < blocks.length) {
    const block = blocks[end];
    if (block.type === "heading" && block.level <= heading.level) break;
    if (block.type === "table") tables.push(block);
    else if (block.type === "paragraph" || block.type === "list") notes.push(block);
    end += 1;
  }
  return { tables, notes, end };
}

function renderReport(markdown, edition, fonts, assets) {
  const blocks = parseBlocks(markdown);
  const titleIndex = blocks.findIndex((block) => block.type === "heading" && block.level === 1);
  const firstSection = blocks.findIndex((block, index) => index > titleIndex && block.type === "heading" && block.level === 2);
  const intro = blocks.slice(titleIndex + 1, firstSection).filter((block) => block.type === "paragraph");
  const toc = blocks.filter((block) => block.type === "heading" && (block.level === 1 || block.level === 2) && !/^(Executive summary|摘要|Snapshot|研究范围)$/i.test(plain(block.text)));
  const body = [];
  let inSummary = false;
  let inSnapshot = false;
  let inMethod = false;
  let summaryCards = [];
  let snapshotBlocks = [];
  const flushSummary = () => {
    if (!summaryCards.length) return;
    body.push(`<section class="summary-section"><h2>${edition.lang === "en" ? "What this report finds" : "这份报告发现了什么"}</h2><div class="summary-cards">${summaryCards.map((text) => {
      const match = text.match(/^\*\*([^*]+)\*\*\s*(.*)$/);
      return `<article><h3>${inline(match?.[1] ?? "")}</h3><p>${inline(match?.[2] ?? text)}</p></article>`;
    }).join("")}</div>${snapshotBlocks.length ? `<div class="snapshot"><h3>${edition.scope}</h3>${snapshotBlocks.join("")}</div>` : ""}</section>`);
    summaryCards = [];
    snapshotBlocks = [];
  };
  for (let i = firstSection; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.type === "heading") {
      const text = plain(block.text);
      if (/^(Executive summary|摘要)$/i.test(text)) { inSummary = true; inSnapshot = false; continue; }
      if (/^(Snapshot|研究范围)$/i.test(text)) { inSummary = false; inSnapshot = true; continue; }
      if (inSummary || inSnapshot) { flushSummary(); inSummary = false; inSnapshot = false; }
      const key = figureKey(text);
      if (key) {
        const { tables, notes, end } = collectFigure(blocks, i);
        body.push(renderFigure(key, text, tables, notes, edition, assets));
        i = end - 1;
        continue;
      }
      if (block.level === 1) {
        inMethod = /Method|方法/.test(text);
        body.push(`<h1 class="chapter-title" data-index="${esc(text.split("·")[0].trim())}">${inline(text.includes("·") ? text.split("·").slice(1).join("·").trim() : text)}</h1>`);
      } else if (block.level === 2) body.push(`<h2>${inline(block.text)}</h2>`);
      else if (block.level === 3) body.push(`<h3>${inline(block.text)}</h3>`);
      else body.push(`<h4>${inline(block.text)}</h4>`);
      continue;
    }
    if (inSummary && block.type === "paragraph") { summaryCards.push(block.text); continue; }
    if (inSnapshot) {
      if (block.type === "list") snapshotBlocks.push(`<ul>${block.items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      else if (block.type === "paragraph") snapshotBlocks.push(`<p>${inline(block.text)}</p>`);
      continue;
    }
    if (block.type === "paragraph") body.push(`<p>${inline(block.text)}</p>`);
    else if (block.type === "list") body.push(`<ul${inMethod ? ' class="method-list"' : ""}>${block.items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
    else if (block.type === "table") body.push(`<div class="body-table">${visualTable(block, { bars: true })}</div>`);
    else if (block.type === "rule") body.push("<hr>");
  }
  flushSummary();
  const coverIntro = intro.slice(-2).map((block) => `<p>${inline(block.text)}</p>`).join("");
  const coverTitle = edition.lang === "en" ? "State of Open-Source Collaboration <em>in the Agentic Era</em>" : "Agent 时代的<em>开源协作</em>";
  const scope = edition.lang === "en"
    ? [["143", "landscape projects"], ["100", "high-activity repositories"], ["5,000", "public Issues and pull requests"], ["8 months", "1 January–31 August 2026"]]
    : [["143", "个全景图项目"], ["100", "个高活跃仓库"], ["5,000", "条公开 Issue 与 PR"], ["8 个月", "2026 年 1 月 1 日至 8 月 31 日"]];
  return `<!doctype html><html lang="${edition.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(edition.title)}</title><style>${css(fonts, edition.lang === "zh-CN" ? "zh" : "en")}</style></head><body><section class="cover"><header class="cover-head"><img src="${assets.antLogo}" alt="Ant Open Source"><span>${esc(edition.reportLabel)}</span><img src="${assets.inclusionLogo}" alt="InclusionAI"></header><div class="cover-main"><img class="cover-mark" src="${assets.brandMark}" alt=""><h1>${coverTitle}</h1><div class="cover-deck">${coverIntro}</div></div><footer class="cover-meta"><span>${esc(edition.producer)}</span><b>agentic-ai-landscape.org</b></footer></section><section class="front-page"><h2>${esc(edition.scope)}</h2><div class="scope-grid">${scope.map(([value, label]) => `<article><strong>${esc(value)}</strong><span>${esc(label)}</span></article>`).join("")}</div><nav class="contents-list"><h2>${esc(edition.contents)}</h2>${toc.map((item, index) => `<a href="#"><b>${String(index + 1).padStart(2, "0")}</b><span>${inline(item.text)}</span><small>${item.level === 1 ? (edition.lang === "en" ? "Chapter" : "章节") : (edition.lang === "en" ? "Section" : "小节")}</small></a>`).join("")}</nav></section><main>${body.join("\n")}</main></body></html>`;
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const fonts = {
    light: await readFile(path.join(publicDir, "fonts/AlibabaPuHuiTi-Light.woff2")),
    regular: await readFile(path.join(publicDir, "fonts/AlibabaPuHuiTi-Regular.woff2")),
    medium: await readFile(path.join(publicDir, "fonts/AlibabaPuHuiTi-Medium.woff2")),
    bold: await readFile(path.join(publicDir, "fonts/AlibabaPuHuiTi-Bold.woff2")),
  };
  const assets = {
    brandMark: dataUri(await readFile(path.join(publicDir, "brand/agentic-ai-landscape-mark.svg")), "image/svg+xml"),
    antLogo: dataUri(await readFile(path.join(publicDir, "community-logos/ant-open-source.png")), "image/png"),
    inclusionLogo: dataUri(await readFile(path.join(publicDir, "community-logos/inclusionai.png")), "image/png"),
    agentMap: dataUri(await readFile(path.join(publicDir, "keynote/recognition/agent-infra-handdrawn.png")), "image/png"),
    modelMap: dataUri(await readFile(path.join(publicDir, "keynote/recognition/model-infra-handdrawn.png")), "image/png"),
  };
  const browser = await chromium.launch({ executablePath: chromePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
    for (const edition of Object.values(editions)) {
      const markdown = await readFile(edition.source, "utf8");
      const html = renderReport(markdown, edition, fonts, assets);
      await writeFile(edition.html, html, "utf8");
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({
        path: edition.pdf,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: "17mm", right: "17mm", bottom: "18mm", left: "17mm" },
      });
      console.log(`${edition.lang}: ${edition.pdf}`);
    }
  } finally { await browser.close(); }
}

await main();
