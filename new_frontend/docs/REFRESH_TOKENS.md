# Refresh Token Implementation Guide

## Overview

Refresh tokens are a security best practice for JWT-based authentication systems. They allow users to maintain their session without having to log in repeatedly, while keeping access tokens short-lived for better security.

## How Refresh Tokens Work

### The Problem with Long-Lived Access Tokens

If you only use a single JWT token with a long expiration (e.g., 7 days):
- **Security Risk**: If a token is stolen, the attacker has access for the full 7 days
- **No Revocation**: You can't easily revoke access without checking a database
- **Stale Data**: User permissions might change, but the token still contains old data

### The Solution: Access Tokens + Refresh Tokens

**Access Token** (Short-lived: 15 minutes to 1 hour):
- Used for authenticating API requests
- Contains user information (userId, email, role, isVerified)
- Expires quickly to limit damage if stolen
- Sent with every API request in the `Authorization` header

**Refresh Token** (Long-lived: 7-30 days):
- Used ONLY to obtain new access tokens
- Contains minimal data (userId, optional tokenVersion)
- Stored securely (httpOnly cookie or secure storage)
- Never sent with regular API requests
- Can be revoked if compromised

## Authentication Flow

### 1. Login Flow

```
User → POST /api/auth/login (email, password)
  ↓
Server validates credentials
  ↓
Server generates:
  - Access Token (15 min expiry)
  - Refresh Token (7 days expiry)
  ↓
Client stores:
  - Access Token: localStorage/memory (for API requests)
  - Refresh Token: localStorage/httpOnly cookie (for refreshing)
```

### 2. Making API Requests

```
Client → API Request with Access Token
  ↓
Server verifies Access Token
  ↓
If valid → Process request
If expired → Return 401 Unauthorized
```

### 3. Refreshing Access Token

```
Client detects Access Token expired (401 response)
  ↓
Client → POST /api/auth/refresh (refreshToken)
  ↓
Server verifies Refresh Token
  ↓
Server fetches latest user data from database
  ↓
Server generates new Access Token
  ↓
Client updates stored Access Token
  ↓
Client retries original API request with new token
```

## Implementation Details

### Token Generation

```typescript
// Access Token - Short-lived, contains full user info
const accessToken = generateAccessToken({
  userId: user._id,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified
})

// Refresh Token - Long-lived, contains minimal info
const refreshToken = generateRefreshToken({
  userId: user._id
})
```

### Token Verification

```typescript
// Verify Access Token (for API requests)
const payload = verifyToken(accessToken)
if (!payload) {
  // Token invalid or expired
  return 401
}

// Verify Refresh Token (for refresh endpoint)
const refreshPayload = verifyRefreshToken(refreshToken)
if (!refreshPayload) {
  // Refresh token invalid or expired
  return 401
}
```

## Security Best Practices

### 1. **Separate Secrets**
- Use different secrets for access and refresh tokens
- Set `REFRESH_TOKEN_SECRET` environment variable
- If not set, defaults to `JWT_SECRET + "-refresh"`

### 2. **Token Storage**
- **Access Token**: Can be stored in memory or localStorage (short-lived anyway)
- **Refresh Token**: Should be stored in httpOnly cookie (prevents XSS attacks)
  - Or use secure storage with encryption
  - Never expose in client-side JavaScript if possible

### 3. **Token Rotation (Optional)**
- When refreshing, generate a NEW refresh token
- Invalidate the old refresh token
- This limits damage if a refresh token is stolen
- Implement by storing `tokenVersion` in database

### 4. **Revocation**
- Store refresh tokens in database for revocation
- When user logs out or changes password, invalidate all refresh tokens
- Check token validity against database on refresh

### 5. **HTTPS Only**
- Always use HTTPS in production
- Prevents token interception during transmission

## Environment Variables

Add these to your `.env` file:

```env
# JWT Secrets
JWT_SECRET=your-super-secret-key-change-in-production
REFRESH_TOKEN_SECRET=your-refresh-token-secret-different-from-jwt-secret

# Token Expiration Times
ACCESS_TOKEN_EXPIRES_IN=15m    # 15 minutes, 1h, 24h, etc.
REFRESH_TOKEN_EXPIRES_IN=7d    # 7 days, 30d, etc.
```

## Client-Side Implementation

### Storing Tokens

```typescript
// After login
localStorage.setItem('accessToken', data.accessToken)
localStorage.setItem('refreshToken', data.refreshToken)
```

### Making Authenticated Requests

```typescript
async function apiRequest(url: string, options: RequestInit = {}) {
  let accessToken = localStorage.getItem('accessToken')
  
  // Add token to request
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`
  }
  
  let response = await fetch(url, { ...options, headers })
  
  // If token expired, refresh it
  if (response.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      // Retry request with new token
      headers['Authorization'] = `Bearer ${newToken}`
      response = await fetch(url, { ...options, headers })
    }
  }
  
  return response
}
```

### Refreshing Access Token

```typescript
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    // Redirect to login
    window.location.href = '/login'
    return null
  }
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
    
    if (!response.ok) {
      // Refresh token expired, redirect to login
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return null
    }
    
    const data = await response.json()
    localStorage.setItem('accessToken', data.accessToken)
    
    // If using token rotation, update refresh token too
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken)
    }
    
    return data.accessToken
  } catch (error) {
    console.error('Failed to refresh token:', error)
    return null
  }
}
```

## API Endpoints

### POST /api/auth/login
Returns both access and refresh tokens on successful login.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Backward compatibility
  "user": {
    "_id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "patient",
    "isVerified": true
  }
}
```

### POST /api/auth/refresh
Exchanges a refresh token for a new access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "patient",
    "isVerified": true
  }
}
```

## Benefits

1. **Better Security**: Short-lived access tokens limit exposure if stolen
2. **Better UX**: Users don't need to log in frequently
3. **Revocation**: Can invalidate refresh tokens when needed
4. **Fresh Data**: User data is fetched from database on each refresh
5. **Scalability**: Stateless tokens reduce database lookups

## Migration from Single Token

If you're migrating from a single token system:

1. Update login endpoint to return both tokens (✅ Done)
2. Update client to store both tokens
3. Update client to handle token refresh on 401 errors
4. Gradually reduce access token expiration time
5. Remove old `token` field once all clients are updated

The current implementation maintains backward compatibility by still returning `token` field (which is the access token).
