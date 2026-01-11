import {
    _meta,
    MessagePortPlusMockPortsMixin,
} from './MessagePortPlus.js';

export class BroadcastChannelPlus extends MessagePortPlusMockPortsMixin(BroadcastChannel) {
    constructor(name, { handshake = 0, postAwaitsOpen = false, clientServerMode = null, autoClose = false } = {}) {
        super(name);

        const portPlusMeta = _meta(this);

        if (typeof handshake !== 'number') {
            throw new Error('handshake must be a number');
        }
        if (handshake < 0 || handshake > 2) {
            throw new Error('handshake must be between 0 and 2');
        }

        if (clientServerMode
            && !['server', 'client'].includes(clientServerMode)) {
            throw new Error('clientServerMode must be "server" or "client"');
        }

        portPlusMeta.set('options', { handshake, postAwaitsOpen, clientServerMode, autoClose });
        // Must come before upgradeEvents()

        this.constructor/* IMPORTANT */.upgradeEvents(this);

        if (handshake === 0) this.start();
    }

    __postMessage(payload, portOptions) {
        BroadcastChannel.prototype.postMessage.call(this, payload);
    }
}
