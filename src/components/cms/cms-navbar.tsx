import Cart from "@/components/store/cart/cart";
import CmsNavbarBrand from "@/components/cms/cms-navbar-brand";
import CmsNavbarCopySiteUrl from "@/components/cms/cms-navbar-copy-site-url";
import Link from "next/link";

const copySiteUrlNavClassDesktop =
  "text-xl text-gray-700 hover:text-purple-700 transition hover:underline";
const copySiteUrlNavClassMobile =
  "text-base text-gray-700 hover:text-purple-700 transition hover:underline";

export default function CmsNavbar() {
  return (
    <div className="sticky top-0 z-50 w-full bg-white px-4 py-3 sm:px-6 md:px-8 shadow-md border-b border-gray-200">
      {/* Desktop only (lg+): full menu row; tablet and mobile use stacked layout */}
      <div className="hidden lg:flex items-center justify-between w-full">
        {/* Logo: long-press reveals התנתקות for signed-in CMS users */}
        <CmsNavbarBrand
          linkClassName="flex items-center gap-2 text-2xl font-bold whitespace-nowrap"
          logoutLinkClassName="text-xl text-gray-700 hover:text-purple-700 transition hover:underline"
        />

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
            href="/cms"
            className="text-xl text-gray-700 hover:text-purple-700 transition hover:underline"
          >
            כלי ניהול
          </Link>
          <CmsNavbarCopySiteUrl className={copySiteUrlNavClassDesktop} />
        </div>

        {/* Cart */}
        <Cart />
      </div>

      {/* Mobile + tablet: two stacked rows */}
      <div className="lg:hidden flex flex-col w-full">
        {/* Top: Logo + Cart */}
        <div className="flex justify-between items-center w-full">
          <CmsNavbarBrand
            linkClassName="flex items-center gap-2 text-xl font-bold text-purple-700 whitespace-nowrap"
            logoutLinkClassName="text-base text-gray-700 hover:text-purple-700 transition hover:underline"
          />
          <Cart />
        </div>

        {/* Bottom: Centered nav buttons with max width */}
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3 px-4 w-full max-w-[640px] mx-auto">
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
            href="/cms"
            className="text-base text-gray-700 hover:text-purple-700 transition hover:underline"
          >
            כלי ניהול
          </Link>
          <CmsNavbarCopySiteUrl className={copySiteUrlNavClassMobile} />
        </div>
      </div>
    </div>
  );
}
