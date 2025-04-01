import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth.service';
import { User } from '../core/models/user.model';
import { NavbarComponent } from '../components/navbar/navbar.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    NavbarComponent
  ]
})
export class DashboardComponent implements OnInit {
  user: User | null = null;
  isAuthenticated = false;
  
  constructor(
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    this.authService.authState$.subscribe({
      next: (authState) => {
        this.isAuthenticated = authState.isAuthenticated;
        if (authState.isAuthenticated) {
          this.user = authState.user;
        }
      }
    });
  }
}
