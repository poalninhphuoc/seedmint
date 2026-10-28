# Locales

Each locale pack provides: person names, addresses, phone formats, currency, date/number formats, national IDs, company names and sample text.

| Code | Language | Notes |
|---|---|---|
| `en` | English | US default; `en-GB`, `en-AU` later |
| `vi` | Vietnamese | CCCD, tax code (MST), plates, province/district/ward |
| `ja` | Japanese | Kanji and kana names, prefectures |
| `ko` | Korean | Hangul names, addresses |
| `zh` | Chinese | Simplified first |
| `th` | Thai | |
| `id` | Indonesian | |
| `fr` `de` `es` | European | |

Rules: fake identifiers must be **format-valid but never real people**. Mixed-locale tables are supported. Add a locale by copying `locales/_template` and opening a PR.
