import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Preserve original query params
  const { searchParams } = new URL(req.url);

  // Point to your Authenticator app
  const authAppBase = process.env.AUTH_SERVER_API_URL;

  // Build the redirect URL
  const redirectUrl = `${authAppBase}?${searchParams.toString()}`;

  // Redirect user to the Authenticator app
  return NextResponse.redirect(redirectUrl);
}
