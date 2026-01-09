# Port+ – *Advanced Web Messaging Primitives*

[![npm version][npm-version-src]][npm-version-href]
[![bundle][bundle-src]][bundle-href]
[![License][license-src]][license-href]

**Port+** is an upgrade to the web's port-based messaging APIs — `MessagePort`, `MessageChannel`, `BroadcastChannel` – and an onboarding of the
WebSocket API into the same port-based messaging model.

This README takes you from installation to the design concepts and, ultimately, to the added capabilities implied by Port+.

---

## Install

```bash
npm i @webqit/port-plus
```

```js
import { MessageChannelPlus, BroadcastChannelPlus, WebSocketPort, StarPort, RelayPort, Observer } from '@webqit/port-plus';
```

## CDN Include

```html
<script src="https://unpkg.com/@webqit/port-plus/dist/main.js"></script>

<script>
    const { MessageChannelPlus, BroadcastChannelPlus, WebSocketPort, StarPort, RelayPort, Observer } = window.webqit;
</script>
```

---

## Design Concepts

Port+ is an API mirror of the Web Messaging APIs built for advanced use cases. An instance of `BroadcastChannelPlus`, for example, is the same `BroadcastChannel` instance, but one that lets you do more.

To see that changed, here is the existing set of Web Messaging APIs. Next, is the Port+ equivalent.

### (a) The Web's Messaging APIs at a Glance

#### 1. MessageChannel

```
MessageChannel (mch)
  ├─ mch.port1 ──► MessageEvent (e) ──► e.ports
  └─ mch.port2 ──► MessageEvent (e) ──► e.ports
```

*In this structure:*

* `mch.port1` and `mch.port2` are each a message port ([`MessagePort`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort))
* messages (`e`) arrive as `message` events ([`MessageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent))
* `e.ports` are each a message port ([`MessagePort`](https://developer.mozilla.org/en-US/docs/Web/API/MessagePort))

#### 2. BroadcastChannel

```
BroadcastChannel (brc) ──► MessageEvent (e)
```

*In this structure:*

* the `BroadcastChannel` interface is the message port – the equivalent of `MessagePort`
* messages (`e`) arrive as `message` events ([`MessageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent))
* no reply ports; `e.ports` is empty; not implemented in BroadcastChannel

#### 3. WebSocket

```
WebSocket ──► MessageEvent (e)
```

*In this structure:*

* the `WebSocket` interface is partly a message port (having `addEventListener()`) and partly not (no `postMessage()`)
* messages (`e`) arrive as `message` events ([`MessageEvent`](https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent))
* no reply ports; `e.ports` is empty; not implemented in WebSocket
* no API parity with `MessagePort` / `BroadcastChannel` in all

### (b) The Port+ Equivalent

#### 1. MessageChannelPlus

```
MessageChannelPlus (mch)
  ├─ mch.port1+ ──► MessageEventPlus (e) ──► e.ports+
  └─ mch.port2+ ──► MessageEventPlus (e) ──► e.ports+
```

*In this structure:*

* `mch.port1+` and `mch.port2+` are Port+ interfaces (`MessagePortPlus`)
* messages arrive as `MessageEventPlus`
* `e.ports+` recursively expose Port+ interfaces
* reply ports support advanced features (requests, live objects, relays)

#### 2. BroadcastChannelPlus

```
BroadcastChannelPlus (brc) ──► MessageEventPlus (e) ──► e.ports+
```

*In this structure:*

* `BroadcastChannelPlus` acts as a full Port+ interface
* messages arrive as `MessageEventPlus`
* `e.ports+` enables reply channels where native BroadcastChannel does not
* broadcast semantics are preserved while extending capabilities

#### 3. WebSocketPort (WebSocket)

```
WebSocketPort ──► MessageEventPlus (e) ──► e.ports+
```

*In this structure:*

* `WebSocketPort` wraps a `WebSocket` as a Port+ interface
* `postMessage()` replaces ad-hoc `send()` usage
* messages arrive as `MessageEventPlus`
* `e.ports+` enables reply channels over WebSockets
* lifecycle and messaging semantics align with other Port+ interfaces

### (c) Result

**Port+** unifies the messaging model across all three and extends the **port interfaces** and **MessageEvent interface** for advanced use cases.

General mental model:

```
port+ ──► MessageEventPlus ──► e.ports+
```

