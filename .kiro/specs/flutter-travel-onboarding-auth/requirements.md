# Requirements Document

## Introduction

This document specifies the requirements for a Flutter travel guide app featuring a three-screen onboarding flow with custom swipe-to-unlock interaction and a unified login/register authentication screen. The app uses glassmorphism design, nature-themed imagery, and smooth animations to create an immersive user experience.

## Glossary

- **Onboarding_System**: The three-screen PageView flow that introduces users to the app
- **Swipe_To_Unlock_Widget**: Custom draggable interaction component on the final onboarding screen
- **Auth_Screen**: The unified login/register screen with tab switching
- **Glassmorphism_Card**: UI component with frosted glass effect (backdrop blur + semi-transparent background)
- **Design_Token**: Predefined color, spacing, or typography value used consistently across the app
- **PageView**: Flutter widget that enables horizontal swipeable pages
- **Tween**: Animation interpolation between two values
- **CurvedAnimation**: Animation with easing curve applied

## Requirements

### Requirement 1: Onboarding Screen Layout

**User Story:** As a new user, I want to see visually appealing onboarding screens with nature imagery, so that I understand the app's purpose and feel engaged.

#### Acceptance Criteria

1. THE Onboarding_System SHALL display exactly three screens in a horizontal PageView
2. WHEN the app launches for the first time, THE Onboarding_System SHALL display screen 1 as the initial view
3. THE Onboarding_System SHALL use assets/forest.jpg as the full-screen background image
4. THE Onboarding_System SHALL apply a LinearGradient overlay from transparent at the top to semi-dark at the bottom
5. THE Onboarding_System SHALL layer SVG-style tree silhouettes at the bottom of each screen for visual depth
6. THE Onboarding_System SHALL display dot indicators at the bottom showing current screen position (3 dots total)
7. WHEN a user swipes horizontally, THE Onboarding_System SHALL transition between screens with smooth animation

### Requirement 2: Onboarding Screen 1 Content

**User Story:** As a new user, I want to see the app's tagline and headline on the first screen, so that I understand the core value proposition.

#### Acceptance Criteria

