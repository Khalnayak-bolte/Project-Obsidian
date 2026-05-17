# Obsidian Design System

## Overview

This design system defines the visual language for the Obsidian application. Use this reference to maintain consistency across all pages and components.

---

## Color Palette

| Name | Hex Code | Usage |
|------|----------|-------|
| `--bg-primary` | `#050507` | Main background, page backgrounds |
| `--bg-secondary` | `#0c0c10` | Section backgrounds, cards container |
| `--bg-card` | `#0f0f14` | Card backgrounds, elevated surfaces |
| `--text-primary` | `#fafafa` | Headings, primary text |
| `--text-secondary` | `#8a8a8a` | Body text, descriptions |
| `--text-muted` | `#4a4a4a` | Placeholders, disabled states |
| `--gold` | `#c9a227` | Accents, highlights, primary CTAs |
| `--gold-dim` | `#8a7019` | Secondary accents |
| `--gold-glow` | `rgba(201, 162, 39, 0.3)` | Gold glow effects |
| `--purple` | `#9b5de5` | Secondary accents, buttons |
| `--purple-dim` | `#6b3fa0` | Darker purple variants |
| `--purple-glow` | `rgba(155, 93, 229, 0.2)` | Purple glow effects |
| `--white` | `#ffffff` | Pure white for contrast elements |

---

## Typography

### Font Families

- **Display/Headings**: `Cormorant Garamond` (serif)
  - Elegant, luxurious feel
  - Use for: Page titles, section headings, brand names

- **Body/UI**: `Questrial` (sans-serif)
  - Clean, modern readability
  - Use for: Body text, buttons, navigation, labels

### Type Scale

| Element | Font | Size | Weight | Letter Spacing |
|---------|------|------|--------|-----------------|
| Hero Title | Cormorant Garamond | `clamp(4rem, 18vw, 14rem)` | 300 | 0.4em |
| Page Title | Cormorant Garamond | `clamp(2.5rem, 5vw, 3.5rem)` | 400 | - |
| Section Title | Cormorant Garamond | `1.8rem` | 500 | - |
| Nav Brand | Cormorant Garamond | 1.5rem | 500 | 0.15em |
| Body | Questrial | 0.85rem | 400 | - |
| Labels | Questrial | 0.65rem | 400 | 0.35-0.5em |
| Buttons | Questrial | 0.7-0.75rem | 400 | 0.15-0.2em |

---

## Spacing System

- Base unit: `1rem` (16px)
- Section padding: `8rem 2rem`
- Card padding: `3rem 2.5rem`
- Grid gap: `2rem`
- Max content width: `1100px` (cards), `1200px` (general)

---

## Components

### Navigation Bar

```css
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding: 1.5rem 3rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom, rgba(5, 5, 7, 0.9), transparent);
  z-index: 100;
}
```

- Brand on left
- Actions on right
- Semi-transparent gradient background

### Buttons

**Primary Button (Purple)**
- Border: `1px solid var(--purple)`
- Background: transparent → purple on hover
- Box-shadow: `0 0 20px var(--purple-glow)` on hover
- Text: uppercase, letter-spacing 0.15-0.2em

**Gold Accent Button**
- Border: `1px solid var(--gold)`
- Similar hover effect with gold glow

### Cards

- Background: `--bg-card` (#0f0f14)
- Border: `1px solid rgba(255, 255, 255, 0.04)`
- On hover:
  - `translateY(-10px)`
  - Border color becomes visible
  - Box shadow appears
- Pseudo-elements for gradient line (top) and radial glow (top-right)

### Section Layouts

**Hero Section**
- `min-height: 100vh`
- Centered content
- Purple radial gradient background effect
- Fade-in animations on load

**Content Sections**
- Background: `--bg-secondary`
- Gradient fade at top and bottom (into primary)
- Section header with label + title

**Grid Layout**
- `grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))`
- Gap: `2rem`
- Max-width: `1100px`

---

## Visual Effects

### Noise Texture

Apply globally or per-section:
```css
.noise-overlay::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,...");
  opacity: 0.025;
  pointer-events: none;
  z-index: 1000;
}
```

### Gradient Overlays

- **Hero**: Purple radial gradient at center
- **Sections**: Linear gradient fade at edges
- **Cards**: Top-right purple radial glow on hover

### Animations

| Animation | Duration | Easing | Use Case |
|-----------|----------|--------|----------|
| `fadeInUp` | 1.5s | cubic-bezier(0.16, 1, 0.3, 1) | Initial page load |
| `fadeInUp` (delayed) | 1s | same | Staggered elements |
| `glowPulse` | 3s | ease-in-out | Decorative lines |
| `scrollPulse` | 2.5s | ease-in-out | Scroll indicators |

---

## Page Structure Template

```tsx
import React from 'react';
import './global.css';

const PageName: React.FC = () => {
  return (
    <div className="page-container">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-brand">OBSIDIAN<span>.</span></div>
        <button className="btn-primary"><span>Action</span></button>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">Title</h1>
        <p className="hero-subtitle">Subtitle</p>
      </section>

      {/* Content Section */}
      <section className="content-section">
        <div className="section-header">
          <p className="section-label">Label</p>
          <h2 className="section-title">Title</h2>
        </div>
        <div className="grid">
          {/* Cards */}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p className="footer-brand">OBSIDIAN<span>.</span></p>
        <p className="footer-copy">© 2026</p>
      </footer>
    </div>
  );
};
```

---

## CSS Variables Reference

Copy this to new CSS files:

```css
:root {
  --bg-primary: #050507;
  --bg-secondary: #0c0c10;
  --bg-card: #0f0f14;
  --text-primary: #fafafa;
  --text-secondary: #8a8a8a;
  --text-muted: #4a4a4a;
  --gold: #c9a227;
  --gold-dim: #8a7019;
  --gold-glow: rgba(201, 162, 39, 0.3);
  --purple: #9b5de5;
  --purple-dim: #6b3fa0;
  --purple-glow: rgba(155, 93, 229, 0.2);
  --white: #ffffff;
}
```

---

## Best Practices

1. **Use CSS variables** for all colors - never hardcode hex values
2. **Use clamp()** for responsive font sizes
3. **Letter spacing**: Use 0.15-0.5em for uppercase labels and buttons
4. **Cubic-bezier transitions**: Use `0.16, 1, 0.3, 1` for smooth, premium feel
5. **Hover states**: Always include subtle lift (translateY) and glow effects
6. **Pseudo-elements**: Use `::before` and `::after` for decorative lines and gradients
7. **Noise texture**: Apply sparingly for depth - keep opacity low (0.025)
8. **Spacing**: Use generous padding (8rem vertical) for sections
9. **Gradients**: Use linear gradients at section edges for smooth transitions

---

## Resources

- Google Fonts: Cormorant Garamond, Questrial
- Color contrast: Ensure `--text-secondary` on `--bg-primary` meets accessibility standards