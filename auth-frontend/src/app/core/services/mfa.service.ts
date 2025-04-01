// auth-frontend/src/app/core/services/mfa.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { MfaSetupResponse, MfaVerifyResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class MfaService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  /**
   * Get the current MFA status
   */
  getStatus(): Observable<any> {
    console.log('Getting MFA status with URL:', `${this.apiUrl}/v1/mfa/status`);
    return this.http.get(`${this.apiUrl}/v1/mfa/status`, { withCredentials: true });
  }

  /**
   * Get MFA setup information including QR code
   * @param password User's current password for verification
   */
  setupMfa(password: string): Observable<MfaSetupResponse> {
    console.log('Setting up MFA with URL:', `${this.apiUrl}/v1/mfa/setup`);
    return this.http.post<MfaSetupResponse>(`${this.apiUrl}/v1/mfa/setup`, { password }, { withCredentials: true })
      .pipe(
        tap(response => {
          console.log('MFA setup successful, QR code received');
        })
      );
  }

  /**
   * Enable MFA after user has scanned QR code
   * @param code Verification code from authenticator app
   */
  enableMfa(code: string): Observable<any> {
    console.log('Enabling MFA with URL:', `${this.apiUrl}/v1/mfa/enable`);
    return this.http.post(`${this.apiUrl}/v1/mfa/enable`, { code }, { withCredentials: true })
      .pipe(
        tap(response => {
          console.log('MFA successfully enabled');
        })
      );
  }

  /**
   * Disable MFA for the user
   * @param password User's current password for verification
   */
  disableMfa(password: string): Observable<any> {
    console.log('Disabling MFA with URL:', `${this.apiUrl}/v1/mfa/disable`);
    return this.http.post(`${this.apiUrl}/v1/mfa/disable`, { password }, { withCredentials: true });
  }

  /**
   * Verify the MFA code during login
   * @param code The verification code from authenticator app
   */
  verifyCode(code: string): Observable<MfaVerifyResponse> {
    console.log('Verifying MFA code with URL:', `${this.apiUrl}/v1/mfa/verify`);
    return this.http.post<MfaVerifyResponse>(
      `${this.apiUrl}/v1/mfa/verify`, 
      { code }, 
      { 
        withCredentials: true,
        headers: new HttpHeaders({
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        })
      }
    )
      .pipe(
        tap(response => {
          // Update auth state to remove MFA requirement and set authentication state
          this.authService.updateMfaStatus(false);
          if (response.user) {
            // Ensure the user is properly set in the auth state
            this.authService.setAuthState({
              isAuthenticated: true,
              user: response.user,
              loading: false,
              requiresMfa: false,
              error: null
            });
          }
          console.log('MFA verification successful, auth state updated');
          
          // Force a refresh of the authentication state to ensure all cookies are properly set
          setTimeout(() => {
            this.authService.checkAuthState();
          }, 500);
        })
      );
  }

  /**
   * Verify a recovery code during login
   * @param recoveryCode The recovery code
   */
  verifyRecoveryCode(recoveryCode: string): Observable<MfaVerifyResponse> {
    console.log('Verifying MFA recovery code with URL:', `${this.apiUrl}/v1/mfa/verify`);
    return this.http.post<MfaVerifyResponse>(
      `${this.apiUrl}/v1/mfa/verify`, 
      { code: recoveryCode }, 
      { 
        withCredentials: true,
        headers: new HttpHeaders({
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        })
      }
    ).pipe(
      tap(response => {
        // Update auth state to remove MFA requirement and set authentication state
        this.authService.updateMfaStatus(false);
        if (response.user) {
          // Ensure the user is properly set in the auth state
          this.authService.setAuthState({
            isAuthenticated: true,
            user: response.user,
            loading: false,
            requiresMfa: false,
            error: null
          });
        }
        console.log('Recovery code verification successful, auth state updated');
        
        // Force a refresh of the authentication state to ensure all cookies are properly set
        setTimeout(() => {
          this.authService.checkAuthState();
        }, 500);
      })
    );
  }

  /**
   * Generate new recovery codes
   */
  generateRecoveryCodes(): Observable<{ recovery_codes: string[] }> {
    console.log('Generating recovery codes with URL:', `${this.apiUrl}/v1/mfa/recovery-codes`);
    return this.http.post<{ recovery_codes: string[] }>(
      `${this.apiUrl}/v1/mfa/recovery-codes`, 
      {}, 
      { withCredentials: true }
    );
  }
}