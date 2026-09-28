import mysql, { type Pool, type PoolOptions } from "mysql2/promise";

let pool: Pool | null = null;

function getDatabaseUrl() {
  return process.env.DEVRADAR_DATABASE_URL ?? "";
}

function parseMysqlUrl(value: string): PoolOptions {
  const url = new URL(value);

  if (url.protocol !== "mysql:") {
    throw new Error("DEVRADAR_DATABASE_URL must use mysql:// protocol.");
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));

  if (!database) {
    throw new Error("DEVRADAR_DATABASE_URL must include a database name.");
  }

  return {
    host: url.hostname,
    port: Number(url.port || "3306"),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  };
}

export function isMysqlConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getMysqlPool() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DEVRADAR_DATABASE_URL is not configured.");
  }

  if (!pool) {
    pool = mysql.createPool(parseMysqlUrl(databaseUrl));
  }

  return pool;
}
