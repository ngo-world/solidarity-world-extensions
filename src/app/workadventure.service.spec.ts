import { TestBed } from '@angular/core/testing';

import { WorkadventureService } from './workadventure.service';

describe('WorkadventureService', () => {
  let service: WorkadventureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkadventureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
