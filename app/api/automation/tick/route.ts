import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { createLoopRun, listLoops } from "@/lib/server/services/domainService";

export const runtime = "nodejs";

type AutomationTickBody = {
  dryRun?: boolean;
  limit?: number;
  loopId?: string;
  recordHistory?: boolean;
};

type AutomationLoopCandidate = {
  id?: unknown;
  name?: unknown;
  status?: unknown;
  frequency?: unknown;
  active?: unknown;
  lastRunAt?: unknown;
  minScore?: unknown;
  automationMode?: unknown;
};

type DueLoopPlan = {
  loopId: string;
  name: string;
  frequency: string;
  status: string;
  active: boolean;
  lastRunAt: string | null;
  minutesSinceLastRun: number | null;
  due: boolean;
  reason: string;
  minScore: number | null;
  automationMode: string | null;
};

type AutomationHistoryRun = {
  loopId: string;
  runId: string;
  status: string;
  mode: "dry-run-history";
};

type AutomationTickError = {
  loopId: string;
  error: string;
};

const frequencyMinutes: Record<string, number> = {
  "1h": 60,
  "3h": 180,
  "6h": 360,
  "12h": 720,
  daily: 1440
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBody(value: unknown): AutomationTickBody {
  if (!isRecord(value)) {
    return {};
  }

  const dryRun = typeof value.dryRun === "boolean" ? value.dryRun : undefined;
  const recordHistory = typeof value.recordHistory === "boolean" ? value.recordHistory : undefined;
  const loopId = typeof value.loopId === "string" ? value.loopId.trim() : undefined;
  const rawLimit = typeof value.limit === "number" && Number.isFinite(value.limit) ? value.limit : null;
  const limit = rawLimit === null ? undefined : Math.max(1, Math.min(10, Math.trunc(rawLimit)));

  return {
    dryRun,
    limit,
    loopId: loopId || undefined,
    recordHistory
  };
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown) {
  return value === true || value === 1;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function minutesBetween(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
}

function buildLoopPlan(loop: AutomationLoopCandidate, now: Date): DueLoopPlan {
  const loopId = asString(loop.id, "");
  const name = asString(loop.name, "Loop sem nome");
  const status = asString(loop.status, "unknown");
  const frequency = asString(loop.frequency, "manual");
  const active = asBoolean(loop.active);
  const lastRunAtValue = typeof loop.lastRunAt === "string" ? loop.lastRunAt : null;
  const lastRunAt = parseDate(lastRunAtValue);
  const interval = frequencyMinutes[frequency];
  const minScore = asNumber(loop.minScore);
  const automationMode = typeof loop.automationMode === "string" ? loop.automationMode : null;

  if (!loopId) {
    return {
      loopId,
      name,
      frequency,
      status,
      active,
      lastRunAt: lastRunAtValue,
      minutesSinceLastRun: null,
      due: false,
      reason: "missing_loop_id",
      minScore,
      automationMode
    };
  }

  if (!active || status !== "active") {
    return {
      loopId,
      name,
      frequency,
      status,
      active,
      lastRunAt: lastRunAtValue,
      minutesSinceLastRun: lastRunAt ? minutesBetween(lastRunAt, now) : null,
      due: false,
      reason: "loop_not_active",
      minScore,
      automationMode
    };
  }

  if (!interval) {
    return {
      loopId,
      name,
      frequency,
      status,
      active,
      lastRunAt: lastRunAtValue,
      minutesSinceLastRun: lastRunAt ? minutesBetween(lastRunAt, now) : null,
      due: false,
      reason: "manual_or_unsupported_frequency",
      minScore,
      automationMode
    };
  }

  if (!lastRunAt) {
    return {
      loopId,
      name,
      frequency,
      status,
      active,
      lastRunAt: null,
      minutesSinceLastRun: null,
      due: true,
      reason: "never_run",
      minScore,
      automationMode
    };
  }

  const minutesSinceLastRun = minutesBetween(lastRunAt, now);
  const due = minutesSinceLastRun >= interval;

  return {
    loopId,
    name,
    frequency,
    status,
    active,
    lastRunAt: lastRunAtValue,
    minutesSinceLastRun,
    due,
    reason: due ? "frequency_elapsed" : "not_due_yet",
    minScore,
    automationMode
  };
}

async function createDryRunHistoryRuns(userId: string, dueLoops: DueLoopPlan[], generatedAt: Date) {
  const historyRunsCreated: AutomationHistoryRun[] = [];
  const errors: AutomationTickError[] = [];

  for (const plan of dueLoops) {
    try {
      const run = await createLoopRun(userId, {
        loopId: plan.loopId,
        status: "success",
        found: 0,
        duplicates: 0,
        rejected: 0,
        approved: 0,
        failedSources: [],
        startedAt: generatedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        metadata: {
          mode: "automation_tick_dry_run_history",
          dryRun: true,
          executionEnabled: false,
          generatedAt: generatedAt.toISOString(),
          loop: {
            id: plan.loopId,
            name: plan.name,
            frequency: plan.frequency,
            minScore: plan.minScore,
            automationMode: plan.automationMode
          },
          decision: {
            due: plan.due,
            reason: plan.reason,
            lastRunAt: plan.lastRunAt,
            minutesSinceLastRun: plan.minutesSinceLastRun
          },
          safety: {
            jobsExecuted: false,
            notificationsCreated: false,
            emailSent: false,
            schedulerTriggered: false
          }
        }
      });

      historyRunsCreated.push({
        loopId: plan.loopId,
        runId: String(run.id),
        status: String(run.status),
        mode: "dry-run-history"
      });
    } catch (error) {
      errors.push({
        loopId: plan.loopId,
        error: error instanceof Error ? error.message : "Unknown dry-run history error"
      });
    }
  }

  return {
    historyRunsCreated,
    errors
  };
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  const body = readBody(await request.json().catch(() => null));
  const now = new Date();
  const limit = body.limit ?? 10;
  const requestedDryRun = body.dryRun ?? true;
  const recordHistory = body.recordHistory === true;

  try {
    const loops = await listLoops(user.id);
    const plans = loops
      .map((loop) => buildLoopPlan(loop as AutomationLoopCandidate, now))
      .filter((plan) => !body.loopId || plan.loopId === body.loopId);

    const dueLoops = plans.filter((plan) => plan.due).slice(0, limit);
    const skipped = plans.filter((plan) => !plan.due);

    const historyResult = recordHistory
      ? await createDryRunHistoryRuns(user.id, dueLoops, now)
      : { historyRunsCreated: [], errors: [] };

    const ok = historyResult.errors.length === 0;

    return NextResponse.json(
      {
        ok,
        mode: recordHistory ? "dry-run-history" : "dry-run-only",
        dryRun: true,
        requestedDryRun,
        recordHistory,
        executionEnabled: false,
        message: recordHistory
          ? "Automation tick evaluated due loops and recorded dry-run history only. No jobs were executed."
          : "Automation tick dry-run only. No loops were executed and no history was recorded.",
        generatedAt: now.toISOString(),
        checkedLoops: plans.length,
        dueLoops,
        skipped,
        historyRunsCreated: historyResult.historyRunsCreated,
        executed: [],
        notificationsCreated: [],
        errors: historyResult.errors
      },
      { status: ok ? 200 : 500 }
    );
  } catch (error) {
    console.error("Automation tick dry-run failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "automation_tick_dry_run_error",
        message: "Failed to evaluate automation tick dry-run.",
        dueLoops: [],
        skipped: [],
        historyRunsCreated: [],
        executed: [],
        notificationsCreated: [],
        errors: [
          error instanceof Error ? error.message : "Unknown automation tick error"
        ]
      },
      { status: 500 }
    );
  }
}