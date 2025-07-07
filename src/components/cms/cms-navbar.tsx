import Cart from "@/components/store/cart";
import Link from "next/link";
import Image from "next/image";

export default function CmsNavbar() {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between bg-white px-4 py-3 sm:px-6 md:px-8 shadow-md border-b border-gray-200">
      {/* Logo / Brand */}
      <Link
        href="/"
        className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-purple-700 whitespace-nowrap"
      >
        <Image
          src="/favicon_io/android-chrome-192x192.png"
          alt="מוצרי שיער"
          width={32}
          height={32}
          sizes="(max-width: 640px) 32px, (max-width: 1024px) 64px, 128px"
        />
        מוצרי שיער
      </Link>

      {/* Nav Links */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 mt-2 sm:mt-0">
        <Link
          href="/"
          className="text-lg sm:text-xl md:text-2xl text-gray-700 hover:text-purple-700 transition hover:underline"
        >
          חנות
        </Link>

        <Link
          href="/orders"
          className="text-lg sm:text-xl md:text-2xl text-gray-700 hover:text-purple-700 transition hover:underline"
        >
          הזמנות
        </Link>

        <Link
          href="/management-menu"
          className="text-lg sm:text-xl md:text-2xl text-gray-700 hover:text-purple-700 transition hover:underline"
        >
          כלי ניהול
        </Link>
      </div>

      {/* Cart */}
      <div className="mt-2 sm:mt-0">
        <Cart />
      </div>
    </div>
  );
}
