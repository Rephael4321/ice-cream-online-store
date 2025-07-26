import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

export async function validateClientOrderAccess(
  req: NextRequest,
  context: { params: { id: string }; [key: string]: any }
): Promise<NextResponse | void> {
  const cookie = cookies();
  const phone = (await cookie).get("phoneNumber")?.value;
  const token = (await cookie).get("token")?.value;
  const orderId = Number(context.params.id);

  console.log("🔐 Validating client order access...");

  if (isNaN(orderId)) {
    console.warn("❌ Invalid order ID:", context.params.id);
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const payload = token ? await verifyJWT(token) : null;
  const isAdmin = payload?.role === "admin" || payload?.id === "admin";

  if (isAdmin) {
    const url = `http://localhost:3000/orders/${orderId}`;
    console.log("🧑‍💼 Admin detected – redirecting to CMS:", url);
    return NextResponse.redirect(url);
  }

  if (!phone) {
    console.warn("❌ No phone cookie found");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("📱 Client phone validated:", phone);

  // ✅ Attach values to context for handler to use
  context.phone = phone;
  context.orderId = orderId;
}
