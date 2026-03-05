'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Product {
  stacklineSku: string;
  title: string;
  categoryName: string;
  subCategoryName: string;
  imageUrls: string[];
  featureBullets: string[];
  retailerSku: string;
  retailPrice?: number;
}

// Bug Fix #8: Extracted into separate component so it can be wrapped in Suspense.
// Next.js 14+ requires useSearchParams() to be inside a Suspense boundary
// otherwise the app throws an error at build time and fails to deploy.
function ProductDetail() {
  const searchParams = useSearchParams();
  const sku = searchParams.get('sku');
  const category = searchParams.get('category') || '';
  const subCategory = searchParams.get('subCategory') || '';
  const search = searchParams.get('search') || '';
  const backUrl = `/?category=${encodeURIComponent(category)}&subCategory=${encodeURIComponent(subCategory)}&search=${encodeURIComponent(search)}`;

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!sku) {
      setError('No product specified.');
      setLoading(false);
      return;
    }
    // Bug Fix #4: Fetch product by SKU from API instead of parsing URL JSON
    // Bug Fix #9: Added error handling with .catch()
    fetch(`/api/products/${encodeURIComponent(sku)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Product not found');
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [sku]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" className="mb-4" onClick={() => router.push(backUrl)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
          <p className="text-center text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Button variant="ghost" className="mb-4" onClick={() => router.push(backUrl)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
          <Card className="p-8">
            <p className="text-center text-muted-foreground">
              {error || 'Product not found'}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Bug Fix #13: router.push(backUrl) restores filter state on back */}
        <Button variant="ghost" className="mb-4" onClick={() => router.push(backUrl)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
              <div className="relative h-96 w-full bg-muted">
                  {product.imageUrls[selectedImage] ? (
                    <Image
                      src={product.imageUrls[selectedImage]}
                      alt={product.title}
                      fill
                      className="object-contain p-8"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-sm text-muted-foreground">No image available</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {product.imageUrls.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.imageUrls.map((url, idx) => (
                  // Bug Fix #17 + #22: cursor-pointer and clear selected state
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`relative h-20 border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedImage === idx
                        ? 'border-primary ring-2 ring-primary ring-offset-2 opacity-100'
                        : 'border-muted opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image
                      src={url}
                      alt={`${product.title} - Image ${idx + 1}`}
                      fill
                      className="object-contain p-2"
                      sizes="100px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex gap-2 mb-2">
                <Badge variant="secondary">{product.categoryName}</Badge>
                <Badge variant="outline">{product.subCategoryName}</Badge>
              </div>
              <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
              {/* Bug Fix #20: Show retailPrice on detail page */}
              {product.retailPrice != null && (
                <p className="text-2xl font-semibold text-primary mb-2">
                  ${product.retailPrice.toFixed(2)}
                </p>
              )}
              {/* Bug Fix #21: Clarify which SKU is being shown */}
              <p className="text-sm text-muted-foreground">
                Retailer SKU: {product.retailerSku}
              </p>
            </div>

            {product.featureBullets.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-lg font-semibold mb-3">Features</h2>
                  <ul className="space-y-2">
                    {product.featureBullets.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Bug Fix #8: Wrap in Suspense boundary as required by Next.js 14+
export default function ProductPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading product...</p>
        </div>
      </div>
    }>
      <ProductDetail />
    </Suspense>
  );
}
