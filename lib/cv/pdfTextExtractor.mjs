import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Missing PDF file path.");
  process.exit(2);
}

const data = await readFile(filePath);
const parser = new PDFParse({ data });

try {
  const result = await parser.getText();
  process.stdout.write(result.text || "");
} finally {
  await parser.destroy();
}
