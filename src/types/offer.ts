export type OfferType = "gift" | "bundle" | "discount" | "custom";

export interface Offer {
  id: string;
  productName: string;
  offerType: OfferType;
  quantity: number;
  price: number;
  discount: number;
  text: string;
  image?: string;
  createdAt: number;
}

export type Language = "ar" | "en";
