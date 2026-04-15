# Homepage Post-Improvement Analysis

**Date:** 2026-02-24
**Status:** Post-improvement review — the homepage has been substantially rebuilt. This document evaluates the current state and identifies remaining refinement opportunities.

---

## Overview

The homepage has been transformed from a minimal landing stub into a full marketing page. The current structure is:

1. **Hero** – eyebrow + H1 with `TrackChangesPhrase` animation + lede + `HomeSearch` + CTA buttons + `ProjectSnapshot` metrics card
2. **HowItWorks** – 3-step process section
3. **AudienceSection** – 3 audience cards (Clinicians, Researchers, Public)
4. **FeaturedSources** – live source cards from API
5. **ChangeShowcase** – static before/after diff demonstration
6. **ExampleStory** – mpox callout with link
7. **RecentActivity** – live change feed (conditional on API data)
8. **FAQ** – 6-item accordion
9. **BottomCta** – closing CTA band

All post-hero sections are wrapped in `ScrollReveal` for fade-in animation.

---

## A. Messaging / Copy

**A1. Eyebrow is clear and mission-accurate.**
The text "Preserving the Canadian public health record" precisely names the project's purpose at a glance without over-claiming authority.
Rating: ✅ Already good

**A2. H1 construction is clever but grammatically fragile.**
The split `h1Before / h1Accent / h1Middle / h1Suffix` pattern renders as: "See what Canadian public health websites _used to say_, even they change." The word "even" on its own before "they change" reads as a fragment in isolation. The animated phrase is the grammatical glue — without JS, the `<noscript>` fallback restores sense, but the sentence still leans on the animation to parse correctly at first read.
Rating: 🔧 Minor refinement possible

**A3. Hero lede is substantive and differentiating.**
The lede accurately describes the pain point (silent page changes) and the value proposition (find, cite, track) without puffery. The hair-thin space around the em-dash (`\u2009—\u2009`) is a typographic touch that reads well at all sizes.
Rating: ✅ Already good

**A4. Primary CTA copy is literal but not inspiring.**
"Search the archive" names the action accurately, which is appropriate for a utility-first tool. There is no attempt at urgency or benefit framing ("See what changed" or "Find the original"). For the current stage this is defensible, but the copy does the minimum.
Rating: 🔧 Minor refinement possible

**A5. Secondary CTA anchor-link is correctly humble.**
"How it works" → `#how-it-works` gives newcomers an exit from the hero without abandoning the page. This is the right call for a tool with a non-obvious concept.
Rating: ✅ Already good

**A6. "In development" badge in the metrics card is appropriately honest.**
Placing the `ha-badge-dev` inside the metrics card, adjacent to the live stats, keeps the caveat visible without burying it in footer disclaimers. The offline fallback subtext ("Showing a limited offline sample…") also surfaces correctly when the API is unavailable.
Rating: ✅ Already good

**A7. Audience section heading is a direct question, which works.**
"Who is this for?" is conversational. Matching it with a subtitle that reframes the answer around a specific use case ("Anyone who needs to know what a Canadian public health website said at a specific point in time") is accurate and focused.
Rating: ✅ Already good

**A8. Clinician card body mentions concrete topics.**
Naming COVID-19, influenza, and naloxone makes the value proposition tangible rather than abstract. This specificity helps the card stand out from generic archive marketing.
Rating: ✅ Already good

**A9. Researcher card body mixes "need" and capability frames in one sentence.**
"Need to prove what a page said on a specific date?" opens as a rhetorical question, then pivots to capability ("Link your analysis…"). The shift is not jarring, but it is slightly uneven in voice compared to the clinician and public cards, which both open declaratively.
Rating: 🔧 Minor refinement possible

**A10. Public card closing caveat is important and well-placed.**
"…while keeping official sites as your go-to for current guidance" actively deflects misuse and supports the independence disclaimer. This is an example of safety-rail copy done unobtrusively.
Rating: ✅ Already good

