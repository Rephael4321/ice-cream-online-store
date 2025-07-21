"use client";

import { useEffect, useState } from "react";

type CookieEntry = {
  name: string;
  value: string;
};

export default function CookieManager() {
  const [cookies, setCookies] = useState<CookieEntry[]>([]);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");

  // Parse document.cookie
  const parseCookies = () => {
    const parsed = document.cookie
      .split("; ")
      .filter(Boolean)
      .map((entry) => {
        const [name, ...rest] = entry.split("=");
        return {
          name,
          value: decodeURIComponent(rest.join("=")),
        };
      });
    setCookies(parsed);
  };

  useEffect(() => {
    parseCookies();
  }, []);

  const updateCookie = (name: string, value: string) => {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
    parseCookies();
  };

  const deleteCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    parseCookies();
  };

  const addNewCookie = () => {
    if (!newName.trim()) return;
    document.cookie = `${newName}=${encodeURIComponent(newValue)}; path=/`;
    setNewName("");
    setNewValue("");
    parseCookies();
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🍪 Cookie Manager</h1>

      <div className="space-y-4">
        {cookies.map((cookie) => (
          <div
            key={cookie.name}
            className="flex flex-col sm:flex-row sm:items-center gap-2 border-b pb-2"
          >
            <label className="font-semibold w-full sm:w-1/4 break-all">
              {cookie.name}:
            </label>
            <input
              className="border px-2 py-1 rounded flex-1 w-full"
              value={cookie.value}
              onChange={(e) => updateCookie(cookie.name, e.target.value)}
            />
            <button
              onClick={() => deleteCookie(cookie.name)}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <hr />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">➕ Add New Cookie</h2>
        <input
          className="border px-2 py-1 rounded w-full"
          placeholder="Cookie Name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="border px-2 py-1 rounded w-full"
          placeholder="Cookie Value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <button
          onClick={addNewCookie}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Add Cookie
        </button>
      </div>
    </div>
  );
}
