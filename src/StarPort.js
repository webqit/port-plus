import { MessagePortPlus, _meta, _options } from './MessagePortPlus.js';

export class StarPort extends MessagePortPlus {

    #ports = new Set;

    get length() { return this.#ports.size; }

    [Symbol.iterator]() { return this.#ports[Symbol.iterator](); }

    constructor({ autoClose = true } = {}) {
        super({ autoStart: false, postAwaitsOpen: true, autoClose });
    }

    addPort(portPlus, { enableBubbling = true } = {}) {
        if (!(portPlus instanceof MessagePortPlus)) {
            throw new TypeError('Port must be a WQMessagePort instance.');
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

    close(...args) {
        for (const portPlus of this.#ports) {
            portPlus.close?.(...args);
        }
    }
}
