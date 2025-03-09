import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { CsrfService } from '../services/csrf.service';

@Injectable()
export class CsrfInterceptor implements HttpInterceptor {
  constructor(private csrfService: CsrfService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Skip CSRF token for GET, HEAD, OPTIONS requests
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
      return next.handle(request);
    }

    // Get the CSRF token
    const csrfToken = this.csrfService.getToken();

    // If we have a token, add it to the request
    if (csrfToken) {
      request = this.addCsrfToken(request, csrfToken);
      return this.handleRequest(request, next);
    } else {
      // If we don't have a token, get one first
      return this.csrfService.getCsrfToken().pipe(
        switchMap(response => {
          // Add the token to the request
          const token = this.csrfService.getToken();
          if (token) {
            request = this.addCsrfToken(request, token);
          }
          return this.handleRequest(request, next);
        }),
        catchError(error => {
          console.error('Error getting CSRF token:', error);
          return throwError(() => error);
        })
      );
    }
  }

  private addCsrfToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        'X-CSRF-TOKEN': token
      }
    });
  }

  private handleRequest(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        // If we get a CSRF token mismatch error (419 in Laravel), refresh the token and retry
        if (error.status === 419) {
          return this.csrfService.refreshToken().pipe(
            switchMap(() => {
              const token = this.csrfService.getToken();
              if (token) {
                request = this.addCsrfToken(request, token);
              }
              return next.handle(request);
            }),
            catchError(refreshError => {
              console.error('Error refreshing CSRF token:', refreshError);
              return throwError(() => refreshError);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
