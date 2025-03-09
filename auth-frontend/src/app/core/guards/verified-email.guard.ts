import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class VerifiedEmailGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

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

        // Check if email is verified
        if (authState.user && authState.user.email_verified_at) {
          return true;
        }

        // Email not verified, redirect to verification page
        return this.router.createUrlTree(['/verify-email'], {
          queryParams: { returnUrl: state.url }
        });
      })
    );
  }
}