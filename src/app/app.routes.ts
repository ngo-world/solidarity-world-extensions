import { Routes } from '@angular/router';
import { SmartphoneComponent } from './smartphone/smartphone.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { BackgroundComponent } from './background/background.component';
import { BroadcastComponent } from './broadcast/broadcast.component';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: 'smartphone', component: SmartphoneComponent },
  { path: 'admin-dashboard', component: AdminDashboardComponent },
  { path: 'background', component: BackgroundComponent },
  { path: 'broadcast', component: BroadcastComponent },
  { path: 'home', component: HomeComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
];
