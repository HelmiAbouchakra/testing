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

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor() {}

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
