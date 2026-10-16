export type ShopLite = {
  id: string; code: string; name: string; address: string | null; phone: string | null;
  city: string | null; lat: number | null; lng: number | null;
};

export type ProductCard = {
  id: string; slug: string; name: string; description: string | null;
  category: { id: string; name: string; slug: string } | null;
  image: string | null;
  minPrice: number; maxPrice: number;
  /** Quantité disponible indicative (quantité − réservé), toutes boutiques actives. Jamais une garantie. */
  available: number;
  /** Disponibilité indicative par boutique active. */
  stockByShop: Record<string, number>;
  soldQty: number; avgRating: number | null; reviewCount: number;
  createdAt: string;
};

export type ProductDetail = ProductCard & {
  images: string[];
  variants: { id: string; label: string | null; sku: string; price: number; stockByShop: Record<string, number> }[];
  shops: ShopLite[];
  reviews: { id: string; authorId: string; rating: number; comment: string | null; createdAt: string }[];
};

export type CatalogSort = "popular" | "price_asc" | "price_desc" | "rating" | "new";
