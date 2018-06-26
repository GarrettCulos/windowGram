
// angular
import { Injectable } from '@angular/core';

import { WindowGramBase, WgMessageBody, WgMessage } from './wgram.base';
import { WGChannel } from './wgram.channel';
import { UUID } from 'angular2-uuid';
import { Subject } from 'rxjs/Subject';

@Injectable()
export class WindowGramService extends WindowGramBase {

	readonly type: 'child' | 'parent' ;
	protected currentWindow: Window;

	// parent only data
	protected children: { [s: string]: WGChannel };

	// child only data
	public stream: Subject<WgMessage>;
	private windowSettings: any;
	private parentId: string;

	/**
	 * This service pulls double dutty, as a parent it estabilises new window connections via channels,
	 * and as a child it communicates to its channel
	 *
	 * Child windows are determined by if the window object has an opener property
	 * Parent windows are all other instances of this service
	 *
	 * Initalization of this service adds message listeners
	 */
	constructor ( ) {

		super();
		if ( window.opener ) {
			this.type = 'child';
			this.childSetup();
			console.log('[ wgram ] IM A CHILD');
		} else {
			this.type = 'parent';
			this.id = UUID.UUID();
			console.log('[ wgram ] IM A PARENT');
		}

		this.children = {};
		this.currentWindow.addEventListener('message', (event) =>  this.addChildParentListeners(event.data) );
		this.setBeforeClose();

	}

	/**
	 * Broadcase message to all children
	 */
	public broadcastMessage(channel: string, m: WgMessageBody) {
		Object.keys( this.children ).forEach( child => {
			this.children[child].dispatchMessage(channel, m);
		});
	}

	/**
	 * parentOnly
	 * Generate window app channel
	 */
	public generateChannel(name: string, path: string) {
		const newChannel = new WGChannel({ name: name, path: path}, this.id);
		this.children[newChannel.childId] = newChannel;
		return this.children[newChannel.childId];
	}

	/**
	 * Call before Destroying
	 */
	public destruction() {
		if ( this.stream ) {
			this.stream.unsubscribe();
		}
		Object.keys(this.children).forEach( c => {
			this.children[c].destruction();
		});
		this.currentWindow.removeEventListener( 'message', (ev: any) => this.addChildParentListeners(ev.data) );
	}

	/**
	 * childrenOnly
	 * For child windows set screen position and resize listeners.
	 */
	private childSetup() {

		this.stream = new Subject();
		const name = this.currentWindow.name;
		const windowName = `${name}-windowPosition`;
		const windowSettings = localStorage.getItem(windowName);

		if ( windowSettings ) {
			const coordinates = windowSettings.split(':');
			this.currentWindow.resizeTo( parseInt(coordinates[0], 0), parseInt(coordinates[1], 0) );
			this.currentWindow.moveTo( parseInt(coordinates[2], 0), parseInt(coordinates[3], 0) );
		}

		let resizeTimeout;
		const resizeThrottler = () => {
			if ( !resizeTimeout ) {
				resizeTimeout = setTimeout( () => {
					resizeTimeout = null;
					resizeHandler();
				}, 66);
			}
		};

		/**
		 * Chrom dosnt update window.screenX and window.screenY within the setInterval
		 * TODO: find a workaround to get these quantaties within interval
		 * WORKAROUND: dispatch resize event to trigger screenX / Y update. (also dosnt work)
		 */
		// let oldX = this.currentWindow.screenX;
		// let oldY = this.currentWindow.screenY;

		// setInterval( () => {
		// 	const resizeEvent = this.currentWindow.document.createEvent('UIEvents');
		// 	resizeEvent.initUIEvent('resize', true, false, this.currentWindow, 0);
		// 	this.currentWindow.dispatchEvent(resizeEvent);
		// 	if(oldX !== this.currentWindow.screenX || oldY !== this.currentWindow.screenY) {
		// 		resizeHandler();
		// 	}
		// 	oldX = this.currentWindow.screenX;
		// 	oldY = this.currentWindow.screenY;
		// }, 2000);

		const resizeHandler = () => {
			const outerHeight = this.currentWindow.outerHeight;
			const outerWidth = this.currentWindow.outerWidth;
			const screenLeft = this.currentWindow.screenX;
			const screenTop = this.currentWindow.screenY;
			localStorage.setItem(windowName, `${outerWidth}:${outerHeight}:${screenLeft}:${screenTop}`);
		};

		this.currentWindow.addEventListener('resize', resizeThrottler, false);

	}
	/**
	 * set before close listener.
	 */
	private setBeforeClose() {

		this.currentWindow.addEventListener( 'beforeunload', (event) => {
			this.broadcastMessage('closeing', { targetId: 'parent', message: 'closing'});
		});

	}

	/**
	 * handle remove window trigger
	 * @param m
	 */
	protected handleCloseingMessage( m: WgMessageBody ) {

		if ( this.type === 'child' ) {
			this.initializeReloadProcess();
		} else if( this.type === 'parent' ) {
			delete this.children[m.sourceId];
		}

	}

	/**
	 * childOnly
	 * used by children to attemp to reconnect to parent (if the parent is refreshed)
	 */
	private initializeReloadProcess() {

		console.log(this.windowSettings);
		const message = { sourceId: this.id, message: { windowSettings: this.windowSettings }, targetId: null };
		/** how do we garantee that the postMessage is not received untill the window is refreshed */
		setTimeout( () => {
			this.dispatchMessage('reload', message);
		}, 2000);

	}

	/**
	 * Add listener for child parent event communication
	 * @param data event
	 */
	private addChildParentListeners(data) {
		if ( data ) {
			if ( data && data.type ) {
				switch ( data.type ) {
					case 'handshake':
						this.handleHandshake(data.message);
						break;
					case 'ping':
						this.handlePong(data.message);
						break;
					case 'closeing':
						this.handleCloseingMessage(data.message);
						break;
					case 'message':
						this.handleMessage( data.message );
						if ( this.type === 'child' ) {
							this.stream.next({ ...data, target: undefined});
				 		}
						break;
					case 'reload':
						this.handleRealod(data.message);
						break;
				}
			}
		}
	}

	/**
	 * handle messages on the message channel
	 * @param m wgMessageBody
	 */
	protected handleMessage(m: WgMessageBody) {
		if ( this.id === m.targetId) {

			if ( m.message === 'ping') {
				const p = confirm('ping');
				if ( p ) {
					this.dispatchMessage('message', { targetId: m.sourceId, message: 'pong' } );
				}

			}

			this.dispatchMessage('ping', { targetId: m.sourceId, message: m.messageId });
		}
	}

	/**
	 * TODO: manage reconnection of child/parent relationship
	 * parentOnly
	 * handle the reloading of a child
	 */
	protected handleRealod(m: WgMessageBody ) {
		if ( this.type === 'parent') {
			console.log(m);
			this.dispatchMessage('ping', { targetId: m.sourceId, message: m.messageId });
			const newChannel = new WGChannel(m.message.windowSettings, this.id, { childId: m.sourceId });
			this.children[newChannel.childId] = newChannel;
		}
	}

	/**
	 * childOnly
	 * handle the handshake method ( used by children only )
	 * @param m
	 */
	protected handleHandshake( m: WgMessageBody ) {
		console.log('[ wgram ] receive handshake', m);
		this.id = m.targetId;
		this.windowSettings = m.message.windowSettings;
		this.parentId = m.message.parentId;
		this.dispatchMessage('ping', { targetId: m.sourceId, message: m.messageId });
	}

}

