import Cart from "@/components/cart";
import Link from "next/link";
import Image from "next/image";

export default function Navbar({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between bg-pink-100 px-4 py-3 sm:px-6 md:px-8 shadow-md">
      {/* Logo / Brand */}
      <Link
        href="/"
        className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-pink-700 whitespace-nowrap"
      >
        <Image
          src="/images/RAW/גלידות חיים/IMG_8444 fimmm.png" // <- replace with your actual image path
          alt="המפנק"
          width={32}
          height={32}
          className="object-contain"
        />
        המפנק
      </Link>

      {/* Nav Links */}
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 mt-2 sm:mt-0">
        <Link
          href="/"
          className="text-lg sm:text-xl md:text-2xl hover:underline"
        >
          חזרה לתפריט
        </Link>

        {isAdmin && (
          <Link
            href="/management-menu"
            className="text-lg sm:text-xl md:text-2xl font-semibold text-red-600 underline"
          >
            ניהול חנות ⚙️
          </Link>
        )}
      </div>

      {/* Cart */}
      <div className="mt-2 sm:mt-0">
        <Cart />
      </div>
    </div>
  );
}
