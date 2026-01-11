import { _isObject } from '@webqit/util/js/index.js';
import {
    _meta,
    MessagePortPlusMockPortsMixin,
} from './MessagePortPlus.js';

export class WebSocketPort extends MessagePortPlusMockPortsMixin(EventTarget) {

    #ws;
    #wsReady;

    constructor(ws, { handshake = 0, postAwaitsOpen = false } = {}) {
        super();

        if (typeof handshake !== 'number') {
            throw new Error('handshake must be a number');
        }
        if (handshake < 0 || handshake > 2) {
            throw new Error('handshake must be between 0 and 2');
        }

        const portPlusMeta = _meta(this);
        portPlusMeta.set('options', { handshake, postAwaitsOpen });
        // Must come before upgradeEvents()

        this.#ws = typeof ws === 'string' ? new WebSocket(ws) : ws;

        this.constructor/* IMPORTANT */.upgradeEvents(this.#ws, this);

        this.#wsReady = new Promise((resolve) => {
            if (this.#ws.readyState === WebSocket.OPEN) {
                resolve();
            } else {
                this.#ws.addEventListener('open', () => resolve(), { once: true });
            }
        });

        if (handshake === 0) {
            this.#wsReady.then(() => this.start());
        }

        if (this.#ws.readyState === WebSocket.CLOSED) {
            try { this.close(); } catch (e) { }
        } else {
            this.#ws.addEventListener('close', () => {
                try { this.close(); } catch (e) { }
            }, { once: true });
        }
    }

    static _hydrateMessage(portPlus, event) {
        try {
            let data;
            if (typeof event.data === 'string'
                && _isObject(data = JSON.parse(event.data))
                && data['.wq']) {
                Object.defineProperty(event, 'data', { value: data, configurable: true });
                return super._hydrateMessage(portPlus, event);
            }
        } catch (e) { }
        return event;
    }

    __postMessage(payload, portOptions) {
        this.#wsReady.then(() => {
            this.#ws.send(JSON.stringify(payload), portOptions);
        });
    }

    _close() {
        this.#ws.close();
    }
}
