import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  AuthState,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from '../models/auth.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: false,
    requiresMfa: false,
    error: null,
  });

  authState$ = this.authStateSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initialize auth state
    this.checkAuthState();

    // Fetch CSRF token (no need to chain these operations)
    this.fetchCsrfToken().subscribe({
      error: () => {
        console.error('Failed to fetch CSRF token');
        this.authStateSubject.next({
          isAuthenticated: false,
          user: null,
          loading: false,
          requiresMfa: false,
          error: 'Failed to establish secure session',
        });
      },
    });
  }

  /**
   * Fetch CSRF token for Sanctum authentication
   */
  private fetchCsrfToken(): Observable<any> {
    // Fix the URL path handling for proper CSRF cookie fetching
    const baseUrl = this.apiUrl.split('/api')[0]; // Get the base URL without /api
    console.log('Fetching CSRF token from:', `${baseUrl}/sanctum/csrf-cookie`);

    return this.http
      .get(`${baseUrl}/sanctum/csrf-cookie`, {
        withCredentials: true,
      })
      .pipe(
        tap(() => console.log('CSRF token fetch successful')),
        catchError((error: any) => {
          console.error('CSRF token fetch failed:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Check if the user is already authenticated on app initialization
   */
  checkAuthState(): void {
    // If we're already loading, don't start another check
    if (this.authStateSubject.value.loading) {
      return;
    }

    // For newly registered users on verification page, set a temporary auth state
    // to prevent redirects and error messages
    if (
      localStorage.getItem('just_registered') === 'true' &&
      window.location.pathname.includes('/verify-email')
    ) {
      console.log(
        'Setting temporary auth state for newly registered user on verification page'
      );

      // Create a temporary auth state that prevents redirects
      const email = localStorage.getItem('registered_email') || '';

      this.authStateSubject.next({
        isAuthenticated: true, // Pretend user is authenticated to prevent redirects
        user: { email: email, name: '', id: 0 }, // Minimal user object
        loading: false,
        requiresMfa: false,
        error: null,
      });

      return; // Skip the actual API call
    }

    this.setLoading(true);
    console.log(
      'Checking authentication state with URL:',
      `${this.apiUrl}/v1/auth/user`
    );

    this.http
      .get<User>(`${this.apiUrl}/v1/auth/user`, {
        withCredentials: true,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      .pipe(
        tap((user) => {
          console.log('Auth check successful, user authenticated:', user);
          console.log('User role from backend:', user.role);
          this.authStateSubject.next({
            isAuthenticated: true,
            user,
            loading: false,
            requiresMfa: false,
            error: null,
          });
        }),
        catchError((error) => {
          // Don't swallow the error, just update the state
          console.log('Auth check failed, user not authenticated:', error);
          this.authStateSubject.next({
            isAuthenticated: false,
            user: null,
            loading: false,
            requiresMfa: false,
            error: null,
          });
          // Return an observable that won't throw in the subscribe
          return throwError(() => error);
        })
      )
      .subscribe({
        // Handle errors explicitly in the subscribe
        error: (err) => {
          // Auth check failed, but we've already updated the state
          console.log('Auth check error in subscribe handler:', err);
        },
      });
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.setLoading(true);
    console.log('Attempting login with URL:', `${this.apiUrl}/v1/auth/login`);

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/v1/auth/login`, credentials, {
        withCredentials: true,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
      })
      .pipe(
        tap((response) => {
          console.log('Login response:', response);
          console.log('User data from login:', response.user);
          console.log('User role from login:', response.user?.role);
          if (response.requires_mfa) {
            this.authStateSubject.next({
              ...this.authStateSubject.value,
              requiresMfa: true,
              loading: false,
            });
          } else if (response.user) {
            this.authStateSubject.next({
              isAuthenticated: true,
              user: response.user,
              loading: false,
              requiresMfa: false,
              error: null,
            });
          }
        }),
        catchError((error) => {
          console.error('Login error:', error);
          this.authStateSubject.next({
            ...this.authStateSubject.value,
            loading: false,
            error: error.error?.message || 'Login failed',
          });
          return throwError(() => error);
        })
      );
  }

  /**
   * Register a new user
   */
  register(userData: RegisterRequest): Observable<AuthResponse> {
    this.setLoading(true);
    console.log(
      'Attempting registration with URL:',
      `${this.apiUrl}/v1/auth/register`
    );

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/v1/auth/register`, userData, {
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          console.log('Registration response:', response);
          if (response.user) {
            this.authStateSubject.next({
              isAuthenticated: true,
              user: response.user,
              loading: false,
              requiresMfa: false,
              error: null,
            });
            localStorage.setItem('just_registered', 'true');
          }
        }),
        catchError((error) => {
          console.error('Registration error:', error);
          let errorMessage = 'Registration failed';
          if (error.error) {
            if (error.error.errors) {
              // Extract validation errors
              errorMessage = Object.values(error.error.errors).join(' ');
            } else if (error.error.message) {
              errorMessage = error.error.message;
            }
          }
          this.authStateSubject.next({
            ...this.authStateSubject.value,
            loading: false,
            error: errorMessage,
          });
          return throwError(() => error);
        })
      );
  }

  /**
   * Logout the current user
   */
  logout(): Observable<any> {
    console.log('Attempting logout with URL:', `${this.apiUrl}/v1/auth/logout`);

    return this.http
      .post(`${this.apiUrl}/v1/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          console.log('Logout successful');
          this.authStateSubject.next({
            isAuthenticated: false,
            user: null,
            loading: false,
            requiresMfa: false,
            error: null,
          });
        }),
        catchError((error) => {
          console.error('Logout error:', error);
          // Even if the server logout fails, clear the local state
          this.authStateSubject.next({
            isAuthenticated: false,
            user: null,
            loading: false,
            requiresMfa: false,
            error: null,
          });
          return throwError(() => error);
        })
      );
  }

  /**
   * Request a password reset link
   */
  forgotPassword(data: ForgotPasswordRequest): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/v1/auth/forgot-password`, data, {
        withCredentials: true,
      })
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Reset password with token
   */
  resetPassword(data: ResetPasswordRequest): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/v1/auth/reset-password`, data, {
        withCredentials: true,
      })
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Resend email verification
   */
  resendVerificationEmail(): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}/v1/auth/email/verification-notification`,
        {},
        { withCredentials: true }
      )
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Send verification email for a newly registered user
   * This is a special case that doesn't require authentication
   */
  sendVerificationEmailForNewUser(email: string): Observable<any> {
    // Use a special endpoint that doesn't require authentication
    return this.http
      .post(
        `${this.apiUrl}/v1/auth/send-verification-email`,
        { email },
        {
          withCredentials: true,
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
          },
        }
      )
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Verify email with code for a newly registered user
   * This is a special case that doesn't require authentication
   */
  verifyEmailForNewUser(email: string, code: string): Observable<any> {
    // Add logging to debug the verification process
    console.log(`Verifying email for new user. Email: ${email}, Code: ${code}`);

    // Use a special endpoint that doesn't require authentication
    return this.http
      .post(
        `${this.apiUrl}/v1/auth/verify-new-user-email`,
        {
          email: email,
          code: code,
        },
        {
          withCredentials: true,
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
          },
        }
      )
      .pipe(
        tap((response) => {
          console.log('Verification response:', response);
        }),
        catchError((error) => {
          console.error('Email verification error details:', error);

          // Check if a new code was provided in the error response and extract it
          let newCode = null;
          if (error.error) {
            if (error.error.debug_code) {
              newCode = error.error.debug_code;
            } else if (error.error.new_code) {
              newCode = error.error.new_code;
            } else if (
              typeof error.error === 'string' &&
              error.error.includes('debug_code')
            ) {
              // Try to parse the error message if it's a string containing the code
              try {
                const match = error.error.match(
                  /debug_code['":\s]+([0-9]{6})/i
                );
                if (match && match[1]) {
                  newCode = match[1];
                }
              } catch (e) {
                console.error('Failed to parse error message for code', e);
              }
            }
          }

          // If we found a new code, add it to the error object so the component can use it
          if (newCode) {
            console.log(
              'New verification code extracted from error response:',
              newCode
            );

            // Add the new code to the error object for the component to use
            error.extractedNewCode = newCode;

            // Also store it in localStorage as a fallback
            localStorage.setItem('debug_verification_code', newCode);
          }

          return throwError(() => error);
        })
      );
  }

  /**
   * Verify email with link clicked from email
   */
  verifyEmailWithLink(id: string, hash: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/v1/auth/email/verify/${id}/${hash}`, {
        withCredentials: true,
      })
      .pipe(
        tap(() => {
          // Update the user state to reflect verified email
          this.getCurrentUser().subscribe();
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Verify email with code
   */
  verifyEmailWithCode(code: string): Observable<any> {
    return this.http
      .post(
        `${this.apiUrl}/v1/auth/email/verify`,
        { code },
        { withCredentials: true }
      )
      .pipe(
        tap(() => {
          // Update the user state to reflect verified email
          this.getCurrentUser().subscribe();
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): Observable<User> {
    return this.http
      .get<User>(`${this.apiUrl}/v1/auth/user`, { withCredentials: true })
      .pipe(
        tap((user) => {
          this.authStateSubject.next({
            ...this.authStateSubject.value,
            user,
            isAuthenticated: true,
          });
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Validate an email globally using Abstract API
   */
  validateEmail(email: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/v1/auth/validate-email`,
      { email },
      {
        withCredentials: true,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
      }
    );
  }

  /**
   * Check the current user's role directly from the backend
   */
  checkRole(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/v1/auth/check-role`, {
      withCredentials: true,
    }).pipe(
      tap((response) => {
        console.log('Role check response:', response);
      }),
      catchError((error) => {
        console.error('Error checking role:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Helper method to update loading state
   */
  private setLoading(loading: boolean): void {
    this.authStateSubject.next({
      ...this.authStateSubject.value,
      loading,
    });
  }

  /**
   * Update the authentication state
   */
  setAuthState(authState: AuthState): void {
    console.log('Setting auth state:', authState);
    this.authStateSubject.next(authState);
  }

  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  /**
   * Check if MFA is required
   */
  isMfaRequired(): boolean {
    return this.authStateSubject.value.requiresMfa;
  }

  /**
   * Update MFA status in auth state
   */
  updateMfaStatus(requiresMfa: boolean): void {
    this.authStateSubject.next({
      ...this.authStateSubject.value,
      requiresMfa,
    });
  }

  /**
   * Initiate social login with Google
   */
  loginWithGoogle(): void {
    // Use the configured URL from environment
    window.location.href = environment.socialAuth.google.redirectUrl;
  }

  /**
   * Initiate social login with Facebook
   */
  loginWithFacebook(): void {
    // Use the configured URL from environment
    window.location.href = environment.socialAuth.facebook.redirectUrl;
  }
}
