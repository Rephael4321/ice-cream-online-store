import { notFound } from "next/navigation";

/** Internal route: middleware rewrites here; JwtGatekeeper navigates here so we emit a real 404. */
export default function CmsUnauthorizedPage() {
  notFound();
}
