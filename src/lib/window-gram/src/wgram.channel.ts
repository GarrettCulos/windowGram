import { UUID } from 'angular2-uuid';
import { WindowGramBase, WgMessageBody, WgMessage } from './wgram.base';
import { Subject } from 'rxjs';

export class WGChannel extends WindowGramBase {

	readonly childWindow: Window;
	readonly type = 'channel';
	readonly childId: string;
	readonly id: string;

	/**
	 * return message stream
	 */
	public stream: Subject<WgMessage>;

	/**
	 * On initialization of a channel
	 * - give it a unique identifier (uuid).
	 * - open new window with parameters below
	 * - dispatch handshake message ( forming a link between the parent and the child )
	 *
	 * @param data
	 * @param data.name string
	 * @param data.path string
	 * @param data.option (optional) window string options
	 * @param parentId Id of the parent initiating the connection through this channel
	 * @param reconnect reconnection parameters
	 */
	constructor(
		data: {
			name: string,
			path: string,
			options?: string
		},
		parentId: string,
		reconnect?: {
			childId: string
		}
	) {

		super();

		if ( !reconnect ) {
			this.id = UUID.UUID();
		} else {
			this.id = reconnect.childId;
		}

		/** check window location in localStorage */
		const wp = localStorage.getItem(`${data.name}-windowPosition`);

		/** set default window options */
		if ( !data.options ) {
			data.options = 'resizable=yes,scrollbars=yes,statusbar=yes,status=yes';
		}

		/** Set window position if its saved in local storage */
		if ( wp ) {
			const wpa = wp.split(':');
			data.options = `${data.options},left=${wpa[2]},top=${wpa[3]},width=${wpa[0]},height=${wpa[1]}`;
		}

		this.childWindow = window.open( data.path, data.name, data.options );

		console.log(data);
		super.dispatchMessage( 'handshake',
			{
				targetId: this.childId,
				message: { windowSettings: data, parentId: parentId }
			},
			{
				target: this.childWindow
			}
		);
		this.stream = new Subject();
		this.currentWindow.addEventListener('message', (event) =>  this.addChannelListeners(event.data) );
		this.childWindow.focus();
	}

	/**
	 * see super
	 */
	public dispatchMessage(type: string, message: WgMessageBody) {
		message.targetId = this.childId;
		super.dispatchMessage(type, message, { target: this.childWindow });
	}

	/**
	 * Bring the channel's window to the foreground
	 */
	public bringUp() {
		this.childWindow.focus();
	}

	/**
	 * event listeners
	 * @param data
	 */
	protected addChannelListeners(data: WgMessage) {
		if ( data ) {
			if ( data && data.type ) {
				switch ( data.type ) {
					case 'ping':
						this.handlePong(data.message);
						break;
					case 'message':
						this.handleMessage(data.message);
						this.stream.next({ ...data, target: undefined });
						break;
					case 'closeing':
						this.handleCloseingMessage(data.message);
						break;
				}
			}
		}
	}

	/**
	 * handle remove window trigger
	 * @param m Message Body
	 */
	protected handleCloseingMessage( m: WgMessageBody ) {
		/* intentionally blank */
	}

	/**
	 * Handle Messages that are dispached
	 * @param m Message Body
	 */
	protected handleMessage( m: WgMessageBody ) {
		if ( m.targetId === this.id && m) {
			if ( m.message === 'pong') {
				alert('pong');
			}
			this.dispatchMessage('ping', { targetId: m.sourceId, message: m.messageId });
		}
	}

	public destruction() {
		this.stream.unsubscribe();
		this.currentWindow.removeEventListener( 'message', () => {} );
	}

}
