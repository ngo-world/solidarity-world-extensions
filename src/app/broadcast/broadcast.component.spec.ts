import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BroadcastComponent } from './broadcast.component';

describe('BroadcastComponent', () => {
  let component: BroadcastComponent;
  let fixture: ComponentFixture<BroadcastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BroadcastComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BroadcastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
