"use client";

export default function BackButton() {
  return (
    <button
      onClick={() => history.back()}
      className="text-sm text-purple-600 hover:underline mb-4 block"
    >
      ← חזרה
    </button>
  );
}
