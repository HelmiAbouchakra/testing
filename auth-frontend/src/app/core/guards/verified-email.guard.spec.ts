import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { verifiedEmailGuard } from './verified-email.guard';

describe('verifiedEmailGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => verifiedEmailGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
