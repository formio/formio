'use strict';

/**
 * Sanitize database connection strings.
 * This regex matches:
 * 1. The protocol and optional +srv part: (mongodb(?:\+srv)?://)
 * 2. The username (assuming no ':' in username): ([^:]+)
 * 3. The optional password part: (:[^@]+)?
 * Followed by '@' that leads to host info.
 * After the match:
 * - p1: mongodb:// or mongodb+srv://
 * - p2: username
 * - p3: :password (if present)
 */
function sanitizeMongoConnectionString(connectionString) {
    return connectionString.replace(
        /(mongodb(?:\+srv)?:\/\/)([^:]+)(:[^@]+)?@/,
        (match, p1, p2, p3) => {
        // If a password is present, replace it with `***`
        if (p3) {
            return `${p1}${p2}:***@`;
        }
        // If no password is present (just username), leave it as is.
        return `${p1}${p2}@`;
        }
    );
}

module.exports = {sanitizeMongoConnectionString};
