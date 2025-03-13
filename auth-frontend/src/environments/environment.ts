export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api',
  oauthRedirectUrl: 'http://localhost:4200/auth/callback',
  socialAuth: {
    google: {
      redirectUrl: 'http://localhost:8000/api/v1/auth/google/redirect',
      callbackUrl: 'http://localhost:4200/auth/social-callback'
    },
    facebook: {
      redirectUrl: 'http://localhost:8000/api/v1/auth/facebook/redirect',
      callbackUrl: 'http://localhost:4200/auth/social-callback'
    }
  }
};
