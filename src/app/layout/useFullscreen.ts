import { useEffect, useState } from "react";
import { platform } from "../../platform";

export function useFullscreen(): boolean {
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    let live = true;
    platform.window
      .isFullscreen()
      .then((v) => live && setFullscreen(v))
      .catch(() => {});
    const off = platform.window.onFullscreenChange(setFullscreen);
    return () => {
      live = false;
      off();
    };
  }, []);
  return fullscreen;
}
