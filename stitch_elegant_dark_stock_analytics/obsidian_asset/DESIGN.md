```markdown
# Design System Strategy: The Financial Luminary

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **"The Precision Vault."** 

In the high-stakes world of stock analysis, the interface must feel as secure as a bank vault and as precise as a surgical instrument. We are moving away from the "Dashboard Template" look characterized by rigid boxes and harsh lines. Instead, we embrace a **Fluid Data Editorial** approach. This system utilizes deep tonal layering, intentional asymmetry, and "light-as-material" to guide the eye. By breaking the grid with overlapping data visualizations and varying surface depths, we create a sophisticated environment where data density feels like a premium feature, not a source of clutter.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
Our palette is rooted in the depth of space, using high-chroma accents to signify market movement.

### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders are strictly prohibited for sectioning. We define boundaries through "Tonal Carving."
- To separate a sidebar from a main feed, transition from `surface` (#0b1326) to `surface-container-low` (#131b2e).
- Use `surface-container-highest` (#2d3449) only for the most critical interactive elements to make them "pop" against the darker void.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers.
*   **Base Layer:** `surface` (#0b1326) – The infinite floor.
*   **Secondary Sections:** `surface-container-low` (#131b2e) – For large content areas.
*   **Active Cards:** `surface-container` (#171f33) – The standard interactive surface.
*   **Elevated Details:** `surface-container-high` (#222a3d) – For tooltips or pop-overs.

### The "Glass & Gradient" Rule
To elevate the "Dark Mode Pro" aesthetic, use **Glassmorphism** for floating headers and navigation bars. Use `surface-container` with a 70% opacity and a `20px` backdrop-blur. 
- **Signature Textures:** Apply a subtle linear gradient to primary action buttons, moving from `primary` (#4edea3) at the top-left to `primary-container` (#10b981) at the bottom-right. This adds a "jewel" quality to the emerald accents.

---

## 3. Typography: Editorial Authority
We utilize **Inter** to bridge the gap between technical data and premium editorial.

*   **Display Scales (`display-lg` to `display-sm`):** Use these for portfolio totals and major indices. The tight letter-spacing and massive scale create an authoritative "hero" moment.
*   **Headline & Title:** These are the anchors. Use `headline-sm` (#dae2fd) for section titles, ensuring they have 2x the top-padding compared to bottom-padding to create an asymmetric, airy flow.
*   **Body & Label:** Use `body-md` for stock descriptions. For technical data points (PE ratios, Vol), use `label-md` with `on-surface-variant` (#bbcabf) to create a clear hierarchy between "Label" and "Value."

---

## 4. Elevation & Depth: Tonal Layering
We do not use shadows to create "lift"; we use light and opacity.

### The Layering Principle
Depth is achieved by "stacking" tiers. A stock watchlist card should not have a shadow; it should be a `surface-container-lowest` (#060e20) shape nested inside a `surface-container` (#171f33) section. This "recessed" look feels more modern and integrated than "floating" boxes.

### Ambient Shadows
For floating modals or context menus only:
- **Shadow:** `0px 24px 48px rgba(6, 14, 32, 0.4)`
- The shadow must be tinted with the `surface-container-lowest` color to ensure it looks like a natural occlusion of light, not a grey smudge.

### The "Ghost Border" Fallback
If contrast testing fails, use a **Ghost Border**: `outline-variant` (#3c4a42) at 15% opacity. It should be felt, not seen.

---

## 5. Components: Precision Elements

### Buttons
*   **Primary:** Gradient of `primary` to `primary-container`. Corner radius: `md` (0.375rem). Use `on-primary` (#003824) for text to ensure high-contrast readability.
*   **Tertiary:** No background. Use `primary` text with a subtle `primary-fixed-dim` underline that only appears on hover.

### Data Cards & Lists
*   **Rule:** Forbid divider lines. Use vertical white space or a subtle shift from `surface-container` to `surface-container-low` to distinguish items.
*   **The "Gain/Loss" Indicator:** Use `primary` (#4edea3) for gains and `secondary` (#ffb2b7) for losses. To add sophistication, use a subtle glow (`box-shadow: 0 0 12px rgba(78, 222, 163, 0.2)`) on the text of the percentage change.

### Input Fields
*   **Style:** `surface-container-lowest` backgrounds with a `ghost-border` on focus.
*   **Active State:** The border transitions to `primary` (#4edea3) with a 2px outer glow of the same color at 10% opacity.

### Stock Sparklines (Signature Component)
*   Charts should use a `primary` stroke with a 10% opacity `primary` gradient fill that fades to `transparent` at the bottom. This creates the "Pro" financial aesthetic found in high-end terminals.

---

## 6. Do's and Don'ts

### Do
*   **Do** use `surface-bright` (#31394d) for hover states on dark cards to create a "sheen" effect.
*   **Do** embrace negative space. If a screen feels cluttered, increase the padding-x on the main container.
*   **Do** use `tertiary` (#7bd0ff) for informational callouts or "Neutral" market movements to avoid color fatigue.

### Don't
*   **Don't** use pure white (#ffffff). Use `on-surface` (#dae2fd) for high-contrast text; it is softer on the eyes in dark environments.
*   **Don't** use `9999px` (pill) buttons unless it is for a "Tag" or "Chip." Action buttons should remain `md` or `lg` roundedness to maintain a professional, architectural feel.
*   **Don't** use standard "drop shadows." If an element needs to stand out, increase its surface tier (e.g., move it from `low` to `high`).

---

## 7. Accessibility Note
While we prioritize "Dark Mode Pro" aesthetics, all text pairings (e.g., `on-surface` on `surface-container`) must maintain a minimum 4.5:1 contrast ratio. When using `secondary` (#ffb2b7) for "Loss" indicators, ensure the font weight is at least `medium` to compensate for the lighter red tone against the dark background.```