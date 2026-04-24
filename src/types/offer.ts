export type OfferType =
  | "gift"
  | "bundle"
  | "discount"
  | "first_piece_discount"
  | "second_piece_discount"
  | "custom";

export interface Offer {
  id: string;
  productName: string;
  offerType: OfferType;
  quantity: number;
  price: number;
  discount: number;
  text: string;
  /** Bundle: buy `buyQty` get `getQty` free (e.g. 2+1, 3+1, 1+1, 2+2) */
  buyQty?: number;
  getQty?: number;
  image?: string;
  /** 6-digit item code resolved from the products database, when known. */
  itemCode?: string;
  createdAt: number;
}

export type Language = "ar" | "en";
