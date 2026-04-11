## Implementation Tasks

- [ ] Update the Templates dialog content editor to use the shared CodeEditor surface with top-aligned primary action and editor status metadata (verification: inspect `app/templates/page.tsx` and confirm `CodeEditor` is used for content editing with top action chrome)
- [ ] Update the Partials dialog content editor to use the shared CodeEditor surface with top-aligned primary action and editor status metadata (verification: inspect `app/partials/page.tsx` and confirm `CodeEditor` is used for content editing with top action chrome)
- [ ] Add or update UI tests for the Templates and Partials editing flows to cover the new editor surface contract (verification: `npm run test -- tests/ui/partials-page.test.tsx tests/ui/templates-page.test.tsx`)
- [ ] Validate the full project checks after the UI polish (verification: `npm run test && npm run typecheck && npm run lint`)

## Future Work

- If more multi-line editors are added, extract the shared top action + status chrome into a dedicated reusable editor dialog component
