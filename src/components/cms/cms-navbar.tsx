import Cart from "@/components/store/cart/cart";
import Link from "next/link";
import Image from "next/image";

export default function CmsNavbar() {
  return (
    <div className="sticky top-0 z-50 w-full bg-white px-4 py-3 sm:px-6 md:px-8 shadow-md border-b border-gray-200">
      {/* Desktop only (lg+): full menu row; tablet and mobile use stacked layout */}
      <div className="hidden lg:flex items-center justify-between w-full">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold whitespace-nowrap"
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

        {/* Nav Buttons */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xl text-gray-700 hover:text-purple-700 transition hover:underline"
          >
            חנות
          </Link>
          <Link
            href="/orders"
            className="text-xl text-gray-700 hover:text-purple-700 transition hover:underline"
          >
            הזמנות
          </Link>
          <Link
            href="/management-menu"
            className="text-xl text-gray-700 hover:text-purple-700 transition hover:underline"
          >
            כלי ניהול
          </Link>
        </div>

        {/* Cart */}
        <Cart />
      </div>

      {/* Mobile + tablet: two stacked rows */}
      <div className="lg:hidden flex flex-col w-full">
        {/* Top: Logo + Cart */}
        <div className="flex justify-between items-center w-full">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-purple-700 whitespace-nowrap"
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

        {/* Bottom: Centered nav buttons with max width */}
        <div className="flex justify-between mt-3 px-16 w-full max-w-[640px] mx-auto">
          <Link
            href="/"
            className="text-base text-gray-700 hover:text-purple-700 transition hover:underline"
          >
            חנות
          </Link>
          <Link
            href="/orders"
            className="text-base text-gray-700 hover:text-purple-700 transition hover:underline"
          >
            הזמנות
          </Link>
          <Link
            href="/management-menu"
            className="text-base text-gray-700 hover:text-purple-700 transition hover:underline"
          >
            כלי ניהול
          </Link>
        </div>
      </div>
    </div>
  );
}
