# Ice Cream Online Store - File Categorization

This document categorizes all source files in the ice cream online store application into Store, CMS, Shared, Unused, and Miscellaneous categories.

## Application Architecture

The application is structured as a Next.js app with two main sections:
- **Store**: Customer-facing e-commerce interface (`src/app/(root)/(store)/`)
- **CMS**: Admin management interface (`src/app/(root)/(cms)/`)

## 📱 STORE FILES (Customer-facing)

### Store Pages
- `src/app/(root)/(store)/layout.tsx` - Store layout with navbar and search
- `src/app/(root)/(store)/page.tsx` - Main store page
- `src/app/(root)/(store)/category-products/[category]/page.tsx` - Category products page
- `src/app/(root)/(store)/cookie-manager/page.tsx` - Cookie management page
- `src/app/(root)/(store)/order/[id]/page.tsx` - Order details page
- `src/app/(root)/(store)/search-products/page.tsx` - Product search page

### Store Components
- `src/components/store/cart/cart.tsx` - Shopping cart component
- `src/components/store/cart/ui/cart-single-item.tsx` - Cart item component
- `src/components/store/cart/ui/confirm-order-modal.tsx` - Order confirmation modal
- `src/components/store/cookie-manager.tsx` - Cookie management component
- `src/components/store/main-menu.tsx` - Main navigation menu
- `src/components/store/navbar.tsx` - Store navigation bar
- `src/components/store/order.tsx` - Order component
- `src/components/store/products-by-category.tsx` - Category products display
- `src/components/store/sale-group-cluster.tsx` - Sale group display
- `src/components/store/search-products/back-button.tsx` - Search back button
- `src/components/store/search-products/search-bar.tsx` - Product search bar
- `src/components/store/single-product.tsx` - Individual product display

## 🛠️ CMS FILES (Admin Management)

### CMS Pages
- `src/app/(root)/(cms)/layout.tsx` - CMS layout with JWT protection
- `src/app/(root)/(cms)/auth/setup/page.tsx` - Auth setup page
- `src/app/(root)/(cms)/categories/[category]/page.tsx` - Category management
- `src/app/(root)/(cms)/categories/[category]/products/page.tsx` - Category products management
- `src/app/(root)/(cms)/categories/layout.tsx` - Categories layout
- `src/app/(root)/(cms)/categories/new/page.jsx` - New category page
- `src/app/(root)/(cms)/categories/page.tsx` - Categories listing
- `src/app/(root)/(cms)/clients/[id]/page.tsx` - Client details
- `src/app/(root)/(cms)/clients/layout.tsx` - Clients layout
- `src/app/(root)/(cms)/clients/page.tsx` - Clients listing
- `src/app/(root)/(cms)/link-product-to-category/page.tsx` - Product-category linking
- `src/app/(root)/(cms)/management-menu/page.tsx` - Management menu
- `src/app/(root)/(cms)/orders/[id]/page.tsx` - Order management
- `src/app/(root)/(cms)/orders/layout.tsx` - Orders layout
- `src/app/(root)/(cms)/orders/page.tsx` - Orders listing
- `src/app/(root)/(cms)/products/[id]/page.tsx` - Product management
- `src/app/(root)/(cms)/products/images/page.tsx` - Product images management
- `src/app/(root)/(cms)/products/layout.tsx` - Products layout
- `src/app/(root)/(cms)/products/new/page.tsx` - New product page
- `src/app/(root)/(cms)/products/out-of-stock/page.tsx` - Out of stock products
- `src/app/(root)/(cms)/products/page.tsx` - Products listing
- `src/app/(root)/(cms)/sale-groups/[id]/items/page.tsx` - Sale group items
- `src/app/(root)/(cms)/sale-groups/[id]/manage-items/page.tsx` - Sale group item management
- `src/app/(root)/(cms)/sale-groups/[id]/page.tsx` - Sale group management
- `src/app/(root)/(cms)/sale-groups/layout.tsx` - Sale groups layout
- `src/app/(root)/(cms)/sale-groups/new/page.tsx` - New sale group page
- `src/app/(root)/(cms)/sale-groups/page.tsx` - Sale groups listing
- `src/app/(root)/(cms)/storage-areas/layout.tsx` - Storage areas layout
- `src/app/(root)/(cms)/storage-areas/page.tsx` - Storage areas management

