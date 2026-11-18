declare module '@testing-library/jest-dom/matchers' {
  const matchers: Record<string, (...args: unknown[]) => unknown>;
  export default matchers;
}
