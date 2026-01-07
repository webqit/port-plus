import { MessagePortPlus, MessageChannelPlus, BroadcastChannelPlus, Observer } from '../src/index.js';

const t = new MessagePortPlus;

let m, q = 4;

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

m.port1.addEventListener('message', (e) => {
    console.log('message', e.data);
    console.log('numPorts', e.ports.length);
    e.ports[0]?.addEventListener('message', (e) => {
        console.log('Port message', e.data, 'isLive', e.live, );
        Observer.observe(e.data, (mm) => {
            console.log('-------mutations', e.data);
        });
    });
    e.ports[0]?.addEventListener('close', (e) => console.log('Port close'));
});

const p = new MessageChannelPlus;
m.port2.postMessage('hello', [p.port1]);
const pMessage = { greeting: 'Hi' };
p.port2.postMessage(pMessage, { live: true });
Observer.set(pMessage, '_K', '_V');

await new Promise((r) => setTimeout(r, 3000));
p.port2.close();

await new Promise((r) => setTimeout(r, 3000));
m.port2.close();

const e = new BroadcastChannelPlus('test');
console.log('________________', e.readyState)