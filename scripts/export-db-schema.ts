import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

type TableRow = { table_name: string };
type ColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_not_null: string;
  column_default: string | null;
};
type ForeignKeyRow = {
  table_name: string;
  constraint_name: string;
  source_columns: string[];
  target_table: string;
  target_columns: string[];
  delete_action: string;
};
type UniqueConstraintRow = {
  table_name: string;
  constraint_name: string;
  columns: string[];
  is_primary: boolean;
};
type IndexRow = {
  table_name: string;
  index_name: string;
  access_method: string;
  columns: string[];
  is_unique: boolean;
};
type CheckConstraintRow = {
  table_name: string;
  constraint_name: string;
  expression: string;
};

function formatColumnList(columns: string[]): string {
  return columns.length > 1 ? `(${columns.join(", ")})` : columns[0] ?? "";
}

function normalizeTextArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return [trimmed];
  const body = trimmed.slice(1, -1);
  if (!body) return [];
  return body.split(",");
}

function resolveDeleteAction(code: string): string {
  switch (code) {
    case "a":
      return "NO ACTION";
    case "r":
      return "RESTRICT";
    case "c":
      return "CASCADE";
    case "n":
      return "SET NULL";
    case "d":
      return "SET DEFAULT";
    default:
      return "NO ACTION";
  }
}

function normalizeConstraintExpression(expression: string): string {
  const trimmed = expression.trim();
  if (trimmed.startsWith("CHECK ")) {
    return trimmed.slice("CHECK ".length);
  }
  if (trimmed.startsWith("NOT NULL ")) {
    const col = trimmed.slice("NOT NULL ".length).trim();
    return `${col} IS NOT NULL`;
  }
  return trimmed;
}

