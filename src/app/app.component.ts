import { Component } from '@angular/core';
import { WindowGramService } from '../lib/window-gram';


@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent {

	constructor(
		public windowG: WindowGramService
	) {}
	title = 'app';

	generateWindow() {
		this.windowG.generateChannel('newWindow1', 'https://www.google.com');
	}
}
