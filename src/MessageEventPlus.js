import { _isTypeObject } from '@webqit/util/js/index.js';
import { MessagePortPlus, applyMutations, _options } from './MessagePortPlus.js';

export class MessageEventPlus extends MessageEvent {

    #originalTarget;
    get originalTarget() { return this.#originalTarget; }

    #eventID;
    get eventID() { return this.#eventID; }

    #data;
    get data() { return this.#data; }

    #live;
    get live() { return this.#live; }

    #bubbles;
    get bubbles() { return this.#bubbles; }

    #forwarded;
    get forwarded() { return this.#forwarded; }

    #honourDoneMutationFlags;
    get honourDoneMutationFlags() { return this.#honourDoneMutationFlags; }

    #ports = [];
    get ports() { return this.#ports; }

    constructor(data, {
        originalTarget = null,
        type = 'message',
        eventID,
        live = false,
        honourDoneMutationFlags = false,
        bubbles = false,
        forwarded = false,
        ports = []
    } = {}) {
        if (type && typeof type !== 'string') {
            throw new TypeError('Where specified, wqEventOptions.type must be a string');
        }
        super(type);
        this.#data = data;
        this.#originalTarget = originalTarget;
        this.#eventID = eventID;
        this.#live = live;
        this.#bubbles = bubbles;
        this.#forwarded = forwarded;
        this.#honourDoneMutationFlags = honourDoneMutationFlags;

        this.#ports = ports;
        this.#ports.forEach((port) => MessagePortPlus.upgradeInPlace(port));

        if (_isTypeObject(this.#data) && this.#live) {
            if (typeof eventID !== 'string') {
                throw new TypeError('eventID must be a non-empty string');
            }
            applyMutations.call(originalTarget, this.#data, this.#eventID, { honourDoneMutationFlags: this.#honourDoneMutationFlags });
        }
    }

    #immediatePropagationStopped = false;
    get immediatePropagationStopped() { return this.#immediatePropagationStopped; }

    stopImmediatePropagation() {
        this.#immediatePropagationStopped = true;
        this.#propagationStopped = true;
        super.stopImmediatePropagation();
    }

    #propagationStopped = false;
    get propagationStopped() { return this.#propagationStopped; }

    stopPropagation() {
        this.#propagationStopped = true;
        super.stopPropagation();
    }

    #defaultPrevented = false;
    get defaultPrevented() { return this.#defaultPrevented; }

    preventDefault() {
        this.#defaultPrevented = true;
        super.preventDefault();
    }

    respondWith(data, transferOrOptions = []) {
        for (const port of this.#ports) {
            port.postMessage(data, transferOrOptions);
        }
        return !!this.#ports.length;
    }
}
