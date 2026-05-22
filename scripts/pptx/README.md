# PPTX generation

This folder contains the local `pptxgenjs` setup for report decks.

## Commands

```bash
npm run pptx:check
npm run pptx:sample
```

`npm run pptx:sample` writes:

```text
outputs/pptxgenjs/sample-landscape-deck.pptx
```

## Creating a new deck

1. Copy `build-sample-deck.mjs` to a report-specific builder, such as
   `build-agentic-landscape-deck.mjs`.
2. Reuse `pptx-theme.mjs` for colors, fonts, slide sizing, and output writing.
3. Write final decks to `reports/<report-name>/slides/` or `outputs/pptxgenjs/`.
4. Keep source data paths explicit in the builder so the deck is reproducible.
