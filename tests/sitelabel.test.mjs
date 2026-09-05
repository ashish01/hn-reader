import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = resolve(dirname(new URL(import.meta.url).pathname), '..');

// Load a TS source file as CJS so the real implementation is what we test.
function loadModule(file) {
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(
    (name) => {
      if (name.startsWith('.')) {
        const resolved = resolve(dirname(file), name.endsWith('.ts') ? name : `${name}.ts`);
        return loadModule(resolved);
      }
      return require(name);
    },
    module,
    module.exports,
  );
  return module.exports;
}

const { formatSiteLabel } = loadModule(resolve(root, 'src/utils/formatters.ts'));

/*
 * URL -> HN site-label pairs observed directly on news.ycombinator.com
 * (front pages, /newest, /best and individual item pages, 2026-09-05).
 * Item ids that anchor the notable cases are noted inline.
 */
const observed = [
  // --- git forges & account platforms: HN appends the first (owner) path segment
  ['https://github.com/anthropics/fermats-last-theorem', 'github.com/anthropics'], // 49568697
  ['https://github.com/Applied-Compute/trie', 'github.com/applied-compute'],
  ['https://github.com/comalice/ubom-v4/releases/tag/v0.0.1', 'github.com/comalice'],
  ['https://github.com/wolfoo2931/declarative-forms', 'github.com/wolfoo2931'],
  ['https://github.com/gaearon/conway-refinement', 'github.com/gaearon'],
  ['https://gitlab.com/gnutls/gnutls/-/work_items/1953', 'gitlab.com/gnutls'], // 49575498
  ['https://codeberg.org/mv12star/shitter/wiki/Instances', 'codeberg.org/mv12star'], // 49571634
  ['https://twitter.com/OpenAI/status/2095968413646737608', 'twitter.com/openai'],
  ['https://twitter.com/Xbow/status/2095220385876742456', 'twitter.com/xbow'],
  ['https://twitter.com/ekwufinance/status/2093732187841400853', 'twitter.com/ekwufinance'], // 49576395
  ['https://medium.com/@nikitonsky/medium-is-a-poor-choice-for-blogging-bb0048d19133', 'medium.com/nikitonsky'], // 18440756
  ['https://buttondown.com/suchbadtechads/archive/spartan-and-the-mime/', 'buttondown.com/suchbadtechads'], // 49575859

  // --- account platforms, but single-segment / non-owner paths stay bare
  ['https://github.com/about', 'github.com'],
  ['https://medium.com', 'medium.com'],
  ['https://twitter.com/i/flow/login', 'twitter.com/i'], // owner rule is blind to structure, like HN's

  // --- non-account platforms never get a path appended
  ['https://arxiv.org/abs/2608.26345', 'arxiv.org'], // 49516962
  ['https://www.youtube.com/watch?v=9xp1XWmJ_Wo', 'youtube.com'], // 49576889
  ['https://www.youtube.com/@charlieguthmann2531', 'youtube.com'],
  ['https://bsky.app/profile/ruggsea.eurosky.social/post/3murj2puwos26', 'bsky.app'], // 49576663
  ['https://en.wikipedia.org/wiki/Aerial_saw', 'wikipedia.org'],
  ['https://sourceforge.net/projects/bitcoin/', 'sourceforge.net'], // 8287905
  ['https://www.nytimes.com/2026/09/04/technology/open-source-ai-anthropic-openai.html', 'nytimes.com'],
  ['https://simonwillison.net/2026/Sep/2/claudes-new-system-prompt/', 'simonwillison.net'],

  // --- tenant subdomains: HN keeps the full host
  ['https://xenaproject.wordpress.com/2026/09/04/flt-anthropic-has-beaten-me-to-it/', 'xenaproject.wordpress.com'], // 49570133
  ['https://on.substack.com/p/notes', 'on.substack.com'], // 35526768
  ['https://aleximas.substack.com/p/what-will-be-scarce', 'aleximas.substack.com'], // 49574381
  ['https://support.google.com/mail/answer/22370?hl=en', 'support.google.com'], // 49565693
  ['https://greatergood.berkeley.edu/images/uploads/A_Wandering_Mind_Is_an_Unhappy_Mind.pdf', 'greatergood.berkeley.edu'], // 49576922
  ['https://neil.fraser.name/news/2026/09/03/', 'neil.fraser.name'], // 49550772
  ['https://adnanbaysal.github.io/square-turns.html', 'adnanbaysal.github.io'], // 49565192
  ['https://intel.github.io/SDM/announcement/2026/08/20/announce-preview.html', 'intel.github.io'], // 49574535
  ['https://archetechmes.vercel.app/blog/functional-options-go', 'archetechmes.vercel.app'], // 49576910
  ['http://terpstrakeyboard.com/', 'terpstrakeyboard.com'],

  // --- vanity/portal subdomains: HN collapses to the bare registrable domain
  ['https://news.un.org/en/story/2026/09/1168284', 'un.org'], // 49569148
  ['https://nvd.nist.gov/vuln/detail/cve-2026-85046', 'nist.gov'], // 49570669
  ['https://engineering.atspotify.com/2026/9/portal-by-spotify-cut-my-claude-code-token-usage-by-90', 'atspotify.com'], // 49571465
  ['https://blog.master.dev/react-now-rusted-all-the-way-out/', 'master.dev'], // 49567873
  ['https://blog.val.town/connectors', 'val.town'], // 49571263
  ['https://osra.banou.dev/', 'banou.dev'], // 49576669
  ['https://bob.ibm.com/', 'ibm.com'], // 49563851
  ['https://spectrum.ieee.org/ai-inference-distributed-computing', 'ieee.org'], // 49576871
  ['https://opensource.posit.co/blog/2026-04-06_whats-next-quarto-2/', 'posit.co'], // 49576675
  ['https://old.reddit.com/r/apolloapp/comments/13ws4w3/had_a_call_with_reddit_to_discuss_pricing_bad/', 'reddit.com'], // 36141083
  ['https://en.wikipedia.org/wiki/Asian_News_International_vs._Wikimedia_Foundation', 'wikipedia.org'], // 41950392

  // --- collapse even when the suffix list marks the host private
  ['https://uecker.codeberg.page/2026-09-05.html', 'codeberg.page'], // 49575766

  // --- plain sites: bare registrable domain (www. stripped, ccTLD aware)
  ['https://www.abc.net.au/news/2026-09-04/why-the-netherlands-moved-its-gold-from-us-and-canada/107111990', 'abc.net.au'],
  ['https://www.anthropic.com/research/formalizing-fermats-last-theorem', 'anthropic.com'],
  ['https://www.pbs.org/newshour/science/global-warming-will-exceed-1-5-degree-limit-un-says-in-report-that-maps-path-back-below-danger-zone', 'pbs.org'],
  ['https://www.commute.bar', 'commute.bar'],
  ['http://www.techdirt.com/2026/09/03/hackers-had-a-live-feed-of-every-id-this-verification-company-scanned-for-over-a-year/', 'techdirt.com'],
  ['https://devquasar.com/hardware/the-60-gaming-pc-amd-bc-250/', 'devquasar.com'],
  ['https://arstechnica.com/health/2026/09/pentagon-releases-then-quickly-removes-testosterone-screening-policy/', 'arstechnica.com'],
  ['https://collusion.wiki/', 'collusion.wiki'],
  ['https://www.gamingonlinux.com/2026/09/the-cloud-gaming-dream-is-dying-xbox-places-limits-o', 'gamingonlinux.com'],
];

for (const [url, expected] of observed) {
  test(`site label for ${url}`, () => {
    assert.equal(formatSiteLabel(url), expected);
  });
}

test('site label returns empty for falsy or invalid input', () => {
  assert.equal(formatSiteLabel(undefined), '');
  assert.equal(formatSiteLabel('not a url'), '');
});
