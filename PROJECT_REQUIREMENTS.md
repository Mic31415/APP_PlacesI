# "Places I..." Mobile App - Project Requirements & Development Plan

## 📋 Project Overview

**App Name:** Places I...  
**Tagline:** Track Your World, One [emoji] at a Time  
**Platform:** iOS & Android (React Native)  
**Monetization:** Ad-supported with premium subscription  
**Architecture:** Offline-first, local storage only (no cloud/Firebase)

---

## 🎯 Client Requirements Summary

### Core Concept
A simple, offline-first mobile application allowing users to create customizable maps and log personal experiences at specific locations. Users can track places they've traveled, restaurants visited, or any location-based activities.

### Key Differentiators
- **Offline-First:** All data stored locally, no cloud dependency
- **Multiple Map Types:** Users create custom map categories
- **Flexible Pin Types:** Country-level, state-level, or exact location pins
- **Ad-Supported:** Primary revenue from ads, optional premium for ad-free
- **Privacy-Focused:** No user accounts (unless subscription-based)

---

## 📦 Required Features Breakdown

### 1. Onboarding & Permissions
- [ ] Simple 3-4 screen onboarding tutorial
- [ ] Permission requests:
  - Location access
  - Camera/Gallery access
  - Storage access
- [ ] No user accounts for free tier
- [ ] Account system for premium subscribers (clarification needed)

### 2. Map Creation & Management
- [ ] Create multiple custom map types
- [ ] Each map includes:
  - Custom name (e.g., "Places I've Eaten At")
  - Custom emoji for pins (emoji picker)
  - Map view type selection:
    - Country-level (highlight whole countries)
    - State-level (highlight states/provinces)
    - Exact location (standard pin map)
- [ ] Home screen displaying all maps as cards showing:
  - Map name
  - Emoji icon
  - Pin count
- [ ] Map management:
  - Create new map
  - Edit existing map
  - Delete map

### 3. Pin Management
- [ ] Add pin functionality with:
  - Location selection (search, current location, manual pick)
  - Title (short text)
  - Note/description (long text with basic formatting)
  - Optional image upload (camera or gallery)
  - Rating system (clarification needed on scale)
- [ ] Pin detail modal displaying:
  - Title
  - Description
  - Image
  - Edit/Delete options
- [ ] Country/state highlighting for area-based maps

### 4. Map Visualization
- [ ] Interactive, zoomable/pannable map view
- [ ] Custom emoji pins display
- [ ] Country/state filled/highlighted regions
- [ ] Pin clustering for dense areas (optional)
- [ ] Light/dark mode support (device-based)

### 5. Search & Stats
- [ ] Search within map by title or description
- [ ] Simple statistics per map (e.g., "25 countries visited")

### 6. Data Management
- [ ] Manual data export as JSON
- [ ] Manual data import/restore from JSON
- [ ] Local database storage (SQLite)

### 7. Settings
- [ ] Ad toggle (premium users only)
- [ ] Clear all data option
- [ ] App information
- [ ] Subscription management

### 8. Monetization
- [ ] Google AdMob integration:
  - Banner ads (non-intrusive placement)
  - Interstitial ads (strategic timing)
- [ ] Premium subscription:
  - $1/month or $10/year
  - Apple In-App Purchases (iOS)
  - Google Play Billing (Android)
  - Ad-free experience only (no additional features)

---

## 🛠️ Technical Stack & Requirements

### Technology Stack
- **Framework:** React Native (same as current apps)
- **Language:** TypeScript
- **Local Storage:** SQLite (react-native-sqlite-storage or similar)
- **Maps:** React Native Maps
- **Navigation:** React Navigation
- **State Management:** React Context API / Redux (TBD)
- **Ad Integration:** Google AdMob (react-native-google-mobile-ads)
- **In-App Purchases:** 
  - iOS: react-native-iap
  - Android: react-native-iap
- **Image Handling:** react-native-image-picker
- **Emoji Picker:** Custom or library (TBD)

### Platform Support
- iOS 13.0+
- Android 6.0+ (API 23+)

### Performance Requirements
- Offline-first architecture
- Fast local data access
- Smooth map interactions
- Efficient image storage and retrieval

---

## 🎨 UI/UX Requirements

### Design Principles
- Clean, minimal design
- Vibrant emoji accents
- Intuitive navigation
- Accessibility support (screen reader, dynamic text)

### Navigation Structure
Bottom tab navigation with 3 tabs:
1. **Home/Maps** - List of all user maps
2. **Create** - Quick access to create new map/pin
3. **Settings** - App settings and preferences

### Screen Flow
```
Home Screen (Map List)
├── Create New Map → Map Configuration
├── Select Map → Map View
│   ├── Add Pin → Pin Creation Flow
│   │   ├── Location Selection
│   │   ├── Pin Details Entry
│   │   └── Image Upload (optional)
│   └── View Pin → Pin Detail Modal
│       ├── Edit Pin
│       └── Delete Pin
└── Settings
    ├── Premium Subscription
    ├── Data Export/Import
    └── App Info
```

