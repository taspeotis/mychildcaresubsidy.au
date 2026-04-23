# mychildcaresubsidy.au

Free, open-source calculator for estimating out-of-pocket child care costs in Australia. Covers the federal Child Care Subsidy (CCS) and state/territory funding programs.

## Calculators

- **Federal CCS** for centre-based day care, family day care, and outside school hours care (OSHC), including school-age children
- **ACT** 3-Year-Old Preschool
- **NSW** Start Strong
- **QLD** Free Kindy
- **VIC** Free Kinder

## Estimates

Save an estimate for each child from any calculator and see a combined fortnightly household total in one place. Entries are kept in your browser and can be edited or removed later.

## How it works

The federal government subsidises child care fees based on family income (up to 90%, or 95% for second and subsequent children). Some states and territories provide additional funding for kindergarten or preschool programs delivered through long day care. You pay the gap after both subsidies are applied.

## Rates

Federal CCS rates are for FY2025-26 (July 2025 to June 2026). State and territory rates are for calendar year 2026.

Estimates only, not financial advice.

## Development

```sh
npm install
npm run dev
```

`npm run build` runs TypeScript checking then Vite. The build uses `vite-plugin-singlefile` to produce a single `index.html` with all assets inlined.

## Issues

Found a bug or have a suggestion? [Open an issue](https://github.com/taspeotis/mychildcaresubsidy.au/issues).
