import { useCallback, useEffect, useRef, useState } from 'react';
import type { SkillCheckProps } from '../../typings';
import { useInterval } from '@mantine/hooks';

interface Props {
  angle: number;
  offset: number;
  multiplier: number;
  skillCheck: SkillCheckProps;
  className: string;
  handleComplete: (success: boolean) => void;
}

const TICK_MS = 16; // ~60fps; real speed is controlled by time delta, not this value

const Indicator: React.FC<Props> = ({ angle, offset, multiplier, handleComplete, skillCheck, className }) => {
  const [indicatorAngle, setIndicatorAngle] = useState(-90);
  const [keyPressed, setKeyPressed] = useState<false | string>(false);

  // Track last timestamp to compute time deltas
  const lastTimeRef = useRef<number | null>(null);

  const interval = useInterval(() => {
    setIndicatorAngle((prev) => {
      const now = performance.now();
      const last = lastTimeRef.current ?? now;
      const delta = now - last; // ms since last tick

      lastTimeRef.current = now;

      // multiplier is now effectively "degrees per ms"
      const next = prev + multiplier * delta;
      return next;
    });
  }, TICK_MS);

  const keyHandler = useCallback(
    (e: KeyboardEvent) => {
      const capitalHetaCode = 880;
      const isNonLatin = e.key.charCodeAt(0) >= capitalHetaCode;
      let convKey = e.key.toLowerCase();

      if (isNonLatin) {
        if (e.code.indexOf('Key') === 0 && e.code.length === 4) {
          // i.e. 'KeyW'
          convKey = e.code.charAt(3);
        }

        if (e.code.indexOf('Digit') === 0 && e.code.length === 6) {
          // i.e. 'Digit7'
          convKey = e.code.charAt(5);
        }
      }

      setKeyPressed(convKey.toLowerCase());
    },
    [skillCheck] // keeps same semantics as original
  );

  // Start / reset when skillCheck changes
  useEffect(() => {
    setIndicatorAngle(-90);
    lastTimeRef.current = performance.now();

    window.addEventListener('keydown', keyHandler);
    interval.start();

    return () => {
      interval.stop();
      window.removeEventListener('keydown', keyHandler);
      lastTimeRef.current = null;
    };
  }, [skillCheck, keyHandler, interval]);

  // Fail if we go past the end of the circle
  useEffect(() => {
    if (indicatorAngle + 90 >= 360) {
      interval.stop();
      handleComplete(false);
    }
  }, [indicatorAngle, interval, handleComplete]);

  // Handle key press + success/fail window
  useEffect(() => {
    if (!keyPressed) return;

    if (skillCheck.keys && !skillCheck.keys?.includes(keyPressed)) return;

    interval.stop();
    window.removeEventListener('keydown', keyHandler);

    if (keyPressed !== skillCheck.key || indicatorAngle < angle || indicatorAngle > angle + offset) {
      handleComplete(false);
    } else {
      handleComplete(true);
    }

    setKeyPressed(false);
  }, [keyPressed, angle, offset, indicatorAngle, skillCheck, interval, keyHandler, handleComplete]);

  return <circle transform={`rotate(${indicatorAngle}, 250, 250)`} className={className} />;
};

export default Indicator;
