"use client";

import Link from "next/link";

export default function AuthSetup() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-2xl p-6 shadow-sm bg-white">
        <h1 className="text-xl font-semibold mb-2">Save login shortcut</h1>
        <p className="text-sm text-gray-600 mb-4">
          Add this screen to your home screen for a one-tap shortcut with the
          correct icon. Then tap <b>Continue</b>.
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
          <Link
            href="/"
            className="px-3 py-2 rounded bg-black text-white inline-block"
          >
            Continue
          </Link>
        </div>
      </div>
    </main>
  );
}
