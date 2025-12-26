import { _isObject } from '@webqit/util/js/index.js';
import { StarPort } from './StarPort.js';

export class RelayPort extends StarPort {

    #channelSpec;
    get channelSpec() { return this.#channelSpec; }

    constructor(channel = null) {
        super();
        if (typeof channel === 'string') {
            channel = { from: channel, to: channel };
        } else if (_isObject(channel)) {
            if (Object.keys(channel).filter((k) => !['from', 'to'].includes(k)).length) {
                throw new Error('Channel must be a string or an object of "from"/"to" members');
            }
        } else if (channel) {
            throw new Error('Invalid channel parameter');
        }
        this.#channelSpec = channel;
    }

    addPort(portPlus, { resolveMessage = null } = {}) {
        const $resolveMessage = (data, ...args) => {
            if (resolveMessage) return resolveMessage(data, ...args);
            return data;
        };

        // Add port and forward its messages back to this relay instance
        const unadd = super.addPort(portPlus, { enableBubbling: false });
        const unforward = portPlus.relay({ channel: this.#channelSpec, to: this, bidirectional: false/* IMPORTANT */, resolveMessage: $resolveMessage });

        const messageType_ping = this.#channelSpec.from
            && `${this.#channelSpec.from}:message`
            || 'message';

        // PING: joins
        this.postMessage(
            $resolveMessage({ event: 'joins' }, portPlus, this),
            { type: messageType_ping, relayedFrom: portPlus }
        );

        const leaves = () => {
            // PING: leaves
            this.postMessage(
                $resolveMessage({ event: 'leaves' }, portPlus, this),
                { type: messageType_ping, relayedFrom: portPlus }
            );
        };

        const cleanup = () => {
            leaves();
            unforward();
            unadd();
        };

        portPlus.readyStateChange('close').then(cleanup);
        return cleanup;
    }
}