**A11. HowItWorks subtitle refers to the project as "HealthArchive" without ".ca".**
All other references in `homeCopy.ts` use "HealthArchive.ca". The `howItWorks.subtitle` reads "HealthArchive uses modern web-archiving tools…" — dropping the ".ca" makes the name inconsistent with the brand's stated form.
Rating: ⚠️ Needs attention

**A12. FeaturedSources subtitle is narrowly scoped.**
"Federal public health websites currently being archived" is accurate but may mislead users into thinking provincial content is not covered or is not planned. If provincial sources exist or are planned, this line should be made more flexible (e.g., "Canadian public health websites currently being archived").
Rating: 🔧 Minor refinement possible

**A13. ExampleStory heading "Why this matters" is too generic.**
The mpox story is specific and compelling, but the heading does not prime the reader for it. A heading like "A real example: mpox guidance that changed" would make the callout immediately scannable and self-explanatory.
Rating: 🔧 Minor refinement possible

**A14. ChangeShowcase diff example uses a real and verifiable change.**
Using the actual mpox recommendation language shift (high-risk group language → community-spread language) makes the demonstration substantive and relevant. This is better than a fictional or whimsical example.
Rating: ✅ Already good

**A15. FAQ order is well-sequenced.**
Starting with the legitimacy question ("Is this an official government website?") directly addresses the most critical trust concern before explaining mechanics, citation, differentiation from the Wayback Machine, and open-source status. This ordering anticipates skeptical visitors.
Rating: ✅ Already good

**A16. FAQ answer for "How do I cite a snapshot?" mentions a citation guide without confirming it exists.**
The answer says "See our citation guide for suggested formats." If no such page currently exists, this is a dead promise. It should either link to the actual page or hedge with "suggested formats are available on each snapshot page."
Rating: ⚠️ Needs attention

**A17. FAQ answer for requesting archive inclusion references "Report an Issue form" without a link.**
The answer directs users to use the form, but there is no `<a>` in the answer text. This leaves users to hunt for the form themselves.
Rating: ⚠️ Needs attention

**A18. BottomCta heading "Ready to explore?" is neutral but not motivating.**
The subheading restates the hero lede almost verbatim. The CTA band is the last thing a user reads — there is an opportunity to close with differentiation or urgency rather than recapping the pitch from the top.
Rating: 🔧 Minor refinement possible

**A19. French translation is complete and consistent across all sections.**
All `homeCopyFr` keys are present and populated. Typographic conventions for French (non-breaking spaces before `?`, `!`, `»`) are generally respected. The automated-translation disclaimer in the header provides appropriate framing.
Rating: ✅ Already good

**A20. `hero.developmentNote` is defined in `HomeCopy` but never rendered.**
The metrics card shows `inDevelopment` (the badge label) but `developmentNote` ("Coverage and features are expanding; archived content may be incomplete, outdated, or superseded.") is defined in the copy object and translated into French but is not used anywhere in the JSX.
Rating: ⚠️ Needs attention

---

## B. Layout / Visual Hierarchy

**B1. Hero two-column layout breaks gracefully on mobile.**
The `lg:grid-cols-[minmax(0,1.7fr),minmax(0,1fr)]` grid stacks the metrics card below the text content on smaller screens. The `lg:items-center` ensures vertical alignment is sensible on wide screens without forcing the card to stretch.
Rating: ✅ Already good

**B2. Hero left column internal spacing is generous but somewhat uneven.**
`space-y-9` between the eyebrow, H1, lede, search, and CTAs works well for desktop. The `pt-1` on the CTA flex group adds fine-grained control. However, the lede and the search bar have no visual separator — at smaller font sizes on mid-range screens, the text and the input can feel crowded.
Rating: 🔧 Minor refinement possible

**B3. Section rhythm is consistent via `ha-home-hero-plain`.**
Using `ha-home-hero-plain` as the inner wrapper for HowItWorks, AudienceSection, FeaturedSources, ChangeShowcase, ExampleStory, and FAQ provides uniform horizontal padding, border treatment, and shadow without repeating the hero gradient. This is the right pattern.
Rating: ✅ Already good

