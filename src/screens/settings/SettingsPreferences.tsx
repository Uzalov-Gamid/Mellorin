import { useEffect } from "react";
import { getConfig } from "../../subprocess";
/** Load the persisted UI preference without opening Settings or invoking a model. */
export function SettingsPreferences() {
  useEffect(() => {
    let active = true;
    getConfig().then(config => {
      const size = (config as { text_size?: number }).text_size;
      if (active && size && size >= 12 && size <= 18) document.documentElement.style.setProperty("--text-size", `${size}px`);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return null;
}
