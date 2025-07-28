import Cart from "@/components/store/cart/cart";
import Link from "next/link";
import Image from "next/image";

export default function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <div className="sticky top-0 z-50 w-full bg-white px-4 py-3 sm:px-6 md:px-8 shadow-md border-b border-gray-200">
      {/* Desktop layout */}
      <div className="hidden sm:flex items-center justify-between w-full">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold text-pink-700 whitespace-nowrap"
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

        {/* Nav buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="px-4 py-2 bg-pink-50 text-pink-700 text-lg rounded-md shadow-sm hover:bg-pink-100 hover:text-pink-900 transition font-semibold max-w-[200px] w-full sm:w-auto text-center"
          >
            חזרה לתפריט ראשי
          </Link>

          {isAdmin && (
            <Link
              href="/management-menu"
              className="px-4 py-2 bg-red-100 text-red-700 text-lg rounded-md shadow-sm hover:bg-red-200 hover:text-red-900 transition font-semibold max-w-[200px] w-full sm:w-auto text-center"
            >
              ניהול חנות ⚙️
            </Link>
          )}
        </div>

        {/* Cart */}
        <Cart />
      </div>

      {/* Mobile layout */}
      <div className="sm:hidden flex flex-col w-full">
        {/* Top: Logo + Cart */}
        <div className="flex justify-between items-center w-full">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-pink-700 whitespace-nowrap"
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
          <Cart />
        </div>

        {/* Bottom: Buttons centered and size-limited */}
        <div className="flex justify-center mt-3 px-8 w-full max-w-[640px] mx-auto gap-3">
          <Link
            href="/"
            className="px-3 py-2 bg-pink-50 text-pink-700 text-sm rounded-md shadow-sm hover:bg-pink-100 hover:text-pink-900 transition font-semibold w-full max-w-[180px] text-center"
          >
            חזרה לתפריט
          </Link>

          {isAdmin && (
            <Link
              href="/management-menu"
              className="px-3 py-2 bg-red-100 text-red-700 text-sm rounded-md shadow-sm hover:bg-red-200 hover:text-red-900 transition font-semibold w-full max-w-[180px] text-center"
            >
              ניהול חנות ⚙️
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
