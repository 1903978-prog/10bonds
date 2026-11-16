// Load the worker with Node's native ESM loader instead of Vitest's module transformer.
module.exports = (specifier) => import(specifier);
