export interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  initial_stock: number;
  category: string;
  image?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Movement {
  id: number;
  product_id: number;
  product_name: string;
  type: 'entry' | 'waste' | 'sale' | 'cancellation';
  quantity: number;
  reason: string;
  timestamp: string;
}

export interface Sale {
  id: number;
  total: number;
  payment_method: 'cash' | 'transfer' | 'split';
  payments?: { method: 'cash' | 'transfer'; amount: number }[];
  payments_json?: string;
  timestamp: string;
  cancelled?: number;
  card_id?: number | null;
  items?: any[];
  created_at?: string;
}

export interface Session {
  id: number;
  start_time: string;
  end_time: string | null;
  is_closed: number;
  name?: string;
  deleted?: number;
}
