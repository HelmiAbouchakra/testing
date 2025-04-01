import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastr = inject(ToastrService);

  return authService.authState$.pipe(
    take(1),
    map(authState => {
      // Add debugging to see what's happening
      console.log('Admin Guard - Auth State:', authState);
      console.log('User Role:', authState.user?.role);
      
      // Check if user is authenticated and has admin role
      if (authState.isAuthenticated && authState.user?.role === 'admin') {
        console.log('Admin access granted');
        return true;
      }

      // If not admin, redirect to dashboard and show error message
      console.log('Admin access denied');
      toastr.error('You do not have permission to access this area');
      router.navigate(['/dashboard']);
      return false;
    })
  );
};
