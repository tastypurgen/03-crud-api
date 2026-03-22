export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

export interface ProductRepository {
  getAll(): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  create(payload: ProductPayload): Promise<Product>;
  update(id: string, payload: ProductPayload): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}
