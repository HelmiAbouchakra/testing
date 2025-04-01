import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MfaService } from '../../core/services/mfa.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';

// Custom Components
import { WrapperComponent } from '../../components/wrapper/wrapper.component';
import { CustomInputComponent } from '../../components/custom-input/custom-input.component';
import { CustomButtonComponent } from '../../components/custom-button/custom-button.component';

// Interfaces
export interface MfaSetupData {
  secret: string;
  qr_code: string;
  recovery_codes: string[];
}

@Component({
  selector: 'app-mfa-setup',
  templateUrl: './mfa-setup.component.html',
  styleUrls: ['./mfa-setup.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    WrapperComponent,
    CustomInputComponent,
    CustomButtonComponent
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
  
  // Fields for custom input binding
  password: string = '';
  verificationCode: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private mfaService: MfaService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private toastr: ToastrService
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

  // Update form values when custom inputs change
  onPasswordChange(value: string): void {
    this.password = value;
    this.p['password'].setValue(value);
  }

  onCodeChange(value: string): void {
    this.verificationCode = value;
    this.f['code'].setValue(value);
  }

  initiateSetup(): void {
    if (this.passwordForm.invalid) {
      // Show validation errors via toastr
      if (this.p['password'].errors?.['required']) {
        this.toastr.error('Password is required');
      }
      return;
    }

    this.loading = true;
    
    const password = this.passwordForm.get('password')?.value;

    this.mfaService.setupMfa(password).subscribe({
      next: (response: MfaSetupData) => {
        // Safely render the SVG QR code
        this.qrCodeData = this.sanitizer.bypassSecurityTrustHtml(response.qr_code);
        this.secret = response.secret;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        const errorMessage = error.error?.message || 'Failed to set up MFA';
        this.toastr.error(errorMessage);
      }
    });
  }

  verifyAndEnable(): void {
    if (this.setupForm.invalid) {
      // Show validation errors via toastr
      if (this.f['code'].errors?.['required']) {
        this.toastr.error('Verification code is required');
      } else if (this.f['code'].errors?.['pattern']) {
        this.toastr.error('Verification code must be 6 digits');
      }
      return;
    }

    this.loading = true;

    this.mfaService.enableMfa(this.f['code'].value).subscribe({
      next: (response: MfaSetupData) => {
        this.loading = false;
        this.setupStep = 3;
        this.setupComplete = true;
        this.recoveryCodes = response.recovery_codes || [];
        
        this.toastr.success('MFA has been successfully enabled!');
      },
      error: (error: HttpErrorResponse) => {
        this.loading = false;
        const errorMessage = error.error?.message || 'Failed to verify code';
        this.toastr.error(errorMessage);
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
    this.router.navigate(['/auth/profile']);
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret).then(() => {
      this.toastr.info('Secret copied to clipboard!');
    });
  }

  copyRecoveryCodes(): void {
    const codes = this.recoveryCodes.join('\n');
    navigator.clipboard.writeText(codes).then(() => {
      this.toastr.info('Recovery codes copied to clipboard!');
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
    this.toastr.success('Recovery codes downloaded');
  }
}