Meaning: Port+ interfaces emit `MessageEventPlus`, which recursively exposes Port+ interface over at `e.ports`.

---

## The Port+ API Overview

### 1. Port-Level API

| API / Feature                      | Port+            | Msg. Ports        | WS            |
| :--------------------------------- | :--------------- | :---------------- | :------------ |
| `postMessage()`                    |     ✓ (advanced) |         ✓ (basic) |  ✗ (`send()`) |
| `postRequest()`                    |     ✓            |         ✗         |  ✗            |
| `addEventListener()` / `onmessage` |     ✓            |         ✓         |  ✓            |
| `addRequestListener()`             |     ✓            |         ✗         |  ✗            |
| `readyState`                       |     ✓            |         ✗         |  ✓            |
| `readyStateChange()`               |     ✓            |         ✗         |  ✗            |
| `relay()`                          |     ✓            |         ✗         |  ✗            |
| `channel()`                        |     ✓            |         ✗         |  ✗            |
| `projectMutations()`               |     ✓            |         ✗         |  ✗            |
| `close()`                          |     ✓            |         ✓         |  ✓            |
| `Live Objects`**                   |     ✓            |         ✗         |  ✗            |

*In this table:*

* **Port+** → `MessagePortPlus`, `BroadcastChannelPlus`, `WebSocketPort`
* **Msg. Ports** → `MessagePort`, `BroadcastChannel`
* **WS** → `WebSocket`
* **`**`** → All-new concept

### 2. Message Event Interface

| API / Feature                | Port+                          | Msg. Event                    | WS                     |
| :--------------------------- | :----------------------------- | :---------------------------- | :--------------------- |
| `data`                       |     ✓ (_Live Objects_ support) |         ✓ (no _Live Objects_) |  ✓ (typically string)  |
| `type`                       |     ✓                          |         ✓                     |  ✓                     |
| `ports`                      |     ✓ (Port+)                  |         ✓**                   |  ✗**                   |
| `preventDefault()`           |     ✓                          |         ✓                     |  ✗**                   |
| `defaultPrevented`           |     ✓                          |         ✓                     |  ✗**                   |
| `stopPropagation()`          |     ✓                          |         ✓                     |  ✗**                   |
| `stopImmediatePropagation()` |     ✓                          |         ✓                     |  ✗**                   |
| `respondWith()`              |     ✓                          |         ✗                     |  ✗                     |
| `eventID`                    |     ✓                          |         ✗                     |  ✗                     |
| `live`                       |     ✓                          |         ✗                     |  ✗                     |
| `relayedFrom`                |     ✓                          |         ✗                     |  ✗                     |

*In this table:*

* **Port+** → `MessageEventPlus`
* **Msg. Event** → `MessageEvent`
* **WS** → `WebSocket`'s `MessageEvent`
* **`**`** → May be present, but may not be implemented

---

## Entry Points

The APIs below are the entry points to a Port+-based messaging system.

```js
const mch = new MessageChannelPlus();
const brc = new BroadcastChannelPlus('channel-name');
const soc = new WebSocketPort(url); // or new WebSocketPort(ws)
```

Above, `WebSocketPort` also takes a `WebSocket` instance – letting you create a port from an existing WebSocket connection:

```js
const ws = new WebSocket(url);
const port = new WebSocketPort(ws);
```

On a WebSocket server, for example, you can do:

```js
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
    // The basic way
    ws.send('something');

    // The unified way
    const port = new WebSocketPort(ws);
    port.postMessage('something');
});
```

Whatever the port+ type, every Port+ instance exposes the same interface and capabilities. For example, with `WebSocketPort` you get an `event.ports` implementation over web sockets consistent with the rest. 

All Port+ interfaces also support live state projection, lifecycle coordination, request/response semantics, and routing.

---

## Live State Projection (Live Objects)

Port+ extends message passing with the ability to project state across a port connection and keep that state synchronized over time.

This capability is referred to as **Live State Projection**, and the projected objects are called **Live Objects**.

Live State Projection is established via the same `.postMessage()` API:

**Sender:**

```js
const state = { count: 0 };

port.postMessage({ state }, { live: true });
```

**Receiver:**

```js
port.addEventListener('message', (e) => {
    if (e.live) console.log('Live object received');
    const { state } = e.data;
});
```

