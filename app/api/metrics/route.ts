import type { RowDataPacket } from "mysql2";
import { NextRequest, NextResponse } from "next/server";

import { getAuthUserFromRequest, unauthorizedJson } from "@/lib/server/auth";
import { getMysqlPool } from "@/lib/server/mysql";

type CountRow = RowDataPacket & {
  total: number;
};

type StatusCountRow = RowDataPacket & {
  status: string;
  total: number;
};

type ApplicationCountRow = RowDataPacket & {
  status: string;
  automation_status: string;
  total: number;
};

type EventCountRow = RowDataPacket & {
  event_type: string;
  total: number;
};

type OutreachCountRow = RowDataPacket & {
  status: string;
  total: number;
};

type LoopRunAggregateRow = RowDataPacket & {
  runs: number;
  found: number;
  duplicates: number;
  rejected: number;
  approved: number;
};

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function countByKey<T extends { total: number }>(rows: T[], key: keyof T) {
  const map = new Map<string, number>();

  for (const row of rows) {
    map.set(String(row[key]), numberValue(row.total));
  }

  return map;
}

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromRequest(request);

  if (!user) {
    return unauthorizedJson();
  }

  try {
    const pool = getMysqlPool();

    const [
      [opportunityTotalRows],
      [statusRows],
      [applicationRows],
      [outreachRows],
      [eventRows],
      [loopRunRows]
    ] = await Promise.all([
      pool.execute<CountRow[]>("SELECT COUNT(*) AS total FROM opportunities WHERE user_id = ?", [user.id]),
      pool.execute<StatusCountRow[]>("SELECT status, COUNT(*) AS total FROM opportunity_statuses WHERE user_id = ? GROUP BY status", [user.id]),
      pool.execute<ApplicationCountRow[]>("SELECT status, automation_status, COUNT(*) AS total FROM application_records WHERE user_id = ? GROUP BY status, automation_status", [user.id]),
      pool.execute<OutreachCountRow[]>("SELECT om.status, COUNT(*) AS total FROM outreach_messages om INNER JOIN application_records ar ON ar.id = om.application_id WHERE ar.user_id = ? GROUP BY om.status", [user.id]),
      pool.execute<EventCountRow[]>("SELECT event_type, COUNT(*) AS total FROM opportunity_events WHERE user_id = ? GROUP BY event_type", [user.id]),
      pool.execute<LoopRunAggregateRow[]>("SELECT COUNT(*) AS runs, COALESCE(SUM(found), 0) AS found, COALESCE(SUM(duplicates), 0) AS duplicates, COALESCE(SUM(rejected), 0) AS rejected, COALESCE(SUM(approved), 0) AS approved FROM loop_runs WHERE user_id = ?", [user.id])
    ]);

    const statusCounts = countByKey(statusRows, "status");
    const eventCounts = countByKey(eventRows, "event_type");
    const outreachCounts = countByKey(outreachRows, "status");

    const applicationsTotal = applicationRows.reduce((sum, row) => sum + numberValue(row.total), 0);
    const proposals = applicationRows
      .filter((row) => row.status === "proposal")
      .reduce((sum, row) => sum + numberValue(row.total), 0);
    const needsReview = applicationRows
      .filter((row) => row.automation_status === "needs-review")
      .reduce((sum, row) => sum + numberValue(row.total), 0);

    const conversations =
      (statusCounts.get("conversation") ?? 0) +
      (statusCounts.get("proposal") ?? 0) +
      (statusCounts.get("won") ?? 0);

    const responseRate = applicationsTotal > 0 ? Math.round((conversations / applicationsTotal) * 100) : 0;

    const loopRunTotals = loopRunRows[0] ?? {
      runs: 0,
      found: 0,
      duplicates: 0,
      rejected: 0,
      approved: 0
    };

    const metrics = {
      opportunities: {
        total: numberValue(opportunityTotalRows[0]?.total),
        selected: statusCounts.get("selected") ?? 0,
        applied: statusCounts.get("applied") ?? 0,
        conversation: statusCounts.get("conversation") ?? 0,
        proposal: statusCounts.get("proposal") ?? 0,
        won: statusCounts.get("won") ?? 0,
        lost: statusCounts.get("lost") ?? 0,
        ignored: statusCounts.get("ignored") ?? 0
      },
      applications: {
        total: applicationsTotal,
        proposals,
        needsReview,
        responseRate
      },
      outreach: {
        drafts: outreachCounts.get("draft") ?? 0,
        approved: outreachCounts.get("approved") ?? 0,
        sent: outreachCounts.get("sent") ?? 0
      },
      events: {
        total: eventRows.reduce((sum, row) => sum + numberValue(row.total), 0),
        statusChanged: eventCounts.get("status_changed") ?? 0,
        proposalCreated: eventCounts.get("proposal_created") ?? 0,
        followUpCreated: eventCounts.get("follow_up_created") ?? 0
      },
      loops: {
        runs: numberValue(loopRunTotals.runs),
        found: numberValue(loopRunTotals.found),
        duplicates: numberValue(loopRunTotals.duplicates),
        rejected: numberValue(loopRunTotals.rejected),
        approved: numberValue(loopRunTotals.approved)
      }
    };

    return NextResponse.json({
      ok: true,
      metrics
    });
  } catch (error) {
    console.error("Failed to load metrics:", error);

    return NextResponse.json(
      { ok: false, error: "metrics_error", message: "Failed to load metrics." },
      { status: 500 }
    );
  }
}
