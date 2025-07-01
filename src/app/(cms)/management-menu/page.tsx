import JwtGatekeeper from "@/components/auth/jwt-gatekeeper";
import ManagementMenu from "@/components/cms/management-menu";

export default function ManagementMenuPage() {
  return (
    <JwtGatekeeper>
      <ManagementMenu />
    </JwtGatekeeper>
  );
}
