# CashPulse Design System (Canonical)

Themed to United Bank Limited (UBL). Brand main color confirmed as #0083CA.

## Palette
| Role                | Hex       | Use |
|---------------------|-----------|-----|
| Primary (UBL Blue)  | #0083CA   | Primary buttons, links, active nav, key accents |
| Primary Dark        | #005B8F   | Pressed/hover on primary, deep headers |
| Navy (UBL Deep)     | #012A4A   | Sidebar bg, dark surfaces, top gradient anchor |
| Cyan Accent         | #00B7E4   | Charts, gradients, highlights |
| Teal Support        | #17A398   | Secondary data series, positive trend |
| Surface             | #FFFFFF   | Cards |
| Background          | #F4F7FB   | App canvas |
| Ink (text)          | #0E1B2A   | Primary text |
| Muted               | #5B6B7C   | Secondary text |
| Hairline            | #E4EBF2   | Borders/dividers |
| Success             | #1E9E5A   | Approve / healthy |
| Warning             | #E8A33D   | Review / caution |
| Danger              | #D6455B   | High risk |
| Gold (UBL accent)   | #F2A900   | Sparingly: badges, "verified" chip |

## Type
- Display/headings: "Poppins", 600/700
- Body/UI: "Inter", 400/500/600
- Numeric/scores: "Poppins" 700 tabular
- Sizes: display 30px, h1 24px, h2 19px, h3 16px, body 14.5px, small 12.5px

## Shape
- Radius: cards 16px, buttons 10px, chips 999px, inputs 10px
- Border: 1px #E4EBF2
- Shadow (card): 0 6px 24px rgba(1,42,74,0.06)
- Shadow (raised): 0 14px 40px rgba(1,42,74,0.12)

## Components
- Primary button: 44px h, 0 20px pad, radius 10, bg #0083CA, white text, hover #005B8F
- Secondary button: white bg, 1px #0083CA border, blue text
- Card: white, radius 16, card shadow, 20-24px pad
- Chip: 999px radius, 12.5px text, tinted bg per semantic color
- Score ring: SVG conic/stroke gauge, color by band
- Sidebar: navy #012A4A, active item pill in #0083CA at 18% + left accent bar

## Spacing scale
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40

## Responsiveness
- Desktop ≥1024px: fixed 248px sidebar + fluid content, multi-column card grids
- Tablet 640–1023px: collapsible sidebar (hamburger), 2-col grids → 1-col
- Mobile <640px: sidebar becomes slide-over drawer, single column, sticky bottom action bar on flow screens
- All charts scale to container width; touch targets ≥44px

## Frame / presentation
Mockups render as a real responsive web app (not device bezels). A top browser-style
chrome bar shows the URL. A device toggle (Desktop / Mobile) lets reviewers see both.
