import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { MfaService } from '../services/mfa.service';

@Injectable({
  providedIn: 'root'
})
export class MfaGuard implements CanActivate {
  constructor(
    private authService: AuthService, 
    private mfaService: MfaService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.authService.authState$.pipe(
      take(1),
      map(authState => {
        // First check if user is authenticated
        if (!authState.isAuthenticated) {
          return this.router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url }
          });
        }

        // If MFA is required but not completed, redirect to MFA verification
        if (authState.requiresMfa) {
          return this.router.createUrlTree(['/auth/mfa-verify'], {
            queryParams: { returnUrl: state.url }
          });
        }

        // Check if user has MFA enabled for secure routes
        if (route.data['requireMfa'] === true && (!authState.user || !authState.user.mfa_enabled)) {
          // User needs to set up MFA for this route
          return this.router.createUrlTree(['/auth/mfa-setup'], {
            queryParams: { returnUrl: state.url }
          });
        }

        // All checks passed
        return true;
      })
    );
  }
}
