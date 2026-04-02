"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth/auth-context";
import LogoutButton from "@/components/cms/logout-button";
import { useCallback, useEffect, useRef, useState } from "react";

const LONG_PRESS_MS = 550;

type CmsNavbarBrandProps = {
  /** Classes for the logo row (size, color) */
  linkClassName: string;
  /** Classes for the revealed logout control (match other nav links) */
  logoutLinkClassName: string;
};

export default function CmsNavbarBrand({
  linkClassName,
  logoutLinkClassName,
}: CmsNavbarBrandProps) {
  const { role } = useAuth();
  const [showLogout, setShowLogout] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const clearTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(() => {
    if (!role) return;
    longPressTriggeredRef.current = false;
    clearTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setShowLogout(true);
    }, LONG_PRESS_MS);
  }, [role, clearTimer]);

  const onPointerEnd = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const onLogoClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    if (longPressTriggeredRef.current) {
      e.preventDefault();
      longPressTriggeredRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!showLogout) return;
    const onDocPointerDown = (ev: PointerEvent) => {
      if (!wrapRef.current?.contains(ev.target as Node)) {
        setShowLogout(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocPointerDown, true);
  }, [showLogout]);

  return (
    <div ref={wrapRef} className="relative inline-flex flex-col items-start">
      <Link
        href="/"
        className={`select-none touch-manipulation ${linkClassName}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
        onClick={onLogoClick}
      >
        <span className="flex items-center gap-2">
          <Image
            src="/favicon_io/android-chrome-192x192.png"
            alt="המפנק"
            width={32}
            height={32}
            sizes="(max-width: 640px) 32px, (max-width: 1024px) 64px, 128px"
          />
          המפנק
        </span>
      </Link>
      {role && showLogout ? (
        <div className="absolute start-0 top-full z-[60] mt-1 whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 py-2 shadow-md">
          <LogoutButton className={logoutLinkClassName} />
        </div>
      ) : null}
    </div>
  );
}
