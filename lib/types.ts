export type IngredientData = {
  id: string;
  name: string;
  removable: boolean;
};

export type ExtraData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

export type ProductData = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  available: boolean;
  ingredients: IngredientData[];
  extras: ExtraData[];
};

export type CategoryData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type StoreSettingsData = {
  businessName: string;
  whatsappNumber: string;
  address: string | null;
  hours: Record<string, string>;
  deliveryCost: number;
  minimumOrder: number;
  paymentMethods: string[];
  deliveryZones: string[];
  socialLinks: Record<string, string>;
};

export type CatalogResult =
  | { status: "configured"; categories: CategoryData[]; products: ProductData[] }
  | { status: "empty"; categories: []; products: [] }
  | { status: "error"; categories: []; products: []; message: string };

export type CartItem = {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  removedIngredientIds: string[];
  removedIngredients: string[];
  extras: { id: string; name: string; price: number }[];
  notes: string;
  subtotal: number;
};