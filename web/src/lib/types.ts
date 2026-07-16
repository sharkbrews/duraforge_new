export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  companyName: string;
  vatNumber?: string;
  phone: string;
  deliveryAddress: Address;
  createdAt: string;
}

/** Safe user fields returned to the client — never includes passwordHash. */
export type PublicUser = Omit<User, "passwordHash">;

export interface OrderLineItem {
  sku: string;
  name: string;
  quantity: number;
  unitPriceExVat: number;
}

export type PickPackStatus =
  | "received"
  | "picking"
  | "packed"
  | "despatched"
  | "delivered";

export type PaymentMethod = "card" | "bacs";

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  companyName: string;
  email: string;
  status: PickPackStatus;
  lineItems: OrderLineItem[];
  subtotalExVat: number;
  vatAmount: number;
  totalIncVat: number;
  paymentMethod: PaymentMethod;
  shippingAddress: Address;
  billingAddress: Address;
  notes?: string;
  createdAt: string;
}

export interface CartItem {
  sku: string;
  quantity: number;
}
