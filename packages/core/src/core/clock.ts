export interface Clock {
  /** Returns the current time in milliseconds since epoch */
  now(): number;
}

/**
 * Default clock implementation using Date.now().
 * In tests, this should be replaced with a deterministic mock.
 */
export const defaultClock: Clock = {
  now: () => Date.now(),
};

let activeClock = defaultClock;

export const clock = {
  now: () => activeClock.now(),
  /** Override the clock for testing */
  setClock: (newClock: Clock) => {
    activeClock = newClock;
  },
  /** Restore the default clock */
  restore: () => {
    activeClock = defaultClock;
  },
};
