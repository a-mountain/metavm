'use strict';

const contextOptionsSymbol = Symbol('contextOptionsSymbol');

/**
 * options - is supported
 */
const createContext = (contextObject, options = {}) => {
  const context = {};
  Object.assign(context, contextObject);
  Object.freeze(options);
  Object.defineProperty(context, contextOptionsSymbol, {
    value: options,
    writable: false,
    enumerable: false,
    configurable: false,
  });
  if (Object.isFrozen(contextObject)) {
    Object.freeze(context);
  }
  if (Object.isSealed(contextObject)) {
    Object.seal(context);
  }
  if (!Object.isExtensible(contextObject)) {
    Object.preventExtensions(context);
  }
  return context;
};

const isContext = (context) => context[contextOptionsSymbol] !== undefined;

const getContextOptions = (context) => {
  if (isContext(context)) {
    return context[contextOptionsSymbol];
  }
};

module.exports = { createContext, isContext, getContextOptions };