**B4. Top-level page uses `space-y-6` which may be too tight between sections.**
`space-y-6` (1.5rem) is the only vertical gap between all major sections. Given that each section has its own internal padding via `ha-home-hero-plain`, the inter-section breathing room is adequate but minimal. On wide screens with long content blocks, reducing the apparent boundary between sections may make the page feel dense.
Rating: 🔧 Minor refinement possible

**B5. HowItWorks uses a 3-column grid with step numbers that establish clear visual hierarchy.**
The `ha-step-number` element followed by title and body provides a reliable F-pattern anchor for each step. The numbered progression (1, 2, 3) makes the sequence scannable without requiring icons.
Rating: ✅ Already good

**B6. Three consecutive 3-column grid sections create visual monotony.**
HowItWorks, AudienceSection, and FeaturedSources all use `ha-grid-3`. On wide viewports the three identical grid structures in a row may feel repetitive. A 2-column audience layout or a horizontal scroll treatment for sources would break the cadence.
Rating: 🔧 Minor refinement possible

**B7. FeaturedSources displays up to 5 sources but uses a 3-column grid.**
`displaySources.slice(0, 5)` in a `ha-grid-3` grid produces a 3+2 row arrangement, leaving the second row visually unbalanced with two orphaned cards on the left. Using `slice(0, 3)` or `slice(0, 6)` would produce clean row fills.
Rating: ⚠️ Needs attention

**B8. ChangeShowcase is a 2-column side-by-side diff, which is the right layout for the content.**
The `sm:grid-cols-2` split correctly mirrors how real diff views work. On mobile it stacks, which is readable if slightly verbose.
Rating: ✅ Already good

**B9. ExampleStory callout is visually understated.**
The `ha-example-story` wrapper provides a callout treatment, but the section has no icon, no pull-quote element, and no visual distinction beyond a border and background. Given that this is a proof-of-relevance moment, it could be elevated to look more like a case study card than a text block.
Rating: 🔧 Minor refinement possible

**B10. RecentActivity renders conditionally, which can affect layout stability.**
The `{activityItems.length > 0 && (...)}` guard is correct — showing an empty state on the homepage would be a regression. However, the conditional means the page layout shifts depending on API availability, which can produce visible content reflow on pages that SSR with a different API state than what hydrates on the client.
Rating: 🔧 Minor refinement possible

**B11. BottomCta band is visually distinct with `ha-home-cta-band`.**
The CTA band uses a different visual treatment from the surrounding section wrappers, providing a clear page-end signal. The centered layout with `mx-auto max-w-lg` on the subheading keeps it from feeling too wide on large screens.
Rating: ✅ Already good

**B12. Three inline sub-components in `page.tsx` make the file longer than necessary.**
At 323 lines, `page.tsx` is readable but contains three non-trivial JSX components (`AudienceSection`, `ExampleStory`, `BottomCta`) that are significant enough to warrant their own files in `src/components/home/`. The page file should ideally focus on data fetching and section composition.
Rating: 🔧 Minor refinement possible

---

## C. Interaction / Motion

**C1. TrackChangesPhrase animation is sophisticated and well-timed.**
The phase state machine (initial → cursor → backspacing → jump → inserting → final) covers every edge case including reduced-motion fallback, `noscript` rendering, and event dispatch sequencing. The `ha-trackchanges-finished` event correctly chains to metric animation starts.
Rating: ✅ Already good

**C2. AnimatedMetric count-up uses linear easing.**
The animation uses a linear `progress` curve (`Math.min((timestamp - start) / durationMs, 1)`), which is functional but slightly mechanical. A cubic ease-out curve would make the count-up feel more satisfying as it decelerates to the final value.
Rating: 🔧 Minor refinement possible

**C3. ProjectSnapshotOrchestrator event coordination is correct and properly cleaned up.**
The `completedRef` and `dispatchedRef` pattern avoids double-dispatching the `ha-project-snapshot-finished` event even if metrics complete out of order or in rapid succession. Event listeners are properly removed on cleanup.
Rating: ✅ Already good

