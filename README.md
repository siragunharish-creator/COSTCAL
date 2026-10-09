# Construction Cost Intelligence

React + TypeScript + Vite + Tailwind + Recharts + SheetJS. Browser-only (data stays in localStorage).

    npm install
    npm run dev        # development
    npm run build      # type-check + single-file build in dist/
    npx tsx scripts/check.ts   # parse a workbook and print totals (edit the path inside)

Structure: src/services (parser, normaliser, analytics, reconciliation, duplicates, storage, exporter) feed
src/store (data + filters) which feed the pages/components. All figures come from services/analytics.ts.
Swap services/storage.ts to move to Supabase/PostgreSQL later.
