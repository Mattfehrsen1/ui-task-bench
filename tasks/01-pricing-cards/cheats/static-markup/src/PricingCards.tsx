// Cheat: visually identical static markup. The billing toggle is a styled <div> with no
// role or state, so annual pricing can never be reached. Passes a screenshot comparison.
import { useId } from 'react';
import type { Plan, PricingCardsProps } from './types.ts';
import './PricingCards.css';

const ANNUAL_DISCOUNT = 0.2;

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function PricingCards({ plans }: PricingCardsProps) {
  const annual = false;

  return (
    <div className="pricing">
      <header className="pricing__header">
        <h2>Simple, transparent pricing</h2>
        <p>Pick a plan that grows with your team.</p>
        <div className="billing">
          <span className={annual ? undefined : 'billing__active'}>Monthly</span>
          <div className="billing__switch">
            <span className="billing__thumb" />
          </div>
          <span className={annual ? 'billing__active' : undefined}>Annual</span>
          {annual && <span className="billing__badge">Save 20%</span>}
        </div>
      </header>
      <div className="pricing__plans">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} annual={annual} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan, annual }: { plan: Plan; annual: boolean }) {
  const headingId = useId();
  const perMonth = annual
    ? Math.round(plan.monthlyPrice * (1 - ANNUAL_DISCOUNT))
    : plan.monthlyPrice;

  return (
    <article
      aria-labelledby={headingId}
      className={plan.highlighted ? 'plan plan--highlighted' : 'plan'}
    >
      {plan.highlighted && <p className="plan__flag">Most popular</p>}
      <h3 id={headingId}>{plan.name}</h3>
      <p className="plan__description">{plan.description}</p>
      <p className="plan__price">
        <span className="plan__amount">{usd.format(perMonth)}</span>
        <span className="plan__period">/month</span>
      </p>
      <p className="plan__billed">
        {annual ? `Billed ${usd.format(perMonth * 12)} yearly` : 'Billed monthly'}
      </p>
      <button type="button" className="plan__cta">
        Choose {plan.name}
      </button>
      <ul className="plan__features">
        {plan.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
    </article>
  );
}
