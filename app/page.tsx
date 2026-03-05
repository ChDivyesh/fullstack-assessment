"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Product {
  stacklineSku: string;
  title: string;
  categoryName: string;
  subCategoryName: string;
  imageUrls: string[];
}

const PAGE_SIZE = 20;

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [subCategories, setSubCategories] = useState<string[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    searchParams.get('category') || undefined
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | undefined>(
    searchParams.get('subCategory') || undefined
  );
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories));
  }, []);

  // Bug Fix #1: Pass selected category to subcategories API
  useEffect(() => {
    if (selectedCategory) {
      fetch(`/api/subcategories?category=${encodeURIComponent(selectedCategory)}`)
        .then((res) => res.json())
        .then((data) => setSubCategories(data.subCategories));
    } else {
      setSubCategories([]);
      setSelectedSubCategory(undefined);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (selectedCategory) params.append("category", selectedCategory);
    if (selectedSubCategory) params.append("subCategory", selectedSubCategory);
    params.append("limit", String(PAGE_SIZE));
    params.append("offset", String(page * PAGE_SIZE));

    fetch(`/api/products?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, selectedCategory, selectedSubCategory, page]);

  // Reset page when filters change
  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value === "__all__" ? undefined : value);
    setPage(0);
  };

  const handleSubCategoryChange = (value: string) => {
    setSelectedSubCategory(value === "__all__" ? undefined : value);
    setPage(0);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  // Bug Fix #18: Clear Filters resets state AND clears the URL
  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategory(undefined);
    setSelectedSubCategory(undefined);
    setPage(0);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold mb-6">StackShop</h1>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Bug Fix #3: Added All Categories option to allow deselecting */}
            <Select
              value={selectedCategory || "__all__"}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCategory && subCategories.length > 0 && (
              <Select
                value={selectedSubCategory || "__all__"}
                onValueChange={handleSubCategoryChange}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Subcategories</SelectItem>
                  {subCategories.map((subCat) => (
                    <SelectItem key={subCat} value={subCat}>
                      {subCat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(search || selectedCategory || selectedSubCategory) && (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <>
            {/* Bug Fix #2 + #19: Show correct total, handle singular/plural */}
            <p className="text-sm text-muted-foreground mb-4">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} {total === 1 ? "product" : "products"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                // Bug Fix #4 + #13: Pass SKU and current filters in URL
                <Link
                  key={product.stacklineSku}
                  href={`/product?sku=${product.stacklineSku}&category=${encodeURIComponent(selectedCategory || '')}&subCategory=${encodeURIComponent(selectedSubCategory || '')}&search=${encodeURIComponent(search)}`}
                >
                  {/* Bug Fix #14/15: flex flex-col ensures consistent card height */}
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer flex flex-col">
                    <CardHeader className="p-0">
                      <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-muted">
                        {product.imageUrls[0] && (
                          <Image
                            src={product.imageUrls[0]}
                            alt={product.title}
                            fill
                            className="object-contain p-4"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 flex-1">
                      <CardTitle className="text-base line-clamp-2 mb-2">
                        {product.title}
                      </CardTitle>
                      <CardDescription className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">
                          {product.categoryName}
                        </Badge>
                        <Badge variant="outline">
                          {product.subCategoryName}
                        </Badge>
                      </CardDescription>
                    </CardContent>
                    {/* Bug Fix #17: cursor-pointer on button, mt-auto pins to bottom */}
                    <CardFooter className="mt-auto">
                      <Button variant="outline" className="w-full cursor-pointer">
                        View Details
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Bug Fix #6: Pagination UI */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Bug Fix #8: Wrap in Suspense boundary as required by Next.js 14+
export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}