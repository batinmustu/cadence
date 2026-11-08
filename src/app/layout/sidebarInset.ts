/**
 * Height in px of the sidebar's top row. On macOS in a window the traffic lights sit there;
 * in full screen (or on other platforms) nothing is reserved so items move up.
 */
export function sidebarTopInset(platform: string, fullscreen: boolean): number {
  return platform === "macos" && !fullscreen ? 48 : 12;
}
