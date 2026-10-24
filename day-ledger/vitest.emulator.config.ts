import { defineConfig } from 'vitest/config';

// Runs only the tests that need the Firestore emulator (see `npm run test:emulator`).
export default defineConfig({ test: { environment: 'node', include: ['src/**/*.emu.test.ts'] } });
