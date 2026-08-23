# ADIF Expert

A desktop viewer for ADIF ham radio log files, in the spirit of [ADIF Master](https://www.dxshell.com/adif-master.html). Point it at a folder, pick a `.adi`/`.adif` file from the list on the left, and browse its QSOs in a sortable, column-configurable table on the right.

Currently view-only; editing, filtering, and multi-file views are planned but not yet implemented.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build        # typecheck + bundle
npm run build:mac    # or build:win / build:linux
```