In live mode, continuity of the original object is achieved. Every mutation on the sender side automatically converges on the received copy, and those mustations are observable:


**Sender:**

```js
setInterval(() => {
    Observer.set(state, 'count', state.count + 1;
}, 1000);
```

**Receiver:**

```js
Observer.observe(state, () => {
    console.log(state.count);
});
```

### Projection Semantics and Lifecycle

When an object is sent with `{ live: true }`, Port+ establishes a projection with the following behavior:

* mutations on the source object are observed using using the Observer API
* **differential updates** are sent over a private channel; they converge on the same object on the other side

Projection is bound to the lifecycle of the port. It begins once the message is delivered and terminates automatically when the port closes. After closure, the target object remains usable but no longer receives updates.

### Explicit Projection via Propagation Channels

In some cases, live state must be projected independently of a specific message. Port+ supports this through a `.projectMutations()` API.

Instead of deriving identity from a message event, both sides explicitly agree on a shared object identity and a **propagation channel** over which to project mutations.

Below, both sides agree on a certain object identity – `'counter'` – and a propagation channel anique to the object: `'counter'`.

**Sender**

```js
const state = { count: 0 };

const stop = port.projectMutations({
    from: state,
    to: 'counter'
});

setInterval(() => {
    Observer.set(state, 'count', state.count + 1);
}, 1000);
```

**Receiver:**

```js
const state = {};

const stop = port.projectMutations({
    from: 'counter',
    to: state
});

Observer.observe(state, () => {
    console.log(state.count);
});
```

In each case, the return value of `projectMutations()` is a cleanup function:

```js
stop(); // terminates the projection
```

Calling it stops mutation tracking and synchronization without closing the port.

This lower-level API is intended for advanced scenarios where object identity and lifetime are managed outside the messaging system.

### Motivation: Shared Identity and Continuity

Live State Projection enables a shared reactive model across execution contexts.

Rather than exchanging updated values, both sides operate on corresponding objects that maintain:

* **shared identity** — distinct objects representing the same logical entity
* **continuity** — stable object references over time
* **deterministic convergence** — ordered, differential mutation application
* **lifecycle scoping** — synchronization exists only while the port exists

This allows state to be treated as persistent and reactive across a messaging boundary, without polling, replacement, or manual reconciliation.

---

## Lifecycles

Port+ introduces a unified lifecycle model for all messaging ports.

The purpose of this lifecycle is to make *interaction readiness* explicit: to know when there is someone actively listening on the other end of a port, and when that condition begins and ends.

Native web messaging APIs do not expose this information consistently. WebSockets expose transport connectivity, but not as to whether the remote side is actually interacting with the connection. Message ports and broadcast channels expose no readiness signal at all.

Port+ addresses this by introducing an interaction-based lifecycle that applies uniformly across all port types.

### Lifecycle States

Every Port+ instance transitions through four states in its lifetime:

- **`connecting`**: The port is being established or is waiting for a connection to be established.
- **`open`**: The port is ready for interaction.
- **`closed`**: The port is closed.

At any given point in time, a port is in exactly one of these states. This state is exposed via the `.readyState` property.

State transitions (observable milestones) can be observed imperatively using `.readyStateChange()`:

```js
// The port is ready for interaction.
await port.readyStateChange('open');

// The port has sent its first message.
await port.readyStateChange('messaging');

// The port is closed.
await port.readyStateChange('close');
```

> [!TIP]
> The `readyState` property reflects the current state as a descriptive value (e.g. `'closed'`), while `readyStateChange()` listens for lifecycle transitions using event-style names (e.g. `'close'`).

### Ready-State by Interaction

In Port+, being "open" for messages is a special phase in the lifecycle model. It is designed to guarantee the readiness of the other end of the port – rather than the readiness of the port itself. A port transitions to this state when it has ascertained that the other end is ready to interact – not just alive. Messages sent at this point are more likely to be read by "someone".

To coordinate readiness across ports, each port is designed to self-signify readiness. The other end of the port receives this signal and acknowledges it. On a successful handshake, the port transitions to the `open` state; an `"open"` event is fired.

But a port sends a readiness signal on an explicit condition: when `.start()` is called. This is how the calling code says "I'm ready to interact". But by default, ports have an `autoStart` option enabled, which gets the port to automatically start on first interaction with:

