# PROJECT_OVERVIEW.md

## Massage Planner - Complete Feature Overview

### 🎯 Core Functionality

#### ✅ Appointment Management
- **Create**: Add new massage appointments with client name, start time, and duration
- **Edit**: Modify existing appointments inline
- **Delete**: Remove appointments with confirmation
- **Auto-calculate**: End times are automatically calculated from start time + duration

#### ✅ Break Management
- **Auto-insert**: Automatically add 15-minute breaks between appointments
- **Manual control**: Move, resize, or delete breaks as needed
- **Visual distinction**: Breaks have different styling (amber) from appointments (blue)

#### ✅ Interactive Schedule
- **Drag-and-drop**: Move appointments and breaks by dragging them
- **Resize**: Adjust duration by dragging the bottom edge
- **Touch support**: Full touch/gesture support for mobile devices
- **Time snapping**: All movements snap to 15-minute intervals for clean scheduling
- **Visual timeline**: Vertical timeline showing 8:00 AM to 9:00 PM

#### ✅ Responsive Design
- **Mobile-first**: Optimized for phone screens with touch controls
- **Desktop-enhanced**: Wider view and additional space on desktop
- **Adaptive layout**: Form and schedule adjust based on screen size
- **Touch-friendly**: Large tap targets and swipe gestures

#### ✅ Data Persistence
- **Supabase integration**: All data saved to PostgreSQL database
- **Real-time sync**: Changes reflected immediately
- **Error handling**: Graceful error messages for failed operations
- **Loading states**: Visual feedback during data operations

---

## 📁 Project Architecture

### Component Structure

```
src/
├── components/
│   ├── AppointmentForm.tsx      # Form for creating/editing appointments
│   ├── AppointmentBlock.tsx     # Individual appointment display with drag/resize
│   ├── BreakBlock.tsx          # Individual break display with drag/resize
│   └── ScheduleView.tsx        # Main timeline view with all appointments/breaks
├── hooks/
│   ├── useAppointments.ts      # State management for appointments & breaks
│   ├── useDragDrop.ts         # Drag-and-drop logic (mouse & touch)
│   └── useResize.ts           # Resize logic (mouse & touch)
├── services/
│   ├── supabaseClient.ts      # Supabase client initialization
│   └── appointmentService.ts   # CRUD operations for appointments & breaks
├── types/
│   └── index.ts               # TypeScript type definitions
├── App.tsx                     # Main app component
├── main.tsx                    # React entry point
└── index.css                   # Global styles + TailwindCSS
```

### Key Design Patterns

#### 1. **Custom Hooks for State Management**
- `useAppointments`: Manages all appointment/break CRUD operations
- `useDragDrop`: Handles drag interactions with mouse/touch support
- `useResize`: Handles resize interactions with mouse/touch support

#### 2. **Service Layer Separation**
- `appointmentService.ts`: All Supabase API calls isolated in one place
- Makes it easy to swap out backend if needed
- Centralized error handling and data transformation

#### 3. **Component Composition**
- Small, focused components with single responsibilities
- `ScheduleView` orchestrates smaller components
- Shared props interface for consistency

#### 4. **TypeScript for Type Safety**
- Complete type definitions for all data structures
- Type-safe API calls and component props
- Reduced runtime errors

---

## 🛠️ Technology Choices

### Frontend Framework: **React 18 + TypeScript**
- **Why React**: Component-based architecture, large ecosystem
- **Why TypeScript**: Type safety, better IDE support, fewer bugs

### Build Tool: **Vite**
- **Why Vite**: Extremely fast dev server, optimized production builds
- Better than Create React App for modern projects

### Styling: **TailwindCSS**
- **Why Tailwind**: Rapid UI development, consistent design system
- Responsive utilities built-in
- Small production bundle size

### Backend: **Supabase**
- **Why Supabase**: PostgreSQL database with REST API
- No backend code needed
- Real-time capabilities (not used but available)
- Free tier sufficient for personal use

### Date Handling: **date-fns**
- **Why date-fns**: Lightweight, functional, tree-shakeable
- Better than moment.js (smaller bundle)

---

## 🎨 UI/UX Features

### Visual Design
- **Color coding**: Blue for appointments, amber for breaks
- **Hover effects**: Subtle elevation on hover
- **Active states**: Visual feedback during drag/resize
- **Shadow depth**: Material design-inspired shadows

