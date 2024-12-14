import { Routes } from '@angular/router';
import { SmartphoneComponent } from './smartphone/smartphone.component';

export const routes: Routes = [
    { path: 'smartphone', component: SmartphoneComponent },
    { path: '',   redirectTo: '/smartphone', pathMatch: 'full' }
];
