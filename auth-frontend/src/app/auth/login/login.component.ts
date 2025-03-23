import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription, interval } from 'rxjs';
import { take } from 'rxjs/operators';

// Services
import { AuthService } from '../../core/services/auth.service';
import { CsrfService } from '../../core/services/csrf.service';

// Custom Components
import { CustomButtonComponent } from '../../components/custom-button/custom-button.component';
import { CustomInputComponent } from '../../components/custom-input/custom-input.component';
import { WrapperComponent } from '../../components/wrapper/wrapper.component';

// Interfaces
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user?: User;
  message?: string;
  requires_mfa?: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  // Add other user properties as needed
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomInputComponent,
    CustomButtonComponent,
    WrapperComponent,
  ],
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup;
  isLoading = false;
  returnUrl: string = '/dashboard';
  showSocialButtons = true;

  // Fields for custom input binding
  email: string = '';
  password: string = '';

  // For redirection after login
  loginSuccess = false;
  redirectCountdown = 3;
  private countdownSubscription?: Subscription;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private csrfService: CsrfService,
    public router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    this.csrfService.getCsrfToken().subscribe();
    this.showSocialButtons = true;
  }

  ngOnDestroy(): void {
    if (this.countdownSubscription) {
      this.countdownSubscription.unsubscribe();
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  // Simple validation for form state (button enabling/disabling)
  isFormValid(): boolean {
    return this.loginForm.valid;
  }

  // Update form values when custom inputs change
  onEmailChange(value: string): void {
    this.email = value;
    this.f['email'].setValue(value);
  }

  onPasswordChange(value: string): void {
    this.password = value;
    this.f['password'].setValue(value);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.f).forEach((key) => {
        this.f[key].markAsTouched();
      });
      return;
    }

    this.isLoading = true;

    const credentials: LoginCredentials = {
      email: this.f['email'].value,
      password: this.f['password'].value,
    };

    // Add a delay to show the spinner for longer (3 seconds)
    setTimeout(() => {
      this.authService.login(credentials).subscribe({
        next: (response: LoginResponse) => {
          // Add another delay before processing the response
          setTimeout(() => {
            this.isLoading = false;

            if (response.requires_mfa) {
              this.authService.updateMfaStatus(true);
              this.toastr.info('Please complete two-factor authentication');

              this.router.navigate(['/auth/mfa-verify'], {
                queryParams: { returnUrl: this.returnUrl },
              });
            } else if (response.user && !response.user.email_verified_at) {
              this.toastr.warning('Please verify your email address');
              this.router.navigate(['/verify-email']);
            } else {
              this.loginSuccess = true;
              this.toastr.success('Login successful! Redirecting to dashboard...');
              this.startRedirectCountdown();
            }
          }, 2000); // 2 second delay after receiving response
        },
        error: (error) => {
          // Add delay before showing error
          setTimeout(() => {
            this.isLoading = false;

            if (typeof error.error === 'string') {
              this.toastr.error(error.error);
            } else if (error.error?.message) {
              this.toastr.error(error.error.message);
            } else if (error.message) {
              this.toastr.error(error.message);
            } else {
              this.toastr.error('Login failed. Please try again.');
            }
          }, 2000); // 2 second delay before showing error
        },
      });
    }); // 3 second delay before sending request
  }

  startRedirectCountdown(): void {
    this.countdownSubscription?.unsubscribe();

    this.countdownSubscription = interval(1000)
      .pipe(take(3))
      .subscribe({
        next: () => {
          this.redirectCountdown--;
        },
        complete: () => {
          this.router.navigate([this.returnUrl]);
        },
      });
  }

  loginWithSocial(provider: 'google' | 'facebook'): void {
    if (provider === 'google') {
      this.authService.loginWithGoogle();
    } else if (provider === 'facebook') {
      this.authService.loginWithFacebook();
    }
  }

  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  /**
   * Navigate to reset password page
   */
  navigateToResetPassword(): void {
    this.router.navigate(['/auth/forgot-password']);
  }
}
