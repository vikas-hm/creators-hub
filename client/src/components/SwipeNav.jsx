import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// true:  slide right opens the page on the right in the bottom bar, slide left opens the one on the left
// false: the other way round (slide left opens the page on the right)
const SLIDE_RIGHT_GOES_RIGHT = true;

const MIN_DISTANCE = 70; // how far the finger must move
const EDGE = 24; // the screen edges are left for the phone's own back gesture

// Is the touch inside something that scrolls sideways?
function insideHorizontalScroller(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 2) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return true;
    }
    node = node.parentElement;
  }
  return false;
}

export default function SwipeNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!localStorage.getItem('token')) return;

    const me = JSON.parse(localStorage.getItem('user') || 'null')?.username || '';
    // The same order as the bottom bar: Home, Search, Reels, Messages, Profile
    const tabs = ['/', '/search', '/reels', '/messages', '/u/' + me];
    const here = tabs.findIndex((p) => p.toLowerCase() === pathname.toLowerCase());

    // Only these five pages swipe. Chats, other profiles and so on do not.
    if (here === -1) return;

    let start = null;

    const onStart = (e) => {
      start = null;
      if (e.touches.length !== 1) return;

      const t = e.touches[0];
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return;

      const el = e.target;
      if (
        el.closest &&
        el.closest('input, textarea, select, [role="dialog"], .sheet-backdrop, [data-no-swipe]')
      ) {
        return;
      }
      if (insideHorizontalScroller(el)) return;

      start = { x: t.clientX, y: t.clientY, time: Date.now() };
    };

    const onEnd = (e) => {
      if (!start) return;

      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const took = Date.now() - start.time;
      start = null;

      if (Math.abs(dx) < MIN_DISTANCE) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.6) return; // mostly up or down, so it is a scroll
      if (took > 800) return; // a slow drag, not a swipe
      if (window.getSelection && String(window.getSelection()).length > 0) return;

      const goesRight = SLIDE_RIGHT_GOES_RIGHT ? dx > 0 : dx < 0;
      const next = here + (goesRight ? 1 : -1);
      if (next < 0 || next >= tabs.length) return;

      const root = document.documentElement;
      root.setAttribute('data-slide', goesRight ? 'right' : 'left');
      setTimeout(() => root.removeAttribute('data-slide'), 400);

      navigate(tabs[next]);
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [pathname, navigate]);

  return null;
}