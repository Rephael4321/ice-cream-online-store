import Cart from "@/components/store/cart";
import Link from "next/link";
import Image from "next/image";

export default function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <div className="sticky top-0 z-50 w-full bg-pink-100 px-4 py-3 sm:px-6 md:px-8 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        {/* Top: Logo + Cart */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-pink-700"
          >
            <Image
              src="/favicon_io/android-chrome-192x192.png"
              alt="המפנק"
              width={32}
              height={32}
              sizes="(max-width: 640px) 32px, (max-width: 1024px) 64px, 128px"
            />
            המפנק
          </Link>

          {/* Cart always top-right on mobile */}
          <div className="sm:hidden">
            <Cart />
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 mt-2 sm:mt-0">
          <Link
            href="/"
            className="px-4 py-2 bg-white text-pink-700 text-base sm:text-lg rounded-md shadow hover:bg-pink-200 hover:text-pink-900 transition font-semibold w-full sm:w-auto text-center"
          >
            חזרה לתפריט ראשי
          </Link>

          {isAdmin && (
            <Link
              href="/management-menu"
              className="text-base sm:text-xl font-semibold text-red-600 underline w-full sm:w-auto text-center"
            >
              ניהול חנות ⚙️
            </Link>
          )}
        </div>

        {/* Cart on right for desktop */}
        <div className="hidden sm:block mt-2 sm:mt-0">
          <Cart />
        </div>
      </div>
    </div>
  );
}