### CMS Components
- `src/components/cms/auth/setup.tsx` - Auth setup component
- `src/components/cms/client-details.tsx` - Client details component
- `src/components/cms/clients.tsx` - Clients listing component
- `src/components/cms/cms-navbar.tsx` - CMS navigation bar
- `src/components/cms/management-menu.tsx` - Management menu component

#### CMS Entity Components
- `src/components/cms/entities/category/edit.tsx` - Category editing
- `src/components/cms/entities/category/link-product.tsx` - Product linking
- `src/components/cms/entities/category/list.tsx` - Category listing
- `src/components/cms/entities/category/new.tsx` - New category
- `src/components/cms/entities/category/products.tsx` - Category products
- `src/components/cms/entities/category/ui/organize-categories.tsx` - Category organization
- `src/components/cms/entities/category/ui/organize-products.tsx` - Product organization
- `src/components/cms/entities/category/ui/ui/sale-group-card.tsx` - Sale group card
- `src/components/cms/entities/category/ui/view-categories.tsx` - Category view
- `src/components/cms/entities/category/ui/view-products.tsx` - Product view

- `src/components/cms/entities/fulfillment/list.tsx` - Fulfillment listing
- `src/components/cms/entities/fulfillment/ui/client-control-panel.tsx` - Client control panel
- `src/components/cms/entities/fulfillment/ui/list/single-order.tsx` - Single order view
- `src/components/cms/entities/fulfillment/ui/order-item-list.tsx` - Order items list
- `src/components/cms/entities/fulfillment/view.tsx` - Fulfillment view

- `src/components/cms/entities/image/ui/image-grid.tsx` - Image grid
- `src/components/cms/entities/image/ui/image-tile.tsx` - Image tile
- `src/components/cms/entities/image/upload-folder.tsx` - Folder upload
- `src/components/cms/entities/image/upload.tsx` - Image upload
- `src/components/cms/entities/image/utils/upload-utils.ts` - Upload utilities
- `src/components/cms/entities/image/view.tsx` - Image view

- `src/components/cms/entities/product/edit.tsx` - Product editing
- `src/components/cms/entities/product/images/list.tsx` - Product images list
- `src/components/cms/entities/product/images/ui/image-card.tsx` - Image card
- `src/components/cms/entities/product/images/ui/image-grid.tsx` - Image grid
- `src/components/cms/entities/product/list.tsx` - Product listing
- `src/components/cms/entities/product/new.tsx` - New product
- `src/components/cms/entities/product/out-of-stock-list.tsx` - Out of stock list
- `src/components/cms/entities/product/ui/category.tsx` - Product category
- `src/components/cms/entities/product/ui/product-storage-selector.tsx` - Storage selector

- `src/components/cms/entities/sale-group/items.tsx` - Sale group items
- `src/components/cms/entities/sale-group/list.tsx` - Sale group listing
- `src/components/cms/entities/sale-group/manage-items.tsx` - Item management
- `src/components/cms/entities/sale-group/new.tsx` - New sale group
- `src/components/cms/entities/sale-group/ui/category-linker.tsx` - Category linker
- `src/components/cms/entities/sale-group/ui/product-row.tsx` - Product row
- `src/components/cms/entities/sale-group/ui/product-sale-group-menu.tsx` - Sale group menu
- `src/components/cms/entities/sale-group/ui/sale-group-card.tsx` - Sale group card
- `src/components/cms/entities/sale-group/ui/sale-group-editor.tsx` - Sale group editor
- `src/components/cms/entities/sale-group/ui/sale-group-item.tsx` - Sale group item
- `src/components/cms/entities/sale-group/ui/sale-group-price-conflict-modal.tsx` - Price conflict modal
- `src/components/cms/entities/sale-group/view.tsx` - Sale group view

- `src/components/cms/entities/storage/view-areas.tsx` - Storage areas view

