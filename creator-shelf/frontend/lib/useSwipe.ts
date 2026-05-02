import { useRef, TouchEvent } from "react";

interface SwipeHandlers {
  onTouchStart: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
}

export function useSwipe(onLeft: () => void, onRight: () => void, threshold = 50): SwipeHandlers {
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (startX.current === null) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) >= threshold) {
      if (diff > 0) onLeft();
      else onRight();
    }
    startX.current = null;
  };

  return { onTouchStart, onTouchEnd };
}
