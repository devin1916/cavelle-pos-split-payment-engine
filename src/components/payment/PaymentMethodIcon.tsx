import type { ReactNode } from 'react';
import type { PaymentMethod } from '../../types/checkout';

interface PaymentMethodIconProps {
  method: PaymentMethod;
}

/**
 * Small inline icons so each tender type reads at a glance.
 * Kept inline instead of adding an icon dependency.
 */
export default function PaymentMethodIcon({ method }: PaymentMethodIconProps) {
  const paths: Record<PaymentMethod, ReactNode> = {
    cash: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M6 9.5v5M18 9.5v5" />
      </>
    ),
    card: (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="2" />
        <path d="M2.5 10h19" />
        <path d="M6.5 15h3" />
      </>
    ),
    bank_transfer: (
      <>
        <path d="M3 21h18" />
        <path d="M6 18v-6M10 18v-6M14 18v-6M18 18v-6" />
        <path d="M12 3l9 5H3l9-5z" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {paths[method]}
    </svg>
  );
}
