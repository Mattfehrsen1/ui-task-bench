import type { PricingCardsProps } from './types.ts';
import './PricingCards.css';

export default function PricingCards({ plans }: PricingCardsProps) {
  return (
    <div className="pricing">
      <header className="pricing__header">
        <h2>Simple, transparent pricing</h2>
        <p>Pick a plan that grows with your team.</p>
        {/* TODO: monthly/annual billing switch and "Save 20%" badge. See TASK.md. */}
      </header>
      <div className="pricing__plans">
        {/* TODO: one card per plan. */}
        {plans.length} plans
      </div>
    </div>
  );
}
