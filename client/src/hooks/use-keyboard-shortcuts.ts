import { useEffect } from "react";

interface ShortcutMap {
  [key: string]: (e: KeyboardEvent) => void;
}

/**
 * Hook to register keyboard shortcuts.
 * Keys: Use 'ctrl+s', 'cmd+s', 'escape', 'enter', 'ctrl+enter', etc.
 * The handler receives the KeyboardEvent.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const keys: string[] = [];
      if (e.ctrlKey) keys.push("ctrl");
      if (e.metaKey) keys.push("cmd");
      if (e.altKey) keys.push("alt");
      if (e.shiftKey) keys.push("shift");
      keys.push(e.key.toLowerCase());

      const combo = keys.join("+");

      // Check for exact match or partial match
      for (const [shortcut, callback] of Object.entries(shortcuts)) {
        const normalized = shortcut.toLowerCase().replace(/\s/g, "");
        if (combo === normalized) {
          e.preventDefault();
          callback(e);
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
