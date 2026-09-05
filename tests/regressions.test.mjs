import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// Transpile the real source in memory, replacing only the HTTP transport.
// Each fixture gets fresh stores and a fresh shared request limiter.
function fixture(get) {
  const cache = new Map();
  const storage = new Map();
  const sandbox = vm.createContext({
    AbortController, DOMException, console: { error() {} },
    sessionStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  });
  function load(path) {
    const file = [path, `${path}.ts`, `${path}.tsx`, `${path}/index.ts`].find(existsSync);
    if (!file) throw new Error(`Missing module: ${path}`);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name === 'axios') return { get, isCancel: (error) => error.name === 'AbortError' };
      if (name === 'dompurify') return { sanitize: (text) => text };
      return name.startsWith('.') ? load(resolve(dirname(file), name)) : require(name);
    };
    vm.runInContext(`(function(require,module,exports){${code}\n})`, sandbox)(localRequire, module, module.exports);
    return module.exports;
  }
  return (path) => load(resolve(root, path));
}

const story = (id, kids = []) => ({ id, type: 'story', title: 'Story', score: 1, kids });
const comment = (id, kids = []) => ({ id, type: 'comment', text: 'Comment', parent: 1, kids });
const itemId = (url) => Number(url.match(/item\/(\d+)/)?.[1]);

test('late top-level comments preserve collapse state and loaded replies', async () => {
  const late = deferred();
  const load = fixture(async (url) => {
    const id = itemId(url);
    if (id === 1) return { data: story(1, [10, 20]) };
    if (id === 20) return late.promise;
    return { data: comment(id, id === 10 ? [11] : []) };
  });
  const store = load('src/store/useStoryWithCommentsStore').default;
  const pending = store.getState().fetchStoryWithComments(1);
  await tick();
  await store.getState().loadCommentChildren(10);
  store.getState().toggleComment(10);
  late.resolve({ data: comment(20) });
  await pending;
  assert.equal(store.getState().comments[0].isExpanded, false);
  assert.equal(store.getState().comments[0].children[0].id, 11);
  assert.equal(store.getState().comments[0].childrenLoaded, true);
});

test('partial replies and top-level failures retry only missing IDs', async () => {
  let failing = true;
  const calls = [];
  const load = fixture(async (url) => {
    const id = itemId(url);
    calls.push(id);
    if (id === 1) return { data: story(1, [10, 20]) };
    if ((id === 20 || id === 12) && failing) throw new Error('offline');
    return { data: comment(id, id === 10 ? [11, 12] : []) };
  });
  const store = load('src/store/useStoryWithCommentsStore').default;
  await store.getState().fetchStoryWithComments(1);
  assert.ok(store.getState().commentsError);
  await store.getState().loadCommentChildren(10);
  assert.ok(store.getState().comments[0].childrenError);
  assert.equal(store.getState().comments[0].childrenLoaded, false);
  store.getState().toggleComment(11);
  failing = false;
  await store.getState().retryComments();
  await store.getState().loadCommentChildren(10);
  assert.equal(store.getState().commentsError, null);
  assert.equal(store.getState().comments[0].childrenError, null);
  assert.equal(store.getState().comments[0].children[0].isExpanded, false);
  assert.equal(calls.filter((id) => id === 10).length, 1);
  assert.equal(calls.filter((id) => id === 11).length, 1);
});

test('A → B → A navigation rejects old replies even if transport ignores abort', async () => {
  const old = deferred();
  let childCalls = 0;
  let oldSignal;
  const load = fixture(async (url, { signal }) => {
    const id = itemId(url);
    if (id === 1 || id === 2) return { data: story(id, id === 1 ? [10] : []) };
    if (id === 11 && ++childCalls === 1) { oldSignal = signal; return old.promise; }
    return { data: comment(id, id === 10 ? [11] : []) };
  });
  const store = load('src/store/useStoryWithCommentsStore').default;
  await store.getState().fetchStoryWithComments(1);
  const pending = store.getState().loadCommentChildren(10);
  await tick();
  await store.getState().fetchStoryWithComments(2);
  assert.equal(oldSignal.aborted, true);
  await store.getState().fetchStoryWithComments(1);
  await store.getState().loadCommentChildren(10);
  store.getState().toggleComment(11);
  old.resolve({ data: comment(11) });
  await pending;
  assert.equal(store.getState().comments[0].children[0].isExpanded, false);
});

test('all item requests share a limit and queued aborted work never reaches HTTP', async () => {
  const gate = deferred();
  let calls = 0;
  const load = fixture(async (url) => { calls++; await gate.promise; return { data: comment(itemId(url)) }; });
  const api = load('src/api/hackernews');
  const abort = new AbortController();
  const work = Array.from({ length: 40 }, (_, id) => api.getComment(id, abort.signal));
  const settled = Promise.allSettled(work);
  await tick();
  assert.equal(calls, 15);
  abort.abort();
  gate.resolve();
  await settled;
  assert.equal(calls, 15);
});

test('story failures are retryable without refetching successes; invalid pages are explicit', async () => {
  let failing = true;
  const calls = [];
  const load = fixture(async (url) => {
    if (url.endsWith('topstories.json')) return { data: [1, 2] };
    const id = itemId(url);
    calls.push(id);
    if (id === 2 && failing) throw new Error('offline');
    return { data: story(id) };
  });
  const store = load('src/store/useStoriesStore').default;
  await store.getState().fetchStories(0);
  assert.equal(store.getState().failedStoryIds[0], 2);
  failing = false;
  await store.getState().retryFailed();
  assert.equal(store.getState().stories.length, 2);
  assert.equal(calls.filter((id) => id === 1).length, 1);
  await store.getState().fetchStories(999);
  assert.equal(store.getState().outOfRange, true);
  assert.equal(store.getState().loading, false);
});

test('deleted comments retain reply controls and loaded descendants', () => {
  const load = fixture(() => { throw new Error('Unexpected HTTP'); });
  const Comment = load('src/components/Comment').default;
  const props = { onToggle() {}, onLoadChildren() {} };
  const html = renderToStaticMarkup(React.createElement(Comment, {
    ...props, comment: { ...comment(10, [11]), deleted: true },
  }));
  assert.match(html, /\[deleted\]/);
  assert.match(html, /Load replies/);
  const loaded = renderToStaticMarkup(React.createElement(Comment, {
    ...props, comment: { ...comment(10, [11]), deleted: true, childrenLoaded: true,
      children: [{ ...comment(11), text: 'Visible descendant' }] },
  }));
  assert.match(loaded, /Visible descendant/);
});

test('theme bootstrap uses saved preference, OS fallback, and survives blocked storage', () => {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const [saved, osDark, blocked, expected] of [
    ['true', false, false, true], ['false', true, false, false],
    [null, true, false, true], [null, true, true, true], [null, false, false, false],
  ]) {
    let actual;
    vm.runInNewContext(script, {
      window: { matchMedia: () => ({ matches: osDark }) },
      localStorage: { getItem: () => { if (blocked) throw new Error('blocked'); return saved; } },
      document: { documentElement: { classList: { toggle: (_, value) => { actual = value; } } } },
    });
    assert.equal(actual, expected);
  }
});
