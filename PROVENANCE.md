# Provenance

Every component and style in this repository has a permission record in its own file (`provenance` in `meta.json` or the style JSON). The loader refuses to publish an item without one, and refuses a third-party item without a source URL. This page lists what is in the current release.

## Catalogue 0.1.0

| Item | Kind | Author | Origin | License | Evidence |
| --- | --- | --- | --- | --- | --- |
| `nav-simple` | component | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |
| `hero-split` | component | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |
| `features-grid` | component | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |
| `stat-row` | component | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |
| `pricing-tiers` | component | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |
| `faq-disclosure` | component | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |
| `cta-band` | component | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |
| `paper` | style | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |
| `harbor` | style | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |
| `signal` | style | Neat Labs | original | MIT | Written for this repository on 2026-09-25 |

Example copy in the components describes a made-up product, "Example Studio". The figures in `stat-row` are labelled as examples. There are no logos, photographs, screenshots, or bundled fonts.

### Fonts

Styles name fonts but don't ship them.

| Font | Used by | License | How it's used |
| --- | --- | --- | --- |
| Fraunces | `paper` display | SIL Open Font License 1.1 | Loaded from Google Fonts by a `<link>` tag the package lists |
| Inter | `harbor` display and body | SIL Open Font License 1.1 | Named only. Not loaded; the stack falls back to the system sans |
| Arial Black, Helvetica Neue | `signal` | Proprietary system fonts | Named only. Used where the viewer's device has them |
| System UI and monospace faces | all | Operating system | Nothing downloaded |

## Adding an item

Record who made it, where it came from, the license or written permission, what it permits, and the evidence. If any of that is unclear, leave the item out and ask. Don't infer permission from public availability, attribution, or another repository's license statement.
