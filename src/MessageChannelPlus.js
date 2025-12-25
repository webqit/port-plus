import { MessagePortPlus, _meta } from './MessagePortPlus.js';

export class MessageChannelPlus extends MessageChannel {

    constructor({ autoStart = true, postAwaitsOpen = false } = {}) {
        super();
        [this.port1, this.port2].forEach((port, i) => {
            const portPlusMeta = _meta(port);

            portPlusMeta.set('options', { autoStart, postAwaitsOpen });
            // Must come before upgradeInPlace()

            MessagePortPlus.upgradeInPlace(port);
        });
    }
}