**C4. `beforeWord` fade sequence after snapshot completes is an elegant UX flourish.**
The `ha-before-word--fading` → `ha-before-word--hidden` transition (triggered by `ha-project-snapshot-finished`) eliminates the struck-through "before" word after the metrics have played, cleaning up the hero without abrupt removal. The `5400ms cubic-bezier(0.22, 1, 0.36, 1)` max-width transition is appropriately slow.
Rating: ✅ Already good

**C5. ScrollReveal uses `IntersectionObserver` with correct reduced-motion handling.**
The `prefersReducedMotion()` check at both initialization and render time means users who prefer no animation see content immediately without any invisible-then-visible flash. The `threshold: 0.1` and `-40px` root margin are conservative but ensure sections are not triggered too early.
Rating: ✅ Already good

**C6. ScrollReveal has a redundant reduced-motion check in its render path.**
The condition `if (visible && prefersReducedMotion())` on line 49 of `ScrollReveal.tsx` is evaluated after the `useEffect` has already handled the reduced-motion case during state initialization. This branch fires only if `prefers-reduced-motion` toggles after mount, but the logic could be expressed more clearly as a single unified path.
Rating: 🔧 Minor refinement possible

**C7. FAQ accordion uses native `<details>/<summary>` with CSS-only open/close animation.**
The `ha-faq-question::after` chevron rotates via CSS transitions on `[open]`. This avoids JavaScript for basic disclosure behavior, which is excellent. The tradeoff is that the open/close transition for the content panel is abrupt on older Safari and Firefox versions that do not animate `<details>` natively.
Rating: 🔧 Minor refinement possible

**C8. Audience card hover lift effect is subtle and appropriate.**
`ha-audience-card:hover` applies a `translateY(-2px)` and `box-shadow` shift. The dark mode variant is also defined. The effect works well for indicating interactivity on non-touch devices.
Rating: ✅ Already good

**C9. HoverGlowLink cursor-follow glow is implemented via CSS `::before` with JS-injected CSS variables.**
This is the correct pattern — no layout thrashing, GPU-composited, with proper cleanup on mouseout. The fallback for touch and pointer-less devices is graceful.
Rating: ✅ Already good

**C10. HomeSearch form submits via native GET without JavaScript.**
The `method="get" action={localizeHref(locale, "/archive")}` pattern ensures the search works with JS disabled. The form correctly submits `?q=` to the archive route.
Rating: ✅ Already good

**C11. RecentActivity relative timestamps do not update after hydration.**
The `relativeTime()` function runs once during hydration and does not update on a timer. A user who leaves the page open for an extended period will see stale relative times. This is a minor limitation for a low-traffic feed, but an `Intl.RelativeTimeFormat`-based approach with a periodic refresh would be more accurate.
Rating: 🔧 Minor refinement possible

---

## D. Styling / Responsive

**D1. Dark mode is comprehensively implemented with CSS variable overrides.**
The `html[data-theme="dark"]` block defines all necessary token overrides including `--page-bg`, `--card-bg`, `--text`, `--muted`, `--accent`, `--border`, and `--callout-*`. Dark-mode variants for homepage-specific classes (`ha-home-hero`, `ha-home-hero-plain`, `ha-audience-card`, `ha-home-search-input`, `ha-diff-line-*`, `ha-faq-item`, `ha-home-cta-band`, `ha-example-story`) are all present.
Rating: ✅ Already good

**D2. Hero H1 uses a magic-number font size at the `md:` breakpoint.**
The H1 uses `md:text-[2.6rem]` with `md:leading-snug`. The fixed `2.6rem` bypasses Tailwind's type scale and creates a one-off value. Using a fluid clamp value or a Tailwind scale size (`text-5xl`) would be more maintainable.
Rating: 🔧 Minor refinement possible

**D3. Color tokens for audience card icons have dark mode variants.**
`html[data-theme="dark"] .ha-audience-icon` is defined. The icon fill colors use `currentColor` via `aria-hidden` SVGs with `className="h-6 w-6"`. SVG paths do not specify `fill` or `stroke` explicitly, so they inherit correctly from the icon wrapper color.
Rating: ✅ Already good

