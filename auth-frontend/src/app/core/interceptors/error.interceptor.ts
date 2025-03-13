import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An unknown error occurred';
        
        // Handle client-side errors
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Client-side error: ${error.error.message}`;
        } 
        // Handle server-side errors
        else {
          // Handle Laravel validation errors
          if (error.status === 422 && error.error && error.error.errors) {
            const validationErrors = error.error.errors;
            const errorMessages = [];
            
            // Format validation errors
            for (const field in validationErrors) {
              if (validationErrors.hasOwnProperty(field)) {
                errorMessages.push(...validationErrors[field]);
              }
            }
            
            errorMessage = errorMessages.join(', ');
          } 
          // Handle email verification errors specifically
          else if (error.status === 403 && error.error && error.error.message && 
                  error.error.message.includes('email')) {
            errorMessage = 'Your email address has not been verified. Please check your inbox or request a new verification email.';
            
            // Check if we need to redirect to the email verification page
            if (!request.url.includes('email/verification-notification')) {
              // Only redirect if we're not already on the verification page or requesting a new email
              this.router.navigate(['/auth/verify-email']);
              return throwError(() => ({
                error: error.error,
                status: error.status,
                message: errorMessage,
                needsVerification: true
              }));
            }
          }
          // Handle other server errors
          else if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else {
            errorMessage = `Server error: ${error.status} - ${error.statusText || 'Unknown'}`;
          }
        }
        
        // Log the error for debugging
        console.error('HTTP Error:', errorMessage, error);
        
        // Return the error with a formatted message
        return throwError(() => ({
          error: error.error,
          status: error.status,
          message: errorMessage
        }));
      })
    );
  }
}
