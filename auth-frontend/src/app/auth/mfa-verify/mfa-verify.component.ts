import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MfaService } from '../../core/services/mfa.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

// Custom Components
import { WrapperComponent } from '../../components/wrapper/wrapper.component';
import { CustomInputComponent } from '../../components/custom-input/custom-input.component';
import { CustomButtonComponent } from '../../components/custom-button/custom-button.component';

// Interfaces
export interface MfaVerifyRequest {
  code: string;
}

export interface MfaVerifyResponse {
  success: boolean;
  message?: string;
  recovery_codes?: string[];
}

@Component({
  selector: 'app-mfa-verify',
  templateUrl: './mfa-verify.component.html',
  styleUrls: ['./mfa-verify.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    WrapperComponent,
    CustomInputComponent,
    CustomButtonComponent
  ]
})
export class MfaVerifyComponent implements OnInit, AfterViewInit {
  @ViewChild('codeInput1') codeInput1!: ElementRef;
  
  verifyForm!: FormGroup;
  loading = false;
  returnUrl: string = '/dashboard';
  isRecoveryMode = false;
  
  // Fields for custom input binding
  verificationCode: string = '';
  codeDigits: string[] = ['', '', '', '', '', '']; // For the 6-digit code

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private mfaService: MfaService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // Initialize the verification form
    this.verifyForm = this.formBuilder.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    // Get return URL from route parameters or default to '/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Check if we should start in recovery mode
    const recoveryMode = this.route.snapshot.queryParams['recovery'];
    if (recoveryMode === 'true') {
      this.isRecoveryMode = true;
      this.f['code'].setValidators([Validators.required, Validators.pattern(/^[a-zA-Z0-9]{8}-[a-zA-Z0-9]{8}-[a-zA-Z0-9]{8}-[a-zA-Z0-9]{8}$/)]);
      this.f['code'].updateValueAndValidity();
    }
  }
  
  ngAfterViewInit(): void {
    // Auto-focus the first input when in authenticator mode
    if (!this.isRecoveryMode && this.codeInput1) {
      setTimeout(() => {
        this.codeInput1.nativeElement.focus();
      }, 0);
    }
  }

  // Convenience getter for easy access to form fields
  get f() { return this.verifyForm.controls; }

  // Update form values when custom inputs change
  onCodeChange(value: string): void {
    this.verificationCode = value;
    this.f['code'].setValue(value);
    
    // Check if the form is valid after the value change
    this.f['code'].updateValueAndValidity();
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
    this.f['code'].setValue(this.verificationCode);
    
    // Auto-submit when all 6 digits are entered
    if (this.verificationCode.length === 6 && this.verifyForm.valid) {
      this.onSubmit();
    }
  }

  onSubmit(): void {
    // Stop here if form is invalid
    if (this.verifyForm.invalid) {
      // Show validation errors via toastr
      if (this.f['code'].errors?.['required']) {
        this.toastr.error('Code is required');
      } else if (this.f['code'].errors?.['pattern']) {
        if (this.isRecoveryMode) {
          this.toastr.error('Invalid recovery code format');
        } else {
          this.toastr.error('Code must be 6 digits');
        }
      }
      return;
    }

    this.loading = true;

    if (this.isRecoveryMode) {
      this.verifyWithRecoveryCode();
    } else {
      this.verifyWithCode();
    }
  }

  verifyWithCode(): void {
    this.mfaService.verifyCode(this.f['code'].value).subscribe({
      next: () => {
        this.toastr.success('MFA verification successful!');
        this.router.navigate([this.returnUrl]);
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = error.error?.message || 'Verification failed';
        this.loading = false;
        this.toastr.error(errorMessage);
      }
    });
  }

  verifyWithRecoveryCode(): void {
    this.mfaService.verifyRecoveryCode(this.f['code'].value).subscribe({
      next: () => {
        this.toastr.success('Recovery code accepted. Please set up MFA again for future use.');
        this.router.navigate([this.returnUrl]);
      },
      error: (error: HttpErrorResponse) => {
        const errorMessage = error.error?.message || 'Recovery code verification failed';
        this.loading = false;
        this.toastr.error(errorMessage);
      }
    });
  }

  toggleRecoveryMode(): void {
    this.isRecoveryMode = !this.isRecoveryMode;
    
    // Reset the form when switching modes
    this.verifyForm.reset();
    this.verificationCode = '';
    this.codeDigits = ['', '', '', '', '', ''];
    
    if (this.isRecoveryMode) {
      // Update validators for recovery code format - using a more flexible pattern
      this.f['code'].setValidators([Validators.required]);
    } else {
      // Update validators for 6-digit code
      this.f['code'].setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
      
      // Focus the first input when switching to authenticator mode
      setTimeout(() => {
        if (this.codeInput1) {
          this.codeInput1.nativeElement.focus();
        }
      }, 0);
    }
    
    this.f['code'].updateValueAndValidity();
  }
}
