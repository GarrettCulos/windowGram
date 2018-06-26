import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { WindowGramModule } from '../lib/window-gram';

@NgModule({
	declarations: [
		AppComponent
	],
	imports: [
		BrowserModule,
		WindowGramModule
	],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule { }
