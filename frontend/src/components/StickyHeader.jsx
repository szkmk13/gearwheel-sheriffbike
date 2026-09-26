import { useState, useEffect, useRef } from "react";

export default function StickyHeader({ children, className = "" }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0 }
    );
    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="absolute top-0 left-0 w-full h-1 -z-10" />

      <div className={`sticky top-0 z-10 bg-[var(--color-paper)] pt-4 sm:pt-6 md:pt-8 pb-4 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 mb-4 sm:mb-6 transition-all duration-300 border-b ${
                    isScrolled ? 'shadow-sm border-[var(--color-line)]' : 'shadow-none border-transparent'} ${className}`}>
        {children}
      </div>
    </>
  );
}