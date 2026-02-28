/**
 * Shared motion/react animation variants for wizard-style page transitions.
 * Used by OnboardingPage, DailySetupPage, WelcomePage, etc.
 */
export const slideVariants = {
    enter: (direction) => ({
        x: direction > 0 ? 80 : -80,
        opacity: 0,
        filter: 'blur(8px)',
    }),
    center: {
        x: 0,
        opacity: 1,
        filter: 'blur(0px)',
    },
    exit: (direction) => ({
        x: direction > 0 ? -80 : 80,
        opacity: 0,
        filter: 'blur(8px)',
    }),
};
export const slideTransition = { duration: 0.3, ease: 'easeOut' };
