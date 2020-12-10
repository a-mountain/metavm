'use strict';

const mt = require('metatests');
const vm = require('../lib/browser-vm/vm.js');

mt.test('use not contextified object', (test) => {
  const msg =
    'The "contextifiedObject" argument must be an vm.Context.' +
    ` Received an instance of object`;
  test.throws(() => vm.runInContext('', {}), new TypeError(msg));
  test.end();
});

mt.test('check deleting iframe', (test) => {
  vm.runInNewContext('', {});
  const actual = document.getElementsByTagName('iframe');
  test.strictSame(actual.length, 0);
  test.end();
});

mt.test('run in this context', (test) => {
  window.a = 2;
  window.b = 2;
  const actual = vm.runInThisContext('a + b');
  test.strictSame(actual, 4);
  test.end();
});

mt.test('has context property', (test) => {
  const code = 'a';
  const script = new vm.Script(code);
  const context = vm.createContext({ a: 2 });
  const result = script.runInContext(context);
  test.strictSame(result, 2);
  test.end();
});

mt.test('change object property', (test) => {
  const context = vm.createContext({ a: { b: 1 } });
  vm.runInContext('a.b = 2', context);
  test.strictSame(context.a.b, 2);
  test.end();
});

mt.test('reassign object property', (test) => {
  const context = vm.createContext({ a: { b: 1 } });
  vm.runInContext('a = {c: 2}', context);
  test.strictSame(context.a.c, 2);
  test.end();
});

mt.test('change context primitive property', (test) => {
  const context = vm.createContext({ a: 1 });
  vm.runInContext('a = 2', context);
  test.strictSame(context.a, 2);
  test.end();
});

mt.test('add new property', (test) => {
  const context = vm.createContext({});
  vm.runInContext('a = 1', context);
  test.strictSame(context.a, 1);
  test.end();
});
mt.test('add property with key included in document by default', (test) => {
  const context = vm.createContext({ name: {} });
  // window.name
  vm.runInContext('name = "hello"', context);
  test.strictSame(context.name, 'hello');
  test.end();
});

mt.test('frozen object', (test) => {
  const context = vm.createContext(Object.freeze({ a: 1 }));
  vm.runInContext('a = 2; b = 3', context);
  test.strictSame(context.a, 1);
  test.strictSame(context.b, undefined);
  test.end();
});

mt.test('sealed object', (test) => {
  const context = vm.createContext(Object.seal({ a: 1 }));
  vm.runInContext('a = 2; b = 3', context);
  test.strictSame(context.a, 2);
  test.strictSame(context.b, undefined);
  test.end();
});

mt.test('get html element', (test) => {
  const element = document.createElement('h1');
  document.body.appendChild(element);

  const getElementsByTagName = (tag) => document.getElementsByTagName(tag);
  const code = 'getElementsByTagName("h1");';
  const context = vm.createContext({ getElementsByTagName });

  const result = vm.runInContext(code, context);

  test.strictSame(result.length, 1);
  test.end();
});

mt.test('promise', (test) => {
  const code = 'promise.then(v => {test.strictSame(v, 1); test.end();})';
  const promise = new Promise((resolve) => setTimeout(() => resolve(1), 50));
  vm.runInNewContext(code, { promise, test });
});
