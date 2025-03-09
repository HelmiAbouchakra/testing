import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CsrfService {
  private apiUrl = environment.apiUrl;
  private csrfToken: string | null = null;

  constructor(private http: HttpClient) { }

  /**
   * Get the CSRF token from the API
   */
  getCsrfToken(): Observable<any> {
    return this.http.get(`${this.apiUrl}/csrf-token`, { withCredentials: true })
      .pipe(
        tap((response: any) => {
          if (response && response.csrf_token) {
            this.csrfToken = response.csrf_token;
          }
        }),
        catchError(error => {
          console.error('Error fetching CSRF token:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get the stored CSRF token
   */
  getToken(): string | null {
    return this.csrfToken;
  }

  /**
   * Set the CSRF token manually (e.g., from a cookie)
   */
  setToken(token: string): void {
    this.csrfToken = token;
  }

  /**
   * Clear the stored CSRF token
   */
  clearToken(): void {
    this.csrfToken = null;
  }

  /**
   * Refresh the CSRF token
   */
  refreshToken(): Observable<any> {
    return this.getCsrfToken();
  }
}
