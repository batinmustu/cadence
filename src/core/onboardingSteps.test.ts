import { describe, expect, it } from "vitest";
import { isLastStep, isOptional, nextStep, previousStep } from "./onboardingSteps";

describe("onboarding steps", () => {
  it("moves forward and back", () => {
    expect(nextStep("welcome")).toBe("ai");
    expect(nextStep("ai")).toBe("series");
    expect(nextStep("series")).toBeNull();
    expect(previousStep("series")).toBe("ai");
    expect(previousStep("welcome")).toBeNull();
  });
  it("knows which steps can be skipped", () => {
    expect(isOptional("welcome")).toBe(false);
    expect(isOptional("ai")).toBe(true);
    expect(isOptional("series")).toBe(true);
    expect(isLastStep("series")).toBe(true);
    expect(isLastStep("ai")).toBe(false);
  });
});
