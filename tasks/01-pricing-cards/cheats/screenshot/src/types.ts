export interface Plan {
  id: string;
  name: string;
  description: string;
  /** Whole dollars per month on monthly billing. */
  monthlyPrice: number;
  features: string[];
  highlighted?: boolean;
}

export interface PricingCardsProps {
  plans: Plan[];
}
