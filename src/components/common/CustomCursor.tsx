/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Classic dot + trailing ring cursor. The dot tracks the pointer exactly;
 * the ring eases toward it a frame behind, and both grow/merge into a
 * filled ring whenever the pointer is over anything clickable. Rendered
 * via a portal directly on <body> so it sits above everything and
 * mix-blend-mode: difference lets it read on any background — light,
 * dark, or sitting on top of the emerald CTA buttons — without needing
 * to know the current theme.
 *
 * Desktop-only: on touch / coarse-pointer devices this renders nothing
 * and never hides the native cursor.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './CustomCursor.css';

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, select, textarea, summary, [data-cursor-hover], .cursor-hover-card';

const BODY_ACTIVE_CLASS = 'agrismart-custom-cursor-active';

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fineHoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let animationId = 0;

    // Ring position lags a frame behind the dot for the classic trailing
    // feel. Under reduced-motion we skip the lag entirely (factor 1 = the
    // ring snaps straight to the pointer, no continuous animation loop).
    const lagFactor = reducedMotionQuery.matches ? 1 : 0.2;

    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { x: pointer.x, y: pointer.y };
    let hasMoved = false;

    const dot = dotRef.current;
    const ring = ringRef.current;

    function setActive(next: boolean) {
      document.body.classList.toggle(BODY_ACTIVE_CLASS, next);
      if (!next) {
        dot?.classList.remove('is-visible');
        ring?.classList.remove('is-visible');
        hasMoved = false;
      }
    }

    function handlePointerMove(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        ringPos.x = pointer.x;
        ringPos.y = pointer.y;
        dot?.classList.add('is-visible');
        ring?.classList.add('is-visible');
      }
      if (dot) {
        dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
      }
    }

    function handlePointerDown(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      dot?.classList.add('is-down');
      ring?.classList.add('is-down');
    }

    function handlePointerUp(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      dot?.classList.remove('is-down');
      ring?.classList.remove('is-down');
    }

    function handleOver(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      const target = e.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) {
        dot?.classList.add('is-hover');
        ring?.classList.add('is-hover');
      }
    }

    function handleOut(e: PointerEvent) {
      if (e.pointerType !== 'mouse') return;
      const related = e.relatedTarget as Element | null;
      const target = e.target as Element | null;
      const leavingInteractive = target?.closest(INTERACTIVE_SELECTOR);
      const enteringInteractive = related?.closest?.(INTERACTIVE_SELECTOR);
      if (leavingInteractive && !enteringInteractive) {
        dot?.classList.remove('is-hover');
        ring?.classList.remove('is-hover');
      }
    }

    function handleLeaveWindow() {
      dot?.classList.add('is-hidden');
      ring?.classList.add('is-hidden');
    }

    function handleEnterWindow() {
      dot?.classList.remove('is-hidden');
      ring?.classList.remove('is-hidden');
    }

    function tick() {
      ringPos.x += (pointer.x - ringPos.x) * lagFactor;
      ringPos.y += (pointer.y - ringPos.y) * lagFactor;
      if (ring) {
        ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) translate(-50%, -50%)`;
      }
      animationId = requestAnimationFrame(tick);
    }

    function handleFineHoverChange() {
      setActive(fineHoverQuery.matches);
    }

    setActive(fineHoverQuery.matches);
    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('pointerover', handleOver, { passive: true });
    document.addEventListener('pointerout', handleOut, { passive: true });
    document.addEventListener('mouseleave', handleLeaveWindow);
    document.addEventListener('mouseenter', handleEnterWindow);
    fineHoverQuery.addEventListener('change', handleFineHoverChange);
    animationId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointerover', handleOver);
      document.removeEventListener('pointerout', handleOut);
      document.removeEventListener('mouseleave', handleLeaveWindow);
      document.removeEventListener('mouseenter', handleEnterWindow);
      fineHoverQuery.removeEventListener('change', handleFineHoverChange);
      cancelAnimationFrame(animationId);
      document.body.classList.remove(BODY_ACTIVE_CLASS);
    };
  }, []);

  return createPortal(
    <>
      <div ref={ringRef} className="custom-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="custom-cursor-dot" aria-hidden="true" />
    </>,
    document.body
  );
}
