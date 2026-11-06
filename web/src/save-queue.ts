/** Ignore overlapping saves; a second snapshot must wait for the current commit. */
export function exclusiveSave() {
  let running = false;
  return async (operation: () => Promise<void>) => {
    if (running) return false;
    running = true;
    try {
      await operation();
      return true;
    } finally {
      running = false;
    }
  };
}
