# Authentication Flow - Login & Signup

## Overview

Complete authentication flow with separate login and signup pages, matching the Disco theme.

## 🔐 User Flow

```
┌─────────────┐
│   Start     │
└──────┬──────┘
       │
       v
┌─────────────┐    Sign up    ┌──────────────┐
│ Login Page  │──────────────>│ Signup Page  │
│ (index.tsx) │               │ (signup.tsx) │
└──────┬──────┘               └──────┬───────┘
       │                             │
       │ Log in                      │ Sign up
       │                             │
       v                             v
┌──────────────────────────────────────┐
│         Home Dashboard               │
│         (tabs)/index.tsx             │
└──────────────────────────────────────┘
       │
       │ Logout
       v
┌─────────────┐
│ Login Page  │
└─────────────┘
```

## 📁 File Structure

### Authentication Pages:
- `app/index.tsx` - **Login page** (entry point)
- `app/signup.tsx` - **Signup page**

### Routing:
- `app/_layout.tsx` - Updated with both auth routes

## 🎨 Login Page

**File:** `app/index.tsx`

### Features:
- ✅ DISCO logo header
- ✅ Email input
- ✅ Password input
- ✅ "Log In" button with loading state
- ✅ Error message display
- ✅ Auto-redirect if already logged in
- ✅ Form validation
- ✅ Divider with "OR"
- ✅ "Sign up" link to navigate to signup page

### Fields:
- Email (with keyboard type)
- Password (secure entry)

### Styling:
- Background: `#050505` (black)
- Card: `#F9FAFB` (white)
- Primary button: `#4C1D95` (purple)
- Logo: Purple with letter-spacing
- Same rounded corners and spacing as signup

### User Journey:
1. User opens app → sees login page
2. Can enter email/password and login
3. OR click "Sign up" to create account
4. If already logged in → auto-redirects to home

## 📝 Signup Page

**File:** `app/signup.tsx`

### Features:
- ✅ DISCO logo header
- ✅ Name input
- ✅ Username input
- ✅ Email input
- ✅ Password input
- ✅ "Sign Up" button with loading state
- ✅ Error message display
- ✅ Auto-redirect if already logged in
- ✅ Form validation
- ✅ Divider with "OR"
- ✅ "Log in" link to go back to login page

### Fields:
- Name
- Username
- Email
- Password

### Navigation:
- "Already have an account? Log in" → Goes back to login page

## 🔌 API Integration

Both pages use the existing `authApi` from `lib/api.ts`:

### Login:
```typescript
const { user } = await authApi.login(email, password);
// Stores user and token in AsyncStorage
// Navigates to /(tabs)
```

### Signup:
```typescript
const { user } = await authApi.signup(name, username, email, password);
// Stores user and token in AsyncStorage
// Navigates to /(tabs)
```

### Logout:
```typescript
await authApi.logout();
// Clears AsyncStorage
// Navigates to / (login page)
```

## 🎯 Behavior

### Auto-Login:
Both login and signup pages check for existing user on mount:
- If user exists in AsyncStorage → auto-redirect to home
- If no user → show login/signup form

### Form Validation:
- All fields required
- Button disabled until all fields filled
- Error messages displayed below form
- Loading state during submission

### Navigation:
- Login → Signup: `router.push('/signup')`
- Signup → Login: `router.back()` or `router.push('/')`
- Success → Home: `router.replace('/(tabs)')`
- Logout → Login: `router.replace('/')`

## 🎨 Consistent Styling

Both pages share the same design language:

### Shared Elements:
- Dark background: `#050505`
- White card: `#F9FAFB`
- Purple branding: `#4C1D95`
- Rounded card: 16px radius
- Max width: 420px
- Centered layout
- DISCO logo at top

### Differences:
- Login: 2 fields (email, password)
- Signup: 4 fields (name, username, email, password)

## 🧪 Testing

### Test Login Flow:
```
1. Open app → see login page
2. Click "Sign up" → navigate to signup
3. Fill form and sign up → redirect to home
4. Logout → back to login page
5. Enter credentials → login → redirect to home
```

### Test Auto-Login:
```
1. Login/signup once
2. Close app
3. Reopen app → should auto-login to home
4. No need to enter credentials again
```

### Test Validation:
```
1. Try submitting empty form → see error
2. Fill partial form → button disabled
3. Fill all fields → button enabled
4. Submit → see loading state
```

## 📱 Responsive Design

Both pages work perfectly on:
- ✅ Mobile (iOS/Android)
- ✅ Tablet
- ✅ Desktop web
- ✅ Different screen sizes

Card is responsive with:
- Width: 85% of screen
- Max width: 420px
- Centered vertically and horizontally

## 🔒 Security Features

- ✅ Password fields use `secureTextEntry`
- ✅ Email validation (keyboard type)
- ✅ Token stored securely in AsyncStorage
- ✅ Auto-logout on 401 errors (handled in api.ts)
- ✅ Form validation prevents empty submissions

## 📝 Backend Integration Notes

Both pages use mock authentication. When backend is ready:

### Update in `lib/api.ts`:

```typescript
// Current (mock):
login: async (email: string, password: string) => {
  // Mock implementation
  const mockUser = { ... };
  return { user: mockUser, token: 'mock-token' };
}

// With backend:
login: async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  const { user, token } = response.data;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  await AsyncStorage.setItem(STORAGE_TOKEN_KEY, token);
  return { user, token };
}
```

Same pattern for signup endpoint.

## ✨ Features Summary

### Login Page (index.tsx):
- ✅ Email and password fields
- ✅ "Log In" button
- ✅ "Sign up" link
- ✅ Auto-login check
- ✅ Error handling
- ✅ Loading states

### Signup Page (signup.tsx):
- ✅ Name, username, email, password fields
- ✅ "Sign Up" button
- ✅ "Log in" link
- ✅ Auto-login check
- ✅ Error handling
- ✅ Loading states

### Both Pages:
- ✅ DISCO logo branding
- ✅ Matching theme and colors
- ✅ Responsive design
- ✅ Form validation
- ✅ TypeScript types
- ✅ No linting errors

---

**Status:** ✅ Complete - Ready to Use

**Test It:** Open the app and you'll see the login page first!

