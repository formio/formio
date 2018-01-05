'use strict';

module.exports = {
  /**
   * The maximum nonce value.
   */
  MAX_NONCE: 4294967295, // Max nonce value - (2^32 - 1)

  /**
   * Get a random nonce within the supported range.
   *
   * @returns {number}
   */
  random() {
    return Math.floor(Math.random() * this.MAX_NONCE); // 0 - 4294967295 (2^32 - 1)
  }
};
