import { StarPort } from './StarPort.js';

export class RelayPort extends StarPort {

    #namespace;
    get namespace() { return this.#namespace; }

    constructor(namespace = null) {
        super();
        this.#namespace = namespace;
    }

    addPort(portPlus, { resolveData = null } = {}) {
        const $resolveData = (data, ...args) => {
            if (resolveData) return resolveData(data, ...args);
            return data;
        };

        // Add port and forward its messages back to this relay instance
        const unadd = super.addPort(portPlus, { enableBubbling: false });
        const unforward = portPlus.forwardPort('*', this, { bidirectional: false, resolveData: $resolveData, namespace1: this.namespace, namespace2: this.namespace });

        const messageType_ping = this.namespace
            && `${this.namespace}:message`
            || 'message';

        // PING: joins
        this.postMessage(
            $resolveData({ event: 'joins' }, portPlus, this),
            { type: messageType_ping, relayedFrom: portPlus }
        );

        const leaves = () => {
            // PING: leaves
            this.postMessage(
                $resolveData({ event: 'leaves' }, portPlus, this),
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