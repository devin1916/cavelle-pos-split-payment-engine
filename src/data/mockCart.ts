import type { CartItem } from '../types/checkout';

/**
 * Seed cart for the Quick Checkout modal.
 * Prices are integer cents: LKR 2,450.00 is stored as 245000.
 */
export const MOCK_CART_ITEMS: readonly CartItem[] = [
  { id: 'CVL-TS-001', name: 'Cavelle Cotton T-Shirt', unitPrice: 245000, qty: 2 },
  { id: 'CVL-JN-014', name: 'Cavelle Slim Fit Jeans', unitPrice: 795000, qty: 1 },
  { id: 'CVL-CP-006', name: 'Cavelle Canvas Cap', unitPrice: 125000, qty: 3 },
];
