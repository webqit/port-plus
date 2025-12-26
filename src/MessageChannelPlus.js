import { MessagePortPlus } from './MessagePortPlus.js';

export class MessageChannelPlus extends MessageChannel {

    constructor({ autoStart = true, postAwaitsOpen = false } = {}) {
        super();
        [this.port1, this.port2].forEach((port, i) => {
            MessagePortPlus.upgradeInPlace(port, { autoStart, postAwaitsOpen });
        });
    }
}
