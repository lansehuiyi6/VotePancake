# Design Guidelines: WAN Governance Voting Platform

## Design Approach
**Reference-Based: PancakeSwap Style**
Drawing from PancakeSwap's playful yet professional DeFi aesthetic while adapting for complex governance workflows. This platform requires clear information hierarchy for multi-role interactions and complex voting mechanics.

## Core Design Principles
1. **Playful Professionalism**: Balance crypto-fun aesthetics with serious governance functionality
2. **Information Clarity**: Complex voting mechanics demand crystal-clear UI patterns
3. **Role-Based Views**: Seamless transitions between Admin, Proposer, Voter, and Partner perspectives
4. **Trust & Transparency**: Visual emphasis on stake amounts, voting power, and fund flows

## Typography System
- **Headers**: Bold, rounded sans-serif (similar to PancakeSwap's style)
  - H1: 3xl-4xl, font-bold
  - H2: 2xl-3xl, font-bold
  - H3: xl-2xl, font-semibold
- **Body**: Clean sans-serif
  - Regular: base-lg, font-normal
  - Important metrics: lg-xl, font-semibold
- **Numerical Data**: Monospace font for WAN amounts, vote counts, multipliers (10x, 50x, 25x)

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: 2-4 (within cards, between related elements)
- Standard spacing: 6-8 (component padding, section gaps)
- Generous spacing: 12-16 (major section separation)

**Container Strategy**:
- Main content: max-w-7xl mx-auto px-4
- Proposal cards: max-w-4xl for readability
- Wide dashboards: max-w-screen-2xl for Partner/Admin panels

## Component Library

### Navigation
- **Top Bar**: Sticky header with wallet connection, role indicator badge, current XP/WAN balance
- **Tab Navigation**: Rounded pill-style tabs for filtering (All/Core/Community, Vote Now/Soon/Closed)
- **Role Switcher**: Dropdown for users with multiple roles (Admin/Partner/Voter)

### Proposal Cards
- **Standard Card**: Rounded-2xl with shadow-lg, p-6
  - Header: Title (font-bold text-xl), Status badge (rounded-full px-3 py-1)
  - Content grid: 2 columns on desktop
    - Left: Proposal details, funding request amount (if applicable)
    - Right: Vote stats, progress bars, countdown timer
  - Footer: Action buttons (Vote, View Details, Cancel/Withdraw)
- **Compact Card**: For lists, rounded-xl p-4, horizontal layout
- **Status Badges**: Rounded-full with icons
  - Pending Review (lock icon, visible to proposer/admin only)
  - Public/Active (check icon)
  - Voting (ballot icon)
  - Passed/Failed (thumbs up/down)

### Forms & Input Components
- **Proposal Creation Form**: Multi-step wizard
  - Step 1: Proposal type selection (large radio cards)
  - Step 2: Details (title, description textarea)
  - Step 3: Funding/Staking configuration
    - WAN stake options: Radio buttons with multiplier badges (10x lock, 50x burn)
    - XP burn confirmation: Prominent display of 110,000 XP cost
- **Voting Interface**: 
  - Yes/No large buttons with voting power preview
  - WAN commitment slider with lock/burn option radio buttons
  - Real-time calculation: "Your voting power: XXX votes (Xx multiplier)"
- **Partner Support Panel**: 
  - Stake amount input with multiplier preview
  - Commitment type selector (lock/burn)

### Data Visualization
- **Vote Progress**: 
  - Horizontal stacked bar (Yes vs No votes)
  - Percentage labels, vote count labels
  - Quorum indicator line (if applicable)
- **Funding Request Display**:
  - Large numerical display for requested amount
  - Supporting stake breakdown (Proposer + Partners)
  - Visual ratio indicator
- **Voting Weight Calculator**: 
  - Interactive preview showing different lock periods
  - Table format: Lock Duration | Multiplier | Your Power
- **Countdown Timer**: 
  - Large digital display for active votes
  - Days:Hours:Minutes format

### Admin Panel
- **Review Queue**: 
  - Kanban-style layout or list view toggle
  - Each pending proposal: Expanded card with approve/reject actions
  - Quick filters: Funding requests, Parameter changes
- **Parameter Management**: 
  - Settings panel with input fields for adjustable values
  - Clear labels: "XP Burn Cost", "Lock Multiplier", "Burn Multiplier", "Voting Duration"
  - Save/Reset buttons

### Partner Dashboard
- **Portfolio Overview**:
  - Grid of supported proposals (3 columns on desktop)
  - Each card: Proposal title, your stake, status, potential return
- **Metrics Row**: 
  - Total staked, Active proposals, Returns earned
  - Card-based layout with icons

### Modals & Overlays
- **Confirmation Modals**: 
  - Rounded-xl, centered overlay
  - Clear warning text for irreversible actions (burning WAN/XP)
  - Two-button layout: Cancel (outline) + Confirm (solid)
- **Proposal Details**: 
  - Full-screen or large modal
  - Tabs: Overview, Vote History, Partner Support, Discussion
  - Sticky action bar at bottom

### Buttons & CTAs
- **Primary Actions**: Rounded-xl, px-6 py-3, font-semibold, gradient effect
- **Secondary**: Rounded-xl, px-6 py-3, outline style
- **Small Actions**: Rounded-lg, px-4 py-2
- **Destructive**: Border/background treatment for burn/destroy actions
- **Disabled State**: Reduced opacity (opacity-50), cursor-not-allowed

### Illustrations & Icons
- Use Heroicons for UI elements (outline for secondary, solid for active states)
- Decorative illustrations: Bunny/mascot elements similar to PancakeSwap (placeholder comments)
- Empty states: Centered illustration + message for "No proposals found"

## Page Layouts

### Main Voting Page
- Hero section (60vh): Gradient background, title "WAN Governance", subtitle, Create Proposal CTA
- Decorative illustration: Floating coins/governance theme (placeholder)
- Filter bar: Tabs + status filters, sticky below header
- Proposal grid: 2 columns on desktop, 1 on mobile, gap-6
- Empty state: Centered with illustration

### Proposal Detail Page
- Breadcrumb navigation
- Two-column layout (2/3 + 1/3 split)
  - Main: Full proposal content, voting interface
  - Sidebar: Stats, timeline, partner support list
- Bottom: Vote/Support action buttons (sticky on mobile)

### Admin Review Panel
- Full-width layout with side navigation
- Filter sidebar (left): Proposal types, date range
- Main content: Pending proposals list, expandable cards
- Bulk actions toolbar (top of list)

### Partner Dashboard
- Metrics cards row (4 columns)
- Supported proposals section: Card grid
- Transaction history: Table with sorting/filtering

## Accessibility & Interactions
- Focus states: Ring-2 with offset for all interactive elements
- Hover states: Slight scale (hover:scale-105) for cards, brightness increase for buttons
- Loading states: Skeleton screens for proposal cards, spinner for actions
- Animations: Minimal - fade-in for modals (duration-200), slide-down for dropdowns
- Form validation: Inline error messages below inputs, border treatment

## Images
- **Hero Section**: Abstract crypto/governance themed illustration (blockchain nodes, voting symbols) - full-width background image with gradient overlay
- **Empty States**: Friendly illustration for "No proposals" scenarios
- **Role Badges**: Small icon graphics for Admin/Partner/Proposer indicators

This design creates a comprehensive, professional governance platform that maintains PancakeSwap's approachable aesthetic while handling complex multi-role workflows and financial mechanics with clarity and confidence.