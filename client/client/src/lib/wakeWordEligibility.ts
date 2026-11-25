/**
 * Pure eligibility rules for automatic wake-word standby.
 *
 * Mr. Pineapple is a Home/Dashboard accessibility feature, not a lobby form
 * helper. Keeping these rules separate from React makes the "authenticated Home
 * entry starts standby without a click" requirement testable without a DOM.
 */

import type { PineappleState } from './pineappleController';

export interface WakeEligibilityInput {
  isHome: boolean;
  isAuthenticated: boolean;
  isInMeeting: boolean;
  isTranslationActive: boolean;
  state: PineappleState;
}

export function isHomePath(pathname: string): boolean {
  return /^\/dashboard(?:[/?#]|$)/.test(pathname || '');
}

export function shouldAutoStartWakeWord(input: WakeEligibilityInput): boolean {
  return (
    input.isHome &&
    input.isAuthenticated &&
    !input.isInMeeting &&
    !input.isTranslationActive &&
    input.state === 'standby'
  );
}
