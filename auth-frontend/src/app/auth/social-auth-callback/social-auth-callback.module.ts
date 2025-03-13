import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { SocialAuthCallbackComponent } from './social-auth-callback.component';

const routes: Routes = [
  { path: '', component: SocialAuthCallbackComponent }
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class SocialAuthCallbackModule { }
