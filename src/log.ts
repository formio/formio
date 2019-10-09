/**
 * This is a wrapper for console.
 *
 * @param args
 */
export const log = (type, ...args) => {
  console[type](...args);
};