+ `addEventListener()` – including higher level APIs that may trigger it
+ `postMessage()` – including, also, higher level APIs that may trigger it

This behaviour is called "Ready-State by Interaction". To switch from this mode to the explicit mode, set `autoStart` to `false`.

```js
// An example for a BroadcastChannel port
const port = new BroadcastChannel(channel, { autoStart: false });

port.start(); // Explicitly start the port
```

### Early Sends and Automatic Queuing

Ports may be configured to implicitly await the `open` ready state before sending messages. In this mode, outbound messages are automatically queued until the port is ready.

```js
// An example for a BroadcastChannel port
const port = new BroadcastChannel(channel, { postAwaitsOpen: true });

port.postMessage('hello'); // queued
await port.readyStateChange('open');
// delivered by now
```

This allows application code to send messages without coordinating startup order.

---

## Lifecycle by Port Type

Each Port+ transport participates in the lifecycle model differently, while exposing the same observable states.

### MessagePortPlus via MessageChannelPlus

Message ports follow a symmetric, point-to-point handshake.

Each side transitions to the `open` state when:

1. `.start()` is triggered explicitly or by interaction
2. an acknowledgment is recieved from the other side

The port is closed when either side is closed explicitly via `.close()`. Once either side closes, a signal is sent to the other side that closes it automatically. A `"close"` event is fired in each case, and ready state transitions to `closed`.

### BroadcastChannelPlus

Broadcast channels form a many-to-many port topology and require additional coordination to make readiness meaningful.

Port+ supports two modes.

#### (a) Default (Peer Mode)

In default mode, each participant becomes `open` when:

1. `.start()` is triggered explicitly or by interaction
2. an acknowledgment is recieved from at least one peer in the shared channel

The port is closed when closed explicitly via `.close()`. A `"close"` event is fired in each case, and ready state transitions to `closed`.

#### (b) Client / Server Mode

While readiness is synchronized in the default mode – as with other port types – termination is not, due to the many-to-many topology.

To support use cases that require synchronized termination across participants, Port+ additionally supports a client/server operational model for BroadcastChannels.

The client/server model introduces explicit role semantics. Here, a specific participant is selected as the "control" port – the `server` – and the others are assigned a `client` role:

```js
const server = new BroadcastChannelPlus('room', {
    clientServerMode: 'server'
});

const client1 = new BroadcastChannelPlus('room', {
    clientServerMode: 'client'
});

const client2 = new BroadcastChannelPlus('room', {
    clientServerMode: 'client'
});
```

Both server and clients can join the channel in any order, but the server:

+ maintains a reference to all connected clients
+ automatically closes all clients when closed
+ automatically closes when all clients leave and its `autoClose` setting is enabled

By contrast, a client:

* closes alone when closed

This mode exists because BroadcastChannel’s native semantics do not provide coordinated teardown or authoritative control. Without it, participants cannot reliably know when a session has ended. Client/server mode enables explicit ownership, deterministic shutdown, and presence-aware coordination over a many-to-many transport.

### WebSocketPort

The lifecycle of a WebSocket connection is supported by a native ready state system. A webSocket's `.readyState` property, and related events, can already tell when the connection transitions between states. However, it does not solve the same problem as Port+'s Readiness by Interaction model.

Port+ therefore lets you have two lifecycle strategies over WebSocketPort:

+ Transport-driven lifecycle (default)
+ Interaction-driven lifecycle (opt-in)

By default, Port+ lets the WebSocket’s native lifecycle be the authoritative lifecycle.

In this mode:

* WebSocketPort's `open` and `closed` states are based on the WebSocket's native ready states
* no handshake control messages are exchanged
* readiness is assumed once the socket opens

#### Explicit Handshake Mode

To enable interaction-based readiness, WebSocketPort can opt out of native ready states. This is controlled by the `naturalOpen` flag:

```js
const port = new WebSocketPort(ws, { naturalOpen: false });
```

In this mode, each side transitions to the `open` state when:

1. `.start()` is triggered explicitly or by interaction
2. an acknowledgment is recieved from the other side

This allows WebSocketPort to behave identically to MessagePortPlus and BroadcastChannelPlus with respect to readiness and cleanup.

### Lifecycle Inheritance

Ports created via `port.channel()` and ports exposed via `event.ports` inherit:

