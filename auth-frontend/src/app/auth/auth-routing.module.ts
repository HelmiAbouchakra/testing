import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { MfaSetupComponent } from './mfa-setup/mfa-setup.component';
import { MfaVerifyComponent } from './mfa-verify/mfa-verify.component';
import { ProfileComponent } from './profile/profile.component';
import { AuthGuard } from '../core/guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'mfa-setup', component: MfaSetupComponent, canActivate: [AuthGuard] },
  { 
    path: 'mfa-verify', 
    component: MfaVerifyComponent,
    data: { skipMfaCheck: true } // Skip MFA check to avoid infinite redirect loop
  },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }