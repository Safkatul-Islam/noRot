# Window activity classification gaps (Windows + browsers)

## What the error looks like

- Procrastination score stays low because most activity is categorized as `neutral`.
- Browsing in Windows browsers (especially Edge/Brave) does not resolve domains, so `title` rules (like `youtube.com`) never match.
- Toggling “On-device AI tracking” off makes native-app activity detection worse than expected (Word/Excel/etc show as `neutral`).
- In `Apps` page, changing category for entries like `Chrome (youtube.com)` does not actually affect classification.

## Why it happens

1. **Browser detection misses Windows process names**
   - Active window libraries often report process names like `msedge.exe` / `brave.exe`.
   - If `isBrowser(appName)` returns false, we never attempt domain/title classification.

2. **Title parsing is too strict**
   - Many browsers use separators other than `" - "` (for example em dashes or pipes).
   - Many productive sites show a **site name** (“Google Docs”, “Stack Overflow”) rather than a literal domain in the title.

3. **Rule-based activity detection was unintentionally gated**
   - Telemetry was only calling the activity classifier when `visionEnabled` was true.
   - That disabled fast rule-based categorization when users turned off the vision model.

4. **Apps page overrides didn’t match runtime classification**
   - App stats were keyed/displayed as `AppName (domain)`.
   - Overrides created `matchType: 'app'` rules using that display string, which never matched the real `activeApp` value.

## How to detect it automatically

- Unit tests (Vitest) that validate:
  - `isBrowser('msedge.exe')` and `isBrowser('brave.exe')` are true
  - `extractDomain()` recognizes “Google Docs” / “Stack Overflow” title segments
  - title parsing works with separators like `—` and `|`
  - `classifyApp()` returns expected categories for Windows browsers using title rules

Run:

```bash
npm -w @norot/desktop run test:run
```

## Practical verification (Windows)

1. Start telemetry (complete daily setup).
2. Open:
   - Edge + YouTube → should become `entertainment`
   - Edge/Brave + Google Docs → should become `productive`
3. In `Apps` page, change category for `Edge (youtube.com)`:
   - should create/update a `title` rule for `youtube.com` and immediately affect future classification.

