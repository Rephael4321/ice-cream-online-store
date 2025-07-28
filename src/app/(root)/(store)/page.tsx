// ✅ Force SSR — disables static optimization and caching
export const dynamic = "force-dynamic";

import MainMenu from "@/components/store/main-menu";

export default function MainMenuPage() {
  return <MainMenu />;
}
