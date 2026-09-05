import type { Variants } from 'framer-motion';

/** Simple opacity/translate fade-in. Use on any single element entering the view. */
export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

/**
 * Apply `staggerContainer` to a parent's `variants`/`animate="visible"` and
 * `fadeIn` (or `staggerItem`) to each child — children reveal in sequence
 * instead of all at once.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

/**
 * For `whileInView` on elements entering via scroll — pair with
 * `viewport={{ once: true, amount: 0.3 }}`.
 */
export const scrollReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};