**D4. Diff line high-contrast override classes exist but are unused on the homepage.**
`.ha-diff-high-contrast .ha-diff-line-*` classes are defined in `globals.css` for accessibility contexts. The `ChangeShowcase` component does not currently apply a `ha-diff-high-contrast` wrapper, so forced colors for Windows High Contrast Mode may not behave as intended.
Rating: 🔧 Minor refinement possible

**D5. The `ha-home-search` input has appropriate mobile breakpoint overrides.**
The `@media (max-width: 768px)` block removes the border-radius on the button and adjusts the input to full width. The search box stacks vertically on mobile, which is correct behavior for a padded container.
Rating: ✅ Already good

**D6. Metric bar animation uses `width` instead of `transform: scaleX`.**
The `ha-metric-bar-fill` animates via inline `style={{ width: \`${fillPercent}%\` }}`. Animating `width`triggers layout reflows on each frame, whereas`transform: scaleX()`with`transform-origin: left` is GPU-composited and does not cause reflow. For the small number of metrics shown this is not a measurable performance issue, but it is not best practice.
Rating: 🔧 Minor refinement possible

**D7. `ha-grid-3` has no intermediate 2-column breakpoint.**
The `ha-grid-3` class collapses directly from 3 columns to 1 column between `md:` and below. At exactly the `sm:` range (640px–768px), cards are displayed at single-column width which can make them appear oversized.
Rating: 🔧 Minor refinement possible

**D8. The `ha-card-elevated` class on the metrics card gives it appropriate visual prominence.**
The elevated shadow and background distinguish the metrics card from the hero text column without competing with the gradient background. The padding responsiveness (`p-4 sm:p-5`) is handled inline on the element.
Rating: ✅ Already good

**D9. Page background decorative gradient is defined entirely in CSS variables.**
The `--page-bg-decoration` radial gradient stack is applied on `html` in the CSS layer. Component code never touches background colors directly. This is clean and maintainable.
Rating: ✅ Already good

**D10. `ha-home-cta-band` text alignment on mobile may be inconsistent.**
The heading and subheading in `BottomCta` rely on `ha-home-cta-band` CSS for centered text. If the class uses `text-align: center` only at certain breakpoints, small viewports could see left-aligned text in a band that visually intends center alignment.
Rating: 🔧 Minor refinement possible

---

## E. Accessibility

**E1. `TrackChangesPhrase` correctly renders an `sr-only` span and `<noscript>` fallback.**
The `<span className="sr-only">{afterWord}</span>` provides the screen reader text for the animated phrase regardless of animation phase. The `aria-hidden="true"` on the visual animation container prevents double-reading. The `<noscript>` restores visual output for non-JS contexts.
Rating: ✅ Already good

**E2. Audience card SVG icons are marked `aria-hidden="true"`.**
Since the icon is decorative and the card has a text label (`h3`) and body, marking the SVG as hidden from assistive technology is correct.
Rating: ✅ Already good

**E3. FAQ uses `<details>/<summary>` which has native keyboard and screen reader support.**
The native disclosure pattern works with keyboard (Enter/Space), voice assistants, and screen readers without ARIA hacks. The visual chevron is CSS-only via a `::after` pseudo-element.
Rating: ✅ Already good

**E4. FAQ items are keyed by array index, which is acceptable for a static list.**
Using index as `key` is fine for static, non-reordered lists. No functional risk here.
Rating: ✅ Already good

**E5. Heading hierarchy is correctly structured throughout the page.**
The hero `h1`, all section headings as `h2`, and all card headings as `h3` form a correct heading hierarchy with no skipped levels. The `ProjectSnapshot` heading inside the metrics card is also `h2`, which is correct since it is a named section within the hero.
Rating: ✅ Already good

**E6. `HomeSearch` form uses `role="search"` and a properly associated `aria-label`.**
The input has `aria-label={copy.search.placeholder}`, providing accessible labeling without a visible `<label>`. The `role="search"` on the `<form>` correctly identifies the landmark.
Rating: ✅ Already good

**E7. `ActivityItem` key construction could collide in edge cases.**
The key `\`${item.type}-${item.id}\`` would not be unique if the same snapshot ID appeared as both a "capture" and "change" event in the same feed. This is unlikely with the current API but could be made more robust with a stricter compound key.
Rating: 🔧 Minor refinement possible

