# StackShop – Bug Fix Submission

## Running the app

```bash
yarn install
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How I approached this

I started by reading all the code before changing anything — just to understand what was there. Then I ran the app and used it like a normal person would: searching, filtering, clicking products, hitting back, checking pagination rules , alingment and watching the browser console.

That combination found more bugs than either approach alone. I fixed things starting with whatever would crash or break the app most badly, then worked down to smaller visual issues.

---

## All 22 bugs — what was wrong and what I did

---

### Bug 1 — Subcategory filter showed completely wrong products

**File:** `app/page.tsx`

When you picked a category like "Tablets", the subcategory dropdown was supposed to show only subcategories for tablets. Instead it showed subcategories from every single category all mixed together. Picking one returned random unrelated products.

The fix was one line — the API call was missing the category in the request:

```js
// Before
fetch(`/api/subcategories`);

// After
fetch(`/api/subcategories?category=${encodeURIComponent(selectedCategory)}`);
```

---

### Bug 2 — Product count was always 20

**File:** `lib/products.ts`

The function that counts total matching products was accidentally applying the page limit. So it always returned 20 instead of the real number like 500.

I separated the filtering logic from the pagination so counting and fetching work independently.

```ts
// Before — counts only the current page, not total matches
getTotalCount(filters?) {
  return this.getAll(filters).length;
}

// After — counts all matches regardless of page
private applyBaseFilters(filters?) { ... }

getTotalCount(filters?) {
  return this.applyBaseFilters(filters).length;
}
```

---

### Bug 3 — Once you picked a category you were stuck with it

**File:** `app/page.tsx`

The category dropdown had no "All Categories" option. If you selected a category you couldn't undo it without hitting "Clear Filters" which also wiped your search at the same time.

Added "All Categories" as the first option in the dropdown so you can reset just the category on its own.

---

### Bug 4 — The entire product was being stuffed into the URL

**Files:** `app/page.tsx`, `app/product/page.tsx`

Clicking a product encoded the whole product object as a JSON string in the URL. URLs have length limits, it exposed all product data in browser history and server logs, and the detail page never fetched fresh data from the API.

```js
// Before — full JSON blob in URL
href={{ pathname: "/product", query: { product: JSON.stringify(product) } }}

