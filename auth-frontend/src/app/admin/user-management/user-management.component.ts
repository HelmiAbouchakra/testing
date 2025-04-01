import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { User } from '../../core/models/user.model';
import { ToastrService } from 'ngx-toastr';
import { CustomButtonComponent } from '../../components/custom-button/custom-button.component';
import { CustomInputComponent } from '../../components/custom-input/custom-input.component';
import { WrapperComponent } from '../../components/wrapper/wrapper.component';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CustomButtonComponent,
    CustomInputComponent,
    WrapperComponent
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  loading = false;
  adminForm!: FormGroup;
  showAdminForm = false;
  
  // Form fields
  name: string = '';
  email: string = '';
  password: string = '';
  password_confirmation: string = '';

  constructor(
    private adminService: AdminService,
    private formBuilder: FormBuilder,
    private toastr: ToastrService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // First check if user is authenticated
    this.authService.authState$.subscribe(authState => {
      console.log('User data in component:', authState.user);
      
      if (!authState.isAuthenticated) {
        this.toastr.error('You need to be logged in to access this area');
        this.router.navigate(['/auth/login']);
        return;
      }
      
      // Directly check role from backend
      this.authService.checkRole().subscribe({
        next: (response) => {
          console.log('Role check response:', response);
          
          if (!response.is_admin) {
            console.log('User is not admin according to backend check');
            this.toastr.error('You do not have permission to access this area');
            this.router.navigate(['/dashboard']);
            return;
          }
          
          // If we get here, user is confirmed as admin
          console.log('User confirmed as admin, loading users');
          this.loadUsers();
          this.initAdminForm();
        },
        error: (error) => {
          console.error('Error checking role:', error);
          this.toastr.error('Error verifying permissions');
          this.router.navigate(['/dashboard']);
        }
      });
    });
  }

  initAdminForm(): void {
    this.adminForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  // Password match validator
  passwordMatchValidator(group: FormGroup): any {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('password_confirmation')?.value;
    
    if (password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  // Update form values when custom inputs change
  onNameChange(value: string): void {
    this.name = value;
    this.adminForm.get('name')?.setValue(value);
  }

  onEmailChange(value: string): void {
    this.email = value;
    this.adminForm.get('email')?.setValue(value);
  }

  onPasswordChange(value: string): void {
    this.password = value;
    this.adminForm.get('password')?.setValue(value);
  }

  onPasswordConfirmationChange(value: string): void {
    this.password_confirmation = value;
    this.adminForm.get('password_confirmation')?.setValue(value);
  }

  loadUsers(): void {
    this.loading = true;
    this.adminService.getUsers().subscribe({
      next: (response) => {
        this.users = response.users || [];
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error('Failed to load users');
        console.error('Error loading users:', error);
        this.loading = false;
      }
    });
  }

  toggleAdminForm(): void {
    this.showAdminForm = !this.showAdminForm;
    if (this.showAdminForm) {
      this.adminForm.reset();
      this.name = '';
      this.email = '';
      this.password = '';
      this.password_confirmation = '';
    }
  }

  createAdmin(): void {
    if (this.adminForm.invalid) {
      this.toastr.error('Please fill out all required fields correctly');
      return;
    }

    this.loading = true;
    const adminData = {
      name: this.adminForm.value.name,
      email: this.adminForm.value.email,
      password: this.adminForm.value.password,
      password_confirmation: this.adminForm.value.password_confirmation
    };

    this.adminService.createAdmin(adminData).subscribe({
      next: (response) => {
        this.toastr.success('Admin user created successfully');
        this.loadUsers();
        this.toggleAdminForm();
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error(error.error?.message || 'Failed to create admin user');
        console.error('Error creating admin:', error);
        this.loading = false;
      }
    });
  }

  updateRole(userId: number, newRole: string): void {
    this.loading = true;
    this.adminService.updateUserRole(userId, newRole).subscribe({
      next: (response) => {
        this.toastr.success('User role updated successfully');
        this.loadUsers();
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error(error.error?.message || 'Failed to update user role');
        console.error('Error updating role:', error);
        this.loading = false;
      }
    });
  }

  deleteUser(userId: number): void {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      this.loading = true;
      this.adminService.deleteUser(userId).subscribe({
        next: (response) => {
          this.toastr.success('User deleted successfully');
          this.loadUsers();
          this.loading = false;
        },
        error: (error) => {
          this.toastr.error(error.error?.message || 'Failed to delete user');
          console.error('Error deleting user:', error);
          this.loading = false;
        }
      });
    }
  }
}
