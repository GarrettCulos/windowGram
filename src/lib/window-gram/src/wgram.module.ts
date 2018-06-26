import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

// WGModules Libraries
import { WindowGramService } from './wgram.service';

@NgModule({
	imports: [
		BrowserModule
	],
	providers: [
		WindowGramService
	]
})
export class WindowGramModule {}
