import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-custom-input',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './custom-input.component.html',
  styleUrls: ['./custom-input.component.scss'],
})
export class CustomInputComponent implements OnInit {
  @Input() placeholder: string = '';
  @Input() type: string = 'text'; // Supports 'text' or 'password'
  @Input() value: string = '';
  @Input() borderColor: string = '#ccc';
  @Output() valueChange = new EventEmitter<string>();

  // FontAwesome icons
  faEye = faEye;
  faEyeSlash = faEyeSlash;

  showPassword: boolean = false; // Toggle for password visibility
  isActive: boolean = false; // Track if the input is focused
  hasValue: boolean = false; // Track if the input has a value
  inputId: string = ''; // Unique ID for the input field

  ngOnInit() {
    // Generate a unique ID for the input
    this.inputId = 'input_' + Math.random().toString(36).substring(2, 11);
    
    // Check if there's an initial value
    this.hasValue = this.value !== '';
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value;
    this.hasValue = this.value !== '';
    this.valueChange.emit(input.value);
  }

  onFocus() {
    this.isActive = true;
  }

  onBlur() {
    this.isActive = false;
    // Update hasValue status when the input loses focus
    this.hasValue = this.value !== '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // Determine input type based on show/hide state
  get inputType(): string {
    if (this.type === 'password') {
      return this.showPassword ? 'text' : 'password';
    }
    return this.type;
  }
}
