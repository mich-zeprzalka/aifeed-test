"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface TickerItem {
  title: string;
  slug: string;
}

interface NewsTickerProps {
  items: TickerItem[];
}

const PIXELS_PER_SECOND = 40;

// Snapshot items on first render and never react to prop updates after that.
// Why: the root layout re-fetches on every navigation, so `items` gets a fresh
// reference on each route change. Updating the animation against that risks
// cancelling the WAAPI track and leaving it frozen if the rebuild catches the
// DOM mid-reconciliation (offsetWidth = 0). Trading off in-session freshness
// for a guaranteed always-scrolling marquee.
export function NewsTicker({ items }: NewsTickerProps) {
  const [snapshot] = useState<TickerItem[]>(items);
  const trackRef = useRef<HTMLUListElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || snapshot.length === 0) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let pendingFrame = 0;

    // Animacja "newsroom ticker": pojedynczy DOM (bez duplikacji items —
    // świadomie, dla SEO/a11y). Po pełnym cyklu (~60-100s zależnie od ilości
    // i szerokości) animacja iteruje — krótki ~5s blank pomiędzy iteracjami
    // jest akceptowalny, użytkownik patrząc okazjonalnie i tak nie zauważy.
    //
    // Kluczowy `iterationStart`: bez niego pierwsza iteracja zaczynałaby się
    // przy translateX(viewportWidth) — items poza prawą krawędzią, viewport
    // pusty. SSR rendruje items w naturalnej pozycji (translateX(0), widoczne
    // od lewej), więc po hydratacji animacja "skakałaby" do pustego stanu i
    // user widziałby flash → pusto → items wjeżdżają od prawej. `iterationStart`
    // pozycjonuje pierwszą klatkę dokładnie tam gdzie SSR ją zostawił —
    // zero glitchu, ticker startuje **wypełniony** treścią. Subsequent
    // iteracje startują normalnie od krawędzi prawej (off-screen → invisible
    // jump między iteracjami, bo end-iteration też jest off-screen).
    const buildAnimation = () => {
      if (cancelled || !track) return;
      // `scrollWidth` (nie offsetWidth) — łapie pełną szerokość track'u nawet
      // gdy parent ma overflow:hidden. Bez tego dostalibyśmy width viewport'u
      // zamiast pełnej długości items.
      const trackWidth = track.scrollWidth;
      if (trackWidth === 0) return;
      const viewportWidth = track.parentElement?.offsetWidth ?? window.innerWidth;

      animationRef.current?.cancel();
      const totalDistance = trackWidth + viewportWidth;
      const duration = (totalDistance / PIXELS_PER_SECOND) * 1000;
      // Math: animacja interpoluje translateX z `viewportWidth` (offset 0) do
      // `-trackWidth` (offset 1). Solve dla translateX = 0:
      //   p = viewportWidth / (viewportWidth + trackWidth)
      // Pierwsza iteracja zaczyna się przy progress=p, więc renderowany
      // transform = translateX(0) na pierwszej klatce. Następne iteracje
      // standardowo od progress=0 (translateX(viewportWidth)).
      const iterationStart = viewportWidth / totalDistance;

      animationRef.current = track.animate(
        [
          // Start: track w całości za prawą krawędzią viewport'u
          { transform: `translate3d(${viewportWidth}px, 0, 0)` },
          // End: track w całości za lewą krawędzią viewport'u
          { transform: `translate3d(-${trackWidth}px, 0, 0)` },
        ],
        { duration, iterations: Infinity, easing: "linear", iterationStart }
      );
    };

    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    fontsReady.then(buildAnimation);

    // Debounced ResizeObserver — coalesces rapid resize events (font load +
    // window resize + dev HMR mogą fire'ować 5-10× w szybkiej serii) do
    // jednego rebuildu na klatkę. Bez tego każdy event cancel'uje i tworzy
    // nową animację, co daje widoczne stuttery.
    const ro = new ResizeObserver(() => {
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      pendingFrame = requestAnimationFrame(() => {
        pendingFrame = 0;
        buildAnimation();
      });
    });
    ro.observe(track);

    // IntersectionObserver — pauzuje WAAPI gdy ticker jest scroll'nięty poza
    // viewport (czyli user przeczytał już górę i jest w połowie strony).
    // Niewielka oszczędność GPU + battery, zerowy wpływ na UX (i tak nie
    // widać). Animation track jest na compositor layer, więc raczej tani —
    // ale to praktyka best-in-class.
    const io = new IntersectionObserver(
      ([entry]) => {
        const anim = animationRef.current;
        if (!anim) return;
        if (entry.isIntersecting) {
          if (document.visibilityState === "visible" && anim.playState !== "running") {
            anim.play();
          }
        } else {
          anim.pause();
        }
      },
      { threshold: 0 }
    );
    io.observe(track);

    // Browsers suspend WAAPI when the tab is hidden; resume on return.
    // pageshow handles bfcache restoration on Safari/Firefox.
    const resume = () => {
      const anim = animationRef.current;
      if (
        document.visibilityState === "visible" &&
        anim &&
        anim.playState !== "running"
      ) {
        anim.play();
      }
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);

    return () => {
      cancelled = true;
      if (pendingFrame) cancelAnimationFrame(pendingFrame);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      animationRef.current?.cancel();
      animationRef.current = null;
    };
  }, [snapshot]);

  // Pause-on-hover is intentional for desktop, but touch devices synthesize
  // `mouseenter` on tap without a reliable matching `mouseleave` once the user
  // navigates away — leaving the marquee frozen across route changes. Gate the
  // handlers on the actual pointer type so phones never pause.
  const handlePointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    animationRef.current?.pause();
  };
  const handlePointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    animationRef.current?.play();
  };

  if (snapshot.length === 0) return null;

  return (
    <aside
      aria-labelledby="news-ticker-heading"
      className="border-b border-border bg-foreground overflow-hidden p-1"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      {/* Visually-hidden landmark heading. Screen readers can jump to the
          ticker by region; sighted users still see the marquee directly. */}
      <h2 id="news-ticker-heading" className="sr-only">
        Najnowsze artykuły
      </h2>

      {/* `<ul role="list">` — semantyczna lista linków (zamiast generycznego
          <div>). Tailwind reset usuwa list-style, co w Safari + VoiceOver
          przesłania role listy — defensywne `role="list"` zapewnia że
          screen readery zawsze zapowiadają "lista 20 elementów". */}
      <ul
        ref={trackRef}
        role="list"
        className="flex w-max items-center will-change-transform"
      >
        {snapshot.map((item, i) => (
          <li
            key={item.slug}
            className="shrink-0 flex items-center whitespace-nowrap"
          >
            <Link
              href={`/artykul/${item.slug}`}
              className="py-1.5 text-sm text-background/70 hover:text-background transition-colors"
            >
              {item.title}
            </Link>
            {/* Bullet RENDEROWANY tylko POMIĘDZY items. Po ostatnim items
                nic nie pokazujemy — zgodne z naturą listy. */}
            {i < snapshot.length - 1 && (
              <span
                className="mx-2 text-background/30 text-[8px]"
                aria-hidden="true"
              >
                &bull;
              </span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
