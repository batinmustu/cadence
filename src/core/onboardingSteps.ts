export type OnboardingStep = "welcome" | "ai" | "series";

export const ONBOARDING_STEPS: readonly OnboardingStep[] = ["welcome", "ai", "series"];

const OPTIONAL: ReadonlySet<OnboardingStep> = new Set(["ai", "series"]);

export function isOptional(step: OnboardingStep): boolean {
  return OPTIONAL.has(step);
}

/** The step after `step`, or null when `step` is the last one. */
export function nextStep(step: OnboardingStep): OnboardingStep | null {
  return ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1] ?? null;
}

/** The step before `step`, or null on the first one. */
export function previousStep(step: OnboardingStep): OnboardingStep | null {
  const i = ONBOARDING_STEPS.indexOf(step);
  return i > 0 ? (ONBOARDING_STEPS[i - 1] ?? null) : null;
}

export function isLastStep(step: OnboardingStep): boolean {
  return nextStep(step) === null;
}
