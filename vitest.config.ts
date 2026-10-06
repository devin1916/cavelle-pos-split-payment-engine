import { defineConfig } from 'vitest/config';

// Standalone config: the suites cover pure domain logic (no JSX, no CSS),
// so the React/Tailwind Vite plugins are not needed here.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});