// After — just the ID
href={`/product?sku=${product.stacklineSku}`}
```

The detail page now calls the API with the SKU to get the product properly.

---

### Bug 5 — Price was missing from the code entirely

**Files:** `lib/products.ts`, `app/product/page.tsx`

All 500 products in the data have a `retailPrice` field but it wasn't in the TypeScript interface. So TypeScript couldn't see it, it never got passed around, and it was never shown to the user anywhere.

Added `retailPrice?: number` to the interface and displayed it on the product detail page.

---

### Bug 6 — Only the first 20 products were reachable

**File:** `app/page.tsx`

The API supported pagination but there were no Previous/Next buttons in the UI. With 500 products in the dataset, 480 of them could never be seen.

Added pagination controls at the bottom of the grid. The page also resets to 1 when you change a filter or search term.

---

### Bug 7 — Changing category could cause a mismatched API request

**File:** `app/page.tsx`

When you switched categories, the previously selected subcategory could still be in state when the product fetch triggered. This sent the API a category and subcategory that didn't belong together.

Fixed by resetting the subcategory and page number in the same handler so everything updates together.

---

### Bug 8 — The app would fail to deploy

**Files:** `app/page.tsx`, `app/product/page.tsx`

Next.js 14 requires `useSearchParams()` to always be inside a `<Suspense>` boundary. Both pages were missing this. It doesn't always crash in development but it breaks the production build.

Split each page into an inner component with the logic and a wrapper that provides the Suspense boundary:

```js
function HomeContent() {
  const searchParams = useSearchParams();
  // everything else
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
```

---

### Bug 9 — Failed API calls showed a spinner forever

**Files:** `app/page.tsx`, `app/product/page.tsx`

None of the `fetch()` calls had error handling. If the network failed or the server returned an error, the loading spinner would spin indefinitely with no message.

Added `.catch()` to every fetch call so errors are caught and a clear message is shown instead.

---

### Bug 10 — Passing bad values to the API silently broke results

**File:** `app/api/products/route.ts`

`parseInt()` returns `NaN` if the input isn't a number, like `?limit=abc`. That `NaN` then goes into `Array.slice()` which quietly returns an empty array — no error, no products, no explanation.

```ts
// Before
limit: parseInt(searchParams.get("limit")!); // NaN if non-numeric

// After
const parsed = parseInt(searchParams.get("limit") ?? "");
limit: isNaN(parsed) || parsed <= 0 ? 20 : Math.min(parsed, 100);
```

Also capped the limit at 100 so no one can request all 500 products at once.

---

### Bug 11 — One product with missing images crashed the whole page

**Files:** `app/page.tsx`, `app/product/page.tsx`, `lib/products.ts`

Product `V6PYBWRE` has no `imageUrls` field at all — not an empty array, just completely missing. Accessing `.length` or `[0]` on `undefined` caused a hard crash: `Cannot read properties of undefined`.

Marked `imageUrls` as optional in the interface and added safe checks throughout:

```ts
// Interface
imageUrls?: string[];

// Rendering
{product.imageUrls?.length > 0 ? (
  <Image src={product.imageUrls[selectedImage]} ... />
) : (
  <p>No image available</p>
)}
```

---

### Bug 12 — Browser tab said "Create Next App"

**File:** `app/layout.tsx`

The page title and description were never updated from the Next.js starter defaults.

```ts
export const metadata = {
  title: "StackShop",
  description: "Browse and search thousands of products on StackShop.",
};
```

---

### Bug 13 — Back button erased your filters

**Files:** `app/page.tsx`, `app/product/page.tsx`

The "Back to Products" button always went to `/` with no filters. So if you had filtered by "Tablets", clicked a product, then hit back — you'd land on the unfiltered home page and have to start over.

Fixed by passing the current filters in the URL when you click a product, then reading them back when returning:

```js
// Navigating to product — carry filters along
href={`/product?sku=${sku}&category=${category}&search=${search}`}

// Back button — return to the filtered list
router.push(`/?category=${category}&search=${search}`);
```

---

### Bug 14 — Product cards were different heights

**File:** `app/page.tsx`

Cards with longer titles were taller, which pushed the "View Details" button to different positions across the grid. It looked uneven.

```js
<Card className="h-full flex flex-col">
  <CardContent className="flex-1">   // stretches to fill space
  <CardFooter className="mt-auto">   // always pinned to bottom
```

---

### Bug 15 — Long badge text broke card layout

**File:** `app/page.tsx`

Some products have long subcategory names that wrap onto two lines, which made those cards taller than others. Same fix as Bug 14 — the footer is always pinned to the bottom so it doesn't matter how much content is above it.

---

### Bug 16 — Searching crashed the page for some products

**File:** `next.config.ts`

Some product images are hosted on `images-na.ssl-images-amazon.com` but that domain wasn't in the Next.js allowed list. Next.js blocks images from unlisted domains which caused a full page crash.

```js
remotePatterns: [
  { protocol: 'https', hostname: 'm.media-amazon.com' },
  { protocol: 'https', hostname: 'images-na.ssl-images-amazon.com' },
],
```

Needs a server restart after this change since `next.config.ts` isn't hot-reloaded.

---

### Bug 17 — Buttons showed the wrong cursor

**Files:** `app/page.tsx`, `app/product/page.tsx`

The "View Details" button and the thumbnail images on the detail page both showed a regular arrow cursor instead of a hand/pointer. The shadcn Button component resets cursor to `auto` by default so it needs to be set explicitly.

```js
<Button className="cursor-pointer">
<button className="cursor-pointer ...">
```

---

### Bug 18 — Clear Filters didn't reset the dropdown visually

**File:** `app/page.tsx`

Clicking "Clear Filters" updated the products correctly but the category dropdown still showed the old selection. The state was cleared in code but the UI didn't reflect it.

Fixed by calling `router.push('/')` to also clear the URL, and mapping the `undefined` state back to the "All Categories" option in the Select.

---

### Bug 19 — "Showing 1 products" — wrong grammar

**File:** `app/page.tsx`

When only one result matched, it said "1 products" instead of "1 product".

```js
{
  total;
}
{
  total === 1 ? "product" : "products";
}
```

---

### Bug 20 — No price on the product detail page

**File:** `app/product/page.tsx`

The detail page showed the title, features, and SKU but no price. This was directly caused by Bug 5 — once the interface was fixed, I added the price display below the title.

---

### Bug 21 — "SKU" label didn't say which SKU

**File:** `app/product/page.tsx`

The product has two identifiers — the internal Stackline SKU and the retailer SKU (like an Amazon ASIN). The label just said "SKU" without clarifying which one.

```js
// Before
SKU: {product.retailerSku}

// After
Retailer SKU: {product.retailerSku}
```

---

### Bug 22 — Hard to see which thumbnail is selected

**File:** `app/product/page.tsx`

The selected thumbnail barely looked different from the others. The border change was too subtle to notice at a glance.

Added a visible ring on the selected thumbnail and reduced the opacity of unselected ones:

```js
selectedImage === idx
  ? "border-primary ring-2 ring-primary ring-offset-2 opacity-100"
  : "border-muted opacity-60 hover:opacity-100";
```

---

## Files changed

| File                        | Bugs                                               |
| --------------------------- | -------------------------------------------------- |
| `app/page.tsx`              | 1, 2, 3, 4, 6, 7, 8, 9, 11, 13, 14, 15, 17, 18, 19 |
| `app/product/page.tsx`      | 4, 8, 9, 11, 13, 17, 20, 21, 22                    |
| `lib/products.ts`           | 2, 5, 11                                           |
| `app/api/products/route.ts` | 10                                                 |
| `next.config.ts`            | 16                                                 |
| `app/layout.tsx`            | 12                                                 |

---

## A few extra things I improved along the way

- Count now shows "Showing 1–20 of 500 products" so you can see where you are in the results
- Changing a filter resets to page 1 so you never end up on an empty page
- Product URLs are now clean and shareable like `/product?sku=E8ZVY2BP3`
- Your filters are restored when you hit back from a product page
- API limit is capped at 100 to avoid loading the whole dataset at once
