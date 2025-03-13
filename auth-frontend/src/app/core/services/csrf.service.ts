import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
   * Fetch CSRF token from the server
   */
  getCsrfToken(): Observable<any> {
    console.log('Fetching CSRF token from:', `${this.apiUrl}/v1/csrf-token`);
    
    return this.http.get(`${this.apiUrl}/v1/csrf-token`, { 
      withCredentials: true,
      headers: new HttpHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      })
    }).pipe(
      tap(() => console.log('CSRF token fetch successful')),
      catchError(error => {
        console.error('CSRF token fetch failed:', error);
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
