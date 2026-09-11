import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { reportScriptError } from "./safe-error";

type Finding = {
  check_name: string;
  violations: string;
};

function reportResult(
  result: QueryResult<QueryResultRow> | QueryResult<QueryResultRow>[]
): QueryResult<Finding> | undefined {
  const results = Array.isArray(result) ? result : [result];
  return [...results].reverse().find(
    (candidate) =>
      candidate.fields[0]?.name === "check_name" &&
      candidate.fields[1]?.name === "violations"
  ) as QueryResult<Finding> | undefined;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL es obligatorio.");

  const sql = readFileSync(
    resolve(process.cwd(), "scripts/sql/check-branch-isolation.sql"),
    "utf8"
  );
  const [reportSql, assertionSql] = sql.split("-- ASSERT_BRANCH_ISOLATION");
  if (!reportSql || !assertionSql) {
    throw new Error("El chequeo SQL no contiene la separación de aserción esperada.");
  }
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const result = reportResult(await pool.query(reportSql));
    if (!result) throw new Error("El chequeo SQL no devolvió su reporte final.");
    for (const row of result.rows) {
      console.log(`${row.check_name}=${row.violations}`);
    }
    await pool.query(assertionSql);
    console.log(`Aislamiento aprobado: ${result.rowCount ?? result.rows.length} checks en cero.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  reportScriptError("Chequeo SQL de aislamiento", error);
  process.exitCode = 1;
});
