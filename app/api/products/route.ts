import { NextRequest, NextResponse } from 'next/server';
import { productService } from '@/lib/products';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Bug Fix #10: parseInt returns NaN for non-numeric values which silently
  // breaks Array.slice(). Added isNaN guard and capped limit at 100 to
  // prevent someone requesting all 500 products in one call.
  const parsedLimit = parseInt(searchParams.get('limit') ?? '');
  const parsedOffset = parseInt(searchParams.get('offset') ?? '');

  const filters = {
    category: searchParams.get('category') || undefined,
    subCategory: searchParams.get('subCategory') || undefined,
    search: searchParams.get('search') || undefined,
    limit: isNaN(parsedLimit) || parsedLimit <= 0 ? 20 : Math.min(parsedLimit, 100),
    offset: isNaN(parsedOffset) || parsedOffset < 0 ? 0 : parsedOffset,
  };

  const products = productService.getAll(filters);
  const total = productService.getTotalCount({
    category: filters.category,
    subCategory: filters.subCategory,
    search: filters.search,
  });

  return NextResponse.json({
    products,
    total,
    limit: filters.limit,
    offset: filters.offset,
  });
}