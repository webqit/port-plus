import {
    _meta,
    MessagePortPlusMockPortsMixin,
} from './MessagePortPlus.js';

export class BroadcastChannelPlus extends MessagePortPlusMockPortsMixin(BroadcastChannel) {
    constructor(name, { autoStart = true, postAwaitsOpen = false, clientServerMode = null, autoClose = true } = {}) {
        super(name);

        const portPlusMeta = _meta(this);

        if (clientServerMode
            && !['server', 'client'].includes(clientServerMode)) {
            throw new Error('clientServerMode must be "server" or "client"');
        }
        portPlusMeta.set('options', { autoStart, postAwaitsOpen, clientServerMode, autoClose });
        // Must come before upgradeEvents()

        this.constructor/* IMPORTANT */.upgradeEvents(this);
    }

    __postMessage(payload, portOptions) {
        BroadcastChannel.prototype.postMessage.call(this, payload);
    }
}
