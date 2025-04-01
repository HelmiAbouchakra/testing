import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

interface AdminResponse {
  message: string;
  user?: User;
  users?: User[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Get all users
   */
  getUsers(): Observable<AdminResponse> {
    return this.http.get<AdminResponse>(`${this.apiUrl}/v1/admin/users`, {
      withCredentials: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Create a new admin user
   */
  createAdmin(userData: { name: string, email: string, password: string, password_confirmation: string }): Observable<AdminResponse> {
    return this.http.post<AdminResponse>(`${this.apiUrl}/v1/admin/users/admin`, userData, {
      withCredentials: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Update user role
   */
  updateUserRole(userId: number, role: string): Observable<AdminResponse> {
    return this.http.put<AdminResponse>(`${this.apiUrl}/v1/admin/users/${userId}/role`, { role }, {
      withCredentials: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Delete a user
   */
  deleteUser(userId: number): Observable<AdminResponse> {
    return this.http.delete<AdminResponse>(`${this.apiUrl}/v1/admin/users/${userId}`, {
      withCredentials: true,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    });
  }
}
