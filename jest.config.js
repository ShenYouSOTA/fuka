export default {
  injectGlobals: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { useESM: true },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts', 'tests/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
};