import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, filter, first, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Force an auth check on every navigation
    this.authService.checkAuthState();
    
    // Wait for the loading to complete before making a decision
    return this.authService.authState$.pipe(
      // Wait until loading is false (auth check complete)
      filter(authState => !authState.loading),
      // Take the first non-loading state
      first(),
      map(authState => {
        // Special case for verify-email path: don't log unless there's a problem
        const isVerifyEmailPath = state.url.includes('/verify-email');
        
        if (!isVerifyEmailPath) {
          console.log('Auth guard checking state:', {
            path: state.url,
            isAuthenticated: authState.isAuthenticated,
            requiresMfa: authState.requiresMfa,
            isVerified: authState.user?.email_verified_at ? true : false
          });
        }
        
        // Special case for just registered users trying to access verification
        if (isVerifyEmailPath && localStorage.getItem('just_registered') === 'true') {
          console.log('Allowing access to verification page for newly registered user');
          return true;
        }
        
        // Allow access during development by checking route data
        if (route.data['skipMfaCheck'] === true && 
            route.data['requiresEmailVerification'] === false) {
          return true;
        }

        // If not authenticated, redirect to login
        if (!authState.isAuthenticated) {
          // Don't log for verify-email to reduce console spam
          if (!isVerifyEmailPath) {
            // Special case: Don't log if going to verify-email with just_registered flag
            if (!(isVerifyEmailPath && localStorage.getItem('just_registered') === 'true')) {
              console.log('User not authenticated, redirecting to login');
            }
          }
          
          // Special case: Don't redirect if going to verify-email with just_registered flag
          if (isVerifyEmailPath && localStorage.getItem('just_registered') === 'true') {
            console.log('Allowing unauthenticated access to verification page for newly registered user');
            return true;
          }
          
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
        }

        // Special case for verify-email path
        if (isVerifyEmailPath) {
          // User is authenticated and trying to access verify-email - always allow
          return true;
        }
        
        // If MFA is required and not in development mode
        if (authState.requiresMfa && !route.data['skipMfaCheck']) {
          console.log('MFA verification required');
          return this.router.createUrlTree(['/auth/mfa-verify'], {
            queryParams: { returnUrl: state.url }
          });
        }

        // If email verification is required and not in development mode
        const requiresEmailVerification = route.data['requiresEmailVerification'] !== false;
        if (requiresEmailVerification && 
            authState.user && 
            !authState.user.email_verified_at) {
          console.log('Email verification required, redirecting to verify-email');
          return this.router.createUrlTree(['/verify-email']);
        }

        // Allow access if all checks pass
        return true;
      })
    );
  }
}
