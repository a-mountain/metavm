import { runScriptInIframe } from './iframe-sandbox.js';

const contextOptionsSymbol = Symbol('contextOptionsSymbol');

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

/**
 * options -  is not supported
 */
class Script {
  constructor(code) {
    this.code = code;
  }

  /**
   * options -  is not supported
   */
  runInContext(contextifiedObject) {
    if (!isContext(contextifiedObject)) {
      const type = typeof contextifiedObject;
      const msg =
        'The "contextifiedObject" argument must be an vm.Context.' +
        ` Received an instance of ${type}`;
      throw new TypeError(msg);
    }
    return runScriptInIframe(document, contextifiedObject, this.code);
  }

  /**
   * options -  is not supported
   */
  runInNewContext(contextObject) {
    const contextifiedObject = createContext(contextObject);
    return this.runInContext(contextifiedObject);
  }

  /**
   * options -  is not supported
   */
  runInThisContext() {
    return eval(this.code);
  }
}

/**
 * options -  is not supported
 */
const runInContext = (code, context) => new Script(code).runInContext(context);

/**
 * options -  is not supported
 */
const runInNewContext = (code, contextObject, options) => {
  const script = new Script(code);
  return script.runInNewContext(contextObject, options);
};

/**
 * options -  is not supported
 */
const runInThisContext = (code, options) => {
  const script = new Script(code, options);
  return script.runInThisContext();
};

export {
  Script,
  runInContext,
  runInNewContext,
  runInThisContext,
  createContext,
  isContext
};
