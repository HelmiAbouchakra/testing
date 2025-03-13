import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { VerifiedEmailGuard } from './core/guards/verified-email.guard';
import { MfaGuard } from './core/guards/mfa.guard';
import { EmailVerificationComponent } from './auth/email-verification/email-verification.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'verify-email',
    component: EmailVerificationComponent
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
    canActivate: [AuthGuard, VerifiedEmailGuard]
  },
  {
    path: 'profile',
    loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule),
    canActivate: [AuthGuard, VerifiedEmailGuard]
  },
  {
    path: 'secure',
    loadChildren: () => import('./secure/secure.module').then(m => m.SecureModule),
    canActivate: [AuthGuard, VerifiedEmailGuard, MfaGuard],
    data: { requireMfa: true }
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];