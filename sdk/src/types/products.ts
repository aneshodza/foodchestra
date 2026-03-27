export interface Ingredient {
  id: string;
  text: string;
  percent_estimate?: number;
}

export interface Product {
  barcode: string;
  name: string | null;
  brands: string | null;
  stores: string | null;
  countries: string | null;
  quantity: string | null;
  nutriscoreGrade: string | null;
  ingredientsText: string | null;
  ingredients: Ingredient[];
  imageUrl: string | null;
}

export interface ProductLookupResponse {
  found: boolean;
  product: Product | null;
}
