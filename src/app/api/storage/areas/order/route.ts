import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function updateStorageAreaOrder(req: NextRequest) {
  try {
    const { areas } = await req.json();

    if (!Array.isArray(areas)) {
      return NextResponse.json(
        { error: "Missing or invalid areas array" },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (let i = 0; i < areas.length; i++) {
        const { id, name } = areas[i];
        if (!id || typeof name !== "string") continue;

        await client.query(
          `UPDATE storage_areas
           SET name = $1, sort_order = $2, updated_at = now()
           WHERE id = $3`,
          [name.trim(), i, id]
        );
      }

      await client.query("COMMIT");
      return NextResponse.json({ success: true });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Failed to update storage areas:", error);
      return NextResponse.json(
        { error: "Failed to update storage areas" },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}

export const POST = withMiddleware(updateStorageAreaOrder);
