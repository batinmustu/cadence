import { platform } from "../platform";

// Placeholder until the app shell lands (issue #8). Strings move to i18n in #5.
export function App() {
  return (
    <main className="flex h-full flex-col items-center justify-center gap-2">
      <h1 className="text-xl font-semibold">Cadence</h1>
      <p className="text-text-3" data-testid="platform">
        {platform.window.platform}
      </p>
    </main>
  );
}