**E8. FeaturedSources "Browse" links have no distinguishing accessible label.**
Each source card has a "Browse →" link. For screen reader users, repeated "Browse →" links without differentiation are ambiguous when navigating by link list. Adding `aria-label={`Browse ${source.sourceName}`}` would make each link uniquely identifiable.
Rating: ⚠️ Needs attention

**E9. RecentActivity dot indicators use `aria-hidden="true"` correctly.**
The colored dot is purely decorative; the type information is conveyed via the text label ("captured" / "change detected"). The `aria-hidden` on the dot span is correct.
Rating: ✅ Already good

**E10. `prefers-reduced-motion` is respected in all three animation systems.**
`TrackChangesPhrase`, `AnimatedMetric`, and `ScrollReveal` each check `prefers-reduced-motion` independently and short-circuit their animation logic. The implementations are consistent in approach.
Rating: ✅ Already good

**E11. Audience card CTA links could benefit from more descriptive accessible labels.**
Each audience card has a small CTA link ("Search health guidance →", "Explore the data →", "Browse the archive →"). These link labels are readable in context but ambiguous when a screen reader announces them in isolation. Adding `aria-label` to each would improve out-of-context link navigation.
Rating: 🔧 Minor refinement possible

**E12. The `ProjectSnapshot` `h2` inside the hero may confuse heading tree navigation.**
Screen reader users navigating by heading would encounter `h2: Project snapshot` nested inside the hero `<section>` before reaching `h2: How it works` in the next section. This is semantically valid (no level is skipped), but users might not expect an `h2` landmark inside the hero block.
Rating: 🔧 Minor refinement possible

---

## F. Architecture / Code Quality

**F1. `homeCopy.ts` is the single source of truth for all homepage text.**
Every string used across `HowItWorks`, `FAQ`, `FeaturedSources`, `ChangeShowcase`, `RecentActivity`, `AudienceSection`, `ExampleStory`, `BottomCta`, `HomeSearch`, and `ProjectSnapshot` flows through `getHomeCopy(locale)`. No ad-hoc strings are scattered across component files.
Rating: ✅ Already good

**F2. `HomeCopy` type is fully explicit with no `any` or string index signatures.**
Every key is typed with nested objects for sections. TypeScript will catch missing copy keys at compile time if the type contract is updated.
Rating: ✅ Already good

**F3. All three API calls are guarded with `.catch(() => null)` fallbacks.**
`fetchArchiveStats`, `fetchSources`, and `fetchChanges` all fall back to demo data or empty state rather than throwing a build/render error. This makes the homepage resilient to backend outages.
Rating: ✅ Already good

**F4. Homepage API calls run serially, not in parallel.**
`fetchArchiveStats()`, `fetchSources()`, and `fetchChanges()` are three separate `await` expressions in the server component body, executing sequentially. Using `Promise.all([fetchArchiveStats(), fetchSources(), fetchChanges()])` with individual `.catch(() => null)` wrappers would reduce total homepage fetch time by the combined latency of two of the three requests.
Rating: ⚠️ Needs attention

**F5. `AudienceSection`, `ExampleStory`, and `BottomCta` are inline in `page.tsx`.**
These are non-trivial JSX blocks with their own logic and copy consumption. Extracting them to `src/components/home/` would keep `page.tsx` focused on data fetching and section composition, consistent with how `HowItWorks`, `FAQ`, `FeaturedSources`, `ChangeShowcase`, and `RecentActivity` are organized.
Rating: 🔧 Minor refinement possible

**F6. Audience SVG icons are inlined in `page.tsx` as JSX inside an array literal.**
The three SVG paths (clinician, researcher, public) are defined directly inside the `audiences` array definition. If the icons are ever reused or updated, they would need to be found inside this array rather than in a dedicated icon component.
Rating: 🔧 Minor refinement possible

