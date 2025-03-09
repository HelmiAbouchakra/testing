import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { MfaSetupResponse, MfaVerifyResponse, MfaVerifyRequest } from '../models/auth.model';

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
    return this.http.get(`${this.apiUrl}/mfa/status`, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update auth state to remove MFA requirement
        })
      );
  }

  /**
   * Get MFA setup information including QR code
   */
  setupMfa(password: string): Observable<MfaSetupResponse> {
    return this.http.post<MfaSetupResponse>(`${this.apiUrl}/mfa/setup`, { password }, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update auth state to remove MFA requirement
        })
      );
  }

  /**
   * Enable MFA for the user
   * @param code The verification code from authenticator app
   */
  enableMfa(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/mfa/enable`, { code }, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update auth state to remove MFA requirement
        })
      );
  }

  /**
   * Disable MFA for the user
   * @param code The verification code from authenticator app
   */
  disableMfa(password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/mfa/disable`, { password }, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update auth state to remove MFA requirement
        })
      );
  }

  /**
   * Verify the MFA code during login
   * @param code The verification code from authenticator app
   */
  verifyCode(code: string): Observable<MfaVerifyResponse> {
    return this.http.post<MfaVerifyResponse>(`${this.apiUrl}/mfa/verify`, { code }, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update auth state to remove MFA requirement
          this.authService.updateMfaStatus(false);
        })
      );
  }

  /**
   * Verify a recovery code during login
   * @param recoveryCode The recovery code
   */
  verifyRecoveryCode(recoveryCode: string): Observable<MfaVerifyResponse> {
    return this.http.post<MfaVerifyResponse>(`${this.apiUrl}/mfa/verify-recovery`, { recovery_code: recoveryCode }, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update auth state to remove MFA requirement
          this.authService.updateMfaStatus(false);
        })
      );
  }

  /**
   * Verify MFA code during login
   */
  verifyMfa(data: MfaVerifyRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/mfa/verify`, data, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update auth state to remove MFA requirement
        })
      );
  }

  /**
   * Regenerate recovery codes
   */
  regenerateRecoveryCodes(): Observable<any> {
    return this.http.post(`${this.apiUrl}/mfa/recovery-codes`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update auth state to remove MFA requirement
        })
      );
  }

  /**
   * Generate new recovery codes
   */
  generateRecoveryCodes(): Observable<{ recovery_codes: string[] }> {
    return this.http.post<{ recovery_codes: string[] }>(`${this.apiUrl}/mfa/recovery-codes`, {}, { withCredentials: true })
      .pipe(
        tap(() => {
          // Update auth state to remove MFA requirement
        })
      );
  }
}
