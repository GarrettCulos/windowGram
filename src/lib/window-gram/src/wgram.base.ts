
// angular
import { UUID } from 'angular2-uuid';

export class WgMessage {
	type: string;
	target: Window;
	message: WgMessageBody;
}

export class WgMessageBody {
	messageId?: string;
	targetId?: string;
	message: any;
	sourceId?: string;
	date?: Date;
}

export class WindowGramBase {

	protected type: 'child' | 'parent' | 'channel';
	protected id: string;
	protected currentWindow: Window;
	protected messageQ: { [s: string]: WgMessage };

	protected failedMessages: WgMessage[];
	protected qThresholdTime = 10 * 1000;

	constructor ( ) {

		this.messageQ = {};
		this.failedMessages = [];
		this.currentWindow = window;

		setInterval( () => {
			Object.keys(this.messageQ).forEach( m => {
				if ( (new Date).getTime() - this.messageQ[m].message.date.getTime() > this.qThresholdTime) {
					this.failedMessages.push(this.messageQ[m]);
					delete this.messageQ[m];
				} else {
					this.sendMessage(this.messageQ[m]);
				}
			});
		}, 1000);

	}

	/**
	 * This method handles sending messages to parent / children
	 * @param type type to dispatch your message to, mesage types are handled by the event listeneres within the wgram.service
	 * @param message message object
	 */
	protected dispatchMessage( type: string, message: WgMessageBody, options?: { target?: Window, noTracking?: boolean } ) {

		const tracking = ( options ) ? !options.noTracking : true;
		const uuid = UUID.UUID();
		const m = new WgMessage();
			m.type = type;
			m.target = ( options ) ? options.target : undefined;
			m.message = new WgMessageBody();
			m.message = message;
			m.message.messageId = uuid;
			m.message.date = new Date();
			m.message.sourceId = this.id;

		// dont add ping's to message q
		if ( type !== 'ping' && tracking) {
			this.messageQ[uuid] = m;
		}

		this.sendMessage(m);

	}


	/**
	 * handles the sending of a message
	 * @param m Message
	 */
	protected sendMessage( m: WgMessage) {

		const mm = Object.assign({}, m);
		delete mm.target;

		console.log(`[ wgram - ${this.type} ] message:`, m);
		/**
		 * If this window is a child send the message to this.currentWindow.opener
		 */
		if ( this.type === 'child' ) {
			this.currentWindow.opener.postMessage(mm, '*' );
		}

		/**
		 * If this is the parent or the parents channel, send message to the target.
		 */
		if ( this.type === 'parent' || this.type === 'channel' ) {
			if ( m.target ) {
				m.target.postMessage(mm, '*');
			}
		}

	}

	/**
	 * When ping is returnd remove it from a child, remove the message retry from the Q.
	 * @param m Message Body
	 */
	protected handlePong( m: WgMessageBody ) {
		if ( m.targetId === this.id ) {
			delete this.messageQ[m.message];
		}
	}

}