* `autoStart`
* `postAwaitsOpen`

from their parent port.

These ports follow a symmetric, point-to-point lifecycle. Closing either side closes the other.

### Practical Use

The lifecycle API enables:

* safe startup sequencing
* early message queuing without race conditions
* deterministic teardown and cleanup
* consistent readiness checks across transports

Port+ makes interaction readiness explicit, observable, and uniform across all messaging primitives.

---

## Composition and Topology

Port+ is not limited to point-to-point messaging. Ports can be composed into higher-level structures that define how messages flow, where they propagate, and which connections participate.

### StarPort

A `StarPort` is a **fan-in / fan-out proxy** over multiple ports.

It acts as a central aggregation point where:

* messages *received* by child ports bubble up to the star
* messages *sent* by the star fan out to all child ports

```js
const star = new StarPort();

star.addPort(port1);
star.addPort(port2);
star.addPort(port3);
```

#### Message Flow Semantics

##### Inbound (Bubbling)

As with every port, when a connected port receives a message from its remote peer, it receives a `MessageEventPlus`. Internally that comes as an event dispatched on the port:

```js
port1.dispatchEvent(new MessageEventPlus(data));
```

The event:

1. is dispatched on `port1`
2. **bubbles up** to the `StarPort`; thus, re-dispatched on `star`

The star port essentially makes it possible to listen to all messages received by any of its child ports:

```js
star.addEventListener('message', (e) => {
    // receives messages from any child port
});
```

##### Outbound (Fan-Out)

A `.postMessage()` call on the star port is a `.postMessage()` call to all connected ports:

```js
star.postMessage(data);
```

This makes `StarPort` a true proxy: a single observable endpoint over many independent ports.

#### Lifecycle Behavior

* A star port transitions to the `open` ready state when the first child port is added
* Closed ports are removed automatically
* A star port transitions to the `closed` ready state when the last child port is removed and `autoClose` is enabled

#### Typical Uses

* centralized coordination
* shared state distribution
* transport-agnostic hubs

### RelayPort

A `RelayPort` is a **router** that forwards messages *between sibling ports*.

It is an extension of `StarPort` and inherits all of its properties, methods, and behaviors.

```js
const relay = new RelayPort('room');

relay.addPort(port1);
relay.addPort(port2);
relay.addPort(port3);
```

#### Message Flow Semantics

##### Inbound Routing

As with every port, when a connected port receives a message from its remote peer, it receives a `MessageEventPlus`. Internally that comes as an event dispatched on the port:

```js
port1.dispatchEvent(new MessageEventPlus(data));
```

Bubbling behaviour works as with a star port. In addition, the relay forwards it to **all other connected ports** as a `.postMessage()` call – excluding the originating port.
Each connected port sees the message as if it were sent directly by its peer.

This creates peer-to-peer fan-out.

##### Outbound Broadcast

As with a star port, a `.postMessage()` call on the relay port is a `.postMessage()` call to all connected ports:

```js
relay.postMessage(data);
```

`RelayPort` has identical outbound behavior to `StarPort`.

##### Join / Leave Signaling

When a port joins (via `relay.addPort()`) or leaves (via `relay.removePort()` or via port close), synthetic join/leave messages are routed to peers.

This enables presence-aware systems (e.g. chat rooms).

#### Typical Uses

* chat rooms
* collaborative sessions
* event fan-out
* decoupled peer coordination

### `port.channel()`

`port.channel()` is a universal instance method on all port types that creates a **logical sub-port** scoped to a message type or namespace over that port.

```js
const chat = port.channel('chat');
const system = port.channel('system');
```

A channel:

* filters inbound messages by the specified namespace (e.g. `chat` above)
* automatically namespaces outbound messages with the same

```js
chat.postMessage({ text: 'hello' });
// Equivalent to:
chat.postMessage({ text: 'hello' }, { type: 'chat:message' });
```

```js
chat.addEventListener('message', (e) => {
    // receives only 'chat' messages
});
// Equivalent to:
chat.addEventListener('chat:message', (e) => {
    // handle 'chat' messages
});
```

Channels are namespaces within the same port.

Channels compose naturally with `StarPort` and `RelayPort`.

### `port.relay()`

`port.relay()` is a universal instance method on all port types that establishes **explicit routing relationships** between ports.

