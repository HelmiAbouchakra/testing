import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { User } from '../core/models/user.model';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule
  ]
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  isResendingEmail = false;
  verificationMessage = '';
  verificationSuccess = false;
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.authService.authState$.subscribe({
      next: (authState) => {
        if (authState.isAuthenticated) {
          this.user = authState.user;
        } else {
          // Redirect to login if not authenticated
          this.router.navigate(['/auth/login']);
        }
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this.router.navigate(['/auth/login']);
      }
    });
  }

  resendVerificationEmail(): void {
    if (this.isResendingEmail) {
      return;
    }
    
    this.isResendingEmail = true;
    this.verificationMessage = '';
    
    this.authService.resendVerificationEmail().subscribe({
      next: (response) => {
        this.isResendingEmail = false;
        this.verificationSuccess = true;
        this.verificationMessage = 'Verification email sent successfully. Please check your inbox.';
        
        // Show a snackbar message
        this.snackBar.open('Verification email sent! Please check your inbox and spam folder.', 'Close', {
          duration: 6000,
          panelClass: 'success-snackbar'
        });
      },
      error: (error) => {
        this.isResendingEmail = false;
        this.verificationSuccess = false;
        this.verificationMessage = error.message || 'Failed to send verification email. Please try again later.';
        
        // Show an error snackbar
        this.snackBar.open('Failed to send verification email. Please try again later.', 'Close', {
          duration: 6000,
          panelClass: 'error-snackbar'
        });
        
        console.error('Error sending verification email:', error);
      }
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Error during logout:', error);
      }
    });
  }
}
