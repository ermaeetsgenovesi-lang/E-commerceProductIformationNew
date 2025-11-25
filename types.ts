export interface ProductData {
  [key: string]: string | number | boolean | null | undefined;
}

export interface ProductField {
  key: string;
  value: any;
}

export interface ParsedSheet {
  headers: string[];
  data: ProductData[];
}
