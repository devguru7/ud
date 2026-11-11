export const springs = {
  snappy: { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.6 },
  liquidPill: { type: 'spring' as const, stiffness: 440, damping: 34, mass: 0.8 },
  card: { type: 'spring' as const, stiffness: 360, damping: 28, mass: 0.9 },
  sheet: { type: 'spring' as const, stiffness: 380, damping: 36, mass: 1.0 },
  gentle: { type: 'spring' as const, stiffness: 260, damping: 26, mass: 1.0 },
  jelly: { type: 'spring' as const, stiffness: 600, damping: 16, mass: 0.7 },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.02 },
  },
};

export const cardEntranceVariant = {
  hidden: { opacity: 0, y: 14, scale: 0.985, filter: 'blur(4px)' },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: springs.card,
  },
};
