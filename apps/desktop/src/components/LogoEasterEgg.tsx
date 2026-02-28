import { useRef, useCallback } from 'react';
import { createTimeline } from 'animejs';
import { NorotLogo } from '@/components/NorotLogo';

export function LogoEasterEgg() {
  const svgRef = useRef<SVGSVGElement>(null);
  const isAnimating = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (!svgRef.current || isAnimating.current) return;

    // Respect reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    isAnimating.current = true;

    createTimeline({
      onComplete: () => { isAnimating.current = false; },
    })
      // Step 1: skew left + blur + hue shift
      .add(svgRef.current, {
        skewX: -5,
        filter: 'blur(2px) hue-rotate(45deg)',
        duration: 100,
        ease: 'inOutQuad',
      })
      // Step 2: skew right + stronger hue
      .add(svgRef.current, {
        skewX: 5,
        filter: 'blur(1px) hue-rotate(90deg)',
        duration: 100,
        ease: 'inOutQuad',
      })
      // Step 3: skew left smaller + more blur
      .add(svgRef.current, {
        skewX: -3,
        filter: 'blur(3px) hue-rotate(180deg)',
        duration: 100,
        ease: 'inOutQuad',
      })
      // Step 4: snap back to normal
      .add(svgRef.current, {
        skewX: 0,
        filter: 'blur(0px) hue-rotate(0deg)',
        duration: 100,
        ease: 'inOutQuad',
      });
  }, []);

  return (
    <div className="flex items-center justify-center w-full h-20 mb-2" onMouseEnter={handleMouseEnter}>
      <NorotLogo ref={svgRef} className="w-20 h-20 cursor-pointer" />
    </div>
  );
}
