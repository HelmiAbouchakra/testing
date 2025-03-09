import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MfaService } from '../../core/services/mfa.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
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
    MatTabsModule,
    MatDividerModule
  ]
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  user: any = null;
  loading = false;
  mfaEnabled = false;
  hideCurrentPassword = true;
  hideNewPassword = true;
  hideConfirmPassword = true;
  error: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private mfaService: MfaService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadUserProfile();
    
    this.profileForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]]
    });

    this.passwordForm = this.formBuilder.group({
      current_password: ['', Validators.required],
      password: ['', [
        Validators.required,
        Validators.minLength(8)
      ]],
      password_confirmation: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  loadUserProfile(): void {
    this.loading = true;
    this.authService.checkAuthState();
    
    // Subscribe to auth state changes
    this.authService.authState$.subscribe({
      next: (authState) => {
        if (authState.isAuthenticated) {
          this.user = authState.user;
          this.mfaEnabled = this.user?.mfa_enabled || false;
          
          // Populate profile form
          this.profileForm.patchValue({
            name: this.user?.name || '',
            email: this.user?.email || ''
          });
        }
        this.loading = false;
      },
      error: (error: any) => {
        this.error = error.message || 'Failed to load profile';
        this.loading = false;
        this.snackBar.open(this.error || 'An error occurred', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  // Convenience getters for easy access to form fields
  get pf() { return this.profileForm.controls; }
  get pwf() { return this.passwordForm.controls; }

  // Custom validator for password match
  passwordMatchValidator(control: FormGroup): { [key: string]: boolean } | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('password_confirmation')?.value;

    if (password !== confirmPassword) {
      control.get('password_confirmation')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      return null;
    }
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Call API to update profile
    // This is a placeholder - implement the actual API call
    setTimeout(() => {
      this.loading = false;
      this.snackBar.open('Profile updated successfully', 'Close', {
        duration: 3000
      });
    }, 1000);
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Call API to update password
    // This is a placeholder - implement the actual API call
    setTimeout(() => {
      this.loading = false;
      this.passwordForm.reset();
      this.snackBar.open('Password updated successfully', 'Close', {
        duration: 3000
      });
    }, 1000);
  }

  setupMfa(): void {
    this.router.navigate(['/auth/mfa-setup']);
  }

  disableMfa(): void {
    this.loading = true;
    this.error = null;

    // Call API to disable MFA
    // This is a placeholder - implement the actual API call
    setTimeout(() => {
      this.mfaEnabled = false;
      this.loading = false;
      this.snackBar.open('Two-factor authentication disabled', 'Close', {
        duration: 3000
      });
    }, 1000);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        this.error = error.message || 'Logout failed';
        this.snackBar.open(this.error || 'An error occurred', 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}
