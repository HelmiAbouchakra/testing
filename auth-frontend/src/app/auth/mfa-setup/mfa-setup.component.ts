import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-mfa-setup',
  templateUrl: './mfa-setup.component.html',
  styleUrls: ['./mfa-setup.component.scss'],
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
    MatListModule,
    MatTooltipModule
  ]
})
export class MfaSetupComponent implements OnInit {
  setupForm!: FormGroup;
  passwordForm!: FormGroup;
  loading = false;
  setupComplete = false;
  setupStep = 1; // 1: Initial setup, 2: Verification, 3: Recovery codes
  qrCodeUrl: string = '';
  qrCodeData: SafeHtml | null = null;
  secret: string = '';
  recoveryCodes: string[] = [];
  error: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private mfaService: MfaService,
    private router: Router,
    private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    // Form for verification code
    this.setupForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    // Form for password
    this.passwordForm = this.formBuilder.group({
      password: ['', [Validators.required]]
    });
  }

  // Convenience getters for form fields
  get f() { return this.setupForm.controls; }
  get p() { return this.passwordForm.controls; }

  initiateSetup(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;
    
    const password = this.passwordForm.get('password')?.value;

    this.mfaService.setupMfa(password).subscribe({
      next: (response) => {
        // Safely render the SVG QR code
        this.qrCodeData = this.sanitizer.bypassSecurityTrustHtml(response.qr_code);
        this.secret = response.secret;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.message || 'Failed to set up MFA';
        this.loading = false;
        this.snackBar.open(this.error || 'Failed to set up MFA', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  verifyAndEnable(): void {
    if (this.setupForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.mfaService.enableMfa(this.f['code'].value).subscribe({
      next: (response) => {
        this.loading = false;
        this.setupStep = 3;
        this.setupComplete = true;
        this.recoveryCodes = response.recovery_codes || [];
        
        this.snackBar.open('MFA has been successfully enabled!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error: HttpErrorResponse) => {
        this.error = error.message || 'Failed to verify code';
        this.loading = false;
        this.snackBar.open(this.error || 'Failed to verify code', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  nextStep(): void {
    if (this.setupStep < 3) {
      this.setupStep++;
    } else {
      this.finishSetup();
    }
  }

  previousStep(): void {
    if (this.setupStep > 1) {
      this.setupStep--;
    }
  }

  finishSetup(): void {
    this.router.navigate(['/profile']);
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret).then(() => {
      this.snackBar.open('Secret copied to clipboard!', 'Close', {
        duration: 2000
      });
    });
  }

  copyRecoveryCodes(): void {
    const codes = this.recoveryCodes.join('\n');
    navigator.clipboard.writeText(codes).then(() => {
      this.snackBar.open('Recovery codes copied to clipboard!', 'Close', {
        duration: 2000
      });
    });
  }

  downloadRecoveryCodes(): void {
    const codes = this.recoveryCodes.join('\n');
    const blob = new Blob([codes], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfa-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}