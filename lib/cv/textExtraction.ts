import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import mammoth from "mammoth";

export type ResumeFileType = "pdf" | "docx" | "txt";

export type ResumeTextExtractionInput = {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type ResumeTextExtractionResult = {
  filename: string;
  originalName: string;
  fileType: ResumeFileType;
  mimeType: string;
  sizeBytes: number;
  rawText: string;
  parserVersion: string;
  warnings: string[];
};

export const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const execFileAsync = promisify(execFile);

const supportedMimeTypes: Record<string, ResumeFileType> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt"
};

const supportedExtensions: Record<string, ResumeFileType> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt"
};

function normalizeText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getExtension(filename: string) {
  const normalized = filename.toLowerCase().trim();
  const index = normalized.lastIndexOf(".");

  return index >= 0 ? normalized.slice(index) : "";
}

export function detectResumeFileType(filename: string, mimeType: string): ResumeFileType | null {
  const normalizedMime = mimeType.toLowerCase().trim();

  if (supportedMimeTypes[normalizedMime]) {
    return supportedMimeTypes[normalizedMime];
  }

  const extension = getExtension(filename);

  return supportedExtensions[extension] ?? null;
}

export function validateResumeFile(input: Pick<ResumeTextExtractionInput, "filename" | "mimeType" | "sizeBytes">) {
  const fileType = detectResumeFileType(input.filename, input.mimeType);

  if (!fileType) {
    return {
      ok: false as const,
      error: "unsupported_file_type",
      message: "Formato não suportado. Usa PDF, DOCX ou TXT."
    };
  }

  if (input.sizeBytes <= 0) {
    return {
      ok: false as const,
      error: "empty_file",
      message: "O ficheiro está vazio."
    };
  }

  if (input.sizeBytes > MAX_RESUME_FILE_SIZE_BYTES) {
    return {
      ok: false as const,
      error: "file_too_large",
      message: "O CV excede o limite de 5 MB."
    };
  }

  return {
    ok: true as const,
    fileType
  };
}

async function extractTxt(buffer: Buffer) {
  return buffer.toString("utf8");
}

async function extractDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });

  return result.value;
}

async function extractPdf(buffer: Buffer) {
  const tempDir = await mkdtemp(path.join(tmpdir(), "devradar-pdf-"));
  const pdfPath = path.join(tempDir, "resume.pdf");
  const workerPath = path.join(process.cwd(), "lib", "cv", "pdfTextExtractor.mjs");

  try {
    await writeFile(pdfPath, buffer);

    const result = await execFileAsync(
      process.execPath,
      [workerPath, pdfPath],
      {
        cwd: process.cwd(),
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true
      }
    );

    return result.stdout;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function extractResumeText(input: ResumeTextExtractionInput): Promise<ResumeTextExtractionResult> {
  const validation = validateResumeFile(input);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  let rawText = "";

  if (validation.fileType === "txt") {
    rawText = await extractTxt(input.buffer);
  }

  if (validation.fileType === "docx") {
    rawText = await extractDocx(input.buffer);
  }

  if (validation.fileType === "pdf") {
    rawText = await extractPdf(input.buffer);
  }

  const normalizedText = normalizeText(rawText);

  return {
    filename: input.filename,
    originalName: input.filename,
    fileType: validation.fileType,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    rawText: normalizedText,
    parserVersion: "devradar-cv-parser-v1",
    warnings: normalizedText ? [] : ["empty_extracted_text"]
  };
}
