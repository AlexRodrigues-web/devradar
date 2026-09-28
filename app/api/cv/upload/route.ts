import { createHash, randomUUID } from "crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

import { extractDevProfileFromText, extractResumeText, validateResumeFile } from "@/lib/cv";
import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";

export const runtime = "nodejs";

type CountRow = RowDataPacket & {
  total: number;
};

type UploadedResumeFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function safeFilename(value: string) {
  return value
    .trim()
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180) || "resume.txt";
}

function buildTextHash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function toJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function readUploadedFile(value: FormDataEntryValue | null): UploadedResumeFile | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as {
    name?: unknown;
    type?: unknown;
    size?: unknown;
    arrayBuffer?: unknown;
  };

  const arrayBuffer = candidate.arrayBuffer;

  if (
    typeof candidate.name !== "string" ||
    typeof candidate.size !== "number" ||
    typeof arrayBuffer !== "function"
  ) {
    return null;
  }

  return {
    name: candidate.name,
    type: typeof candidate.type === "string" ? candidate.type : "",
    size: candidate.size,
    arrayBuffer: () => arrayBuffer.call(value) as Promise<ArrayBuffer>
  };
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const formData = await request.formData();
    const file = readUploadedFile(formData.get("file"));

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "missing_file", message: "Envia um ficheiro no campo file." },
        { status: 400 }
      );
    }

    const mimeType = file.type || "application/octet-stream";

    const validation = validateResumeFile({
      filename: file.name,
      mimeType,
      sizeBytes: file.size
    });

    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, error: validation.error, message: validation.message },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const extraction = await extractResumeText({
      filename: file.name,
      mimeType,
      sizeBytes: file.size,
      buffer
    });

    if (!extraction.rawText) {
      return NextResponse.json(
        { ok: false, error: "empty_extracted_text", message: "Não foi possível extrair texto útil do CV." },
        { status: 400 }
      );
    }

    const extractedProfile = extractDevProfileFromText(extraction.rawText);
    const pool = getMysqlPool();
    const connection = await pool.getConnection();

    const resumeId = randomUUID();
    const devProfileId = `dev-profile-cv-${resumeId}`;
    const filename = `${resumeId}-${safeFilename(file.name)}`;
    const textHash = buildTextHash(extraction.rawText);

    try {
      await connection.beginTransaction();

      const [versionRows] = await connection.execute<CountRow[]>(
        "SELECT COUNT(*) AS total FROM resumes WHERE user_id = ?",
        [user.id]
      );

      const version = Number(versionRows[0]?.total ?? 0) + 1;

      await connection.execute<ResultSetHeader>(
        "UPDATE resumes SET active = 0, updated_at = NOW() WHERE user_id = ?",
        [user.id]
      );

      await connection.execute<ResultSetHeader>(
        "INSERT INTO resumes (id, user_id, version, filename, original_name, file_type, mime_type, size_bytes, file_path, raw_text, text_hash, detected_skills, detected_seniority, detected_strengths, extracted_profile, parser_version, source, uploaded_at, status, active, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 1, ?, NOW(), NOW())",
        [
          resumeId,
          user.id,
          version,
          filename,
          extraction.originalName,
          extraction.fileType,
          extraction.mimeType,
          extraction.sizeBytes,
          null,
          extraction.rawText,
          textHash,
          toJson(extractedProfile.detectedSkills),
          extractedProfile.seniority,
          toJson(extractedProfile.strengths),
          toJson(extractedProfile),
          extraction.parserVersion,
          "upload",
          "active",
          toJson({
            warnings: extraction.warnings,
            source: "cv-upload-api"
          })
        ]
      );

      await connection.execute<ResultSetHeader>(
        "UPDATE dev_profiles SET active = 0, updated_at = NOW() WHERE user_id = ?",
        [user.id]
      );

      await connection.execute<ResultSetHeader>(
        "INSERT INTO dev_profiles (id, user_id, resume_id, title, seniority, skills, languages, locations, work_modes, salary_min, preferences, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1, NOW(), NOW())",
        [
          devProfileId,
          user.id,
          resumeId,
          extractedProfile.title,
          extractedProfile.seniority,
          toJson(extractedProfile.skills),
          toJson(extractedProfile.languages),
          toJson(extractedProfile.locations),
          toJson(extractedProfile.workModes),
          toJson({
            source: "cv-upload",
            strengths: extractedProfile.strengths,
            summary: extractedProfile.summary,
            detectedSkills: extractedProfile.detectedSkills
          })
        ]
      );

      await connection.commit();

      return NextResponse.json({
        ok: true,
        resume: {
          id: resumeId,
          userId: user.id,
          version,
          filename,
          originalName: extraction.originalName,
          fileType: extraction.fileType,
          mimeType: extraction.mimeType,
          sizeBytes: extraction.sizeBytes,
          status: "active",
          active: true,
          rawTextPreview: extraction.rawText.slice(0, 600),
          detectedSkills: extractedProfile.detectedSkills,
          detectedSeniority: extractedProfile.seniority,
          detectedStrengths: extractedProfile.strengths,
          parserVersion: extraction.parserVersion
        },
        devProfile: {
          id: devProfileId,
          userId: user.id,
          resumeId,
          title: extractedProfile.title,
          seniority: extractedProfile.seniority,
          skills: extractedProfile.skills,
          languages: extractedProfile.languages,
          locations: extractedProfile.locations,
          workModes: extractedProfile.workModes,
          strengths: extractedProfile.strengths,
          summary: extractedProfile.summary,
          active: true
        }
      });
    } catch (error) {
      await connection.rollback();

      console.error("Failed to upload CV:", error);

      return NextResponse.json(
        { ok: false, error: "cv_upload_error", message: "Não foi possível processar o CV." },
        { status: 500 }
      );
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Failed to read CV upload:", error);

    return NextResponse.json(
      { ok: false, error: "cv_upload_read_error", message: "Não foi possível ler o upload do CV." },
      { status: 500 }
    );
  }
}
