# kindy.au

A calculator that estimates out-of-pocket childcare costs for Australian families, factoring in the federal Child Care Subsidy (CCS) and state/territory kindy funding programs.

Currently supports **QLD** (Free Kindy) and **ACT** (3-Year-Old Preschool).

## Tech stack

- **React 19** + **TypeScript** + **Vite**
- **TanStack Router** (file-based routing)
- **Tailwind CSS 4** with `@theme` for custom design tokens

## Project structure

```
src/
  calculators/      # Pure calculation logic (qld, act, ccs)
  components/       # Reusable UI components
  routes/           # TanStack file-based routes (__root, index, qld, act)
  styles/index.css  # Tailwind theme + custom CSS classes
  config.ts         # Shared default values for calculator inputs
  types.ts          # Shared TypeScript types
```

## Design decisions

### Colour scheme

Purple brand palette (`brand-50` to `brand-950`, primary `#63198e`) for backgrounds. Orange accent palette (`accent-50` to `accent-950`, primary `#f44e27`) for highlights, active states, and CTAs. White for card surfaces, outlines, and shadows against the dark background.

Palettes are defined as CSS custom properties in `src/styles/index.css` under `@theme` so Tailwind utilities like `bg-brand-600` and `text-accent-400` work natively.

### Custom CSS classes

Complex multi-property visual effects that Tailwind utilities can't express are in `src/styles/index.css`:

- **`.bg-page`** — Radial gradient background with depth
- **`.card-glass`** — White card with gradient, layered shadows (inset highlight + ambient + purple depth + white glow)
- **`.card-lift`** — Hover animation: translateY(-4px) + intensified shadows + accent ring
- **`.sidebar-gradient`** — Dark purple gradient for calculator sidebars
- **`.header-glow`** / **`.footer-glow`** — Gradient glow lines via `::after` / `::before` pseudo-elements

### Form field alignment in grids

When form fields (InputField, SelectField, TimePicker) sit in a 2-column grid, labels of different lengths cause inputs to misalign. This is solved with:

1. Outer container is `flex flex-col`
2. The input wrapper uses `mt-auto` to push to the bottom of the grid cell
3. Spacing between label and input uses `pt-1.5` on a wrapper div **outside** the `relative` container (not inside it, which would throw off the vertical centering of prefix/suffix icons)

### Input formatting and validation

The `InputField` component supports a `format` prop with three modes:

- **`currency`** — `type="text"` + `inputMode="decimal"`, blocks non-numeric input, formats to 2 decimal places on blur (e.g. `150` becomes `150.00`)
- **`percent`** — Same as currency but semantically for percentages (e.g. `85` becomes `85.00`)
- **`integer`** — `type="text"` + `inputMode="numeric"`, blocks non-numeric input, adds thousand separators on blur (e.g. `120000` becomes `120,000`)

All formatted fields support `min`/`max` clamping on blur. Since they use `type="text"`, HTML min/max attributes don't work natively, so the component clamps values programmatically in the blur handler.

Prefix (`$`) and suffix (`%`, `/yr`) are absolutely positioned spans inside a `relative` container. The `relative` div must not have padding that would throw off `inset-y-0` centering.

### Sticky footer

The root layout uses `flex min-h-screen flex-col` on the outer div and `flex-1` on `<main>` to push the footer to the bottom on tall screens.

### Sliding pill animations

Both the navbar (QLD/ACT) and the ToggleGroup (Daily/Fortnightly) use a sliding pill pattern:

1. An absolutely positioned gradient div sits behind the buttons
2. `useLayoutEffect` measures the active element's `offsetLeft` and `offsetWidth`
3. The pill's `left` and `width` are set via inline styles with `transition-all duration-300 ease-out`

**First activation**: The pill skips the slide transition and only fades in. This prevents a jarring slide from position 0. Implementation: temporarily set `transition: none` on the element, update position, then restore transition in a `requestAnimationFrame`. A `useRef` boolean tracks whether the pill has been visible before.

### Scroll restoration

Configured via `scrollRestoration: true` on `createRouter()` in `src/main.tsx` (not the deprecated `<ScrollRestoration />` component).

### Shared defaults

Calculator default values (CCS %, withholding, session fee) are centralised in `src/config.ts` so both QLD and ACT calculators stay consistent.

## Running locally

```sh
npm install
npm run dev
```
