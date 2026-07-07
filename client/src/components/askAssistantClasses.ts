/** Shared layout classes for header Ask Appy the Assistant. popovers. */
export const ASK_ASSISTANT_PANEL_CLASS = [
  'z-[60] flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl',
  'fixed left-3 right-3',
  'top-[max(4.5rem,env(safe-area-inset-top,0px))]',
  'bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
  'sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:bottom-auto sm:left-auto',
  'sm:h-[min(32rem,calc(100dvh-6rem))] sm:w-[min(24rem,calc(100vw-2rem))]',
].join(' ')

export const ASK_ASSISTANT_BACKDROP_CLASS =
  'fixed inset-0 z-[55] cursor-pointer bg-black/35 sm:hidden'