```js
portA.relay({
    to: portB,
    channel: 'chat',
    bidirectional: true
});
```

This means:

* messages received by `portA` on channel `chat`
  → are forwarded to `portB`
* optionally in both directions
* respecting lifecycle, and teardown rules – relay relationships are automatically torn down when either port closes

Use `port.relay()` to chain ports together transparently.

```js
// Forward Port A -> Port B
portA.relay({ to: portB });

// Bidirectional A <-> B
portA.relay({ to: portB, bidirectional: true });
```

Use `RelayPort` when:

* routing is shared across many ports
* join/leave semantics matter
* topology is explicit

### Composition and Live Objects

Live objects propagate through composition transparently.

* events bubble, or route, as defined
* mutation convergence follows routing paths
* projection terminates when required links close

This allows shared reactive state to exist **across entire topologies**, not just between endpoints.

---

## Messaging Patterns

Port+ supports a small number of messaging patterns. These patterns are not separate APIs — they are ways of structuring interactions using the same port abstraction.

### 1. One-Way Signaling

Use this pattern when you need to *notify* the other side, without waiting for a response.

```js
port.postMessage({ op: 'invalidate-cache' });
```

This is appropriate when:

* ordering matters, but acknowledgment does not
* the sender does not depend on the receiver’s result
* failure can be handled independently

### 2. Request / Response (RPC-style)

Use this pattern when the sender *expects a result* and wants deterministic correlation.

```js
const result = await port.postRequest({
    op: 'multiply',
    args: [6, 7]
});
```

On the receiving side:

```js
port.addEventListener('request', (e) => {
    if (e.data.op === 'multiply') {
        return e.data.args[0] * e.data.args[1];
    }
});
```

This pattern provides:

* automatic request correlation
* promise-based control flow
* rejection on timeout or port closure

Use this for command execution, queries, and remote procedure calls.

### 3. Conversational Reply Ports

Some interactions are not single exchanges, but *conversations*.

In these cases, Port+ provides **reply ports** — temporary, private ports scoped to a specific message. This is what `.postRequest()` and `.addRequestListener()` do under the hood.

```js
const messageChannel = new MessageChannelPlus;

// Listen on the reply port
messageChannel.port2.addEventListener('message', (e) => {
    // handle reply
    console.log('reply', e.data);
});

// Send the message with the reply port
const result = await port.postRequest(
    {
        op: 'multiply',
        args: [6, 7]
    },
    [messageChannel.port1] // Transfer the reply port
);
```

On the receiving side:

```js
port.addEventListener('message', (e) => {
    const reply = e.ports[0];

    reply.postMessage(e.data.args[0] * e.data.args[1]);

    // Continue the conversation
    reply.addEventListener('message', (e) => {
        console.log('follow-up:', e.data);
    });
});
```

Reply ports:

* form a symmetric 1:1 connection
* inherit lifecycle settings from their parent port
* close automatically when either side closes

Use reply ports when:

* responses are multi-step
* data streams over time
* isolation from other traffic matters

### 4. Channelled Conversations

Use channels to separate independent flows over the same port. Channels also use reply ports under the hood.

```js
const chat = port.channel('chat');
const system = port.channel('system');
```

```js
chat.postMessage({ text: 'hello' });
system.postMessage({ action: 'sync' });
```

Channels provide:

* logical namespacing
* inbound filtering
* outbound tagging

They do not create new connections and compose naturally with routing and topology.

### 5. Shared Live State

Use this pattern when two sides must stay synchronized over time.

```js
port.postMessage(state, { live: true });
```

On the receiving side:

```js
port.addEventListener('message', (e) => {
    if (e.live) {
        Observer.observe(e.data, () => {
            render(e.data);
        });
    }
});
```

This pattern enables:

* shared identity across contexts
* differential mutation propagation
* lifecycle-bound reactivity

It is the foundation for collaborative state, projections, and reactive coordination.

(Detailed semantics are covered in the Live Objects section.)

---

## API Reference

This section defines the **formal API contract** for Port+.
Conceptual behavior, lifecycle semantics, and usage patterns are documented in earlier sections.

1. `MessagePortPlus` (Base & Concrete Interfaces)
2. `MessageEventPlus`

### 1. `MessagePortPlus` (Base & Concrete Interfaces)

