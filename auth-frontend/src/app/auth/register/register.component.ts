import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule, AsyncValidator, AsyncValidatorFn } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CsrfService } from '../../core/services/csrf.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { Observable, catchError, debounceTime, distinctUntilChanged, first, map, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatStepperModule
  ]
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  error: string | null = null;
  
  // New multi-step form properties
  currentStep = 1;
  maxSteps = 2;
  showSocialButtons = true;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private csrfService: CsrfService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // Initialize the registration form
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', 
        {
          validators: [Validators.required, Validators.email],
          asyncValidators: [this.emailGlobalValidator()],
          updateOn: 'blur'
        }
      ],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        this.passwordStrengthValidator
      ]],
      password_confirmation: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });

    // Get CSRF token on component initialization
    this.csrfService.getCsrfToken().subscribe();

    // Update showSocialButtons based on current step
    this.registerForm.get('password')?.valueChanges.subscribe(() => {
      // If user is on step 2 and typing a password, hide social buttons
      if (this.currentStep === 2) {
        this.showSocialButtons = false;
      }
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.registerForm.controls; }

  // Password strength validator
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value: string = control.value || '';
    
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
    
    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecialChar;
    
    return !passwordValid ? { passwordStrength: true } : null;
  }

  // Password match validator
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('password_confirmation')?.value;
    
    return password && confirmPassword && password !== confirmPassword 
      ? { passwordMismatch: true } 
      : null;
  }

  // Email global validator using Abstract API
  emailGlobalValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      // Don't validate empty emails or emails that don't pass basic validation
      const email = control.value;
      if (!email || !Validators.email(control)) {
        return of(null);
      }

      // Add a loading indicator
      control.markAsPending();
      
      // Debounce to prevent too many API calls
      return of(email).pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(emailValue => 
          this.authService.validateEmail(emailValue).pipe(
            first(),
            map(response => {
              // Check if the email is valid globally
              if (!response.is_valid) {
                console.log('Email validation failed:', response);
                // Return appropriate error based on response
                if (response.details.error) {
                  // API error, don't block the user
                  console.warn('Email validation service error:', response.details.error);
                  return null;
                }
                
                return { invalidEmail: true, details: response.details };
              }
              
              // If it's a disposable email, we might want to reject it
              if (response.details.is_disposable) {
                return { disposableEmail: true };
              }
              
              return null;
            }),
            catchError(error => {
              console.error('Email validation error:', error);
              // Don't block the user if the API fails
              return of(null);
            })
          )
        )
      );
    };
  }

  // Method to go to next step
  nextStep(): void {
    if (this.currentStep < this.maxSteps) {
      // Validate current step
      if (this.currentStep === 1) {
        if (this.f['name'].invalid || this.f['email'].invalid) {
          // Mark fields as touched to show validation errors
          this.f['name'].markAsTouched();
          this.f['email'].markAsTouched();
          return;
        }
      }
      
      this.currentStep++;
      
      // Hide social buttons when moving to password step
      if (this.currentStep === 2) {
        this.showSocialButtons = false;
      }
    }
  }

  // Method to go back to previous step
  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      
      // Show social buttons when going back to step 1
      if (this.currentStep === 1) {
        this.showSocialButtons = true;
      }
    }
  }

  onSubmit(): void {
    // Stop here if form is invalid
    if (this.registerForm.invalid) {
      // Mark all fields as touched to trigger validation display
      Object.keys(this.f).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.error = null;

    // First check if the email is valid globally
    this.authService.validateEmail(this.f['email'].value).subscribe({
      next: (response) => {
        if (!response.is_valid) {
          // Email is not valid globally
          this.loading = false;
          this.error = 'The email address appears to be invalid or not deliverable.';
          this.snackBar.open(this.error, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          // Add validation error to the email field
          this.f['email'].setErrors({ invalidEmail: true, details: response.details });
          return;
        }

        // If the email is disposable, show a warning but allow registration
        if (response.details.is_disposable) {
          this.snackBar.open('Warning: You are using a temporary email address. You may not receive important notifications.', 'Continue Anyway', {
            duration: 8000,
            panelClass: ['warning-snackbar']
          });
        }

        // Proceed with registration if email is valid
        this.registerUser();
      },
      error: (error) => {
        console.error('Email validation error:', error);
        // Continue with registration even if validation fails
        this.registerUser();
      }
    });
  }

  // Helper method to handle the registration process
  private registerUser(): void {
    this.loading = true;
    console.log('Starting registration process...');

    this.authService.register({
      name: this.f['name'].value,
      email: this.f['email'].value,
      password: this.f['password'].value,
      password_confirmation: this.f['password_confirmation'].value
    }).subscribe({
      next: (response) => {
        console.log('Registration successful, redirecting to verification page immediately');
        
        // Set flags to indicate registration just happened
        localStorage.setItem('just_registered', 'true');
        localStorage.setItem('registered_email', this.f['email'].value);
        localStorage.setItem('stay_on_verification', 'true'); // Add flag to prevent redirects
        
        // Store verification code for debugging if it's provided in the response
        if (response.verification_code) {
          localStorage.setItem('debug_verification_code', response.verification_code);
          console.log('Debug verification code stored:', response.verification_code);
        }
        
        // Show success message
        this.snackBar.open('Registration successful! Please verify your email.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Set flag to DISABLE automatic email sending when the verification page loads
        localStorage.setItem('verification_email_already_sent', 'true');
        
        // We don't need to explicitly request another verification email here
        // The backend already sent one during registration
        // Just navigate to the verification page
        window.location.href = '/verify-email';
      },
      error: (error) => {
        console.error('Registration failed:', error);
        this.error = error.message || 'Registration failed';
        this.loading = false;
        this.snackBar.open(this.error || 'Registration failed', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  /**
   * Handle social registration button clicks
   */
  registerWithSocial(provider: 'google' | 'facebook'): void {
    if (provider === 'google') {
      this.authService.loginWithGoogle();
    } else if (provider === 'facebook') {
      this.authService.loginWithFacebook();
    }
  }
}