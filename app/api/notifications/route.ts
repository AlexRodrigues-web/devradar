import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { createNotification, deleteNotification, listNotifications, markNotificationRead } from "@/lib/server/services/domainService";

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
    const notifications = await listNotifications(user.id);
    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    console.error("Failed to load notifications:", error);
    return NextResponse.json({ ok: false, error: "notifications_error", message: "Failed to load notifications." }, { status: 500 });
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
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid notification payload." }, { status: 400 });
    }

    const notification = await createNotification(user.id, body);
    return NextResponse.json({ ok: true, notification });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return NextResponse.json({ ok: false, error: "notification_create_error", message: "Failed to create notification." }, { status: 500 });
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
      return NextResponse.json({ ok: false, error: "invalid_payload", message: "Invalid notification update payload." }, { status: 400 });
    }

    const notification = await markNotificationRead(user.id, body.id);

    if (!notification) {
      return NextResponse.json({ ok: false, error: "not_found", message: "Notification not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, notification });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json({ ok: false, error: "notification_update_error", message: "Failed to update notification." }, { status: 500 });
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
      return NextResponse.json({ ok: false, error: "missing_id", message: "Missing notification id." }, { status: 400 });
    }

    const deleted = await deleteNotification(user.id, id);
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return NextResponse.json({ ok: false, error: "notification_delete_error", message: "Failed to delete notification." }, { status: 500 });
  }
}
