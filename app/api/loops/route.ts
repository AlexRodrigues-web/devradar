import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { createLoop, deleteLoop, listLoops, updateLoop } from "@/lib/server/services/domainService";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const loops = await listLoops(user.id);
    return NextResponse.json({ ok: true, loops });
  } catch (error) {
    console.error("Failed to load loops:", error);
    return NextResponse.json({ ok: false, error: "loops_error", message: "Failed to load loops." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const body = await request.json().catch(() => null);

    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid loop payload." }, { status: 400 });
    }

    const loop = await createLoop(user.id, body);
    return NextResponse.json({ ok: true, loop });
  } catch (error) {
    console.error("Failed to create loop:", error);
    return NextResponse.json({ ok: false, error: "loop_create_error", message: "Failed to create loop." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const body = await request.json().catch(() => null);

    if (!isRecord(body) || typeof body.id !== "string") {
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid loop update payload." }, { status: 400 });
    }

    const loop = await updateLoop(user.id, body.id, body);

    if (!loop) {
      return NextResponse.json({ ok: false, error: "not_found", message: "Loop not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, loop });
  } catch (error) {
    console.error("Failed to update loop:", error);
    return NextResponse.json({ ok: false, error: "loop_update_error", message: "Failed to update loop." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "missing_id", message: "Missing loop id." }, { status: 400 });
    }

    const deleted = await deleteLoop(user.id, id);
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("Failed to delete loop:", error);
    return NextResponse.json({ ok: false, error: "loop_delete_error", message: "Failed to delete loop." }, { status: 500 });
  }
}
