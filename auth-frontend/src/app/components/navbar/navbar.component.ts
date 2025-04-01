import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/user.model';

// User interface with additional properties
interface UserWithRole extends User {
  role?: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isAuthenticated = false;
  isAdmin = false;
  user: UserWithRole | null = null;
  cartItemCount = 0;
  private authSubscription: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to auth state changes
    this.authSubscription = this.authService.authState$.subscribe({
      next: (authState) => {
        this.isAuthenticated = authState.isAuthenticated;
        if (authState.isAuthenticated && authState.user) {
          this.user = authState.user as UserWithRole;
          this.isAdmin = this.user.role === 'admin';
        } else {
          this.user = null;
          this.isAdmin = false;
        }
      },
      error: (error) => {
        console.error('Auth state error:', error);
      }
    });
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  /**
   * Get the first initial of the user's name for the avatar
   */
  getUserInitial(): string {
    return this.user?.name?.charAt(0).toLowerCase() || 'u';
  }

  /**
   * Navigate to the login page
   */
  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Navigate to the register page
   */
  navigateToRegister(): void {
    this.router.navigate(['/auth/register']);
  }

  /**
   * Navigate to the profile page
   */
  navigateToProfile(): void {
    this.router.navigate(['/auth/profile']);
  }

  /**
   * Log the user out
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
      }
    });
  }
}
