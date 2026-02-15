import {
    MessagePortPlus,
    _meta,
    _options,
    getReadyStateInternals,
} from './MessagePortPlus.js';

export class StarPort extends MessagePortPlus {

    #tags = new Map;
    get tags() { return this.#tags; }

    #ports = new Set;
    #startCalled = false;
    #closeCalled = false;

    get length() { return this.#ports.size; }

    [Symbol.iterator]() { return this.#ports[Symbol.iterator](); }

    constructor({ handshake = 0, postAwaitsOpen = false, autoClose = false } = {}) {
        super({ handshake, postAwaitsOpen, autoClose });
        if (handshake === 0) this.start();
    }

    #autoCloseX;
    get autoCloseXPromise() { return this.#autoCloseX?.p; }

    #autoCloseXPromises = new Set;
    extendAutoClose(promise) {
        const readyStateInternals = getReadyStateInternals.call(this);

        if (readyStateInternals.close.state) {
            throw new Error('Port lifecycle already complete.');
        }

        promise = Promise.resolve(promise);
        this.#autoCloseXPromises.add(promise);
        if (!this.#autoCloseX) {
            let r;
            const p = new Promise(res => (r = res));
            this.#autoCloseX = { p, r };
        }

        return promise.finally(() => {
            this.#autoCloseXPromises.delete(promise);
            if (!this.#autoCloseXPromises.size) {
                this.#autoCloseX.r();
                this.#autoCloseX = null;
            }
        });
    }

    addPort(portPlus, { enableBubbling = true } = {}) {
        if (!(portPlus instanceof MessagePortPlus)) {
            throw new TypeError('Port must be a WQMessagePort instance.');
        }

        const readyStateInternals = getReadyStateInternals.call(this);

        if (this.#closeCalled || readyStateInternals.close.state) {
            const starPortName = this.constructor.name;
            throw new Error(`Cannot add port to ${starPortName}. ${starPortName} is closed.`);
        }

        if (this.#ports.has(portPlus)) return;
        this.#ports.add(portPlus); // @ORDER: 1

        const portPlusMeta = _meta(portPlus);

        if (enableBubbling) {
            if (portPlusMeta.get('parentPort')) {
                throw new TypeError('Incoming port already has a parent node.');
            }
            portPlusMeta.set('parentPort', this); // @ORDER: 2
        }

        if (this.options.handshake) {
            portPlus.readyStateChange('open').then(() => {
                readyStateInternals.open.state = true;
                readyStateInternals.open.resolve(this);
            });
            portPlus.readyStateChange('close').then(() => cleanup());
        }

        if (this.#startCalled || readyStateInternals.open.state) {
            portPlus.start();
        }

        const cleanup = () => {
            if (!this.#ports.has(portPlus)) return;

            this.#ports.delete(portPlus);

            if (enableBubbling
                && portPlusMeta.get('parentPort') === this) {
                portPlusMeta.set('parentPort', null);
            }

            const resolveClose = () => {
                if (this.#ports.size === 0
                    && _options(this).autoClose) {
                    readyStateInternals.close.state = true;
                    readyStateInternals.close.resolve(this);
                }
            };

            if (this.#autoCloseX) {
                this.#autoCloseX.p.finally(resolveClose);
            } else resolveClose();
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
            portPlus.postMessage(payload, { ...portOptions, portPlusIgnore: true });
        }
    }

    start() {
        if (this.#startCalled) return;
        this.#startCalled = true;

        for (const portPlus of this.#ports) {
            portPlus.start();
        }

        if (!this.options.handshake) {
            const readyStateInternals = getReadyStateInternals.call(this);
            readyStateInternals.open.state = true;
            readyStateInternals.open.resolve(this);
        }
    }

    close(...args) {
        if (this.#closeCalled) return;
        this.#closeCalled = true;

        for (const portPlus of this.#ports) {
            portPlus.close(...args);
        }
        this.#autoCloseX?.r();

        if (!this.options.handshake || !this.#ports.size) {
            const readyStateInternals = getReadyStateInternals.call(this);
            readyStateInternals.close.state = true;
            readyStateInternals.close.resolve(this);
        }
    }
}