#### CMS UI Components
- `src/components/cms/sections/config.ts` - Section configuration
- `src/components/cms/sections/header/section-header.tsx` - Section header
- `src/components/cms/sections/scaffold/section-scaffold.tsx` - Section scaffold
- `src/components/cms/ui/button.tsx` - Button component
- `src/components/cms/ui/image-picker.tsx` - Image picker
- `src/components/cms/ui/image-selector.tsx` - Image selector
- `src/components/cms/ui/input.tsx` - Input component
- `src/components/cms/ui/label.tsx` - Label component
- `src/components/cms/ui/select.tsx` - Select component
- `src/components/cms/ui/toast.ts` - Toast utilities

## 🔄 SHARED FILES (Used by both Store and CMS)

### API Routes (Backend)
- `src/app/api/auth/entry/route.ts` - Authentication entry point
- `src/app/api/categories/[id]/products/order/route.ts` - Category product ordering
- `src/app/api/categories/[id]/products/route.ts` - Category products API
- `src/app/api/categories/[id]/route.ts` - Category management API
- `src/app/api/categories/linked/route.ts` - Linked categories API
- `src/app/api/categories/name/[name]/children/route.ts` - Category children API
- `src/app/api/categories/name/[name]/items/route.ts` - Category items API
- `src/app/api/categories/name/[name]/products/order/route.ts` - Category product ordering
- `src/app/api/categories/name/[name]/products/route.ts` - Category products by name
- `src/app/api/categories/name/[name]/route.ts` - Category by name API
- `src/app/api/categories/order/route.ts` - Category ordering API
- `src/app/api/categories/root/route.ts` - Root categories API
- `src/app/api/categories/route.ts` - Categories API
- `src/app/api/clients/[id]/route.ts` - Client management API
- `src/app/api/clients/route.ts` - Clients API
- `src/app/api/images/delete/route.ts` - Image deletion API
- `src/app/api/images/index/route.ts` - Image indexing API
- `src/app/api/images/rename/route.ts` - Image renaming API
- `src/app/api/images/route.ts` - Images API
- `src/app/api/images/update-index/route.ts` - Image index update API
- `src/app/api/images/upload/route.ts` - Image upload API
- `src/app/api/img-proxy/route.ts` - Image proxy API
- `src/app/api/orders/[id]/delivery/route.ts` - Order delivery API
- `src/app/api/orders/[id]/notify/route.ts` - Order notification API
- `src/app/api/orders/[id]/payment/route.ts` - Order payment API
- `src/app/api/orders/[id]/route.ts` - Order management API
- `src/app/api/orders/[id]/status/route.ts` - Order status API
- `src/app/api/orders/[id]/stock/route.ts` - Order stock API
- `src/app/api/orders/client/[id]/route.ts` - Client orders API
- `src/app/api/orders/route.ts` - Orders API
- `src/app/api/orders/search/route.ts` - Order search API
- `src/app/api/product-category/route.ts` - Product-category linking API
- `src/app/api/products/[id]/categories/route.ts` - Product categories API
- `src/app/api/products/[id]/price-change/route.ts` - Product price change API
- `src/app/api/products/[id]/price-change/validate/route.ts` - Price change validation
- `src/app/api/products/[id]/route.ts` - Product management API
- `src/app/api/products/by-sale/route.ts` - Products by sale API
- `src/app/api/products/out-of-stock/route.ts` - Out of stock products API
- `src/app/api/products/route.ts` - Products API
- `src/app/api/products/sale-groups/route.ts` - Product sale groups API
- `src/app/api/products/search/route.ts` - Product search API
- `src/app/api/products/stock/route.ts` - Product stock API
- `src/app/api/products/unused-images/route.ts` - Unused images API
- `src/app/api/sale-groups/[id]/items/[productId]/route.ts` - Sale group item management
- `src/app/api/sale-groups/[id]/items/eligible-products/route.ts` - Eligible products API
- `src/app/api/sale-groups/[id]/items/route.ts` - Sale group items API
- `src/app/api/sale-groups/[id]/route.ts` - Sale group management API
- `src/app/api/sale-groups/route.ts` - Sale groups API
- `src/app/api/storage/areas/[id]/route.ts` - Storage area management API
- `src/app/api/storage/areas/order/route.ts` - Storage area ordering API
- `src/app/api/storage/areas/route.ts` - Storage areas API
- `src/app/api/storage/assign/route.ts` - Storage assignment API
- `src/app/api/storage/unplaced-products/route.ts` - Unplaced products API

