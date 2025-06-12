import { TestBed } from '@angular/core/testing';

import { FolderProcessorService } from './folder-processor.service';

describe('FolderProcessorService', () => {
  let service: FolderProcessorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FolderProcessorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
