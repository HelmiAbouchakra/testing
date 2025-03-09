import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { 
  AuthResponse, 
  AuthState, 
  LoginRequest, 
  RegisterRequest, 
  ForgotPasswordRequest, 
  ResetPasswordRequest,
  VerifyEmailRequest
} from '../models/auth.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: false,
    requiresMfa: false,
    error: null
  });

  authState$ = this.authStateSubject.asObservable();

  constructor(private http: HttpClient) {
    this.checkAuthState();
  }

  /**
   * Check if the user is already authenticated on app initialization
   */
  checkAuthState(): void {
    this.setLoading(true);
    this.http.get<User>(`${this.apiUrl}/auth/user`, { withCredentials: true })
      .pipe(
        tap(user => {
          this.authStateSubject.next({
            isAuthenticated: true,
            user,
            loading: false,
            requiresMfa: false,
            error: null
          });
        }),
        catchError(error => {
          this.authStateSubject.next({
            isAuthenticated: false,
            user: null,
            loading: false,
            requiresMfa: false,
            error: null
          });
          return throwError(() => error);
        })
      )
      .subscribe();
  }

  /**
   * Login with email and password
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.setLoading(true);
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, credentials, { withCredentials: true })
      .pipe(
        tap(response => {
          if (response.requires_mfa) {
            this.authStateSubject.next({
              ...this.authStateSubject.value,
              requiresMfa: true,
              loading: false
            });
          } else if (response.user) {
            this.authStateSubject.next({
              isAuthenticated: true,
              user: response.user,
              loading: false,
              requiresMfa: false,
              error: null
            });
          }
        }),
        catchError(error => {
          this.authStateSubject.next({
            ...this.authStateSubject.value,
            loading: false,
            error: error.error?.message || 'Login failed'
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
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, userData, { withCredentials: true })
      .pipe(
        tap(response => {
          if (response.user) {
            this.authStateSubject.next({
              isAuthenticated: true,
              user: response.user,
              loading: false,
              requiresMfa: false,
              error: null
            });
          }
        }),
        catchError(error => {
          this.authStateSubject.next({
            ...this.authStateSubject.value,
            loading: false,
            error: error.error?.message || 'Registration failed'
          });
          return throwError(() => error);
        })
      );
  }

  /**
   * Logout the current user
   */
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          this.authStateSubject.next({
            isAuthenticated: false,
            user: null,
            loading: false,
            requiresMfa: false,
            error: null
          });
        }),
        catchError(error => {
          // Even if the server logout fails, clear the local state
          this.authStateSubject.next({
            isAuthenticated: false,
            user: null,
            loading: false,
            requiresMfa: false,
            error: null
          });
          return throwError(() => error);
        })
      );
  }

  /**
   * Request a password reset link
   */
  forgotPassword(data: ForgotPasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/forgot-password`, data, { withCredentials: true })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Reset password with token
   */
  resetPassword(data: ResetPasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/reset-password`, data, { withCredentials: true })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Resend email verification
   */
  resendVerificationEmail(): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/email/verification-notification`, {}, { withCredentials: true })
      .pipe(
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Verify email with link clicked from email
   */
  verifyEmailWithLink(id: string, hash: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/email/verify/${id}/${hash}`, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update the user state to reflect verified email
          this.getCurrentUser().subscribe();
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Verify email with code
   */
  verifyEmailWithCode(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/email/verify`, { code }, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update the user state to reflect verified email
          this.getCurrentUser().subscribe();
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/auth/user`, { withCredentials: true })
      .pipe(
        tap(user => {
          this.authStateSubject.next({
            ...this.authStateSubject.value,
            user,
            isAuthenticated: true
          });
        }),
        catchError(error => {
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
      loading
    });
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
      requiresMfa
    });
  }
}