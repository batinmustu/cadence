import { createSettingsRepository } from "../../db/repositories/settings";
import { platform } from "../../platform";

export const ONBOARDING_KEY = "onboarding.done";

/** True once onboarding was completed or skipped; a failed read counts as done so the app never blocks. */
export async function isOnboardingDone(): Promise<boolean> {
  try {
    return (await createSettingsRepository(platform.database).get(ONBOARDING_KEY)) !== null;
  } catch {
    return true;
  }
}

export async function markOnboardingDone(): Promise<void> {
  await createSettingsRepository(platform.database).set(ONBOARDING_KEY, "1");
}
