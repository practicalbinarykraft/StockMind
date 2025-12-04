# Design Guidelines: ReelRepurposer AI Video Production Pipeline

## Design Approach

**Selected Approach:** Design System + Reference Hybrid
- **Primary System:** Material Design 3 (for information-dense productivity interfaces)
- **Reference Inspiration:** Linear (clean typography, structured layouts), Notion (data organization), Adobe Creative Suite (professional production tools)
- **Rationale:** This is a professional production tool requiring clear hierarchy, efficient workflows, and reliable patterns over visual experimentation

## Core Design Principles

1. **Clarity Over Decoration:** Every element serves a functional purpose in the production pipeline
2. **Progressive Disclosure:** Show complexity only when needed (7-stage workflow with contextual information)
3. **Status Transparency:** Clear visual indicators for pipeline progress, API health, and content scores
4. **Professional Efficiency:** Optimized for repeat use by content creators who value speed

## Color Palette

### Dark Mode (Primary)
- **Background:** 220 15% 8% (deep slate, professional)
- **Surface:** 220 14% 12% (elevated panels)
- **Surface Elevated:** 220 13% 16% (cards, modals)
- **Border:** 220 12% 22% (subtle divisions)
- **Primary Brand:** 210 100% 55% (vibrant blue for CTAs, active states)
- **Primary Hover:** 210 100% 48%
- **Success:** 142 76% 45% (RSS success, high scores)
- **Warning:** 38 92% 50% (moderate scores, pending states)
- **Error:** 0 84% 60% (RSS errors, low scores)
- **Text Primary:** 0 0% 98%
- **Text Secondary:** 220 10% 70%
- **Text Muted:** 220 8% 50%

### Light Mode (Secondary)
- **Background:** 0 0% 100%
- **Surface:** 220 14% 98%
- **Border:** 220 12% 88%
- **Primary Brand:** 210 100% 45%
- **Text Primary:** 220 18% 15%
- **Text Secondary:** 220 10% 40%

### Score Gradient System
- **90-100:** 142 76% 45% (vivid green)
- **70-89:** 170 70% 48% (teal)
- **50-69:** 38 92% 50% (amber)
- **Below 50:** 0 84% 60% (red)

## Typography

**Font Stack:** Inter (Google Fonts) for UI, JetBrains Mono for code/API keys
- **Display (Stage Titles):** 2xl (24px) / font-semibold / tracking-tight
- **Headings (Settings, Cards):** xl (20px) / font-semibold
- **Subheadings (Labels):** base (16px) / font-medium / text-secondary
- **Body (Content):** sm (14px) / font-normal / leading-relaxed
- **Captions (Metadata):** xs (12px) / font-normal / text-muted
- **Mono (API Keys):** sm / font-mono / tracking-wide

## Layout System

**Spacing Primitives:** Tailwind units 2, 4, 6, 8, 12, 16
- **Component padding:** p-4 (cards), p-6 (panels), p-8 (sections)
- **Vertical rhythm:** space-y-6 (settings lists), space-y-4 (forms)
- **Grid gaps:** gap-4 (news cards), gap-6 (stage cards)

**Container Strategy:**
- **Sidebar:** Fixed w-64 (256px), dark surface, sticky navigation
- **Main Content:** flex-1 with max-w-7xl mx-auto px-8
- **Settings Panels:** max-w-4xl for optimal reading
- **News Feed:** Grid layout with responsive columns

## Component Library

### Navigation & Structure
**Sidebar Navigation:**
- Dark surface (220 14% 10%), full-height sticky
- Stage indicators with numbers (1-7), icons, and status badges
- Active state: primary brand left border (w-1), bg-surface-elevated
- Completed stages: success checkmark icon
- Disabled stages: opacity-50, cursor-not-allowed

**Header:**
- h-16, border-b, surface background
- Logo left, user profile/settings right
- Project title center (when active)

### Data Display
**News Cards:**
- Surface-elevated background, rounded-xl, p-6
- Score badge (top-right): rounded-full, score-colored background, font-semibold
- Title: font-semibold, text-lg, line-clamp-2
- Source/date: text-sm, text-muted, flex gap-2
- Hover: translate-y-[-2px], shadow-lg transition

