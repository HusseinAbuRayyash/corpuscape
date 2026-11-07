# Corpuscape 2.4.0 accessibility checks

Lighthouse ran on the production build served locally. Axe scanned the rendered
landing page and the Corpus Explorer with a teaching corpus loaded, at 1,365 ×
900 and 390 × 844. The archive contains the Lighthouse HTML reports and the
axe-core JSON results.

| Page | Device | Performance | Accessibility | Best practices | SEO | Axe violations |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Landing | Desktop | 100 | 100 | 100 | 100 | 0 |
| Landing | Mobile | 98 | 100 | 100 | 100 | 0 |
| Corpus Explorer | Desktop | 100 | 100 | 100 | 100 | 0 |
| Corpus Explorer | Mobile | 100 | 100 | 100 | 100 | 0 |

The first pass scored 96 for landing accessibility and 97 for Explorer
accessibility. The fixes address the text contrast and the accessible names of
the motion and tool search controls. Performance scores are individual
Lighthouse runs and vary with hardware and browser load.

[Lighthouse and axe reports](./lighthouse-and-axe.zip)
