import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-email-verification',
  templateUrl: './email-verification.component.html',
  styleUrls: ['./email-verification.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ]
})
export class EmailVerificationComponent implements OnInit, OnDestroy {
  verifyForm!: FormGroup;
  loading = false;
  emailSent = false;
  verified = false;
  error: string | null = null;
  email: string = '';
  isNewUser = false;
  userEmail: string | null = null;
  autoSendEmail = true; // Flag to control automatic sending of verification emails
  debugCode: string | null = null; // For showing debug verification code
  private authSubscription: Subscription | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.initializeVerificationForm();

    // Check if we're dealing with a newly registered user
    const justRegistered = localStorage.getItem('just_registered') === 'true';
    const registeredEmail = localStorage.getItem('registered_email');
    const emailAlreadySent = localStorage.getItem('verification_email_already_sent') === 'true';

    // Check if we have a debug verification code
    const debugCode = localStorage.getItem('debug_verification_code');

    if (debugCode) {
      console.log('Debug verification code found:', debugCode);
      this.debugCode = debugCode;
      // Don't auto-populate the form with the debug code
      // Let the user enter the code sent to their email
    }

    if (justRegistered && registeredEmail) {
      console.log('New user detected, email:', registeredEmail);
      this.isNewUser = true;
      this.userEmail = registeredEmail;
      this.email = registeredEmail;

      // Show welcome message for new users
      this.showWelcomeMessage();

      // Only automatically send verification email if it hasn't been sent already
      // during the registration process
      if (this.autoSendEmail && !emailAlreadySent) {
        console.log('Auto-sending verification email');
        this.sendVerificationEmail();
      } else if (emailAlreadySent) {
        console.log('Verification email already sent during registration, not sending again');
        this.emailSent = true;
      }
    } else {
      // Check auth state as a fallback for non-registration cases
      this.authService.checkAuthState();

      this.authSubscription = this.authService.authState$.subscribe({
        next: (authState) => {
          // Don't show error messages if we just registered
          if (!justRegistered) {
            console.log('Email verification - Auth state updated:', {
              isAuthenticated: authState.isAuthenticated,
              isVerified: authState.user?.email_verified_at ? true : false
            });
          }

          if (authState.isAuthenticated) {
            if (authState.user?.email_verified_at) {
              // User is already verified
              console.log('User email already verified');

              // Log the user out first to ensure clean state
              this.authService.logout().subscribe({
                complete: () => {
                  // Redirect to login
                  this.router.navigate(['/auth/login']);
                }
              });
            } else if (!this.email) {
              // If we don't have an email yet from the justRegistered check, get it from auth state
              this.email = authState.user?.email || '';

              // Check if we should auto-send a verification email
              if (!this.emailSent && !this.loading && !this.verified) {
                const lastSent = localStorage.getItem('lastVerificationEmailSent');
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

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
        }
      });
    }
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Convenience getter for form fields
  get f() { return this.verifyForm.controls; }

  // Send verification email
  sendVerificationEmail(): void {
    // Check if we've sent an email very recently (last 30 seconds) to prevent double-sends
    const lastSent = localStorage.getItem('lastVerificationEmailSent');
    const thirtySecondsAgo = Date.now() - (30 * 1000);

    if (lastSent && parseInt(lastSent) > thirtySecondsAgo) {
      // If we sent one very recently, just update the UI state
      this.emailSent = true;
      return;
    }

    this.loading = true;
    this.error = null;

    console.log('Sending verification email request...');

    // Check if we're dealing with a newly registered user
    const justRegistered = localStorage.getItem('just_registered') === 'true';
    const registeredEmail = localStorage.getItem('registered_email');

    if (justRegistered && registeredEmail) {
      // Special case for newly registered users - we'll use a different endpoint
      // that doesn't require authentication
      console.log('Sending verification email for newly registered user:', registeredEmail);
      
      this.authService.sendVerificationEmailForNewUser(registeredEmail).subscribe({
        next: (response) => {
          console.log('Verification email response for new user:', response);
          this.loading = false;
          this.emailSent = true;
          
          // Store timestamp to prevent multiple immediate sends
          localStorage.setItem('lastVerificationEmailSent', Date.now().toString());
          
          // If a verification code is provided in the response, store it for debugging
          if (response?.code) {
            this.debugCode = response.code;
            localStorage.setItem('debug_verification_code', response.code);
          }
          
          this.snackBar.open('Verification code sent! Please check your inbox.', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error: HttpErrorResponse) => {
          console.error('Verification email error for new user:', error);
          this.loading = false;
          this.error = error.message || 'Failed to send verification email';
          this.snackBar.open(this.error || 'Failed to send verification email', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      // Normal case - authenticated user resending verification
      this.authService.resendVerificationEmail().subscribe({
        next: (response) => {
          console.log('Verification email response:', response);
          this.loading = false;
          this.emailSent = true;
          // Store timestamp to prevent multiple immediate sends
          localStorage.setItem('lastVerificationEmailSent', Date.now().toString());
          this.snackBar.open('Verification code sent! Please check your inbox.', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error: HttpErrorResponse) => {
          console.error('Verification email error:', error);
          this.loading = false;
          this.error = error.message || 'Failed to send verification email';
          this.snackBar.open(this.error || 'Failed to send verification email', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  // Public method called by the "Resend Email" button
  resendVerificationEmail(): void {
    // Allow manual resends to override the timeout
    this.sendVerificationEmail();
  }

  // Submit verification code
  submitVerificationCode(): void {
    if (this.verifyForm.invalid) {
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
          this.loading = false;
          this.verified = true;
          this.snackBar.open('Email verified successfully! You can now log in.', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });

          // Clear stored data
          localStorage.removeItem('lastVerificationEmailSent');
          localStorage.removeItem('just_registered');
          localStorage.removeItem('registered_email');
          localStorage.removeItem('stay_on_verification');
          localStorage.removeItem('debug_verification_code');

          console.log('Redirecting to login page after successful verification');
          // Use navigate with replaceUrl to avoid back-button issues
          this.router.navigate(['/auth/login'], { replaceUrl: true });
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;
          console.log('Verification error received:', error);
          this.error = error.error?.message || 'Failed to verify email';
          
          // Check various locations for a new verification code
          let newCode = null;
          
          // First check our custom property added by the service
          if (error.hasOwnProperty('extractedNewCode')) {
            newCode = (error as any).extractedNewCode;
          }
          // Then check various locations in the error object
          else if (error.error?.debug_code) {
            newCode = error.error.debug_code;
          }
          else if (error.error?.new_code) {
            newCode = error.error.new_code;
          }
          // Also check localStorage as a fallback
          else {
            const storedCode = localStorage.getItem('debug_verification_code');
            if (storedCode && storedCode !== code) {
              newCode = storedCode;
            }
          }
          
          if (newCode) {
            console.log('New verification code found:', newCode);
            
            // Don't auto-populate the verification code field
            this.debugCode = newCode;
            
            // Show a helpful message to the user
            this.snackBar.open('A new verification code has been sent. Please check your email for the code.', 'OK', {
              duration: 8000,
              panelClass: ['info-snackbar']
            });
          } else {
            // Regular error handling
            this.snackBar.open(this.error || 'Failed to verify email', 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar']
            });
          }
        }
      });
    } else {
      // Normal case - authenticated user verifying email
      this.authService.verifyEmailWithCode(code).subscribe({
        next: () => {
          this.loading = false;
          this.verified = true;
          this.snackBar.open('Email verified successfully! You can now log in.', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });

          // ALWAYS redirect to login page after verification - no conditions
          // First log the user out to ensure a clean state
          this.authService.logout().subscribe({
            complete: () => {
              // Clear any stored auth state
              localStorage.removeItem('lastVerificationEmailSent');

              console.log('Redirecting to login page after successful verification');
              // Use navigate with replaceUrl to avoid back-button issues
              this.router.navigate(['/auth/login'], { replaceUrl: true });
            }
          });
        },
        error: (error: HttpErrorResponse) => {
          this.loading = false;
          this.error = error.error?.message || 'Failed to verify email';
          this.snackBar.open(this.error || 'Failed to verify email', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  logout(): void {
    this.authService.logout().subscribe({
      complete: () => {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  initializeVerificationForm(): void {
    this.verifyForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')]]
    });
  }

  showWelcomeMessage(): void {
    this.snackBar.open('Welcome! Please verify your email to continue.', 'Close', {
      duration: 5000,
      panelClass: ['info-snackbar']
    });
  }
}