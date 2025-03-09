import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MfaService } from '../../core/services/mfa.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-mfa-verify',
  templateUrl: './mfa-verify.component.html',
  styleUrls: ['./mfa-verify.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class MfaVerifyComponent implements OnInit {
  verifyForm!: FormGroup;
  loading = false;
  returnUrl: string = '/dashboard';
  error: string | null = null;
  isRecoveryMode = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private mfaService: MfaService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // Initialize the verification form
    this.verifyForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    // Get return URL from route parameters or default to '/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
  }

  // Convenience getter for easy access to form fields
  get f() { return this.verifyForm.controls; }

  onSubmit(): void {
    // Stop here if form is invalid
    if (this.verifyForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    if (this.isRecoveryMode) {
      this.verifyWithRecoveryCode();
    } else {
      this.verifyWithCode();
    }
  }

  verifyWithCode(): void {
    this.mfaService.verifyCode(this.f['code'].value).subscribe({
      next: () => {
        this.snackBar.open('MFA verification successful!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate([this.returnUrl]);
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.message || 'Verification failed';
        this.loading = false;
        this.snackBar.open(this.error || 'Verification failed', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  verifyWithRecoveryCode(): void {
    this.mfaService.verifyRecoveryCode(this.f['code'].value).subscribe({
      next: () => {
        this.snackBar.open('Recovery code accepted. Please set up MFA again for future use.', 'Close', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate([this.returnUrl]);
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.message || 'Recovery code verification failed';
        this.loading = false;
        this.snackBar.open(this.error || 'Recovery code verification failed', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  toggleRecoveryMode(): void {
    this.isRecoveryMode = !this.isRecoveryMode;
    
    // Reset the form when switching modes
    this.verifyForm.reset();
    
    if (this.isRecoveryMode) {
      // Update validators for recovery code format
      this.f['code'].setValidators([Validators.required, Validators.pattern(/^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{8}-[a-zA-Z0-9]{8}-[a-zA-Z0-9]{8}$/)]);
    } else {
      // Update validators for 6-digit code
      this.f['code'].setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
    }
    
    this.f['code'].updateValueAndValidity();
  }
}
