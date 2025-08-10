"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const SETUP_FLAG = "auth_setup_done_v1"; // bump to re-show setup later

function hasFlag() {
  try {
    if (
      typeof window !== "undefined" &&
      localStorage.getItem(SETUP_FLAG) === "1"
    ) {
      return true;
    }
  } catch {
    // ignore
  }
  return document.cookie
    .split("; ")
    .some((c) => c.startsWith(`${SETUP_FLAG}=`));
}

function setFlag(days = 365) {
  try {
    if (typeof window !== "undefined") localStorage.setItem(SETUP_FLAG, "1");
  } catch {
    // ignore
  }
  const exp = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${SETUP_FLAG}=1; Expires=${exp}; Path=/; SameSite=Lax;${
    secure ? " Secure" : ""
  }`;
}

export default function AuthSetup() {
  const sp = useSearchParams();
  const qs = sp.toString();
  const targetHref = useMemo(() => (qs ? `/api/auth/entry?${qs}` : ""), [qs]);

  const [show, setShow] = useState(false);

  useEffect(() => {
    // If we already did setup on this device → skip UI but STILL hit real auth.
    if (targetHref && hasFlag()) {
      window.location.replace(targetHref);
      return;
    }
    setShow(true);
  }, [targetHref]);

  function continueNow() {
    if (!targetHref) return;
    setFlag(); // one-time device flag
    window.location.replace(targetHref); // → client proxy → Auth app → JWT verify/refresh → callback
  }

  if (!show) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-2xl p-6 shadow-sm bg-white">
        <h1 className="text-xl font-semibold mb-2">Save login shortcut</h1>
        <p className="text-sm text-gray-600 mb-4">
          Add this screen to your home screen so you’ll have a one-tap login
          with the correct icon. Then tap <b>Continue</b>.
        </p>

        <ol className="list-decimal ml-5 space-y-2 text-sm text-gray-700 mb-6">
          <li>Open the browser menu (⋮) in the top-right.</li>
          <li>
            Choose <b>Add to Home screen</b> (or <b>Install app</b>).
          </li>
          <li>
            Return here and tap <b>Continue</b>.
          </li>
        </ol>

        <div className="flex gap-2">
          <button
            onClick={continueNow}
            className="px-3 py-2 rounded bg-black text-white"
          >
            Continue
          </button>
          <a
            href={targetHref || "#"}
            onClick={(e) => {
              e.preventDefault();
              continueNow();
            }}
            className="px-3 py-2 rounded border"
          >
            Continue (now)
          </a>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          This flag only skips this screen next time. Authentication is still
          verified by the server on every login.
        </p>
      </div>
    </main>
  );
}
