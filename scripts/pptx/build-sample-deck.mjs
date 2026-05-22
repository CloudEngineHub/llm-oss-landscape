import pptxgen from "pptxgenjs";
import {
  COLORS,
  FONTS,
  SLIDE,
  addBullets,
  addFooter,
  addHeader,
  addMetric,
  addProgressBars,
  createDeck,
  writeDeck,
} from "./pptx-theme.mjs";

const outPath = process.argv[2] || "outputs/pptxgenjs/sample-landscape-deck.pptx";
const pptx = createDeck({
  title: "LLM OSS Landscape Sample Deck",
  subject: "pptxgenjs smoke-test deck",
});

{
  const slide = pptx.addSlide("LANDSCAPE");
  slide.background = { color: COLORS.ink };
  slide.addText("LLM OSS LANDSCAPE", {
    x: SLIDE.margin,
    y: 0.45,
    w: 4.4,
    h: 0.28,
    fontFace: FONTS.body,
    fontSize: 9,
    bold: true,
    color: "7DD3FC",
    margin: 0,
  });
  slide.addText("Local PPTX generation is ready", {
    x: SLIDE.margin,
    y: 2.05,
    w: 8.8,
    h: 1.25,
    fontFace: FONTS.head,
    fontSize: 34,
    bold: true,
    color: COLORS.white,
    margin: 0,
    fit: "shrink",
  });
  slide.addText("A small editable deck built with pptxgenjs from scripts/pptx.", {
    x: SLIDE.margin,
    y: 3.48,
    w: 6.4,
    h: 0.35,
    fontFace: FONTS.body,
    fontSize: 13.5,
    color: "C9D3DF",
    margin: 0,
    fit: "shrink",
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 9.15,
    y: 1.02,
    w: 2.95,
    h: 4.92,
    fill: { color: "233142" },
    line: { color: "385069", width: 1 },
  });
  slide.addText("PPTXGENJS", {
    x: 9.45,
    y: 1.42,
    w: 2.35,
    h: 0.24,
    fontFace: FONTS.body,
    fontSize: 8,
    bold: true,
    color: "93C5FD",
    margin: 0,
  });
  addProgressBars(slide, [
    { label: "Editable text", value: 0.92, note: "92%", color: "60A5FA" },
    { label: "Native shapes", value: 0.86, note: "86%", color: "2DD4BF" },
    { label: "Scriptable charts", value: 0.78, note: "78%", color: "FBBF24" },
    { label: "Repeatable export", value: 0.95, note: "95%", color: "34D399" },
  ], { x: 9.45, y: 2.1, w: 2.35, barW: 1.08 });
  slide.addText("Generated from npm run pptx:sample", {
    x: SLIDE.margin,
    y: 6.8,
    w: 4.8,
    h: 0.2,
    fontFace: FONTS.body,
    fontSize: 8,
    color: "9AA8B5",
    margin: 0,
  });
}

{
  const slide = pptx.addSlide("LANDSCAPE");
  addHeader(
    slide,
    "workflow",
    "Use one builder script per deck",
    "Keep source data, layout choices, and export path versioned together.",
  );
  addMetric(slide, {
    x: 0.62,
    y: 2.0,
    w: 2.55,
    label: "Command",
    value: "npm run",
    note: "local script entrypoint",
    color: COLORS.teal,
  });
  addMetric(slide, {
    x: 3.45,
    y: 2.0,
    w: 2.55,
    label: "Output",
    value: ".pptx",
    note: "editable PowerPoint",
    color: COLORS.blue,
  });
  addMetric(slide, {
    x: 6.28,
    y: 2.0,
    w: 2.55,
    label: "Assets",
    value: "local",
    note: "figures and data files",
    color: COLORS.green,
  });
  addBullets(slide, [
    "Clone build-sample-deck.mjs for each report deck.",
    "Put shared colors, fonts, and helpers in pptx-theme.mjs.",
    "Write final PPTX files under reports/<report>/slides/ or outputs/pptxgenjs/.",
  ], { x: 0.72, y: 4.1, w: 7.5, h: 1.5 });
  addFooter(slide);
}

{
  const slide = pptx.addSlide("LANDSCAPE");
  addHeader(slide, "sample data view", "Native chart and table primitives work", "This slide verifies basic deck objects beyond plain text.");
  const chartData = [
    {
      name: "OpenRank",
      labels: ["Jan", "Feb", "Mar", "Apr"],
      values: [52, 61, 68, 79],
    },
  ];
  slide.addChart(pptx.ChartType.bar, chartData, {
    x: 0.7,
    y: 2.0,
    w: 5.5,
    h: 3.55,
    showLegend: false,
    showValue: true,
    valAxisMinVal: 0,
    valAxisMaxVal: 100,
    valAxisLabelFontFace: FONTS.body,
    catAxisLabelFontFace: FONTS.body,
    valAxisLabelFontSize: 8,
    catAxisLabelFontSize: 8,
    dataLabelFontFace: FONTS.body,
    dataLabelFontSize: 8,
    chartColors: [COLORS.blue],
    showTitle: false,
  });
  slide.addTable(
    [
      [
        { text: "Object", options: { bold: true } },
        { text: "Purpose", options: { bold: true } },
        { text: "Status", options: { bold: true } },
      ],
      ["Text", "Claims and notes", "ready"],
      ["Shapes", "Cards and layout", "ready"],
      ["Chart", "Native PowerPoint chart", "ready"],
    ],
    {
      x: 6.85,
      y: 2.08,
      w: 5.35,
      h: 1.7,
      border: { color: COLORS.line, pt: 0.7 },
      fill: { color: COLORS.white },
      color: COLORS.ink,
      fontFace: FONTS.body,
      fontSize: 8.6,
      margin: 0.08,
      valign: "mid",
      fit: "shrink",
      autoFit: false,
      colW: [1.15, 2.85, 1.35],
    },
  );
  addProgressBars(slide, [
    { label: "Report narrative", value: 0.82, note: "82%", color: COLORS.blue },
    { label: "Metric coverage", value: 0.76, note: "76%", color: COLORS.teal },
    { label: "Visual polish", value: 0.68, note: "68%", color: COLORS.amber },
  ], { x: 6.98, y: 4.55, w: 4.8, barW: 1.7 });
  addFooter(slide, "Sample values for environment verification only");
}

const fileName = await writeDeck(pptx, outPath);
console.log(`Wrote ${fileName}`);