All Port+ implementations – `MessagePortPlus`, `BroadcastChannelPlus`, `WebSocketPort`, `StarPort`, `RelayPort` – conform to the `MessagePortPlus` interface.

### Port-Specific Constructor Options

+ `MessageChannelPlus`
+ `BroadcastChannelPlus`
+ `WebSocketPort`
+ `StarPort`
+ `RelayPort`

#### `MessageChannelPlus`

```js
new MessageChannelPlus({
    autoStart?: boolean,
    postAwaitsOpen?: boolean
});
```

| Option           | Default | Description                                           |
| ---------------- | ------- | ----------------------------------------------------- |
| `autoStart`      | `true`  | Automatically initiate handshake on first interaction |
| `postAwaitsOpen` | `false` | Queue messages until the port is `open`               |

#### `BroadcastChannelPlus`

```js
new BroadcastChannelPlus(name, {
    autoStart?: boolean,
    postAwaitsOpen?: boolean,
    clientServerMode?: 'server' | 'client' | null,
    autoClose?: boolean
});
```

| Option             | Default | Description                                   |
| ------------------ | ------- | --------------------------------------------- |
| `autoStart`        | `true`  | Begin handshake on first interaction          |
| `postAwaitsOpen`   | `false` | Queue messages until readiness                |
| `clientServerMode` | `null`  | Can be one of `'server'`, `'client'` or `null` |
| `autoClose`        | `true` | Auto-close server when all clients disconnect |

#### `WebSocketPort`

```js
new WebSocketPort(wsOrUrl, {
    autoStart?: boolean,
    naturalOpen?: boolean,
    postAwaitsOpen?: boolean
});
```

| Option           | Default | Description                          |
| ---------------- | ------- | ------------------------------------ |
| `autoStart`      | `true`  | Begin handshake on first interaction |
| `naturalOpen`    | `true`  | Use WebSocket transport readiness instead of Port+ interaction-based ready state |
| `postAwaitsOpen` | `false` | Queue messages until readiness       |

#### `StarPort`

```js
new StarPort({
    autoStart?: boolean,
    postAwaitsOpen?: boolean,
    autoClose?: boolean
});
```

| Option           | Default | Description                          |
| ---------------- | ------- | ------------------------------------ |
| `autoStart`      | `true`  | Igonred for self. Inherited by `.channel()` ports |
| `postAwaitsOpen` | `false` | Queue messages until readiness       |
| `autoClose`      | `true`  | Auto-close server when all clients disconnect |

#### `RelayPort`

```js
new RelayPort(channelSpec?, {
    autoStart?: boolean,
    postAwaitsOpen?: boolean,
    autoClose?: boolean
});
```

| Option           | Default | Description                          |
| ---------------- | ------- | ------------------------------------ |
| `autoStart`      | `true`  | Igonred for self. Inherited by `.channel()` ports |
| `postAwaitsOpen` | `false` | Queue messages until readiness       |
| `autoClose`      | `true`  | Auto-close server when all clients disconnect |

### Lifecycle API

* `start()`
* `close()`
* `readyState`
* `readyStateChange()`

#### `start(): void`

Explicitly initiates the interaction handshake.

* Required when `autoStart` is `false`
* Signals readiness to the remote side

#### `close(): void`

Closes the port.

* Sends a control close signal
* Triggers teardown of dependent ports and projections
* Transitions `readyState` to `closed`

#### `readyState: 'connecting' | 'open' | 'closed'`

Current lifecycle state of the port.

#### `readyStateChange(state: 'open' | 'close' | 'messaging'): Promise<void>`

Resolves when the port transitions into the specified state.

* `'open'`: handshake completed
* `'messaging'`: first outbound message sent
* `'close'`: port fully closed

> [!TIP]
>
> This is the recommended way to listen for port lifecycle changes compared to using `addEventListener('close', ...)`.
> While a corresponding `open` and `close` events are dispatched at the same time as the `readyStateChange` promise, those events may also be simulated manually via `dispatchEvent()` or `postMessage()`. By contrast, `readyStateChange` is system-managed.
> Code that depends on port lifecycle changes should always rely on `readyState` or `readyStateChange()`.

### Messaging API

+ `postMessage()`
+ `postRequest()`
+ `addEventListener()`
+ `addRequestListener()`

#### `postMessage(data: any, options?): void`

Sends a message over the port. `options` are:

