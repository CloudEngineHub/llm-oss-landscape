import fs from "node:fs/promises";
import path from "node:path";
import pptxgen from "pptxgenjs";

export const SLIDE = {
  width: 13.333,
  height: 7.5,
  margin: 0.52,
};

export const COLORS = {
  ink: "16202A",
  muted: "5B6673",
  faint: "EEF2F5",
  line: "D9E0E7",
  blue: "2563EB",
  teal: "0F766E",
  green: "16A34A",
  amber: "D97706",
  red: "DC2626",
  white: "FFFFFF",
};

export const FONTS = {
  head: "Aptos Display",
  body: "Aptos",
  mono: "Aptos Mono",
};

export function createDeck({
  title = "LLM OSS Landscape",
  subject = "Local PPTX deck",
  company = "llm-oss-landscape",
} = {}) {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = company;
  pptx.company = company;
  pptx.subject = subject;
  pptx.title = title;
  pptx.lang = "en-US";
  pptx.theme = {
    headFontFace: FONTS.head,
    bodyFontFace: FONTS.body,
    lang: "en-US",
  };
  pptx.defineSlideMaster({
    title: "LANDSCAPE",
    background: { color: COLORS.white },
    margin: [0, 0, 0, 0],
    objects: [
      {
        line: {
          x: SLIDE.margin,
          y: 7.02,
          w: SLIDE.width - SLIDE.margin * 2,
          h: 0,
          line: { color: COLORS.line, width: 0.6 },
        },
      },
    ],
    slideNumber: {
      x: 12.1,
      y: 7.07,
      fontFace: FONTS.body,
      fontSize: 7.5,
      color: COLORS.muted,
    },
  });
  return pptx;
}

export function addHeader(slide, eyebrow, title, subtitle) {
  if (eyebrow) {
    slide.addText(eyebrow.toUpperCase(), {
      x: SLIDE.margin,
      y: 0.38,
      w: 6.2,
      h: 0.22,
      fontFace: FONTS.body,
      fontSize: 8,
      bold: true,
      color: COLORS.teal,
      breakLine: false,
    });
  }
  slide.addText(title, {
    x: SLIDE.margin,
    y: 0.7,
    w: 8.6,
    h: 0.55,
    fontFace: FONTS.head,
    fontSize: 24,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    fit: "shrink",
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: SLIDE.margin,
      y: 1.32,
      w: 7.8,
      h: 0.34,
      fontFace: FONTS.body,
      fontSize: 10.5,
      color: COLORS.muted,
      margin: 0,
      fit: "shrink",
    });
  }
}

export function addFooter(slide, text = "Source: llm-oss-landscape analysis") {
  slide.addText(text, {
    x: SLIDE.margin,
    y: 7.08,
    w: 9.4,
    h: 0.18,
    fontFace: FONTS.body,
    fontSize: 7.2,
    color: COLORS.muted,
    margin: 0,
    fit: "shrink",
  });
}

export function addMetric(slide, { x, y, w, label, value, note, color = COLORS.blue }) {
  slide.addShape(slide.ShapeType?.roundRect || "roundRect", {
    x,
    y,
    w,
    h: 1.18,
    rectRadius: 0.06,
    fill: { color: COLORS.faint },
    line: { color: COLORS.line, width: 0.8 },
  });
  slide.addText(label.toUpperCase(), {
    x: x + 0.18,
    y: y + 0.14,
    w: w - 0.36,
    h: 0.18,
    fontFace: FONTS.body,
    fontSize: 7,
    bold: true,
    color: COLORS.muted,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(value, {
    x: x + 0.18,
    y: y + 0.4,
    w: w - 0.36,
    h: 0.38,
    fontFace: FONTS.head,
    fontSize: 22,
    bold: true,
    color,
    margin: 0,
    fit: "shrink",
  });
  slide.addText(note, {
    x: x + 0.18,
    y: y + 0.86,
    w: w - 0.36,
    h: 0.18,
    fontFace: FONTS.body,
    fontSize: 7.5,
    color: COLORS.muted,
    margin: 0,
    fit: "shrink",
  });
}

export function addBullets(slide, items, { x, y, w, h }) {
  slide.addText(
    items.map((item) => ({ text: item, options: { bullet: { indent: 12 }, hanging: 3 } })),
    {
      x,
      y,
      w,
      h,
      fontFace: FONTS.body,
      fontSize: 12,
      color: COLORS.ink,
      paraSpaceAfterPt: 8,
      fit: "shrink",
      breakLine: false,
      margin: 0,
    },
  );
}

export function addProgressBars(slide, rows, { x, y, w, barW = 2.8 }) {
  rows.forEach((row, index) => {
    const rowY = y + index * 0.52;
    slide.addText(row.label, {
      x,
      y: rowY,
      w: w - barW - 0.34,
      h: 0.22,
      fontFace: FONTS.body,
      fontSize: 9.2,
      color: COLORS.ink,
      margin: 0,
      fit: "shrink",
    });
    slide.addShape(slide.ShapeType?.rect || "rect", {
      x: x + w - barW,
      y: rowY + 0.04,
      w: barW,
      h: 0.12,
      fill: { color: COLORS.faint },
      line: { color: COLORS.faint },
    });
    slide.addShape(slide.ShapeType?.rect || "rect", {
      x: x + w - barW,
      y: rowY + 0.04,
      w: barW * row.value,
      h: 0.12,
      fill: { color: row.color || COLORS.blue },
      line: { color: row.color || COLORS.blue },
    });
    slide.addText(row.note, {
      x: x + w - 0.54,
      y: rowY - 0.02,
      w: 0.54,
      h: 0.18,
      fontFace: FONTS.body,
      fontSize: 7.5,
      color: COLORS.muted,
      margin: 0,
      align: "right",
    });
  });
}

export async function writeDeck(pptx, outPath) {
  const absolutePath = path.resolve(outPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await pptx.writeFile({ fileName: absolutePath });
  return absolutePath;
}
