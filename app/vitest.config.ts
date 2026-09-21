import { defineConfig } from 'vitest/config'

// Deliberately separate from vite.config.ts: tests exercise plain logic, so
// there's no reason to spin up the React, Tailwind and PWA plugins for them.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