| Option     | Type    | Description                               |
| ---------- | ------- | ----------------------------------------- |
| `type`     | string  | Message event type (default: `'message'`) |
| `live`     | boolean | Enable live object projection             |
| `transfer` | Array   | Transferable objects                      |

#### `postRequest(data: any, options?): Promise<any>`

Sends a request and awaits a response. `options` are:

| Option    | Type        | Description                           |
| --------- | ----------- | ------------------------------------- |
| `timeout` | number      | Reject if no response within duration |
| `signal`  | AbortSignal | Abort the request                     |

* Rejects automatically if the port closes
* Uses a private ephemeral reply channel internally

#### `addEventListener(type: string, handler, options?): void`

Registers a handler for a specific message type. `options` are:

| Option    | Type        | Description                           |
| --------- | ----------- | ------------------------------------- |
| `once`    | boolean     | Remove listener after first invocation |
| `signal`  | AbortSignal | Abort the request                     |

Receives `MessageEventPlus` instances.

#### `addRequestListener(type: string, handler, options?): void`

Registers a request handler for a specific message type. `options` are:

| Option    | Type        | Description                           |
| --------- | ----------- | ------------------------------------- |
| `once`    | boolean     | Remove listener after first invocation |
| `signal`  | AbortSignal | Abort the request                     |

* Return value (or resolved promise) is sent as the response
* Thrown errors reject the requester

### Structuring & Routing

+ `channel()`
+ `relay()`

#### `channel(name: string): MessagePortPlus`

Creates a logical sub-port scoped to a message namespace.

* Filters inbound messages
* Tags outbound messages
* Shares lifecycle with the parent port

Ports created via `port.channel()` (and ports exposed via `event.ports`) inherit:

* `autoStart`
* `postAwaitsOpen`

from their parent port.

#### `relay(config): () => void`

Establishes explicit routing between ports. `config` is:

| Config Option    | Type            | Description               |
| ---------------- | --------------- | ------------------------- |
| `to`             | MessagePortPlus | Target port               |
| `channel`        | string | object | Channel filter            |
| `bidirectional`  | boolean         | Relay in both directions  |
| `resolveMessage` | function        | Transform message payload |

If `channel` is specified, it may be a string or a `{ from, to }` mapping. Only messages of the specified channel are relayed. If specified as a `from` -> `to` mapping, incoming messages are matched for `from` and outgoing messages are namespaced with `to` – effectively a channel mapping.

Returns a cleanup function that removes the relay.

### Live State Projection

+ `projectMutations()`

#### `projectMutations(options): () => void`

Projects mutations between objects across a port. `options` are:

| Option | Type            | Description                |
| ------ | --------------- | -------------------------- |
| `from` | object | string | Source object or shared ID |
| `to`   | string | object | Target ID or local object  |

* Must be called on **both ends** with complementary `from` / `to`
* Returns a function that terminates the projection

### 2. `MessageEventPlus`

All message events dispatched by Port+ ports.

#### Properties

| Property      | Type            | Description                     |
| ------------- | --- | ------------------------------- |
| `data`        | any | Message payload                 |
| `type`        | string | Event type                      |
| `eventID`     | string | Stable message identifier       |
| `ports`       | `MessagePortPlus[]` | Reply ports. Each instance inherits `autoStart` and `postAwaitsOpen`. Closing either side closes the other.                     |
| `live`        | boolean | Indicates a live object payload |
| `relayedFrom` | `MessagePortPlus` | Originating port (if routed)    |

#### Methods

| Method          | Description                     |
| --------------- | ------------------------------- |
| `respondWith()` | Sends a response through attached reply ports. `data` and `options` are as is with `postMessage`. |

#### `respondWith(data, options?): boolean`

Sends a response through attached reply ports. `data` and `options` are as is with `postMessage`.

Returns `true` if one or more reply ports were present.


---

## License

MIT.

[npm-version-src]: https://img.shields.io/npm/v/@webqit/port-plus?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/@webqit/port-plus
[bundle-src]: https://img.shields.io/bundlephobia/minzip/@webqit/port-plus?style=flat&colorA=18181B&colorB=F0DB4F
[bundle-href]: https://bundlephobia.com/result?p=@webqit/port-plus
[license-src]: https://img.shields.io/github/license/webqit/port-plus.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/webqit/port-plus/blob/master/LICENSE

