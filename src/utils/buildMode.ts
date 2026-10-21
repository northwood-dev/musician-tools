// True on a Vite dev build (`npm run dev`), false in a production build.
// Its own module because Jest compiles to CommonJS, where `import.meta` doesn't parse: the
// test config maps this file to src/test/buildModeStub.ts, and a test can jest.mock it.
export const isDevBuild: boolean = import.meta.env.DEV;
