import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { mfaGuard } from './mfa.guard';

describe('mfaGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => mfaGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
