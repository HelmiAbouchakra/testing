import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.authState$.pipe(
      take(1),
      map(authState => {
        // Check if user is authenticated
        if (authState.isAuthenticated) {
          // Check if MFA is required
          if (authState.requiresMfa && !route.data['skipMfaCheck']) {
            // Redirect to MFA verification with return URL
            return this.router.createUrlTree(['/auth/mfa-verify'], {
              queryParams: { returnUrl: state.url }
            });
          }
          return true;
        }

        // Not authenticated, redirect to login with return URL
        return this.router.createUrlTree(['/auth/login'], {
          queryParams: { returnUrl: state.url }
        });
      })
    );
  }
}
