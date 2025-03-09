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
  private authSubscription: Subscription | null = null;
  
  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // Initialize form
    this.verifyForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')]]
    });

    // Check if user is already verified
    this.authService.checkAuthState();
    
    this.authSubscription = this.authService.authState$.subscribe({
      next: (authState) => {
        if (authState.isAuthenticated) {
          if (authState.user?.email_verified_at) {
            // User is already verified, redirect to dashboard
            this.verified = true;
            setTimeout(() => {
              this.router.navigate(['/dashboard']);
            }, 2000);
          } else {
            this.email = authState.user?.email || '';
            
            // Automatically send verification email when the component loads
            if (!this.loading && !this.verified) {
              this.sendVerificationEmail();
            }
          }
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscription to prevent memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  // Convenience getter for easy access to form fields
  get f() { return this.verifyForm.controls; }

  // Private method to handle the email sending logic
  private sendVerificationEmail(): void {
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

    this.authService.verifyEmailWithCode(code).subscribe({
      next: () => {
        this.loading = false;
        this.verified = true;
        this.snackBar.open('Email verified successfully!', 'Close', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        
        // Redirect after showing success message
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
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

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Clear verification email timestamp on logout
        localStorage.removeItem('lastVerificationEmailSent');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        this.error = error.message || 'Logout failed';
        this.snackBar.open(this.error || 'Logout failed', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}