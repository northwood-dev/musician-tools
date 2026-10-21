// Stands in for src/utils/buildMode.ts under Jest (moduleNameMapper in package.json):
// `import.meta` doesn't parse in the CommonJS output ts-jest produces. Tests run as a
// production build unless they jest.mock('../utils/buildMode').
export const isDevBuild = false;
