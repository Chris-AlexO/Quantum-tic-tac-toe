import { useEffect, useRef, useState } from "react";

export function useOverlayCountdown(statusOverlay) {
  const countdownRef = useRef(null);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());

  useEffect(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (!statusOverlay?.isVisible || !statusOverlay?.countdownEndsAt) {
      return undefined;
    }

    setCountdownNow(Date.now());
    countdownRef.current = setInterval(() => {
      setCountdownNow(Date.now());
    }, 200);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [statusOverlay?.countdownEndsAt, statusOverlay?.isVisible]);

  return countdownNow;
}
