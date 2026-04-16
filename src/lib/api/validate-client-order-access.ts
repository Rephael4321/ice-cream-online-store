import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isAdminEquivalentRole } from "@/lib/auth/roles";
import { AUTH_COOKIE_NAME } from "@/lib/auth/session";
import { verifyPrivilegedSession } from "@/lib/jwt";

export async function validateClientOrderAccess(
  req: NextRequest,
  context: { params: Promise<{ id: string }>; [key: string]: any }
): Promise<NextResponse | void> {
  const cookie = cookies();
  const phone = (await cookie).get("phoneNumber")?.value;
  const token = (await cookie).get(AUTH_COOKIE_NAME)?.value;
  const { id } = await context.params;
  const orderId = Number(id);

  console.log("🔐 Validating client order access...");

  if (isNaN(orderId)) {
    console.warn("❌ Invalid order ID:", id);
    return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
  }

  const session = token ? await verifyPrivilegedSession(token) : null;
  const isPrivilegedForCms = isAdminEquivalentRole(session?.role);

  if (isPrivilegedForCms) {
    const url = `/orders/${orderId}`;
    console.log("🧑‍💼 Admin detected – redirecting to CMS:", url);
    return NextResponse.redirect(new URL(url, req.url));
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
