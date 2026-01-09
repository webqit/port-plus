import {
    MessagePortPlus,
    _meta,
    _options,
    getReadyStateInternals,
} from './MessagePortPlus.js';

export class StarPort extends MessagePortPlus {

    #ports = new Set;

    get length() { return this.#ports.size; }

    [Symbol.iterator]() { return this.#ports[Symbol.iterator](); }

    constructor({ autoStart = true, postAwaitsOpen = false, autoClose = true } = {}) {
        super({ autoStart, postAwaitsOpen, autoClose });
    }

    addPort(portPlus, { enableBubbling = true } = {}) {
        if (!(portPlus instanceof MessagePortPlus)) {
            throw new TypeError('Port must be a WQMessagePort instance.');
        }

        const readyStateInternals = getReadyStateInternals.call(this);

        if (readyStateInternals.close.state) {
            const starPortName = this.constructor.name;
            throw new Error(`Cannot add port to ${starPortName}. ${starPortName} is closed.`);
        }

        if (this.#ports.has(portPlus)) return;
        this.#ports.add(portPlus); // @ORDER: 1

        const portPlusMeta = _meta(portPlus);

        if (enableBubbling) {
            if (portPlusMeta.get('parentNode')) {
                throw new TypeError('Incoming port already has a parent node.');
            }
            portPlusMeta.set('parentNode', this); // @ORDER: 2
        }

        portPlus.readyStateChange('open').then(() => this.start());
        portPlus.readyStateChange('close').then(cleanup);

        const cleanup = () => {
            if (!this.#ports.has(portPlus)) return;

            this.#ports.delete(portPlus);

            if (enableBubbling
                && portPlusMeta.get('parentNode') === this) {
                portPlusMeta.set('parentNode', null);
            }

            if (this.#ports.size === 0
                && _options(this).autoClose) {
                this.close();
            }
        };

        return cleanup;
    }

    findPort(callback) {
        for (const portPlus of this.#ports) {
            if (callback(portPlus)) return portPlus;
        }
    }

    // --------

    _postMessage(payload, portOptions, relayedFrom) {
        for (const portPlus of this.#ports) {
            if (portPlus === relayedFrom) continue;
            portPlus.postMessage(payload, portOptions);
        }
    }

    _autoStart() { } // Must be present to do nothing

    start() {
        const readyStateInternals = getReadyStateInternals.call(this);

        if (readyStateInternals.open.state) return;
        readyStateInternals.open.state = true;

        readyStateInternals.open.resolve(this);

        const openEvent = new MessageEventPlus(null, { type: 'open' });
        super.dispatchEvent(openEvent);
    }

    close(...args) {
        const readyStateInternals = getReadyStateInternals.call(this);

        if (readyStateInternals.close.state) return;
        readyStateInternals.close.state = true;

        for (const portPlus of this.#ports) {
            portPlus.close?.(...args);
        }

        readyStateInternals.close.resolve(this);

        const closeEvent = new MessageEventPlus(null, { type: 'close' });
        super.dispatchEvent(closeEvent);
    }
}