---

## 📱 Required Screens & Components

### Screens (Estimated)
1. **Onboarding Screens** (3-4 screens)
2. **Home Screen** - Map list with cards
3. **Map Creation Screen** - Configure new map
4. **Map View Screen** - Interactive map display
5. **Pin Creation Screen** - Add/edit pin details
6. **Pin Detail Modal** - View pin information
7. **Search Screen** - Search within map
8. **Settings Screen** - App preferences
9. **Premium Subscription Screen** - Purchase flow
10. **Data Export/Import Screen** - Backup/restore

### Reusable Components
- Map card component
- Pin marker component
- Emoji picker component
- Image uploader component
- Modal components
- Ad banner component
- Ad interstitial component
- Search bar component
- Stats display component

---

## 🗄️ Data Models

### Map Type
```typescript
{
  id: string;
  name: string;
  emoji: string;
  viewType: 'country' | 'state' | 'exact';
  createdAt: timestamp;
  updatedAt: timestamp;
  pinCount: number;
}
```

### Pin
```typescript
{
  id: string;
  mapId: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  countryCode?: string; // For country-level
  stateCode?: string;   // For state-level
  emoji: string;
  rating?: number;
  imagePath?: string;
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

### User Preferences
```typescript
{
  isPremium: boolean;
  subscriptionType?: 'monthly' | 'yearly';
  subscriptionExpiry?: timestamp;
  theme: 'light' | 'dark' | 'auto';
  onboardingCompleted: boolean;
}
```

---

## 🔐 Permissions & Privacy

### Required Permissions
- **Location:** For current location pin placement
- **Camera:** For taking photos for pins
- **Photo Library:** For selecting existing photos
- **Storage:** For local data and image storage

### Privacy Considerations
- All data stored locally on device
- No data sent to external servers (except ads)
- No user tracking beyond ad analytics
- Clear data deletion option

---

## 💰 Monetization Implementation Plan

### Ad Placement Strategy
1. **Banner Ads:**
   - Bottom of home screen (map list)
   - Bottom of map view screen (non-intrusive)
2. **Interstitial Ads:**
   - After creating 3rd pin (first time)
   - After every 5 pins created thereafter
   - When switching between maps (frequency-limited)

### Subscription Flow
1. User taps "Go Premium" in settings
2. Display subscription options ($1/month or $10/year)
3. Process payment via platform billing
4. Store premium status locally
5. Disable all ads
6. Provide restore purchase option

---

## 📋 Development Phases

### Phase 1: Project Setup & Foundation (Week 1)
- [ ] Initialize React Native project
- [ ] Set up folder structure
- [ ] Configure TypeScript
- [ ] Install core dependencies
- [ ] Set up navigation structure
- [ ] Configure SQLite database
- [ ] Create base theme and styling system

### Phase 2: Core Map Functionality (Week 2-3)
- [ ] Implement map creation flow
- [ ] Build map list home screen
- [ ] Integrate React Native Maps
- [ ] Implement basic pin creation
- [ ] Build pin detail modal
- [ ] Implement local storage for maps and pins

### Phase 3: Advanced Pin Features (Week 3-4)
- [ ] Implement emoji picker
- [ ] Add image upload functionality
- [ ] Build rating system
- [ ] Implement country/state highlighting
- [ ] Add pin clustering
- [ ] Implement search functionality

### Phase 4: Data Management (Week 4)
- [ ] Build export functionality (JSON)
- [ ] Build import/restore functionality
- [ ] Implement data validation
- [ ] Add error handling

### Phase 5: Monetization Integration (Week 5)
- [ ] Integrate Google AdMob
- [ ] Implement banner ads
- [ ] Implement interstitial ads
- [ ] Set up In-App Purchases (iOS)
- [ ] Set up Google Play Billing (Android)
- [ ] Build subscription flow
- [ ] Implement ad removal for premium users

### Phase 6: UI/UX Polish (Week 5-6)
- [ ] Implement onboarding screens
- [ ] Add animations and transitions
- [ ] Implement light/dark mode
- [ ] Add accessibility features
- [ ] Polish all screens
- [ ] Implement stats display

### Phase 7: Testing & Optimization (Week 6-7)
- [ ] Unit testing for core functions
- [ ] Integration testing
- [ ] Performance optimization
- [ ] Memory leak testing
- [ ] Ad placement optimization
- [ ] Subscription flow testing
- [ ] Cross-platform testing (iOS & Android)

### Phase 8: Deployment Preparation (Week 7-8)
- [ ] App store assets creation
- [ ] Privacy policy creation
- [ ] Terms of service creation
- [ ] App store listings
- [ ] Beta testing (TestFlight & Google Play Beta)
- [ ] Final bug fixes
- [ ] Production build
- [ ] App store submission

---

## ❓ Questions & Clarifications Needed

### High Priority
1. **User Accounts:** Document mentions "no user accounts unless subscription based" - should premium users have accounts for cross-device subscription management?
2. **Ad Network:** Client asks for recommendation - Google AdMob is standard, but alternatives include:
   - Facebook Audience Network
   - Unity Ads
   - AppLovin
   - **Recommendation:** Stick with Google AdMob for simplicity and cross-platform support
3. **Rating System:** What scale? (1-5 stars, 1-10, thumbs up/down?)
4. **Dynamic Tagline:** "One (emoji icons/dynamically changing?) at a Time" - should the emoji in tagline change based on context?

### Medium Priority
5. **Pin Limit:** Any limit on pins per map or total pins?
6. **Image Storage:** Max image size/quality? Compression needed?
7. **Map Limit:** Any limit on number of maps a user can create?
8. **Offline Maps:** Should map tiles be cached for offline use?
9. **Social Features:** Any sharing capabilities needed in future?
10. **Analytics:** Beyond ad analytics, should we track user behavior for improvements?

### Low Priority
11. **Localization:** Support for multiple languages?
12. **Backup Reminder:** Should app remind users to export data periodically?
13. **Pin Categories:** Within a map, can pins have sub-categories?

---

## 🎯 Success Metrics

### Technical Metrics
- App launch time < 2 seconds
- Map interaction smooth at 60fps
- Local data operations < 100ms
- App size < 50MB
- Crash-free rate > 99%

### Business Metrics
- Ad impression rate
- Ad click-through rate
- Premium conversion rate (target: 2-5%)
- User retention (Day 1, Day 7, Day 30)
- Average pins per user

---

## 🚀 Project Management Approach

### Development Methodology
- **Agile/Scrum:** 1-week sprints
- **Daily standups:** Progress tracking
- **Weekly demos:** Client review
- **Continuous integration:** Automated testing

### Communication Plan
- Weekly progress reports
- Demo builds for client review
- Immediate notification of blockers
- Decision log for all client clarifications

### Version Control
- Git with feature branch workflow
- Pull request reviews
- Semantic versioning
- Changelog maintenance

### Quality Assurance
- Code reviews for all changes
- Automated testing (unit + integration)
- Manual testing on physical devices
- Beta testing before release

---

## 📊 Risk Assessment

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Map performance with many pins | High | Implement clustering, pagination |
| Local storage limits | Medium | Implement data compression, cleanup |
| Ad integration issues | Medium | Thorough testing, fallback options |
| In-app purchase complexity | High | Use proven libraries, extensive testing |
| Image storage bloat | Medium | Image compression, size limits |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Low ad revenue | Medium | Optimize ad placement, A/B testing |
| Low premium conversion | Medium | Clear value proposition, trial period? |
| App store rejection | High | Follow guidelines strictly, pre-review |
| Competition | Low | Focus on simplicity and UX |

---

## 📝 Deliverables

### Code Deliverables
- Complete React Native source code
- SQLite database schema
- Build configurations (iOS & Android)
- Environment configuration files

### Documentation
- Technical documentation
- API documentation (if any)
- User guide / Help section
- Privacy policy
- Terms of service

### Assets
- App icons (all sizes)
- Splash screens
- App store screenshots
- App store descriptions
- Promotional materials

### Builds
- Development builds
- Staging builds
- Production builds (signed)
- App store submission packages

---

## 🎓 Lessons from Current Apps

Based on conversation history with existing "Places I..." app:
- Use proven React Native architecture
- Implement proper TypeScript typing
- Plan for future React Native upgrades
- Use modular component structure
- Implement proper error handling
- Plan for both iOS and Android from start
- Use consistent naming conventions
- Implement proper state management
- Consider performance from day one

---

## 📅 Estimated Timeline

**Total Duration:** 7-8 weeks

- **Weeks 1-2:** Foundation & Core Features
- **Weeks 3-4:** Advanced Features & Data Management
- **Week 5:** Monetization Integration
- **Weeks 6-7:** Polish, Testing & Optimization
- **Week 8:** Deployment Preparation & Launch

**Note:** Timeline assumes full-time development. Adjust based on team size and availability.

---

## ✅ Next Steps

1. **Client Review:** Get approval on this requirements document
2. **Clarifications:** Address all questions in the "Questions & Clarifications" section
3. **Design Mockups:** Create UI/UX mockups for client approval
4. **Technical Spike:** Test critical components (maps, ads, IAP)
5. **Project Setup:** Initialize repository and development environment
6. **Sprint Planning:** Break down Phase 1 into detailed tasks
7. **Development Start:** Begin Phase 1 implementation

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-21  
**Status:** Awaiting Client Review
