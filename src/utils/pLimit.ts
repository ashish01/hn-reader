/**
 * Simple concurrency limiter.
 * Returns a `limit` function that wraps async work
 * so that at most `concurrency` tasks run in parallel.
 */
export function pLimit(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const next = () => {
    if (queue.length > 0 && active < concurrency) {
      active++;
      const run = queue.shift()!;
      run();
    }
  };

  const limit = <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            active--;
            next();
          });
      };

      if (active < concurrency) {
        active++;
        run();
      } else {
        queue.push(run);
      }
    });
  };

  return limit;
}
