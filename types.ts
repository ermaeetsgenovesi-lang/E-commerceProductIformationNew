export interface ProductData {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ProductField {
  key: string;
  value: any;
}

export interface ParsedSheet {
  name: string; // The Sheet Name (Brand)
  headers: string[];
  data: ProductData[];
}