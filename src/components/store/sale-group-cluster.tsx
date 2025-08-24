"use client";

import { ReactNode } from "react";

export default function SaleGroupCluster({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-emerald-200">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white text-lg shadow">
            %
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-emerald-800">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-emerald-700">{subtitle}</p>
            )}
          </div>
        </div>

        {/* optional CTA area; keep simple for now */}
        {/* <button className="text-xs sm:text-sm px-3 py-1 rounded-full border border-emerald-400 text-emerald-700 hover:bg-emerald-100">
          קנה חבילת מבצע
        </button> */}
      </div>

      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
