import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/api/with-middleware";
import pool from "@/lib/db";

async function deleteStorageArea(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const res = await pool.query(`DELETE FROM storage_areas WHERE id = $1`, [
      id,
    ]);

    if (res.rowCount === 0) {
      return NextResponse.json(
        { error: "Storage area not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Error deleting storage area:", error);
    return NextResponse.json(
      { error: "Failed to delete storage area" },
      { status: 500 }
    );
  }
}

export const DELETE = withMiddleware(deleteStorageArea);
