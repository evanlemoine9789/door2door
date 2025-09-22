# Theme Guidelines

This application uses a **dark theme only** design system based on shadcn/ui components.

## Design Principles

- **Dark theme only**: No light mode support
- **Consistent color palette**: Uses the predefined CSS variables in `globals.css`
- **shadcn/ui components**: All UI components should use the standard shadcn/ui components
- **CRM-inspired styling**: Follows the dark theme established in CRM and metrics pages

## Color Usage

### Background Colors
- `bg-background` - Main page background (dark gray)
- `bg-card` - Card backgrounds (slightly lighter dark gray)
- `bg-muted` - Muted backgrounds for secondary elements

### Text Colors
- `text-foreground` - Primary text (white)
- `text-muted-foreground` - Secondary/muted text
- `text-card-foreground` - Text on card backgrounds

### Accent Colors
- `bg-primary` - Primary buttons and highlights
- `bg-accent` - Secondary buttons and hover states
- `border-border` - Borders and dividers

## Component Guidelines

### New Pages
- Always use `bg-card` for the main container
- Use `text-card-foreground` for headings
- Use `text-muted-foreground` for descriptions
- Apply `border-border` for borders

### Buttons
- Primary actions: `bg-primary text-primary-foreground`
- Secondary actions: `variant="outline"` with `border-border`
- Hover states: `hover:bg-accent` or `hover:bg-primary/90`

### Cards and Containers
- Use `bg-card` for card backgrounds
- Apply `border-border` for borders
- Use `text-card-foreground` for card text

## CSS Variables

All colors are defined in `src/app/globals.css` using CSS custom properties. Do not create new color variables - use the existing ones to maintain consistency.

## Examples

```tsx
// ✅ Correct - Dark theme consistent
<div className="min-h-screen bg-card">
  <h1 className="text-2xl font-bold text-card-foreground">Page Title</h1>
  <p className="text-muted-foreground">Description text</p>
  <Button className="bg-primary text-primary-foreground">Action</Button>
</div>

// ❌ Incorrect - Don't use light theme colors
<div className="min-h-screen bg-white">
  <h1 className="text-2xl font-bold text-black">Page Title</h1>
  <p className="text-gray-600">Description text</p>
</div>
```

## Important Notes

- **Never add light theme support** - This application is designed to be dark theme only
- **Don't create new color variables** - Use the existing CSS custom properties
- **Follow the established patterns** - Look at existing pages (CRM, metrics) for reference
- **Use shadcn/ui components** - They're already styled for the dark theme

## File Structure

- `src/app/globals.css` - Contains all color variables and base styles
- `src/components/ui/` - shadcn/ui components with dark theme styling
- Existing pages serve as examples of proper dark theme implementation
