import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserManagementComponent } from './user-management/user-management.component';
import { AuthGuard } from '../core/guards/auth.guard';

// Simplified routes - we'll check admin role in the component
const routes: Routes = [
  { path: 'users', component: UserManagementComponent, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'users', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
