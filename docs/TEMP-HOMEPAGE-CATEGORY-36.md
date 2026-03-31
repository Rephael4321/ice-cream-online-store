Temporary storefront homepage override
=====================================

The client storefront home page at `src/app/(root)/(store)/page.tsx` is temporarily configured to open category `36` directly instead of showing the normal category grid first.

Details:
- This change only affects the initial `/` storefront entry.
- Other categories and category routes are still available and unchanged.
- If category `36` is missing or the lookup fails, the page falls back to the normal `MainMenu` category grid.

Rollback:
- Remove the temporary redirect logic and restore the plain `MainMenu` render in `src/app/(root)/(store)/page.tsx`.