1. THE Onboarding_System SHALL display the tag "KEŞİF ZAMANI" in lime green color (#A8E063) at the top of screen 1
2. THE Onboarding_System SHALL render the tag text in bold serif font (Playfair Display)
3. THE Onboarding_System SHALL display the headline "Doğanın İçine Gir" in large serif font below the tag
4. THE Onboarding_System SHALL display muted subtitle text below the headline with 55% white opacity
5. THE Onboarding_System SHALL render headline text in white color (#FFFFFF)

### Requirement 3: Onboarding Screen 2 Content

**User Story:** As a new user, I want to see visual icons representing app features, so that I understand what functionality is available.

#### Acceptance Criteria

1. THE Onboarding_System SHALL display three circular glassmorphism icons in a horizontal row on screen 2
2. THE Onboarding_System SHALL render each icon with white 15% opacity background and backdrop blur effect
3. THE Onboarding_System SHALL display icons representing: route planning, map viewing, and exploration
4. THE Onboarding_System SHALL apply sigmaX and sigmaY values of 16 to the backdrop blur filter
5. THE Onboarding_System SHALL maintain the same background, gradient, and tree silhouettes as screen 1

### Requirement 4: Onboarding Screen 3 Swipe Interaction

**User Story:** As a new user, I want to swipe up a button to proceed to login, so that I have an engaging way to complete onboarding.

#### Acceptance Criteria

1. THE Onboarding_System SHALL display the headline "Rotanı Oluştur, Yola Çık." on screen 3
2. THE Onboarding_System SHALL render a Swipe_To_Unlock_Widget at the bottom center of screen 3
3. THE Swipe_To_Unlock_Widget SHALL have a pill-shaped track with frosted glass appearance (white 15% opacity + blur)
4. THE Swipe_To_Unlock_Widget SHALL contain a draggable thumb button styled as a lime green circle (#A8E063)
5. THE Swipe_To_Unlock_Widget SHALL display an arrow icon inside the thumb button
6. THE Swipe_To_Unlock_Widget SHALL display "G O" label text that fades as the thumb moves right
7. WHEN the thumb is dragged beyond 85% of the track width, THE Swipe_To_Unlock_Widget SHALL trigger navigation to the Auth_Screen
8. WHEN the thumb is released before reaching 85%, THE Swipe_To_Unlock_Widget SHALL animate the thumb back to the starting position
9. THE Swipe_To_Unlock_Widget SHALL use Curves.easeInOutCubic for all animations

### Requirement 5: Authentication Screen Layout

**User Story:** As a user, I want to see a unified login/register screen with clear visual separation, so that I can easily switch between authentication modes.

#### Acceptance Criteria

1. THE Auth_Screen SHALL allocate the top 55% of screen height to the forest background image with tree silhouettes
2. THE Auth_Screen SHALL allocate the bottom 45% of screen height to a Glassmorphism_Card
3. THE Glassmorphism_Card SHALL have white 12% opacity background
4. THE Glassmorphism_Card SHALL apply backdrop blur with sigmaX and sigmaY values of 20
5. THE Glassmorphism_Card SHALL have top rounded corners with 24px radius
6. THE Glassmorphism_Card SHALL have bottom corners with 0px radius (square)

### Requirement 6: Authentication Tab Switcher

**User Story:** As a user, I want to toggle between login and register modes, so that I can access the appropriate form without navigating to a different screen.

#### Acceptance Criteria

1. THE Auth_Screen SHALL display a tab switcher inside the Glassmorphism_Card at the top
2. THE Auth_Screen SHALL render two tabs labeled "Giriş Yap" and "Kayıt Ol"
3. THE Auth_Screen SHALL style the tab switcher as a pill-shaped toggle
4. WHEN a user taps a tab, THE Auth_Screen SHALL switch to the corresponding form (login or register)
5. THE Auth_Screen SHALL highlight the active tab with lime green background (#A8E063)
6. THE Auth_Screen SHALL animate the tab transition using Tween and CurvedAnimation with Curves.easeInOutCubic

### Requirement 7: Authentication Form Fields

**User Story:** As a user, I want to enter my credentials in clearly labeled fields, so that I can authenticate successfully.

#### Acceptance Criteria

1. THE Auth_Screen SHALL display email and password input fields in both login and register modes
2. THE Auth_Screen SHALL style input fields with semi-transparent background and subtle white border
3. THE Auth_Screen SHALL display "Şifremi unuttum" link in lime green (#A8E063) aligned to the right below password field in login mode
4. WHEN in register mode, THE Auth_Screen SHALL display an additional full name input field above email
5. THE Auth_Screen SHALL use DM Sans font for all input field text
6. THE Auth_Screen SHALL display placeholder text in muted white color (rgba(255,255,255,0.55))

### Requirement 8: Authentication Primary Action

**User Story:** As a user, I want a prominent button to submit my credentials, so that I can complete the authentication process.

#### Acceptance Criteria

1. THE Auth_Screen SHALL display a primary CTA button below the input fields
2. THE Auth_Screen SHALL render the button with solid lime green background (#A8E063)
3. THE Auth_Screen SHALL display dark text on the button for contrast
4. THE Auth_Screen SHALL make the button full width within the Glassmorphism_Card
5. WHEN in login mode, THE Auth_Screen SHALL label the button "Giriş Yap"
6. WHEN in register mode, THE Auth_Screen SHALL label the button "Kayıt Ol"
7. WHEN the button is tapped, THE Auth_Screen SHALL trigger the appropriate authentication action

### Requirement 9: Social Authentication

**User Story:** As a user, I want to sign in with Google, so that I can authenticate without creating a new password.

#### Acceptance Criteria

1. THE Auth_Screen SHALL display a divider with text "ya da" below the primary CTA button
2. THE Auth_Screen SHALL display a Google Sign-In button below the divider
3. THE Auth_Screen SHALL style the Google button with outlined frosted glass appearance
4. THE Auth_Screen SHALL display the Google "G" icon on the left side of the button
5. WHEN the Google button is tapped, THE Auth_Screen SHALL initiate Google OAuth flow
6. THE Auth_Screen SHALL apply backdrop blur effect to the Google button

### Requirement 10: Design Token System

**User Story:** As a developer, I want consistent design tokens defined, so that the UI maintains visual consistency.

#### Acceptance Criteria

1. THE App SHALL define primary accent color as #A8E063 (lime green)
2. THE App SHALL define background dark gradient from #0A1A0A to #2D4A1F
3. THE App SHALL define text primary color as #FFFFFF
4. THE App SHALL define text muted color as rgba(255,255,255,0.55)
5. THE App SHALL use Playfair Display font for all heading text
6. THE App SHALL use DM Sans font for all body text
7. THE App SHALL apply sigmaX and sigmaY values of 16 to all glassmorphism overlays
8. THE App SHALL use Curves.easeInOutCubic for all Tween and CurvedAnimation instances

### Requirement 11: Navigation Flow

**User Story:** As a user, I want seamless navigation between onboarding and authentication, so that I have a smooth first-time experience.

#### Acceptance Criteria

1. WHEN the app launches for the first time, THE App SHALL display the Onboarding_System
2. WHEN the Swipe_To_Unlock_Widget completes on screen 3, THE App SHALL navigate to the Auth_Screen
3. WHEN navigation occurs, THE App SHALL use a smooth transition animation
4. THE App SHALL not allow back navigation from Auth_Screen to Onboarding_System after swipe completion
5. WHEN authentication succeeds, THE App SHALL navigate to the main app home screen

### Requirement 12: Asset Management

**User Story:** As a developer, I want all required assets properly referenced, so that the app displays correctly.

#### Acceptance Criteria

1. THE App SHALL load assets/forest.jpg for background imagery
2. THE App SHALL render tree silhouette SVG graphics at the bottom of onboarding screens
3. THE App SHALL load Playfair Display font from assets or package dependencies
4. THE App SHALL load DM Sans font from assets or package dependencies
5. WHEN an asset fails to load, THE App SHALL display a fallback color or placeholder
