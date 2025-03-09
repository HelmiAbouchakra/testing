# Laravel Backend Authentication System for Angular 19 with HttpOnly Cookies and Social Login

## 1. Laravel API Backend Setup

- Set up Laravel as an API-only backend
- Configure Laravel for cookie-based authentication with Sanctum
- Structure API routes with proper versioning (e.g., `/api/v1/auth/*`)
- Set up proper environment configuration for different domains

## 2. HttpOnly Cookie Authentication with Sanctum

- Configure Laravel Sanctum for cookie-based authentication:
  - Enable `stateful` domains in Sanctum configuration
  - Configure cookie settings (lifetime, path, domain)
  - Set `HttpOnly`, `Secure`, and `SameSite` attributes for cookies
- Create authentication endpoints:
  - Login endpoint that sets HttpOnly cookies
  - Logout endpoint that invalidates the session
- Configure session configuration for API usage

## 3. Social Authentication Integration

### Setup and Configuration
- Install Laravel Socialite package
- Register and configure OAuth applications:
  - Google Developer Console setup
  - Facebook Developer Portal setup
- Configure Socialite in `config/services.php` with proper credentials
- Set up secure storage of OAuth secrets in environment variables

### Backend Implementation
- Create OAuth routes for redirect and callback:
  - `/api/auth/google/redirect`
  - `/api/auth/google/callback`
  - `/api/auth/facebook/redirect`
  - `/api/auth/facebook/callback`
- Implement user retrieval/creation from OAuth data
- Handle user account linking (same email with different providers)
- Store OAuth provider and provider user ID in database
- Create unique user identifier strategy

### Session Handling for Social Authentication
- Set up HTTP-only cookies after successful social login
- Handle CSRF protection during OAuth flow
- Implement session regeneration after social authentication
- Create proper error handling for OAuth failures

### User Profile Data
- Determine which social profile data to store:
  - Name, email, profile picture
  - OAuth tokens (if needed for API access)
- Create database schema for social authentication data
- Implement profile completion flow for missing required data

## 4. Angular Integration for Social Login

- Create authentication service in Angular for social login
- Implement the OAuth redirect flow:
  - Initialize OAuth process from Angular
  - Handle redirect to provider
  - Process return to application
- Design JWT or cookie handling after OAuth completion
- Implement loading states during authentication
- Create error handling for failed social logins
- Design user experience for account linking

## 5. CSRF Protection with Cookie Authentication

- Enable Laravel's CSRF protection for stateful API calls
- Configure CSRF cookie settings
- Create endpoint to issue CSRF tokens
- Set up middleware to verify CSRF tokens on state-changing requests
- Ensure Angular sends the CSRF token with each request

## 6. User Registration and Email Verification

- Create registration API endpoint
- Implement email verification flow:
  - Generate verification tokens and store in database
  - Send verification emails with secure verification links
  - Create verification confirmation endpoint
- Add API route to check verification status
- Implement re-sending verification emails
- Handle verification for social login users (possibly skip for verified emails)

## 7. Cross-Origin Resource Sharing (CORS)

- Configure Laravel CORS middleware to work with cookie-based auth:
  - Set `Access-Control-Allow-Origin` to your Angular domain (not wildcard)
  - Enable `Access-Control-Allow-Credentials: true`
  - Configure `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers`
- Test CORS with cookies across different environments
- Ensure OAuth redirects work properly with CORS settings

## 8. Cookie Security Configuration

- Configure secure cookie settings in Laravel:
  - Set `session.secure` to `true` in production (HTTPS only)
  - Configure `session.domain` correctly for your domains
  - Set appropriate `SameSite` policy (typically 'Lax' for OAuth compatibility)
  - Configure session lifetime and rotation
- Implement session regeneration after authentication
- Test cookie behavior in various browsers

## 9. Password Management (for Email/Password Users)

- Create secure password reset flow with cookie authentication
- Implement password change functionality for authenticated users
- Add strong password validation rules
- Consider implementing password breach checks
- Handle account linking between social and password-based accounts

## 10. Multi-Factor Authentication (MFA)

- Design MFA flow that works with HttpOnly cookies:
  - MFA setup and QR code generation
  - MFA verification with session validation
  - Recovery codes management
- Create session enhancement after MFA verification
- Implement re-authentication for sensitive operations
- Consider how MFA interacts with social login

## 11. Rate Limiting & Security

- Apply rate limiting to all authentication endpoints
- Implement account lockout mechanism after failed attempts
- Create IP-based blocking for suspicious activities
- Configure proper session timeout policies
- Add notifications for important security events
- Add specific rate limiting for social authentication attempts

## 12. Testing & Monitoring

- Create comprehensive API tests for all authentication methods
- Set up monitoring for authentication events:
  - Failed login attempts (both password and social)
  - OAuth errors and failures
  - Password reset requests
  - Session creation/destruction
  - Cookie validation failures
- Implement security audit logs

## 13. Security Headers & Best Practices

- Set secure headers for all API responses
- Implement automatic session timeout
- Add mechanisms to detect suspicious activity patterns
- Create account recovery procedures
- Implement proper OAuth error handling

## 14. Production Deployment Considerations

- Configure domain settings for production:
  - Ensure main domain and API domain compatibility for cookies
  - Set up proper SSL/TLS for all domains
  - Configure cookie domains correctly
  - Set up OAuth callback URLs for production
- Implement proper session driver (Redis recommended)
- Set up load balancing considerations for sessions
- Create deployment checklist for security settings

## Implementation Checklist

- [ ] Laravel API project setup with Sanctum cookie authentication
- [ ] Socialite integration with Google and Facebook
- [ ] User model and database setup for social authentication
- [ ] OAuth routes and controllers
- [ ] Angular integration for social login
- [ ] CSRF protection implementation
- [ ] Email verification flow
- [ ] CORS configuration for cookie-based auth
- [ ] Secure cookie settings
- [ ] Password management endpoints
- [ ] MFA implementation
- [ ] Rate limiting and security measures
- [ ] Authentication logging and monitoring
- [ ] Security headers and best practices
- [ ] Production deployment configuration