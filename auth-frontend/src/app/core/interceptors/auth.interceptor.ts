import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, finalize, switchMap, take } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Always include credentials for cross-site requests and add proper headers for Sanctum
    request = request.clone({
      withCredentials: true,
      headers: request.headers.set('X-Requested-With', 'XMLHttpRequest')
    });

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Handle 401 Unauthorized errors
          // If we're not already refreshing, try to refresh session
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            // Log the 401 error for debugging
            console.log('Received 401 Unauthorized, checking if we should redirect', error);

            // Don't redirect for specific API calls like auth checks or API validation
            const skipRedirectUrls = [
              '/auth/user',
              '/csrf-token',
              '/sanctum/csrf-cookie'
            ];
            
            const shouldRedirect = !skipRedirectUrls.some(url => request.url.includes(url));
            
            if (shouldRedirect) {
              console.log('Redirecting to login page due to 401 error');
              // For other requests, redirect to login page
              this.router.navigate(['/auth/login'], {
                queryParams: { returnUrl: this.router.url }
              });
            } else {
              console.log('Not redirecting for auth check or CSRF request');
            }
          }
        }
        return throwError(() => error);
      }),
      finalize(() => {
        // Reset refreshing state
        this.isRefreshing = false;
      })
    );
  }
}
