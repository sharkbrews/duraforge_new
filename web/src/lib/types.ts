export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
}

export type UserRole = "customer" | "admin";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  companyName: string;
  vatNumber?: string;
  phone: string;
  role: UserRole;
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
  carrier?: string;
  trackingNumber?: string;
  statusUpdatedAt: string;
  statusEvents: OrderStatusEvent[];
  createdAt: string;
}

export interface OrderStatusEvent {
  status: PickPackStatus;
  note?: string;
  createdAt: string;
}

export type EnquiryStatus = "new" | "read" | "replied" | "archived";

export interface Enquiry {
  id: string;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
  readAt?: string;
}

/** Admin-only product row — includes cost columns. Never send to customers. */
export interface AdminProduct {
  id: string;
  sku: string;
  partCode: string;
  name: string;
  brand: string;
  brandSlug: string;
  model: string;
  position: string;
  material: string;
  salePriceExVat: number;
  fpePrice: number;
  purchasePriceInr: number;
  purchasePriceGbp: number;
  landingPriceGbp: number;
  stockQty: number;
  marginPct: number;
  isActive: boolean;
}

export interface CartItem {
  sku: string;
  quantity: number;
}
