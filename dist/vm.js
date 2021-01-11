import { normalizeOptions } from './options';

const sandboxes = new WeakMap();
let contextCounter = 0;

const FILENAME_DEFAULT = 'evalmachine.';
const IFRAME_CLASS_DEFAULT = 'iframe-vm';
const TIMEOUT_DEFAULT = 0;

const getDefaultContextName = () => `VM Context ${contextCounter++}`;
const getIframeId = () => `iframe-vm:${Date.now()}`;

const throwEvalError = () => {
  const msg = 'Code generation from strings disallowed for this context';
  throw new EvalError(msg);
};

const throwNotContextifiedObjectTypeError = (context) => {
  const type = typeof context;
  const msg =
    'The "contextifiedObject" argument must be an vm.Context.' +
    ` Received an instance of ${type}`;
  throw new TypeError(msg);
};

const deleteByValue = (array, value) => {
  const index = array.indexOf(value);
  if (index > -1) {
    array.splice(index, 1);
  }
};

const createIframeElement = (document, name) => {
  const element = document.createElement('iframe');
  element.style.display = 'none';
  element.id = getIframeId();
  element.name = name;
  element.className = IFRAME_CLASS_DEFAULT;
  document.body.appendChild(element);
  return element;
};

const setFilenameForAllErrors = (contentWindow, errorFilename) => {
  const errors = [
    Error,
    EvalError,
    RangeError,
    ReferenceError,
    SyntaxError,
    TypeError,
    URIError,
  ];
  errors
    .map((error) => ({
      name: error.name,
      newError: class ErrorWithFilename extends error {
        constructor(message, filename, lineNumber) {
          super(message, filename, lineNumber);
          this.filename = errorFilename;
        }
      },
    }))
    .forEach((v) => (contentWindow[v.name] = v.newError));
};

const funcWithoutCodeGeneration = () =>
  class Func extends Function {
    constructor(...args) {
      if (args.length !== 0) {
        throwEvalError();
      }
      super();
    }
  };

const createIframe = (document, context, options) => {
  const element = createIframeElement(document, options.name);
  const contentWindow = element.contentWindow;
  Object.assign(contentWindow, context);
  const defaultContentKeys = Object.keys(contentWindow);
  const isNotDefaultContentKey = key => !defaultContentKeys.includes(key);
  const runScript = contentWindow.eval;
  setFilenameForAllErrors(contentWindow, options.filename);
  if (options.blockCodeGeneration) {
    contentWindow.eval = throwEvalError;
    contentWindow.Function = funcWithoutCodeGeneration();
  }
  return {
    deleteFromDocument() {
      document.body.removeChild(element);
    },
    updateContext() {
      const isExtensible = Object.isExtensible(context);
      const isContextKey = key => key in context;
      const canAddNewKey = key => isExtensible && isNotDefaultContentKey(key);
      for (const [key, value] of Object.entries(contentWindow)) {
        if (isContextKey(key) || canAddNewKey(key)) {
          context[key] = value;
        }
      }
    },
    runScript(script) {
      return runScript(script);
    },
  };
};

const createSandbox = (context, rootWindow, contextOptions) => {
  const iframes = [];
  const isFrozen = Object.isFrozen(context);
  const getIframe = iframeOptions => {
    const iframe = createIframe(rootWindow.document, context, iframeOptions);
    iframes.push(iframe);
    return iframe;
  };
  const deleteIframe = iframe => {
    if (!isFrozen) {
      iframe.updateContext();
    }
    deleteByValue(iframes, iframe);
    iframe.deleteFromDocument();
  };
  return {
    updateContext() {
      if (iframes.length === 0) {
        return;
      }
      if (!isFrozen) {
        iframes.forEach(iframe => iframe.updateContext());
      }
    },
    runScript(script, runOptions) {
      const iframeOptions = {
        name: contextOptions.name,
        blockCodeGeneration: !contextOptions.codeGeneration.strings,
        filename: runOptions.filename,
      };
      const iframe = getIframe(iframeOptions);
      const timeout = runOptions.timeout;
      try {
        const result = iframe.runScript(script);
        if (timeout === 0) {
          deleteIframe(iframe);
        } else if (timeout > 0 && timeout !== Number.MAX_VALUE) {
          setTimeout(() => deleteIframe(iframe), timeout);
        }
        return result;
      } catch (e) {
        deleteIframe(iframe);
        throw e;
      }
    },
  };
};

