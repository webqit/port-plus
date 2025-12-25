import { MessagePortPlus, MessageChannelPlus, WebSocketPort, BroadcastChannelPlus } from '../src/index.js';

const t = new MessagePortPlus;

let m, q = 3;

if (q === 1) {
    m = new MessageChannel;
} else if (q === 2) {
    m = { port1: new BroadcastChannel('test'), port2: new BroadcastChannel('test') };
} else if (q === 3) {
    m = new MessageChannelPlus({ postAwaitsOpen: true });
    m.port1.__ = 1;
    m.port2.__ = 2;
} else if (q === 4) {
    m = { port0: new BroadcastChannelPlus('test', { clientServerMode: 'client', postAwaitsOpen: true }), port1: new BroadcastChannelPlus('test', { clientServerMode: 'client', postAwaitsOpen: true }), port2: new BroadcastChannelPlus('test', { clientServerMode: 'server', postAwaitsOpen: true }) };
    m.port0.__ = 0;
    m.port1.__ = 1;
    m.port2.__ = 2;
    console.log('____________________________________');
}


m.port0?.addEventListener('open', () => console.log('open0'));
m.port0?.addEventListener('close', () => console.log('close0'));

m.port1.addEventListener('open', () => console.log('open1'));
m.port1.addEventListener('close', () => console.log('close1'));

m.port2.addEventListener('open', () => console.log('open2'));
m.port2.addEventListener('close', () => console.log('close2'));

m.port1.addEventListener('message', (e) => console.log('message', e.data));
m.port2.postMessage('hello');

await new Promise((r) => setTimeout(r, 3000));
//m.port1.close();
m.port2.close();