export async function exportDbSchemaToDocs(
  connectionString: string,
  outputPath = path.resolve(process.cwd(), "docs/db-schema.txt")
): Promise<void> {
  const pool = new Pool({ connectionString });

  try {
    const tables = (
      await pool.query<TableRow>(
        `select table_name
         from information_schema.tables
         where table_schema = 'public' and table_type = 'BASE TABLE'
         order by table_name`
      )
    ).rows;

    const columns = (
      await pool.query<ColumnRow>(
        `select
           table_name,
           column_name,
           data_type,
           is_nullable as is_not_null,
           column_default
         from information_schema.columns
         where table_schema = 'public'
         order by table_name, column_name`
      )
    ).rows;

    const foreignKeys = (
      await pool.query<ForeignKeyRow>(
        `select
           c.relname as table_name,
           con.conname as constraint_name,
          array_agg(src_att.attname order by src_keys.ord)::text[] as source_columns,
           format('%I.%I', tn.nspname, tgt.relname) as target_table,
          array_agg(tgt_att.attname order by tgt_keys.ord)::text[] as target_columns,
           con.confdeltype as delete_action
         from pg_constraint con
         join pg_class c on c.oid = con.conrelid
         join pg_namespace n on n.oid = c.relnamespace
         join pg_class tgt on tgt.oid = con.confrelid
         join pg_namespace tn on tn.oid = tgt.relnamespace
         join lateral unnest(con.conkey) with ordinality as src_keys(attnum, ord) on true
         join lateral unnest(con.confkey) with ordinality as tgt_keys(attnum, ord) on tgt_keys.ord = src_keys.ord
         join pg_attribute src_att on src_att.attrelid = con.conrelid and src_att.attnum = src_keys.attnum
         join pg_attribute tgt_att on tgt_att.attrelid = con.confrelid and tgt_att.attnum = tgt_keys.attnum
         where n.nspname = 'public' and con.contype = 'f'
         group by c.relname, con.conname, tn.nspname, tgt.relname, con.confdeltype
         order by c.relname, con.conname`
      )
    ).rows;

    const uniqueConstraints = (
      await pool.query<UniqueConstraintRow>(
        `select
           c.relname as table_name,
           con.conname as constraint_name,
           array_agg(att.attname order by keys.ord)::text[] as columns,
           (con.contype = 'p') as is_primary
         from pg_constraint con
         join pg_class c on c.oid = con.conrelid
         join pg_namespace n on n.oid = c.relnamespace
         join lateral unnest(con.conkey) with ordinality as keys(attnum, ord) on true
         join pg_attribute att on att.attrelid = con.conrelid and att.attnum = keys.attnum
         where n.nspname = 'public' and con.contype in ('p', 'u')
         group by c.relname, con.conname, con.contype
         order by c.relname, con.conname`
      )
    ).rows;

    const indexes = (
      await pool.query<IndexRow>(
        `select
           t.relname as table_name,
           i.relname as index_name,
           am.amname as access_method,
           array_agg(a.attname order by keys.ord)::text[] as columns,
           idx.indisunique as is_unique
         from pg_index idx
         join pg_class t on t.oid = idx.indrelid
         join pg_namespace n on n.oid = t.relnamespace
         join pg_class i on i.oid = idx.indexrelid
         join pg_am am on am.oid = i.relam
         join lateral unnest(idx.indkey) with ordinality as keys(attnum, ord) on true
         join pg_attribute a on a.attrelid = t.oid and a.attnum = keys.attnum
         where n.nspname = 'public'
         group by t.relname, i.relname, am.amname, idx.indisunique
         order by t.relname, i.relname`
      )
    ).rows;

    const checkConstraints = (
      await pool.query<CheckConstraintRow>(
        `select
           c.relname as table_name,
           con.conname as constraint_name,
           pg_get_constraintdef(con.oid, true) as expression
         from pg_constraint con
         join pg_class c on c.oid = con.conrelid
         join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and con.contype in ('c', 'n')
         order by c.relname, con.conname`
      )
    ).rows;

    const lines: string[] = [];

    for (const table of tables) {
      const tableName = table.table_name;
      lines.push(`📦 Table: public.${tableName}`);

      const tableColumns = columns.filter((row) => row.table_name === tableName);
      for (const column of tableColumns) {
        const parts = [`${column.column_name} ${column.data_type}`];
        if (column.is_not_null === "NO") parts.push("NOT NULL");
        if (column.column_default !== null) parts.push(`DEFAULT ${column.column_default}`);
        lines.push(`  - ${parts.join(" ")}`);
      }
      lines.push("");

      const tableForeignKeys = foreignKeys.filter((row) => row.table_name === tableName);
      if (tableForeignKeys.length > 0) {
        lines.push("🔗 Foreign Keys:");
        for (const fk of tableForeignKeys) {
          const sourceColumns = normalizeTextArray(fk.source_columns);
          const targetColumns = normalizeTextArray(fk.target_columns);
          lines.push(
            `  - ${fk.constraint_name}: ${formatColumnList(sourceColumns)} → ${fk.target_table}(${targetColumns.join(", ")}) ON DELETE ${resolveDeleteAction(fk.delete_action)}`
          );
        }
        lines.push("");
      }

      const tableUniques = uniqueConstraints.filter((row) => row.table_name === tableName);
      if (tableUniques.length > 0) {
        lines.push("🔑 Unique Constraints:");
        for (const unique of tableUniques) {
          const columns = normalizeTextArray(unique.columns);
          lines.push(
            `  - ${unique.constraint_name}: ${formatColumnList(columns)} [${unique.is_primary ? "PRIMARY KEY" : "UNIQUE"}]`
          );
        }
        lines.push("");
      }

      const tableIndexes = indexes.filter((row) => row.table_name === tableName);
      if (tableIndexes.length > 0) {
        lines.push("📊 Indexes:");
        for (const index of tableIndexes) {
          const columns = normalizeTextArray(index.columns);
          lines.push(
            `  - ${index.index_name}: ${formatColumnList(columns)} [${index.access_method}]${index.is_unique ? " [UNIQUE]" : ""}`
          );
        }
        lines.push("");
      }

      const tableChecks = checkConstraints.filter((row) => row.table_name === tableName);
      if (tableChecks.length > 0) {
        lines.push("✅ Check Constraints:");
        for (const check of tableChecks) {
          lines.push(`  - ${check.constraint_name}: ${normalizeConstraintExpression(check.expression)}`);
        }
        lines.push("");
      }
    }

    const fileContent = `${lines.join("\n").trimEnd()}\n`;
    fs.writeFileSync(outputPath, fileContent, "utf8");
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const localUrl = process.env.DATABASE_URL;
  if (!localUrl) throw new Error("Missing DATABASE_URL in .env.local");

  await exportDbSchemaToDocs(localUrl);
  console.log("Updated docs/db-schema.txt");
}

const scriptPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const thisPath = fileURLToPath(import.meta.url);
if (scriptPath && scriptPath === thisPath) {
  main().catch((err) => {
    console.error(`\n[Error]: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
