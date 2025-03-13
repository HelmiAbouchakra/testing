// custom-button.component.ts
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, ElementRef, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-custom-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './custom-button.component.html',
  styleUrls: ['./custom-button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomButtonComponent implements OnChanges {
  @Input() text: string = 'Button';
  @Input() backgroundColor: string = '#9147ff';
  @Input() hoverColor?: string;
  @Input() textColor: string = '#fff';
  @Input() disabled: boolean = false;
  @Input() disabledColor?: string; // New input for disabled color
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() ariaLabel?: string;
  @Input() loading: boolean = false;
  
  @Output() buttonClick = new EventEmitter<void>();
  
  constructor(private el: ElementRef) {}
  
  ngOnChanges(changes: SimpleChanges): void {
    this.updateCssVariables();
  }
  
  private updateCssVariables(): void {
    // Get the button element
    const button = this.el.nativeElement.querySelector('.custom-button');
    if (button) {
      // Set CSS variables
      button.style.setProperty('--background-color', this.backgroundColor);
      button.style.setProperty('--hover-color', this.effectiveHoverColor);
      button.style.setProperty('--text-color', this.textColor);
      button.style.setProperty('--disabled-color', this.effectiveDisabledColor);
    }
  }
  
  get effectiveHoverColor(): string {
    return this.hoverColor || this.adjustBrightness(this.backgroundColor, 20);
  }
  
  get effectiveDisabledColor(): string {
    return this.disabledColor || this.adjustBrightness(this.backgroundColor, -30);
  }
  
  get effectiveAriaLabel(): string {
    return this.ariaLabel || this.text;
  }
  
  onClick(event: Event) {
    if (!this.disabled && !this.loading) {
      this.buttonClick.emit();
    }
  }
  
  // Utility to lighten or darken the button color
  private adjustBrightness(hex: string, percent: number): string {
    // Handle transparent or non-hex colors
    if (!hex || hex === 'transparent' || !hex.startsWith('#')) {
      return hex;
    }
        
    try {
      const num = parseInt(hex.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) + amt;
      const G = ((num >> 8) & 0x00ff) + amt;
      const B = (num & 0x0000ff) + amt;
      return `#${(
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)}`;
    } catch (e) {
      console.error('Failed to adjust color brightness:', hex);
      return hex;
    }
  }
}