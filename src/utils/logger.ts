/**
 * Development-only diagnostics. Never pass tokens, headers, request/response
 * bodies or personal data here — only method, path, status and timings.
 */
export const devLog = {
  info(scope: string, message: string): void {
    if (__DEV__) console.info(`[${scope}] ${message}`);
  },
  warn(scope: string, message: string): void {
    if (__DEV__) console.warn(`[${scope}] ${message}`);
  }
};
