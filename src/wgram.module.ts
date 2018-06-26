import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';

// Components
import {PostMessageModule} from 'ngx-post-message/ngx-post-message';

// WGModules Libraries
import { WindowGramService } from './wgram.service';

@NgModule({
	imports: [
		HttpModule,
		BrowserModule,
		PostMessageModule
	],
	providers: [
		WindowGramService
	]
})
export class WindowGramModules {}
