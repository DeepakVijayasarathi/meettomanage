import { useEffect, useState } from "react";

/** Keyframes for the whole home page. Everything animated is registered only when the visitor
 *  hasn't asked for reduced motion, and every element's un-animated state is its finished look,
 *  so reduced-motion visitors get a complete static page rather than a half-built one. */
export const FX_CSS = `
.mx-hl { background-image: linear-gradient(#FFCFA3, #FFCFA3); background-repeat: no-repeat; background-position: 0 90%; background-size: 100% 36%; }
@media (prefers-reduced-motion: no-preference) {
  @keyframes mx-hl { to { background-size: 100% 36% } }
  .mx-word.mx-hl { background-size: 0 36%; animation: mx-rise .9s cubic-bezier(.2,.7,.2,1) both, mx-hl .9s cubic-bezier(.2,.7,.2,1) 1s forwards }
  @keyframes mx-rise { from { transform: translateY(55%) } to { transform: translateY(0) } }
  @keyframes mx-fade-up { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
  @keyframes mx-tilt-in { from { opacity: 0; transform: perspective(1600px) translateY(40px) rotateY(-14deg) rotateX(8deg) } to { opacity: 1; transform: perspective(1600px) rotateY(-6deg) rotateX(2deg) } }
  @keyframes mx-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-9px) } }
  @keyframes mx-toast { 0%,100% { opacity: 0; transform: translateY(12px) scale(.97) } 8%,34% { opacity: 1; transform: translateY(0) scale(1) } 42% { opacity: 0; transform: translateY(-8px) scale(.98) } }
  @keyframes mx-pulse { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,.55) } 100% { box-shadow: 0 0 0 10px rgba(239,68,68,0) } }
  @keyframes mx-bar { from { transform: scaleY(0) } to { transform: scaleY(1) } }
  @keyframes mx-draw { to { stroke-dashoffset: 0 } }
  @keyframes mx-marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
  @keyframes mx-dot { 0%,80%,100% { opacity: .25; transform: translateY(0) } 40% { opacity: 1; transform: translateY(-3px) } }
  @keyframes mx-chip { 0% { transform: translateX(0) } 40%,60% { transform: translateX(var(--mx-dx, 56px)) } 100% { transform: translateX(0) } }
  @keyframes mx-ring { from { stroke-dashoffset: var(--mx-ring-full) } to { stroke-dashoffset: var(--mx-ring-to) } }
  @keyframes mx-progress-x { from { transform: scaleX(0) } to { transform: scaleX(1) } }
  @keyframes mx-progress-y { from { transform: scaleY(0) } to { transform: scaleY(1) } }
  @keyframes mx-star { 0% { transform: translateY(0) scale(.5) rotate(-10deg); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(-110px) scale(1.15) rotate(14deg); opacity: 0 } }
  @keyframes mx-pop { 0%,100% { transform: scale(0); opacity: 0 } 8%,36% { transform: scale(1); opacity: 1 } 46% { transform: scale(.9); opacity: 0 } }
  @keyframes mx-tap { 0% { transform: scale(.3); opacity: .75 } 70%,100% { transform: scale(2.4); opacity: 0 } }
  .mx-star { animation: mx-star 3.6s ease-out infinite }
  .mx-pop { animation: mx-pop 9s ease-in-out infinite both }
  .mx-tap { animation: mx-tap 2.2s ease-out infinite }
  @keyframes mx-ping-ring { 0% { transform: scale(.6); opacity: .7 } 100% { transform: scale(2.2); opacity: 0 } }
  .mx-progress { transform-origin: left; animation: mx-progress-x 7s linear both }
  .mx-ping-ring { animation: mx-ping-ring 2.4s ease-out infinite }
  @media (min-width: 1024px) { .mx-progress { transform-origin: top; animation-name: mx-progress-y } }
  .mx-word { display: inline-block; animation: mx-rise .9s cubic-bezier(.2,.7,.2,1) both }
  .mx-fade-up { animation: mx-fade-up .8s cubic-bezier(.2,.7,.2,1) both }
  .mx-tilt-in { animation: mx-tilt-in 1.1s cubic-bezier(.2,.7,.2,1) .25s both }
  .mx-float { animation: mx-float 6s ease-in-out infinite }
  .mx-toast { animation: mx-toast 9s ease-in-out infinite both }
  .mx-live-dot { animation: mx-pulse 1.6s ease-out infinite }
  .mx-bar { transform-origin: bottom; animation: mx-bar .9s cubic-bezier(.2,.7,.2,1) both }
  .mx-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: mx-draw 2.4s ease-in-out .3s forwards }
  .mx-marquee { animation: mx-marquee 38s linear infinite }
  .mx-marquee:hover { animation-play-state: paused }
  .mx-dot { animation: mx-dot 1.2s ease-in-out infinite }
  .mx-chip { animation: mx-chip 6s ease-in-out infinite }
  .has-boot .mx-word { animation: none }
  .has-boot .mx-word.mx-hl { animation: mx-hl .9s cubic-bezier(.2,.7,.2,1) .5s forwards }
  .has-boot .mx-fade-up { animation: none }
  .mx-ring { animation: mx-ring 1.8s cubic-bezier(.2,.7,.2,1) .4s both }
}
`;

/** True once the page has scrolled past `offset` px — drives the nav's shadow. */
export function useScrolled(offset = 8): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return scrolled;
}
