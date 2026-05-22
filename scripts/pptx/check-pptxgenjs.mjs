import pptxgen from "pptxgenjs";

const pptx = new pptxgen();

console.log("pptxgenjs import: ok");
console.log(`layout default: ${pptx.layout || "unset"}`);
console.log("PPTX generation environment is ready.");
