import type { Variants, Transition } from 'framer-motion';

export const ease = [0.22, 1, 0.36, 1] as const;

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export const containerVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
};

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease } },
};

export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
  exit:    { opacity: 0, y: 16, transition: { duration: 0.25 } },
};

export const slideDownVariants: Variants = {
  initial: { opacity: 0, y: -16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
  exit:    { opacity: 0, y: -16, transition: { duration: 0.2 } },
};

export const scaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export const drawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { duration: 0.4, ease } },
  exit:    { x: '100%', transition: { duration: 0.3, ease } },
};

export const bottomSheetVariants: Variants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: { duration: 0.4, ease } },
  exit:    { y: '100%', transition: { duration: 0.3 } },
};

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};

export const notificationVariants: Variants = {
  initial: { opacity: 0, y: -32, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease } },
  exit:    { opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.25 } },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, x: -16 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease } },
};

export const statusTimelineVariants: Variants = {
  initial: { scaleY: 0, opacity: 0 },
  animate: { scaleY: 1, opacity: 1, transition: { duration: 0.4, ease } },
};

/* Scroll reveal — use with whileInView */
export const scrollRevealVariants: Variants = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

/* Staggered container for whileInView */
export const staggerContainerVariants: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

/* Hero sequence */
export const heroVariants: Variants = {
  initial: { opacity: 0, y: 28 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease },
  }),
};

/* Button tap animation — add as whileTap prop */
export const buttonTap = { scale: 0.96, transition: { duration: 0.1 } };

/* Floating card */
export const floatVariant = (dir: 'up' | 'down' = 'up') => ({
  animate: {
    y: dir === 'up' ? [0, -8, 0] : [0, 8, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
});

/* Transitions */
export const badgeBounceTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 20,
};

export const springConfig: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
};

export const gentleSpring: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 20,
};
