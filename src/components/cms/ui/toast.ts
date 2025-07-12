// components/ui/toast.ts
import { toast } from "sonner";

export function showToast(
  message: string,
  type: "success" | "error" | "info" = "success"
) {
  toast[type](message, {
    action: {
      label: "✕",
      onClick: () => {},
    },
  });
}