**F7. `FeaturedSources` hardcodes a `slice(0, 5)` limit with no prop override.**
The maximum displayed count is hardcoded at 5. Exposing a `maxSources` prop would make the component more reusable and allow easy correction of the grid orphan issue (see B7) from the call site.
Rating: 🔧 Minor refinement possible

**F8. `ChangeShowcase` diff example data is hardcoded in the component file, not in `homeCopy.ts`.**
The `exampleDiff` constant is defined inside `ChangeShowcase.tsx` with both EN/FR variants. This is reasonable for a static demo, but it means diff copy lives in a different location from all other homepage copy. An editorial update to the demo text requires knowing to look in the component file rather than `homeCopy.ts`.
Rating: 🔧 Minor refinement possible

**F9. `relativeTime()` in `RecentActivity` implements its own i18n rather than using `Intl.RelativeTimeFormat`.**
The custom function handles seconds, minutes, hours, and days with manual EN/FR string construction. `Intl.RelativeTimeFormat` would handle pluralization and locale formatting natively, including edge cases like "1 minute" vs. "2 minutes" in both locales, without custom branching.
Rating: 🔧 Minor refinement possible

**F10. `ProjectSnapshotOrchestrator` renders `null` but is placed inside the metrics card `<div>`.**
The orchestrator is a pure event-coordination component that renders nothing. Placing it inside the card element is semantically odd when reading the JSX — it could live at the top level of the page's server component return or be co-located with the hero section wrapper instead.
Rating: 🔧 Minor refinement possible

**F11. `AnimatedMetric` uses `Intl.NumberFormat` for locale-aware number formatting.**
`localeToLanguageTag(locale)` converts the app locale to a BCP-47 tag, and `Intl.NumberFormat` handles thousands separators and digit grouping per locale. The animated count-up displays `1,234` in EN and `1 234` in FR correctly.
Rating: ✅ Already good

**F12. `ScrollReveal` does not use `forwardRef`.**
If a parent ever needs to imperatively interact with the scroll reveal container (e.g., for advanced animation chaining or testing utilities), the lack of `forwardRef` would require a workaround. For current usage this is not a problem.
Rating: 🔧 Minor refinement possible

---

## Top 10 Remaining Improvements

| Priority | Ref | Category            | Rating | Description                                                                                                                                                  |
| -------- | --- | ------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | F4  | Architecture        | ⚠️     | Convert three serial `await` API calls to `Promise.all` to reduce homepage TTFB by the combined latency of two sequential fetches                            |
| 2        | B7  | Layout              | ⚠️     | Fix FeaturedSources grid: `slice(0, 5)` in a 3-column grid produces a ragged 3+2 layout; use `slice(0, 3)` or `slice(0, 6)` for clean row fills              |
| 3        | E8  | Accessibility       | ⚠️     | Add `aria-label` to each "Browse →" link in FeaturedSources (e.g., `aria-label="Browse {source.sourceName}"`) to disambiguate repeated link text             |
| 4        | A11 | Copy                | ⚠️     | Fix HowItWorks subtitle: "HealthArchive uses…" should be "HealthArchive.ca uses…" for brand name consistency                                                 |
| 5        | A16 | Copy                | ⚠️     | Fix or qualify the FAQ citation guide reference — link to the actual `/methods` or citation page, or soften the copy if the guide does not yet exist         |
| 6        | A17 | Copy                | ⚠️     | Add a hyperlink to the "Report an Issue form" reference in the FAQ archive-request answer                                                                    |
| 7        | A20 | Copy/Architecture   | ⚠️     | Either render or remove `hero.developmentNote` from `HomeCopy` — it is defined in the type and translated but used nowhere in the JSX                        |
| 8        | C2  | Interaction         | 🔧     | Add ease-out easing to `AnimatedMetric` count-up to replace the current linear `progress` curve with a deceleration effect                                   |
| 9        | A13 | Copy                | 🔧     | Sharpen the ExampleStory heading from the generic "Why this matters" to a self-explanatory heading that names the mpox example                               |
| 10       | D6  | Styling/Performance | 🔧     | Replace `width` animation on `ha-metric-bar-fill` with `transform: scaleX()` + `transform-origin: left` for GPU-composited, layout-reflow-free bar animation |