const duplicate = (object) => {
  const duplicate = {};
  Object.assign(duplicate, object);
  if (Object.isFrozen(object)) {
    Object.freeze(duplicate);
  }
  if (Object.isSealed(object)) {
    Object.seal(duplicate);
  }
  if (!Object.isExtensible(object)) {
    Object.preventExtensions(duplicate);
  }
  return duplicate;
};

const createContextProxy = (sandbox, context) => {
  const updateContext = () => sandbox.updateContext();
  return new Proxy(context, {
    get(target, key) {
      updateContext();
      return target[key];
    },
    set(target, key, value) {
      updateContext();
      target[key] = value;
    },
    has(target, p) {
      updateContext();
      return target in p;
    },
    ownKeys(target) {
      updateContext();
      return Object.keys(target);
    },
    defineProperty(target, p, attributes) {
      updateContext();
      Object.defineProperty(target, p, attributes);
    },
    deleteProperty(target, p) {
      updateContext();
      delete target[p];
    },
    getOwnPropertyDescriptor(target, p) {
      updateContext();
      return Object.getOwnPropertyDescriptor(target, p);
    },
  });
};

const makeOptionsFromFilename = (filename) => ({ filename });

const isFilename = (options) => typeof options === 'string';

const createContext = (contextObject, options = {}) => {
  normalizeOptions(options, {
    name: getDefaultContextName(),
    codeGeneration: {
      strings: true,
    },
  });
  const context = duplicate(contextObject);
  const sandbox = createSandbox(context, window, options);
  const proxyContext = createContextProxy(sandbox, context);
  sandboxes.set(proxyContext, sandbox);
  return proxyContext;
};

const isContext = (context) => sandboxes.has(context);

const runInContext = (code, context, options = {}) => {
  if (!isContext(context)) {
    throwNotContextifiedObjectTypeError(context);
  }
  if (isFilename(options)) {
    options = makeOptionsFromFilename(options);
  }
  normalizeOptions(options, {
    timeout: TIMEOUT_DEFAULT,
    filename: FILENAME_DEFAULT,
  });
  const sandbox = sandboxes.get(context);
  return sandbox.runScript(code, options);
};

const runInNewContext = (code, contextObject = {}, options = {}) => {
  if (isFilename(options)) {
    options = makeOptionsFromFilename(options);
  }
  normalizeOptions(options, {
    timeout: TIMEOUT_DEFAULT,
    filename: FILENAME_DEFAULT,
    contextCodeGeneration: {
      strings: true,
    },
    contextName: getDefaultContextName(),
  });
  const contextOptions = {
    name: options.contextName,
    codeGeneration: options.contextCodeGeneration,
  };
  const context = createContext(contextObject, contextOptions);
  return runInContext(code, context, options);
};

const runInThisContext = (code) => eval(code);

class Script {
  constructor(code, options = {}) {
    this.code = code;
    if (isFilename(options)) {
      options = makeOptionsFromFilename(options);
    }
    normalizeOptions(options, {
      filename: FILENAME_DEFAULT,
    });
    this.options = options;
  }

  runInContext(contextifiedObject, options = {}) {
    options.filename = this.options.filename;
    return runInContext(this.code, contextifiedObject, options);
  }

  runInNewContext(contextObject, options = {}) {
    options.filename = this.options.filename;
    return runInNewContext(this.code, contextObject, options);
  }

  runInThisContext() {
    return runInThisContext(this.code);
  }
}

export {
  runInContext,
  runInNewContext,
  runInThisContext,
  createContext,
  isContext,
  Script,
};
