import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
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
export class ResetPasswordComponent implements OnInit {
  resetForm!: FormGroup;
  loading = false;
  submitted = false;
  success = false;
  token: string = '';
  email: string = '';
  hidePassword = true;
  hideConfirmPassword = true;
  error: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // Get token and email from route parameters
    this.token = this.route.snapshot.queryParams['token'] || '';
    this.email = this.route.snapshot.queryParams['email'] || '';

    if (!this.token || !this.email) {
      this.error = 'Invalid password reset link. Please request a new one.';
      this.snackBar.open(this.error, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      this.router.navigate(['/auth/forgot-password']);
      return;
    }

    this.resetForm = this.formBuilder.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordStrengthValidator
      ]],
      password_confirmation: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.resetForm.controls; }

  // Custom validator for password strength
  passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
    const value: string = control.value || '';
    
    if (!value) {
      return null;
    }

    const hasUpperCase = /[A-Z]+/.test(value);
    const hasLowerCase = /[a-z]+/.test(value);
    const hasNumeric = /[0-9]+/.test(value);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(value);

    const passwordValid = hasUpperCase && hasLowerCase && hasNumeric && hasSpecial;

    return !passwordValid ? { passwordStrength: true } : null;
  }

  // Custom validator for password match
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('password_confirmation')?.value;

    if (password !== confirmPassword) {
      control.get('password_confirmation')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      return null;
    }
  }

  onSubmit(): void {
    this.submitted = true;

    // Stop here if form is invalid
    if (this.resetForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const resetData = {
      email: this.email,
      token: this.token,
      password: this.f['password'].value,
      password_confirmation: this.f['password_confirmation'].value
    };

    this.authService.resetPassword(resetData)
      .subscribe({
        next: () => {
          this.success = true;
          this.loading = false;
          this.snackBar.open('Your password has been reset successfully. You can now login with your new password.', 'Close', {
            duration: 5000
          });
          this.router.navigate(['/auth/login']);
        },
        error: (error) => {
          this.error = error.message || 'An error occurred. Please try again.';
          this.loading = false;
          this.snackBar.open(this.error || 'An error occurred', 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  backToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
