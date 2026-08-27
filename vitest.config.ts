import { defineConfig } from 'vitest/config';

// Unit tests live next to source under src/; Playwright specs under
// tests/e2e are run exclusively by `npm run test:e2e`.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
