# Job Application Assistant

Phase 1 focuses on a Chrome extension that detects and fills job application forms using a local knowledge base and an OmniRoute AI gateway.

The current flow is:

1. Upload a resume in the options page.
2. Extract structured fields and resume chunks.
3. Prefill the knowledge base from the resume.
4. Let the user edit and save the final values.
5. Use OmniRoute to route AI requests to free or low-cost models first.

## Structure

- `extension/`: Chrome extension (MVP ready)
- `backend/`: crawler, matcher, notifier, API placeholders
- `shared/`: cross-component schema docs

## Run Extension Locally

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked` and choose the `extension` folder.
4. Open any job application page, then use popup actions:
   - `Detect Fields`
   - `Autofill This Page`
5. Open extension options page to edit knowledge base values.

## Current MVP Scope

- Local storage based knowledge base
- Resume upload with structured field prefill
- Resume chunk storage for later retrieval and answer generation
- OmniRoute gateway settings with dynamic model routing
- Semantic field detection (`label/name/placeholder`)
- Autofill with synthetic DOM events (`input/change/blur`)
- User input watcher with feedback loop
- Popup stats + options editor

## Next Phase

- Integrate backend polling endpoint in service worker
- Add provider-agnostic AI client implementation
- Add ATS-specific adapters (Greenhouse/Lever)