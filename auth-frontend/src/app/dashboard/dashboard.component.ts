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
  
  constructor(
    private authService: AuthService,
    private router: Router
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
