export function withViewTransition(fn) {
  
  if (document.startViewTransition) {
    return document.startViewTransition(async () => {
      await fn();
    });
  }
  return fn();
}
