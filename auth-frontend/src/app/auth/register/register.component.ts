import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule, AsyncValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CsrfService } from '../../core/services/csrf.service';
import { CommonModule } from '@angular/common';
import { Observable, catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

// Custom Components
import { CustomButtonComponent } from '../../components/custom-button/custom-button.component';
import { CustomInputComponent } from '../../components/custom-input/custom-input.component';
import { WrapperComponent } from '../../components/wrapper/wrapper.component';

// Interfaces
export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface RegisterResponse {
  message?: string;
  verification_code?: string;
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomButtonComponent,
    CustomInputComponent,
    WrapperComponent
  ]
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  hidePassword = true;
  hideConfirmPassword = true;
  error: string | null = null;
  
  // Multi-step form properties
  currentStep = 1;
  maxSteps = 2;
  showSocialButtons = true;

  // Fields for custom input binding
  name: string = '';
  email: string = '';
  password: string = '';
  password_confirmation: string = '';
  termsAccepted: boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private csrfService: CsrfService,
    public router: Router,
    private toastr: ToastrService
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

  // Update form values when custom inputs change
  onNameChange(value: string): void {
    this.name = value;
    this.f['name'].setValue(value);
  }

  onEmailChange(value: string): void {
    this.email = value;
    this.f['email'].setValue(value);
  }

  onPasswordChange(value: string): void {
    this.password = value;
    this.f['password'].setValue(value);
  }

  onPasswordConfirmationChange(value: string): void {
    this.password_confirmation = value;
    this.f['password_confirmation'].setValue(value);
  }
  
  onTermsChange(event: any) {
    this.termsAccepted = event.target.checked;
  }

  // Password strength validator
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value: string = control.value || '';
    
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumeric = /[0-9]/.test(value);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);
    
    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecial;
    
    return !passwordValid ? { passwordStrength: true } : null;
  }

  // Password match validator
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('password_confirmation')?.value;
    
    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  // Email global validator using Abstract API
  emailGlobalValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const email = control.value;
      
      if (!email) {
        return of(null);
      }
      
      return control.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(email => 
          this.authService.validateEmail(email).pipe(
            map(response => {
              if (!response.is_valid) {
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
          
          // Show toastr error message
          if (this.f['name'].invalid) {
            this.toastr.error('Please enter a valid name');
          } else if (this.f['email'].invalid) {
            this.toastr.error('Please enter a valid email address');
          }
          
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
      
      this.toastr.error('Please fix the errors in the form');
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
          this.toastr.error(this.error);
          
          // Add validation error to the email field
          this.f['email'].setErrors({ invalidEmail: true, details: response.details });
          return;
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

    // Add a delay to show the spinner for longer (3 seconds)
    setTimeout(() => {
      this.authService.register({
        name: this.f['name'].value,
        email: this.f['email'].value,
        password: this.f['password'].value,
        password_confirmation: this.f['password_confirmation'].value
      }).subscribe({
        next: (response) => {
          // Add another delay before processing the response
          setTimeout(() => {
            this.loading = false;
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
            this.toastr.success('Registration successful! Please verify your email.');
            
            // Set flag to DISABLE automatic email sending when the verification page loads
            localStorage.setItem('verification_email_already_sent', 'true');
            
            // We don't need to explicitly request another verification email here
            // The backend already sent one during registration
            // Just navigate to the verification page
            window.location.href = '/verify-email';
          }, 2000); // 2 second delay after receiving response
        },
        error: (error) => {
          // Add delay before showing error
          setTimeout(() => {
            console.error('Registration failed:', error);
            this.loading = false;
            
            if (typeof error.error === 'string') {
              this.error = error.error;
              this.toastr.error(error.error);
            } else if (error.error?.message) {
              this.error = error.error.message;
              this.toastr.error(error.error.message);
            } else if (error.message) {
              this.error = error.message;
              this.toastr.error(error.message);
            } else {
              this.error = 'Registration failed. Please try again.';
              this.toastr.error(this.error);
            }
          }, 2000); // 2 second delay before showing error
        }
      });
    }, 3000); // 3 second delay before sending request
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