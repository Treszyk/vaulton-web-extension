import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

console.log('[Vaulton Extension] Bootstrapping Angular Popup...');

bootstrapApplication(AppComponent, appConfig).catch((err) =>
	console.error(err),
);
