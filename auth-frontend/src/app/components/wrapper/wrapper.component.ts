import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-wrapper',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wrapper.component.html',
  styleUrls: ['./wrapper.component.scss'],
})
export class WrapperComponent {
  @Input() width: string = '';
  @Input() height: string = 'auto';
  @Input() center: boolean = true;
  @Input() fullScreen: boolean = false;
  @Input() hasBackground: boolean = true;
  @Input() transparentBg: boolean = false;
  @Input() showBrandElements: boolean = false;
  @Input() showLogo: boolean = true;
}