**RSS Source Cards:**
- Grid layout (2 columns lg, 1 mobile)
- Status badge: Success (green) / Error (red) with item count
- Toggle switch (primary brand when active)
- Last updated timestamp (text-xs, text-muted)

**Score Displays:**
- Large circular progress (Stage 3): 120px diameter, score-colored stroke
- Scene score chips: inline-flex, rounded-full, px-3 py-1, text-sm
- Overall AI comment: italic, text-secondary, border-l-4 border-primary

### Forms & Input
**Text Input:**
- Surface background, border, rounded-lg, p-3
- Focus: border-primary, ring-2 ring-primary/20
- Dark mode aware (maintain contrast)

**Select Dropdowns:**
- Match input styling, chevron icon right
- Dropdown menu: surface-elevated, shadow-xl, rounded-lg

**Toggle Switches:**
- w-11 h-6, rounded-full, transition-all
- Active: bg-primary, translate-x-5
- Inactive: bg-border

**File Upload Zone:**
- Dashed border-2, rounded-xl, p-12
- Icon centered, drag-active state (border-primary, bg-primary/5)

### Buttons & Actions
**Primary CTA:**
- bg-primary, hover:bg-primary-hover, rounded-lg, px-6 py-3
- font-medium, transition-colors
- Icon + text layout when applicable

**Secondary:**
- border, border-border, hover:bg-surface-elevated
- Same padding/typography as primary

**Icon Buttons:**
- w-10 h-10, rounded-lg, hover:bg-surface-elevated
- Heroicons for consistency

### Stage-Specific Components
**Format Template Selector (Stage 3):**
- Grid of 15 cards (3 cols lg, 2 md, 1 sm)
- Preview thumbnail + name + description
- Selected: border-2 border-primary, bg-primary/5

**Rewrite Variants (Stage 3):**
- Tabbed interface or accordion
- Each variant: card with edit button
- Selected variant: highlighted border

**Audio Player (Stage 4):**
- Custom controls: play/pause, waveform visualization
- Duration display, download button

**Avatar Grid (Stage 5):**
- Masonry or uniform grid, hover scale effect
- Avatar image + name overlay
- Selected: border-primary, checkmark overlay

**Final Export Panel (Stage 6):**
- Summary cards: timeline, text, audio, avatar
- Large download button (primary)
- Share options (secondary icons)

### Status & Feedback
**Progress Indicator:**
- Top bar: 7 steps, filled = primary, current = pulsing, future = muted
- Percentage complete (text-sm, text-secondary)

**Toast Notifications:**
- Fixed bottom-right, surface-elevated, shadow-2xl
- Success/error icon, message, auto-dismiss
- Slide-in animation

**Loading States:**
- Skeleton loaders (matching card shapes, animated gradient)
- Spinner: border-primary with rotating animation

**Error States:**
- Alert box: bg-error/10, border-error, text-error
- Icon + message + retry button

## Images

No hero images required. This is a dashboard/tool interface focused on data and workflow. Use:
- **Icons:** Heroicons throughout (outline for navigation, solid for badges)
- **Avatars:** User-uploaded or HeyGen API thumbnails
- **News Thumbnails:** Parsed from RSS feeds (fallback to source logo)
- **Empty States:** Illustration-style SVGs (undraw.co style) for "No projects", "No sources"

## Animations

**Minimal, Purposeful Only:**
- Page transitions: fade-in (200ms)
- Card hover: translate-y + shadow (150ms ease-out)
- Button press: scale-95 (100ms)
- Progress updates: width transition (300ms ease-in-out)
- NO scroll animations, parallax, or decorative motion

## Accessibility

- WCAG AA contrast ratios maintained in both modes
- Focus rings: 2px, primary color, offset-2
- Keyboard navigation: visible focus states, logical tab order
- Screen reader labels for icon-only buttons
- Form validation: inline errors with aria-live regions

## Responsive Behavior

- **Desktop (1024px+):** Sidebar always visible, 3-column grids
- **Tablet (768-1023px):** Collapsible sidebar, 2-column grids
- **Mobile (<768px):** Bottom tab navigation, single column, simplified stage cards