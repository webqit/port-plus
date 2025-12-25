import { _isObject } from '@webqit/util/js/index.js';
import {
    _meta,
    MessagePortPlusMockPortsMixin,
} from './MessagePortPlus.js';

export class WebSocketPort extends MessagePortPlusMockPortsMixin(EventTarget) {

    #ws;

    constructor(ws, { autoStart = true, naturalOpen = true, postAwaitsOpen = false } = {}) {
        super();
        this.#ws = typeof ws === 'string' ? new WebSocket(ws) : ws;
        
        const portPlusMeta = _meta(this);
        portPlusMeta.set('options', { autoStart, naturalOpen, postAwaitsOpen });
        // Must come before upgradeEvents()

        this.constructor/* IMPORTANT */.upgradeEvents(this.#ws, this);

        if (naturalOpen
            && autoStart
            && this.#ws.readyState === WebSocket.OPEN) {
            this.start();
        }
        if (this.#ws.readyState === WebSocket.CLOSED) {
            try { this.close(); } catch(e) {}
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
        } catch (e) {}
        return event;
    }

    __postMessage(payload, portOptions) {
        this.#ws.send(JSON.stringify(payload), portOptions);
    }
}
