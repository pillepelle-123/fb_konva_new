import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
};

const transition = {
  duration: 0.4,
  ease: [0.25, 0.46, 0.45, 0.94] as const,
};

/**
 * Layout für /books-Routen. Ermöglicht Schiebefolien-Übergänge zwischen Index und Archiv via Framer Motion.
 * Bleibt beim Wechsel zwischen /books und /books/archive gemountet, damit AnimatePresence funktioniert.
 */
export default function BooksLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const isSlideRoute = location.pathname === '/books' || location.pathname === '/books/archive';

  // Keine Slide-Animation für create, manager, export, etc.
  if (!isSlideRoute) {
    return outlet;
  }

  // Richtung: 1 = von Archiv (Index schiebt von links), -1 = von Index (Archiv schiebt von rechts)
  const from = (location.state as { from?: string })?.from;
  const direction = from === 'archive' ? 1 : -1;

  return (
    <div className="relative w-full min-h-full overflow-hidden">
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={location.key || location.pathname}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="absolute inset-0 w-full min-h-full"
          style={{ overflow: 'auto' }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