### Shared Components
- `src/components/auth/jwt-gatekeeper.tsx` - JWT authentication gatekeeper
- `src/components/auth/jwt-wrapper.tsx` - JWT wrapper component
- `src/components/global-image-retry.tsx` - Global image retry component
- `src/components/pwa/sw-register.tsx` - Service worker registration

### Shared Libraries
- `src/lib/api/jwt-protect.ts` - JWT protection utilities
- `src/lib/api/validate-client-order-access.ts` - Client order access validation
- `src/lib/api/with-middleware.ts` - Middleware utilities
- `src/lib/aws/assume-role.ts` - AWS role assumption
- `src/lib/aws/image-usage.ts` - Image usage tracking
- `src/lib/aws/images-index.ts` - Images indexing
- `src/lib/aws/s3.ts` - S3 utilities
- `src/lib/db.ts` - Database connection
- `src/lib/jwt.ts` - JWT utilities
- `src/lib/utils/image-name.ts` - Image naming utilities
- `src/lib/utils/notify-telegram-deprecations-bot.ts` - Telegram notification bot

### Shared Data & Context
- `src/data/images.ts` - Image data utilities
- `src/context/cart-context.tsx` - Shopping cart context

### Core Application Files
- `src/app/layout.tsx` - Root application layout
- `src/app/globals.css` - Global styles
- `src/app/favicon.ico` - Favicon

## ⚙️ CONFIGURATION FILES

### Build & Development
- `package.json` - Project dependencies and scripts
- `package-lock.json` - Dependency lock file
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `postcss.config.mjs` - PostCSS configuration
- `vitest.config.ts` - Vitest testing configuration
- `next-env.d.ts` - Next.js TypeScript declarations

### Middleware & Security
- `middleware.ts` - Next.js middleware for JWT protection and image proxying

## 🧪 TEST FILES

- `tests/api/order.test.ts` - Order API tests
- `tests/setup.ts` - Test setup configuration

## 📁 PUBLIC ASSETS

### Images & Icons
- `public/apple-touch-icon.png` - Apple touch icon
- `public/favicon_io/` - Favicon package
- `public/icons/icon-192.png` - PWA icon (192px)
- `public/icons/icon-512.png` - PWA icon (512px)
- `public/images/` - Product images organized by date
- `public/file.svg` - File icon
- `public/globe.svg` - Globe icon
- `public/next.svg` - Next.js logo
- `public/vercel.svg` - Vercel logo
- `public/window.svg` - Window icon

### PWA & Manifest
- `public/manifest.webmanifest` - PWA manifest
- `public/sw.js` - Service worker

## 📄 DOCUMENTATION

- `README.md` - Project documentation

## 🔍 POTENTIALLY UNUSED FILES

### Migration & Legacy Files
- `src/lib/image-migration.ts` - Image migration utilities (may be legacy)
- `src/lib/push-updates.txt` - Push updates text file (unclear purpose)

### Note on File Usage
Most files appear to be actively used based on the application structure. The `image-migration.ts` file might be legacy code used for initial data migration, and `push-updates.txt` appears to be a text file that may not be actively used in the application logic.

## Summary

- **Store Files**: 18 files (pages + components)
- **CMS Files**: 70+ files (pages + components)
- **Shared Files**: 50+ files (API routes + shared components + libraries)
- **Configuration**: 8 files
- **Tests**: 2 files
- **Public Assets**: 100+ files (mostly images)
- **Documentation**: 1 file
- **Potentially Unused**: 2 files

The application follows a clear separation between customer-facing store functionality and admin CMS functionality, with shared API routes and utilities supporting both sides.


