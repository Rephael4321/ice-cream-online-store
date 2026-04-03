import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-semibold text-neutral-400">404</p>
      <h1 className="max-w-md text-lg font-medium text-neutral-800">
        העמוד לא נמצא
      </h1>
      <Link
        href="/"
        className="text-sm font-medium text-sky-700 underline underline-offset-4 hover:text-sky-900"
      >
        חזרה לדף הבית
      </Link>
    </main>
  );
}
