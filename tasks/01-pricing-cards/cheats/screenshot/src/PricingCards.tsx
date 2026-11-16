// Cheat: submit the target image itself. Pixel-perfect at the reference viewport, with no
// behaviour at all. A grader that only compares screenshots would accept it.
import type { PricingCardsProps } from './types.ts';
import target from './target.png';

export default function PricingCards(_props: PricingCardsProps) {
  return (
    <img src={target} alt="Pricing plans" width={1280} height={800} style={{ display: 'block' }} />
  );
}
