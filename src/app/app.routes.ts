import { Routes } from '@angular/router';
import { SmartphoneComponent } from './smartphone/smartphone.component';
import { DebugComponent } from './debug/debug.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';

export const routes: Routes = [
    { path: 'smartphone', component: SmartphoneComponent },
    { path: 'admin-dashboard', component: AdminDashboardComponent },
    { path: 'debug', component: DebugComponent },
    { path: '',   redirectTo: '/smartphone', pathMatch: 'full' }
];
