'use strict';

const prepareWindow = (window) => {
  window.setTimeout = undefined;
  window.setInterval = undefined;
  window.clearTimeout = undefined;
  window.clearInterval = undefined;
  window.fetch = undefined;
};

const updateContext = (defaultWindowKeys, window, context) => {
  const contextKeys = Object.keys(context);
  const isExtensibleContext = Object.isExtensible(context);
  const isNewProperty = (key) => !defaultWindowKeys.includes(key);
  const isContextKey = (key) => contextKeys.includes(key);
  for (const [key, value] of Object.entries(window)) {
    if (isContextKey(key) || (isExtensibleContext && isNewProperty(key))) {
      context[key] = value;
    }
  }
};

const createIframe = (document) => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  return iframe;
};

const runScriptInWindowWithContext = (window, context, code) => {
  const runScript = window.eval;
  const defaultWindowKeys = Object.keys(window);
  Object.assign(window, context);
  const result = runScript(code);
  if (!Object.isFrozen(context)) {
    updateContext(defaultWindowKeys, window, context);
  }
  return result;
};

const runScriptInIframe = (documentToAddIframe, context, code) => {
  const iframe = createIframe(documentToAddIframe);
  documentToAddIframe.body.appendChild(iframe);
  const iframeWindow = iframe.contentWindow;
  prepareWindow(iframeWindow);
  const result = runScriptInWindowWithContext(iframeWindow, context, code);
  documentToAddIframe.body.removeChild(iframe);
  return result;
};

module.exports = { runScriptInIframe };
