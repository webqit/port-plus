# Port+ – *Upgraded Web Messaging Primitives*

[![npm version][npm-version-src]][npm-version-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

**Port+** is an upgrade to the Web Messaging APIs — `MessagePort`, `MessageChannel`, `BroadcastChannel`, and reply ports (`MessageEvent.ports`) that lets you do more. It also brings WebSocket-based messaging up to parity with the port-based messaging system.

This README takes you from installation to the design concepts and, ultimately, to the capabilities of the system.

---

## Install

```bash
npm i @webqit/port-plus
```

```js
import { MessageChannelPlus, BroadcastChannelPlus, SocketPort, ... } from '@webqit/port-plus';
```

---

## Design Concepts

Port+ is a mirror of the Web Messaging APIs, but with upgrades. An instance of `BroadcastChannelPlus`, for example, gives you the same standard `BroadcastChannel` instance, but with extended capabilities.

### 1. Messaging APIs at a Glance

#### MessageChannel

```
MessageChannel (ch)
  ├─ ch.port1 ──► MessageEvent (e) ──► e.ports
  └─ ch.port2 ──► MessageEvent (e) ──► e.ports
```

* `ch.port1` and `ch.port2` are message ports ([`MessagePort`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort))
* messages (`e`) arrive as `message` event ([`MessageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent))
* `e.ports` are each a message port ([`MessagePort`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort))

#### BroadcastChannel

```
BroadcastChannel (br) ──► MessageEvent (e) ──► e.ports
```

* the `BroadcastChannel` itself is the message port (the equivalent of `MessageEvent`)
* messages (`e`) arrive as `message` event ([`MessageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent))
* `e.ports` are each a message port ([`MessagePort`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort))

#### WebSocket

```
WebSocket ──► MessageEvent (e)
```

* messages (`e`) arrive as `message` event ([`MessageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent))
* no reply ports (`e.ports` is not implemented by the spec)
* no shared `postMessage()` interface with `MessagePort` / `BroadcastChannel`

### 2. What Port+ Does

**Port+** upgrades the **port interfaces** and **MessageEvent interface** in this system and extends the same design and capabilities to the WebSocket counterpart – giving you one unified messaging API across all models.

### 3. Messaging APIs – Upgraded

#### MessageChannelPlus

```
MessageChannelPlus (ch)
  ├─ ch.port1+ ──► MessageEventPlus (e) ──► e.ports+
  └─ ch.port2+ ──► MessageEventPlus (e) ──► e.ports+
```

#### BroadcastChannelPlus

```
BroadcastChannelPlus (br) ──► MessageEventPlus (e) ──► e.ports+
```

#### SocketPort (WebSocket ──► MessagePort)

```
SocketPort ──► MessageEventPlus (e) ──► e.ports+
```

### 4. Port+ API Overview

The Port+ API is a mirror of the standard messaging APIs, but with enhanced semantics.

#### 4.1 Port+ vs Message Ports + WebSocket

| API / Feature                      | Port+            | Msg. Ports        | WS            |
| :--------------------------------- | :--------------- | :---------------- | :------------ |
| `postMessage()`                    |     ✓ (advanced) |         ✓ (basic) |  ✗ (`send()`) |
| `addEventListener()` / `onmessage` |     ✓            |         ✓         |  ✓            |
| `close()`                          |     ✓            |         ✓         |  ✓            |
| `readyState`                       |     ✓            |         ✗         |  ✓            |
| `readyStateChange()`               |     ✓            |         ✗         |  ✗            |
| `postRequest()`                    |     ✓            |         ✗         |  ✗            |
| `handleRequests()`                 |     ✓            |         ✗         |  ✗            |
| `forwardPort()`                    |     ✓            |         ✗         |  ✗            |
| _Live Objects_                     |     ✓            |         ✗         |  ✗            |

**Legend**

* **Port+** → `MessagePortPlus`, `BroadcastChannelPlus`, `e.ports+`
* **Msg. Ports** → `MessagePort`, `BroadcastChannel`, `e.ports`
* **WS** → `WebSocket`

#### 4.2 MessageEventPlus vs MessageEvent

| API / Feature                | Port+                          | Msg. Event                    | WS                     |
| ---------------------------- | :----------------------------- | :---------------------------- | :--------------------- |
| `data`                       |     ✓ (_Live Objects_ support) |         ✓ (no _Live Objects_) |  ✓ (typically string)  |
| `type`                       |     ✓                          |         ✓                     |  ✗                     |
| `ports`                      |     ✓ (Port+)                  |         ✓                     |  ✗                     |
| `preventDefault()`           |     ✓                          |         ✓                     |  ✗                     |
| `defaultPrevented`           |     ✓                          |         ✓                     |  ✗                     |
| `stopPropagation()`          |     ✓                          |         ✓                     |  ✗                     |
| `stopImmediatePropagation()` |     ✓                          |         ✓                     |  ✗                     |
| `respondWith()`              |     ✓                          |         ✗                     |  ✗                     |
| `eventID`                    |     ✓                          |         ✗                     |  ✗                     |
| `live`                       |     ✓                          |         ✗                     |  ✗                     |
| `forwarded`                  |     ✓                          |         ✗                     |  ✗                     |

**Legend**

* **Port+** → `MessageEventPlus`
* **Msg. Event** → `MessageEvent`
* **WS** → `WebSocket`'s `MessageEvent`

**General Mental Model**

```
port+ ──► MessageEventPlus ──► e.ports+
```

> Port+ interfaces emit `MessageEventPlus`, which itself has `e.ports` as Port+ interfaces.

### 5. Entry Points

Pick a corresponding Port+ entry point to land an upgraded messaging system.

```js
const ch = new MessageChannelPlus();
const br = new BroadcastChannelPlus('channel-name');
const ws = new SocketPort(url); // new SocketPort(instance);
```

`SocketPort` takes a `WebSocket` instance too – letting you create a port from an existing WebSocket connection:

```js
const ws = new WebSocket(url);
const port = new SocketPort(ws);
```

In Node.js too you can do:

```js
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    // The basic way
    ws.send('something');

    // The unified way
    const port = new SocketPort(ws);
    port.postMessage('something');
});
```

Whatever the Port+ instance, it always has the same API and set of capabilities. For example, you get an `event.ports` implementation over web sockets this time – via `SocketPort`. 

---

## Capabilities

> **TODO**
> Live Objects
> Lifecycle APIs
> Request / Response Messaging
> Forwarding and Topologies

---

## License

MIT.

[npm-version-src]: https://img.shields.io/npm/v/@webqit/port-plus?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/@webqit/port-plus
[bundle-src]: https://img.shields.io/bundlephobia/minzip/@webqit/port-plus?style=flat&colorA=18181B&colorB=F0DB4F
[bundle-href]: https://bundlephobia.com/result?p=@webqit/port-plus
[license-src]: https://img.shields.io/github/license/webqit/port-plus.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/webqit/port-plus/blob/master/LICENSE
