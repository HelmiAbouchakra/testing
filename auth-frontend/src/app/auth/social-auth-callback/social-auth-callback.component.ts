import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-social-auth-callback',
  templateUrl: './social-auth-callback.component.html',
  styleUrls: ['./social-auth-callback.component.scss'],
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule]
})
export class SocialAuthCallbackComponent implements OnInit {
  loading = true;
  error: string | null = null;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Get query parameters
    this.route.queryParams.subscribe(params => {
      const provider = params['provider'];
      const status = params['status'];
      const errorMessage = params['message'];
      
      if (status === 'success') {
        // Social login was successful, fetch the current user to update auth state
        this.authService.getCurrentUser().subscribe({
          next: (user) => {
            console.log('Social login successful, user:', user);
            
            // Check if email needs verification
            if (!user.email_verified_at) {
              console.log('Email verification required');
              
              // Following our email verification improvements, we don't need to show debug codes
              // Just redirect to verification page
              
              // Set flag to DISABLE automatic email sending when the verification page loads
              // since the backend should have already sent one
              localStorage.setItem('verification_email_already_sent', 'true');
              localStorage.setItem('registered_email', user.email);
              
              // Redirect to verification page
              this.router.navigate(['/auth/verify-email']);
            } else if (this.authService.isMfaRequired()) {
              console.log('MFA verification required');
              // MFA verification needed
              this.router.navigate(['/auth/mfa-verify']);
            } else {
              console.log('Fully authenticated, redirecting to dashboard');
              // Fully authenticated, go to dashboard
              this.router.navigate(['/dashboard']);
            }
            this.loading = false;
          },
          error: (err) => {
            console.error('Failed to get user info:', err);
            this.error = 'Authentication succeeded but we could not retrieve your information. Please try again.';
            this.loading = false;
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 3000);
          }
        });
      } else {
        // Handle error
        this.error = errorMessage || 'Social authentication failed. Please try again.';
        this.loading = false;
        
        // Redirect back to login after a delay
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 3000);
      }
    });
  }
}
