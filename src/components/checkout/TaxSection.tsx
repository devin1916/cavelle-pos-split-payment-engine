import Panel from '../ui/Panel';
import { VAT_RATE_PERCENT } from '../../constants/checkout';

/**
 * Displays the configured VAT rate. The amount itself is derived in the
 * calculation pipeline after the discount — see SummaryPanel.
 */
export default function TaxSection() {
  return (
    <Panel title="Tax">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-semibold text-slate-900">
          VAT: {VAT_RATE_PERCENT}%
        </p>
        <p className="text-xs text-slate-500">
          Charged on the discounted amount (after discount, before payable)
        </p>
      </div>
    </Panel>
  );
}
