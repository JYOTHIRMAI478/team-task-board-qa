# Testing Notes: Team Task Board

This is how I approached testing the Team Task Board, what I chose to automate, and why. The bugs themselves are written up in [BUGS_REPORT.md](BUGS_REPORT.md), and my raw notes from manual testing are in [docs/manual-test-notes](docs/manual-test-notes).

## Running the tests

```bash
npm install
npx playwright install chromium   # only needed once, downloads the test browser

npm test             # unit and component tests
npm run test:e2e     # end-to-end tests in a real browser
npm run typecheck    # TypeScript check
```

## How I approached it

I started with the tickets, not the code. Every ticket is marked Done, so I treated the acceptance criteria as the contract and went through them one by one in Chrome. For each one I tried the normal case, then tried to break it: empty titles, titles with only spaces, past dates, today's date as the edge case, refreshing after every change, and forcing saves to fail.

That gave me 30 manual test cases. Some of the most useful findings came from going a little off-script. For example, I noticed the Close button behaves differently from Cancel, and that ticking a task never shows a banner, even though no ticket step asked me to check those exact things.

Once I had the list of bugs, I opened the code to find where each one comes from. That changed how I wrote the report. Four of my failed tests (completion lost on refresh, the Active and Completed filters ignoring ticked tasks, no banner on toggle, and search + filter showing the wrong tasks) all trace back to the same spot in the checkbox code. So I reported that as one bug with several symptoms, instead of four separate bugs.

After that, I automated the checks that matter most.

## What I automated

| Level | Tool | What it checks | Tests |
|-------|------|----------------|-------|
| Unit | Vitest | Validation, sorting, filtering, search, and the save/load layer | 28 |
| Component | Vitest + React Testing Library | The app running in a simulated browser: typing, clicking, banners, and what actually gets saved | 14 |
| End-to-end | Playwright | The built app in real Chrome, including page refreshes | 4 |

I kept to the usual testing pyramid: lots of fast unit tests at the bottom, fewer component tests, and just a handful of end-to-end tests for the journey that matters most.

## Why these tools

**Vitest.** The app already uses Vite, so Vitest slotted in with almost no setup. It handles TypeScript out of the box, and the whole suite runs in a few seconds, which makes it easy to run often.

**React Testing Library.** I like that it finds things the way a person would: by label, by role, by the text on the screen, like `getByLabelText("Task title")`. That means the tests don't break when someone renames a CSS class, and they double as a small accessibility check. If a button loses its label, the test fails.

**Playwright.** Most of the serious bugs only show up after you refresh the page, so I needed a real browser. Playwright makes reloads easy, waits for elements on its own, and saves screenshots and traces when something fails. It's also the end-to-end tool I've used the most, so I could move quickly with it.

## Why test at three levels

Each level catches something the others miss.

The unit tests are quick and precise. All three example tables from TTB-7 (sorting) are in there as tests, exactly as the ticket wrote them.

The component tests catch problems between pieces of code. The completion bug is a good example: every logic function is fine on its own, but the checkbox never calls the save function. The only way to catch that is to click the checkbox and then check what was saved, which is what the component test does.

The end-to-end tests prove the whole thing works the way a user would experience it, in a real browser, including after a refresh.

## The main end-to-end journey

The main Playwright test does what I'd expect a real user to do most: add a couple of tasks, refresh, edit one, refresh again, then search for it. Refreshing after each change is deliberate. That's how I caught the worst bugs by hand, so I wanted the automated test to do the same.

## How I handled tests for known bugs

This was the decision I thought about most.

For every bug I found, I wrote a test that checks what the ticket says *should* happen, named it after the bug (like `[BUG-04]`), and marked it as an expected failure. In Vitest that's `it.fails`, and in Playwright it's `test.fail()`.

Here's why. If I left those tests failing normally, the pipeline would be red all the time because of bugs everyone already knows about. People stop paying attention to a pipeline that's always red, and then a new problem slips through. If I skipped the tests instead, the bugs would just disappear from view.

With expected failures:
- While a bug is still there, its test fails as expected, so the pipeline stays green.
- When a developer fixes the bug, the test suddenly passes, and the pipeline turns red. That's their cue to remove the marker. From then on, the test protects against the bug coming back.

The one downside is that an expected-failure test could hide a different problem inside the same test. To keep that risk small, each of these tests only checks one thing.

## CI

The pipeline is in `.github/workflows/ci.yml`. It runs on every push to `main` and on every pull request, in two steps:

1. **Quick checks:** install, type check, run all the Vitest tests, and build the app. This takes about a minute.
2. **Browser tests:** only run if the quick checks pass. It installs Chrome and runs the Playwright tests against the built app. If anything fails, it uploads the Playwright report and traces so whoever picks it up can see exactly what happened.

I split it this way so the slower browser tests don't waste time on code that's already broken.

## Decisions and tradeoffs

- **I didn't fix the bugs.** My job here was to test and sign off, not to change the app. Each bug in the report has a root cause and a suggested fix, and the `[BUG-xx]` tests will confirm the fixes once they're made.
- **Testing failed saves without editing the code.** `SIMULATE_FAILURE` is a hard-coded constant, so I can't switch it on from a test. In the component tests, I swapped in a version of the API where every save fails. It tests the same behavior without touching the app.
- **Creating test data directly in storage.** There's no archive button yet, so I tested the archived filter by putting tasks straight into localStorage, first by hand through DevTools, then the same way in the automated tests.
- **Skipping the wait in unit tests only.** The fake API waits 200 ms on every call. I skip that in the unit tests to keep them instant, but the component tests keep the real delay, so the app's loading behavior still gets tested.
- **Testing the production build.** The end-to-end tests run against `vite build` and `vite preview` instead of the dev server, so they test what would actually ship.
- **Chrome only for now.** That keeps the pipeline quick for an internal MVP. Firefox and Safari can be added with one line in `playwright.config.ts`.
- **What I left out** to stay inside the time box: other browsers, mobile screen sizes, visual comparison tests, performance testing, and a full accessibility audit.

## What I'd recommend for the team

- **Make CI required before merging.** Turn on branch protection for `main`, so both CI steps have to pass and someone has to review the change.
- **Link acceptance criteria to tests.** All 9 stories were marked Done, but every one of them failed at least one acceptance criterion when I tested it. If "each AC has a passing test" were part of the Definition of Done, most of these would have been caught before QA.
- **Make failure simulation easy to switch on.** If `SIMULATE_FAILURE` came from an environment variable or a URL parameter, testers and automated tests could check error handling without editing code.
- **Clean up generated files.** `tsconfig.tsbuildinfo`, `vite.config.js`, and `vite.config.d.ts` are build outputs that got committed. Vite reads `vite.config.js` before `vite.config.ts`, so a future change to the TypeScript config could be quietly ignored. These should be deleted and added to `.gitignore`.
- **When the real backend arrives in v1.1:** add contract tests between the app and the API, and use Playwright to simulate slow or failed network calls.
- **Over time:** add linting with accessibility rules, a minimum coverage level, and accessibility scans in the end-to-end tests.
