import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription, interval } from 'rxjs';
import { takeWhile } from 'rxjs/operators';
import { CustomButtonComponent } from '../../components/custom-button/custom-button.component';
// import { CustomInputComponent } from '../../components/custom-input/custom-input.component';
import { WrapperComponent } from '../../components/wrapper/wrapper.component';
import { AuthService } from '../../core/services/auth.service';

// Define interfaces within the component file
interface VerificationResponse {
  message: string;
  success: boolean;
  user?: any;
  code?: string;
}

interface VerificationError {
  message: string;
  code?: string;
  debug_code?: string;
  new_code?: string;
}

@Component({
  selector: 'app-email-verification',
  templateUrl: './email-verification.component.html',
  styleUrls: ['./email-verification.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    WrapperComponent,
    CustomButtonComponent,
    // CustomInputComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EmailVerificationComponent implements OnInit, OnDestroy {
  verifyForm!: FormGroup;
  loading = false;
  resendLoading = false; // Separate loading state for resend functionality
  emailSent = false;
  verified = false;
  error: string | null = null;
  email: string = '';
  isNewUser = false;
  userEmail: string | null = null;
  autoSendEmail = true;
  verificationCode: string = '';
  codeDigits: string[] = ['', '', '', '', '', '']; // Array to hold individual digits
  private authSubscription: Subscription | null = null;
  
  // Resend code timer properties
  resendTimerSubscription: Subscription | null = null;
  resendCountdown: number = 0;
  canResendCode: boolean = true;
  initialCountdownTime: number = 120; // 120 seconds (2 minutes)

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.initializeVerificationForm();

    // Check if we're dealing with a newly registered user
    const justRegistered = localStorage.getItem('just_registered') === 'true';
    const registeredEmail = localStorage.getItem('registered_email');
    const emailAlreadySent =
      localStorage.getItem('verification_email_already_sent') === 'true';

    if (justRegistered && registeredEmail) {
      console.log('New user detected, email:', registeredEmail);
      this.isNewUser = true;
      this.userEmail = registeredEmail;
      this.email = registeredEmail;

      // Show welcome message for new users
      this.toastr.info('Welcome! Please verify your email to continue.');

      // Only automatically send verification email if it hasn't been sent already
      if (this.autoSendEmail && !emailAlreadySent) {
        console.log('Auto-sending verification email');
        this.sendVerificationEmail();
      } else if (emailAlreadySent) {
        console.log(
          'Verification email already sent during registration, not sending again'
        );
        this.emailSent = true;
      }
    } else {
      // Check auth state as a fallback for non-registration cases
      this.authService.checkAuthState();

      this.authSubscription = this.authService.authState$.subscribe({
        next: (authState) => {
          if (!justRegistered) {
            console.log('Email verification - Auth state updated:', {
              isAuthenticated: authState.isAuthenticated,
              isVerified: authState.user?.email_verified_at ? true : false,
            });
          }

          if (authState.isAuthenticated) {
            if (authState.user?.email_verified_at) {
              // User is already verified
              console.log('User email already verified');
              this.toastr.success('Your email is already verified');

              // Log the user out first to ensure clean state
              this.authService.logout().subscribe({
                complete: () => {
                  // Redirect to login
                  this.router.navigate(['/auth/login']);
                },
              });
            } else if (!this.email) {
              // If we don't have an email yet from the justRegistered check, get it from auth state
              this.email = authState.user?.email || '';

              // Check if we should auto-send a verification email
              if (!this.emailSent && !this.loading && !this.verified) {
                const lastSent = localStorage.getItem(
                  'lastVerificationEmailSent'
                );
                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

                // Only auto-send if we haven't sent one in the last 5 minutes
                if (!lastSent || parseInt(lastSent) < fiveMinutesAgo) {
                  console.log('Auto-sending verification email');
                  this.sendVerificationEmail();
                }
              }
            }
          } else if (!justRegistered) {
            // Only redirect if we're not in the "just registered" flow
            console.log('User not authenticated, redirecting to login');
            this.router.navigate(['/auth/login']);
          }
        },
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    
    // Clean up the timer subscription
    if (this.resendTimerSubscription) {
      this.resendTimerSubscription.unsubscribe();
    }
  }

  // Send verification email
  private sendVerificationEmail(): void {
    // Check if we've sent an email very recently (last 30 seconds) to prevent double-sends
    const lastSent = localStorage.getItem('lastVerificationEmailSent');
    const thirtySecondsAgo = Date.now() - 30 * 1000;

    if (lastSent && parseInt(lastSent) > thirtySecondsAgo) {
      // If we sent one very recently, just update the UI state
      this.emailSent = true;
      // Reset resend loading state if it was set
      this.resendLoading = false;
      return;
    }

    // Don't set the main loading flag if this is a resend operation
    if (!this.resendLoading) {
      this.loading = true;
    }
    this.error = null;

    console.log('Sending verification email request...');

    // Check if we're dealing with a newly registered user
    const justRegistered = localStorage.getItem('just_registered') === 'true';
    const registeredEmail = localStorage.getItem('registered_email');

    if (justRegistered && registeredEmail) {
      // Special case for newly registered users
      console.log(
        'Sending verification email for newly registered user:',
        registeredEmail
      );

      this.authService
        .sendVerificationEmailForNewUser(registeredEmail)
        .subscribe({
          next: (response) => {
            console.log('Verification email response:', response);
            this.loading = false;
            this.resendLoading = false;
            this.emailSent = true;

            // Store timestamp to prevent multiple immediate sends
            localStorage.setItem(
              'lastVerificationEmailSent',
              Date.now().toString()
            );

            this.toastr.success(
              'Verification code sent! Please check your inbox.'
            );
          },
          error: (error: HttpErrorResponse) => {
            console.error('Verification email error for new user:', error);
            this.loading = false;
            this.resendLoading = false;
            this.error =
              error.error?.message || 'Failed to send verification email';
            this.toastr.error(
              this.error || 'Failed to send verification email'
            );
          },
        });
    } else {
      // Normal case - authenticated user resending verification
      this.authService.resendVerificationEmail().subscribe({
        next: (response) => {
          console.log('Verification email response:', response);
          this.loading = false;
          this.resendLoading = false;
          this.emailSent = true;
          // Store timestamp to prevent multiple immediate sends
          localStorage.setItem(
            'lastVerificationEmailSent',
            Date.now().toString()
          );
          this.toastr.success(
            'Verification code sent! Please check your inbox.'
          );
        },
        error: (error: HttpErrorResponse) => {
          console.error('Verification email error:', error);
          this.loading = false;
          this.resendLoading = false;
          this.error =
            error.error?.message || 'Failed to send verification email';
          this.toastr.error(this.error || 'Failed to send verification email');
        },
      });
    }
  }

  // Handle verification code input changes
  onCodeChange(value: string): void {
    this.verificationCode = value;
    this.verifyForm.get('code')?.setValue(value);
  }

  // Submit verification code
  submitVerificationCode(): void {
    if (this.verifyForm.invalid) {
      // Show validation errors via toastr instead of inline messages
      if (this.verifyForm.get('code')?.errors?.['required']) {
        this.toastr.error('Verification code is required');
      } else if (this.verifyForm.get('code')?.errors?.['minlength'] || 
                 this.verifyForm.get('code')?.errors?.['maxlength']) {
        this.toastr.error('Verification code must be 6 digits');
      } else if (this.verifyForm.get('code')?.errors?.['pattern']) {
        this.toastr.error('Verification code must contain only numbers');
      }
      return;
    }

    this.loading = true;
    this.error = null;

    const code = this.verifyForm.get('code')?.value;

    // Check if we're dealing with a newly registered user
    const justRegistered = localStorage.getItem('just_registered') === 'true';
    const registeredEmail = localStorage.getItem('registered_email');

    if (justRegistered && registeredEmail) {
      // For newly registered users, use a special endpoint that doesn't require authentication
      this.authService.verifyEmailForNewUser(registeredEmail, code).subscribe({
        next: () => {
          this.toastr.success(
            'Email verified successfully! You can now log in.'
          );

          // Clear stored data
          localStorage.removeItem('lastVerificationEmailSent');
          localStorage.removeItem('just_registered');
          localStorage.removeItem('registered_email');
          localStorage.removeItem('stay_on_verification');

          // Redirect after a short delay to allow toastr to be seen
          setTimeout(() => {
            this.router.navigate(['/auth/login'], { replaceUrl: true });
          }, 1500);
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;
          console.log('Verification error received:', error);
          const errorMessage = error.error?.message || 'Failed to verify email';
          this.toastr.error(errorMessage);
          // Do not enable the resend button on verification failure
          // Keep the countdown timer running
        },
      });
    } else {
      // Normal case - authenticated user verifying email
      this.authService.verifyEmailWithCode(code).subscribe({
        next: () => {
          this.toastr.success(
            'Email verified successfully! You can now log in.'
          );

          // ALWAYS redirect to login page after verification
          this.authService.logout().subscribe({
            complete: () => {
              // Clear any stored auth state
              localStorage.removeItem('lastVerificationEmailSent');

              // Redirect after a short delay to allow toastr to be seen
              setTimeout(() => {
                this.router.navigate(['/auth/login'], { replaceUrl: true });
              }, 1500);
            },
          });
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;
          const errorMessage = error.error?.message || 'Failed to verify email';
          this.toastr.error(errorMessage);
        },
      });
    }
  }

  initializeVerificationForm(): void {
    this.verifyForm = this.formBuilder.group({
      code: [
        '',
        [
          Validators.required,
          Validators.minLength(6),
          Validators.maxLength(6),
          Validators.pattern('^[0-9]*$'),
        ],
      ],
    });
  }

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // Start countdown timer for resending code
  startResendTimer(): void {
    this.canResendCode = false;
    this.resendCountdown = this.initialCountdownTime;
    
    // Clear any existing timer
    if (this.resendTimerSubscription) {
      this.resendTimerSubscription.unsubscribe();
    }
    
    // Start a new timer
    this.resendTimerSubscription = interval(1000)
      .pipe(takeWhile(() => this.resendCountdown > 0))
      .subscribe(() => {
        this.resendCountdown--;
        if (this.resendCountdown === 0) {
          this.canResendCode = true;
          if (this.resendTimerSubscription) {
            this.resendTimerSubscription.unsubscribe();
          }
        }
      });
  }

  // Format the countdown time as MM:SS
  formatCountdown(): string {
    const minutes = Math.floor(this.resendCountdown / 60);
    const seconds = this.resendCountdown % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Resend verification code button handler
  resendVerificationCode(): void {
    if (!this.canResendCode) {
      return;
    }
    
    // Send the verification email
    this.resendLoading = true;
    this.sendVerificationEmail();
    
    // Start the countdown timer
    this.startResendTimer();
  }

  // Handle individual digit input
  onDigitInput(event: Event, index: number, nextInput: HTMLInputElement | null): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    
    // Only allow numeric input
    if (value && /^[0-9]$/.test(value)) {
      this.codeDigits[index] = value;
      
      // Auto-focus next input if available
      if (nextInput && value) {
        nextInput.focus();
      }
    } else {
      // Clear non-numeric input
      input.value = '';
      this.codeDigits[index] = '';
    }
    
    // Update the full verification code
    this.updateVerificationCode();
  }
  
  // Handle keyboard navigation between inputs
  onKeyDown(event: KeyboardEvent, index: number, prevInput: HTMLInputElement | null, nextInput: HTMLInputElement | null): void {
    // Handle backspace
    if (event.key === 'Backspace') {
      if (!this.codeDigits[index] && prevInput) {
        // If current input is empty and backspace is pressed, focus previous input
        prevInput.focus();
        // Prevent default to avoid navigating back in browser history
        event.preventDefault();
      }
    } 
    // Handle left arrow key
    else if (event.key === 'ArrowLeft' && prevInput) {
      prevInput.focus();
      event.preventDefault();
    } 
    // Handle right arrow key
    else if (event.key === 'ArrowRight' && nextInput) {
      nextInput.focus();
      event.preventDefault();
    }
  }
  
  // Update the full verification code from individual digits
  private updateVerificationCode(): void {
    this.verificationCode = this.codeDigits.join('');
    this.verifyForm.get('code')?.setValue(this.verificationCode);
    
    // Auto-submit when all 6 digits are entered
    if (this.verificationCode.length === 6 && this.verifyForm.valid) {
      this.submitVerificationCode();
    }
  }
}