### Interaction Design
- **Drag handles**: Clear visual affordance for draggable items
- **Resize handles**: Bottom edge highlighted for resizing
- **Confirmation dialogs**: Prevent accidental deletions
- **Loading states**: Spinner during data fetching

### Responsive Breakpoints
- **Mobile**: < 640px (compact layout, stacked forms)
- **Tablet**: 640px - 1024px (side-by-side where space allows)
- **Desktop**: > 1024px (full 3-column grid layout)

---

## 🚀 Performance Optimizations

### React Optimizations
- `useCallback` hooks to prevent unnecessary re-renders
- Memoized calculations where appropriate
- Efficient state updates (batch updates)

### Bundle Size
- Tree-shaking enabled (Vite)
- date-fns imported functions only (not entire library)
- TailwindCSS purges unused styles in production

### Database Efficiency
- Indexed columns (start_time, end_time)
- Single queries for fetching data
- Optimistic UI updates where possible

---

## 🔒 Security Considerations

### Current Setup (Private Use)
- ✅ No authentication required
- ✅ Row Level Security enabled but permissive
- ✅ Environment variables for API keys
- ⚠️ Suitable for personal, private use only

### For Production/Public Use
- 🔐 Add Supabase Authentication
- 🔐 Implement restrictive RLS policies
- 🔐 Add user-based data isolation
- 🔐 Rate limiting on API calls

---

## 📊 Database Schema

### Tables

#### `appointments`
```sql
id               UUID (PK)
client_name      TEXT
start_time       TIMESTAMPTZ
duration_minutes INTEGER
end_time         TIMESTAMPTZ
type             TEXT (always 'appointment')
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

#### `breaks`
```sql
id               UUID (PK)
start_time       TIMESTAMPTZ
duration_minutes INTEGER
end_time         TIMESTAMPTZ
type             TEXT (always 'break')
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
```

### Indexes
- `idx_appointments_start_time` on `appointments(start_time)`
- `idx_breaks_start_time` on `breaks(start_time)`

---

## 🧪 Testing Recommendations

### Manual Testing Checklist
- ✅ Create appointment with various durations
- ✅ Edit appointment details
- ✅ Delete appointment
- ✅ Drag appointment to new time
- ✅ Resize appointment duration
- ✅ Auto-insert breaks between appointments
- ✅ Delete break
- ✅ Test on mobile device (touch interactions)
- ✅ Test on different screen sizes
- ✅ Test with slow network (loading states)

### Automated Testing (Future Enhancement)
- Unit tests for hooks (Jest + React Testing Library)
- Integration tests for components
- E2E tests for critical flows (Cypress/Playwright)

---

## 🔮 Future Enhancement Ideas

### Features
- 📅 **Calendar view**: Month/week view in addition to daily
- 🔍 **Search**: Find appointments by client name
- 📝 **Notes**: Add notes/details to appointments
- 📞 **Client info**: Store client contact information
- 🔔 **Notifications**: Email/SMS reminders
- 📊 **Statistics**: Revenue tracking, most popular times
- 🎨 **Themes**: Dark mode, custom color schemes
- 📱 **PWA**: Install as mobile app
- 🔄 **Recurring**: Support for recurring appointments

### Technical Improvements
- 🔐 **Authentication**: Multi-user support
- ⚡ **Real-time**: Live updates with Supabase real-time
- 🧪 **Testing**: Unit and E2E test coverage
- 📱 **Offline**: Service worker for offline capability
- 🌍 **i18n**: Multi-language support
- ♿ **Accessibility**: ARIA labels, keyboard navigation
- 🎭 **Animations**: Smooth transitions with Framer Motion

---

## 📚 Learning Resources

### Documentation
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [date-fns Docs](https://date-fns.org/docs)

### Related Concepts
- React Hooks
- TypeScript Generics
- CSS Grid & Flexbox
- PostgreSQL
- REST APIs
- Environment Variables

---

## 🤝 Contributing

If you want to extend this project:

1. **Fork** the repository
2. **Create** a feature branch
3. **Implement** your changes with comments
4. **Test** thoroughly
5. **Submit** a pull request

---

## 📄 License

MIT License - Feel free to use, modify, and distribute as needed.

---

**Built with ❤️ for massage therapists**
