import { useEffect, RefObject } from 'react';

export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;

    const container = ref.current;
    
    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => {
        // Ensure element is visible and not hidden
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          last.focus();
          e.preventDefault();
        }
      } else {
        if (activeEl === last || !container.contains(activeEl)) {
          first.focus();
          e.preventDefault();
        }
      }
    };

    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus the first element inside the container if none is focused yet
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      if (!container.contains(document.activeElement)) {
        focusable[0].focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [ref, active]);
}
