import { _wq as $wq } from '@webqit/util/js/index.js';
import { _isObject, _isTypeObject } from '@webqit/util/js/index.js';
import { MessageEventPlus } from './MessageEventPlus.js';
import Observer from '@webqit/observer';

export const _wq = (target, ...args) => $wq(target, 'port+', ...args);
export const _options = (target) => $wq(target, 'port+', 'meta').get('options') || {};
export const _meta = (target) => $wq(target, 'port+', 'meta');

const portPlusMethods = [
    'addEventListener',
    'addRequestListener',
    'postMessage',
    'postRequest',
    'dispatchEvent',
    'forwardPort',
    'start',
    'readyStateChange',
    'removeEventListener',
    'close',
];
const portPlusProps = [
    'options',
    'readyState',
    'onmessage',
    'onmessageerror',
];

export class MessagePortPlus extends MessagePortPlusMixin(EventTarget) {

    constructor(options = {}) {
        super();
        const portPlusMeta = _wq(this, 'meta');
        portPlusMeta.set('options', options);
    }

    static [Symbol.hasInstance](instance) {
        // Direct subclass?
        if (Function.prototype[Symbol.hasInstance].call(this, instance)) return true;
        // Duct-type checking
        return portPlusMethods.every((m) => typeof instance[m] === 'function')
            || portPlusProps.every((m) => m in instance);
    }
}

export function MessagePortPlusMixin(superClass) {
    return class extends superClass {

        static upgradeInPlace(port) {
            if (port instanceof MessagePortPlus) {
                return port;
            }

            const proto = this.prototype;

            for (const prop of portPlusMethods) {
                const original = port[prop];
                const plus = proto[prop];

                if (original) Object.defineProperty(port, `_${prop}`, { value: original.bind(port), configurable: true });
                Object.defineProperty(port, prop, { value: plus.bind(port), configurable: true });
            }

            for (const prop of portPlusProps) {
                const original = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(port), prop);
                const plus = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(proto), prop);

                if (original) Object.defineProperty(port, `_${prop}`, { ...original, configurable: true });
                Object.defineProperty(port, prop, { ...plus, configurable: true });
            }

            this.upgradeEvents(port);
        }

        static upgradeEvents(port, portPlus = null) {
            if (!portPlus) portPlus = port;

            const rawPortMeta = _meta(port);
            if (rawPortMeta.get('events+')) return; // Already wrapped

            const portPlusMeta = _meta(portPlus);
            const options = _options(portPlus);

            const garbageCollection = getGarbageCollection.call(portPlus);
            const readyStateInternals = getReadyStateInternals.call(portPlus);

            // ------------- SETUP

            if (port instanceof BroadcastChannel) {
                if (options.clientServerMode === 'server') {
                    portPlusMeta.set('clients', new Set);
                } else if (options.clientServerMode === 'client') {
                    portPlusMeta.set('client_id', `client-${(0 | Math.random() * 9e6).toString(36)}`);
                }
            }

            // ------------- MESSAGE

            const messageHandler = (e) => {
                if (e instanceof MessageEventPlus) return;
                // Stop propagation if the event for portPlus
                // since we'll repost it there
                if (port === portPlus) e.stopImmediatePropagation?.();
                // Hydrate event. Typically a WebSocket-specific feature
                e = this._hydrateMessage?.(portPlus, e) || e;

                /*
                 * Handle lifecycle events from the other end
                 */

                if (e.data.ping === 'connect'
                    && typeof e.data?.['.wq']?.eventID === 'string'
                    && (!(port instanceof WebSocket) || !options.naturalOpen)) {
                    // This is a special ping from a MessagePort or BroadcastChannel instance
                    // that helps us simulate an "open" event
                    // If !options.naturalOpen, WebSockets too

                    let reply = true;

                    if (port instanceof BroadcastChannel) {
                        if (options.clientServerMode === 'server'
                            && typeof e.data.id === 'string') {
                            portPlusMeta.get('clients').add(e.data.id);
                            reply = 'server';
                        } else if (e.data.id === 'server'
                            && portPlusMeta.has('client_id')) {
                            reply = portPlusMeta.get('client_id');
                        }
                    }

                    e.ports?.forEach((p) => p.postMessage(reply));

                    portPlusMeta.set('remote.start.called', true);
                    portPlus.start();
                    return;
                }

                if (e.data.ping === 'disconnect'
                    && typeof e.data?.['.wq']?.eventID === 'string') {
                    // This is a special ping from a BroadcastChannel instance
                    // that helps us simulate a "close" event
                    // WebSockets naturally fire a close event
                    // In nodejs only, MessagePort naturally fire a close event
                    // so we need to support simulated closing for when in the browser

                    const close = () => {
                        portPlusMeta.set('remote.close.called', true);
                        portPlus.close();
                    };

                    if (port instanceof BroadcastChannel) {
                        if (options.clientServerMode === 'server'
                            && typeof e.data.id === 'string') {
                            // Expel a client
                            portPlusMeta.get('clients').delete(e.data.id);
                            // Declare closed if no clients remain
                            if (!portPlusMeta.get('clients').size
                                && options.autoClose
                                && !readyStateInternals.close.state) {
                                close();
                            }
                        } else if (options.clientServerMode === 'client'
                            && e.data.id === 'server') {
                            // Server has closed
                            close();
                        }
                    } else if (port instanceof MessagePort) {
                        close();
                    }

                    return;
                }

                /*
                 * Do event rewrites and the Webflo live object magic
                 */

                let message = e.data;
                let wqOptions = {};
                if (typeof e.data?.['.wq']?.eventID === 'string') {
                    ({ message, ['.wq']: wqOptions } = e.data);
                }

                const eventPlus = new MessageEventPlus(message, {
                    originalTarget: port,
                    ...wqOptions,
                    ports: e.ports,
                });

                portPlus.dispatchEvent(eventPlus);
            };

            // ------------- OPEN

            const openHandler = (e) => {
                // Native "open" event fired by WebSocket
                if (port instanceof WebSocket
                    && options.naturalOpen
                    && !(e instanceof MessageEventPlus)) {
                    portPlusMeta.set('remote.start.called', true);
                    portPlus.start();
                }
            };

            // ------------- CLOSE

            const closeHandler = (e) => {
                // Native "close" events fired by MessagePort and WebSocket
                if ((port instanceof WebSocket || port instanceof MessagePort)
                    && !(e instanceof MessageEventPlus)) {
                    portPlusMeta.set('remote.close.called', true);
                    portPlus.close();
                }
            };

            rawPortMeta.set('internal_call', true);
            port.addEventListener('message', messageHandler);
            port.addEventListener('error', messageHandler);
            port.addEventListener('open', openHandler);
            port.addEventListener('close', closeHandler);
            rawPortMeta.delete('internal_call');

            rawPortMeta.set('events+', true);

            garbageCollection.add(() => {
                port.removeEventListener('message', messageHandler);
                port.removeEventListener('error', messageHandler);
                port.removeEventListener('open', openHandler);
                port.removeEventListener('close', closeHandler);

                rawPortMeta.set('events+', false);
            });
        }

        get options() { return { ..._options(this) }; }

        // Messages

        get onmessageerror() {
            if (typeof super.onmessageerror !== 'undefined') {
                return super.onmessageerror;
            }
            if (typeof this._onmessageerror !== 'undefined') {
                return this._onmessageerror;
            }
            return null;
        }

        set onmessageerror(v) {
            if (typeof super.onmessageerror !== 'undefined') {
                super.onmessageerror = v;
                return;
            }

            if (v !== null && typeof v !== 'function') {
                throw new TypeError('onmessageerror must be a function');
            }

            if (Object.getOwnPropertyDescriptor(this, '_onmessageerror')?.set) {
                this._onmessageerror = v;
                return;
            }

            if (this._onmessageerror) this.removeEventListener('messageerror', this._onmessageerror);
            this.addEventListener('messageerror', v);
            this._onmessageerror = v;
        }

        get onmessage() {
            if (typeof super.onmessage !== 'undefined') {
                return super.onmessage;
            }
            if (typeof this._onmessage !== 'undefined') {
                return this._onmessage;
            }
            return null;
        }

        set onmessage(v) {
            // Auto-start?
            const portPlusMeta = _meta(this);
            const options = _options(this);
            if (!portPlusMeta.get('internal_call')
                && options.autoStart) {
                this.start();
            }

            if (typeof super.onmessage !== 'undefined') {
                super.onmessage = v;
                return;
            }

            if (v !== null && typeof v !== 'function') {
                throw new TypeError('onmessage must be a function');
            }

            if (Object.getOwnPropertyDescriptor(this, '_onmessage')?.set) {
                this._onmessage = v;
                return;
            }

            if (this._onmessage) this.removeEventListener('message', this._onmessage);
            this.addEventListener('message', v);
            this._onmessage = v;
        }

        addEventListener(...args) {
            // Auto-start?
            const portPlusMeta = _meta(this);
            const options = _options(this);
            if (!portPlusMeta.get('internal_call')
                && options.autoStart) {
                this.start();
            }

            // Add to registry 
            const garbageCollection = getGarbageCollection.call(this);
            garbageCollection.add(() => {
                this._removeEventListener
                    ? this._removeEventListener(...args)
                    : super.removeEventListener(...args);
            });

            // Execute addEventListener()
            return this._addEventListener
                ? this._addEventListener(...args)
                : super.addEventListener(...args);
        }

        dispatchEvent(event) {
            const returnValue = this._dispatchEvent
                ? this._dispatchEvent(event)
                : super.dispatchEvent(event);
            if (event instanceof MessageEventPlus) {
                // Bubble semantics
                propagateEvent.call(this, event);
            }
            return returnValue;
        }

        postMessage(message, transferOrOptions = {}) {
            // Auto-start?
            const portPlusMeta = _meta(this);
            const options = _options(this);
            if (!portPlusMeta.get('internal_call')
                && options.autoStart) {
                this.start();
            }

            // Update readyState
            const readyStateInternals = getReadyStateInternals.call(this);
            readyStateInternals.messaging.state = true;
            readyStateInternals.messaging.resolve();

            // Format payload if not yet in the ['.wq'] format
            let _relayedFrom;
            if (!_isObject(message?.['.wq'])) {
                const { portOptions, wqOptions: { relayedFrom, ...wqOptions } } = preProcessPostMessage.call(this, message, transferOrOptions);
                message = { message, ['.wq']: wqOptions };
                transferOrOptions = portOptions;
                _relayedFrom = relayedFrom;
            }

            // Exec
            const post = () => {
                this._postMessage
                    ? this._postMessage(message, transferOrOptions, _relayedFrom)
                    : super.postMessage(message, transferOrOptions);
            };

            // If client-server mode, wait for open ready state
            if (options.postAwaitsOpen) readyStateInternals.open.promise.then(post);
            else post();
        }

        // Requests

        addRequestListener(type, handler, options = {}) {
            const handle = async (e) => {
                const response = await handler(e);
                for (const port of e.ports) {
                    port.postMessage(response);
                }
            };
            this.addEventListener(type, handle, options);
        }

        postRequest(data, callback, options = {}) {
            let returnValue;

            if (_isObject(callback)) {
                options = { once: true, ...callback };
                returnValue = new Promise((resolve) => {
                    callback = resolve;
                });
            }

            const messageChannel = new MessageChannel;
            this.constructor.upgradeEvents(messageChannel.port1);
            messageChannel.port1.start();

            const { signal = null, once = false, transfer = [], ..._options } = options;

            messageChannel.port1.addEventListener('message', (e) => callback(e), { signal, once });
            signal?.addEventListener('abort', () => {
                messageChannel.port1.close();
                messageChannel.port2.close();
            });

            this.postMessage(data, { ..._options, transfer: [messageChannel.port2].concat(transfer) });
            return returnValue;
        }

        // Forwarding

        forwardPort(eventTypes, targetPort, { resolveData = null, bidirectional = false, namespace1 = null, namespace2 = null } = {}) {
            if (!(this instanceof MessagePortPlus) || !(targetPort instanceof MessagePortPlus)) {
                throw new Error('Both ports must be instance of MessagePortPlus.');
            }
            if (typeof eventTypes !== 'function' && !(eventTypes = [].concat(eventTypes)).length) {
                throw new Error('Event types must be specified.');
            }

            const downstreamRegistry = getDownstreamRegistry.call(this);
            const registration = { targetPort, eventTypes, options: { resolveData, namespace1, namespace2 } };
            downstreamRegistry.add(registration);

            let cleanup2;
            if (bidirectional) {
                cleanup2 = this.forwardPort.call(
                    targetPort,
                    typeof eventTypes === 'function' ? eventTypes : eventTypes.filter((s) => s !== 'close'),
                    this,
                    { resolveData, bidirectional: false, namespace1: namespace2, namespace2: namespace1 }
                );
            }

            return () => {
                downstreamRegistry.delete(registration);
                cleanup2?.();
            };
        }

        // Lifecycle

        get readyState() {
            const readyStateInternals = getReadyStateInternals.call(this);
            return readyStateInternals.close.state ? 'closed'
                : (readyStateInternals.open.state ? 'open' : 'connecting');
        }

        readyStateChange(query) {
            if (!['open', 'messaging', 'error', 'close'].includes(query)) {
                throw new Error(`Invalid readyState query "${query}"`);
            }
            const readyStateInternals = getReadyStateInternals.call(this);
            return readyStateInternals[query].promise;
        }

        start() {
            const readyStateInternals = getReadyStateInternals.call(this);
            if (readyStateInternals.open.state) return;

            let messageChannel;

            const readyStateOpen = () => {
                if (readyStateInternals.open.state) return;
                readyStateInternals.open.state = true;
                readyStateInternals.open.resolve();

                const openEvent = new MessageEventPlus(null, { type: 'open' });
                this._dispatchEvent
                    ? this._dispatchEvent(openEvent)
                    : super.dispatchEvent(openEvent);

                messageChannel?.port1.close();
                messageChannel?.port2.close();
            };

            const portPlusMeta = _meta(this);
            const options = _options(this);

            if (portPlusMeta.get('remote.start.called')) {
                readyStateOpen();
                return;
            }

            if (portPlusMeta.get('start.called')) return;
            portPlusMeta.set('start.called', true);

            this._start
                ? this._start()
                : super.start?.();

            messageChannel = new MessageChannel;

            messageChannel.port1.onmessage = (e) => {
                if (this instanceof BroadcastChannel
                    && options.clientServerMode === 'server'
                    && typeof e.data === 'string') {
                    // Register clients that replied
                    portPlusMeta.get('clients').add(e.data);
                }
                readyStateOpen();
            };

            const { wqOptions } = preProcessPostMessage.call(this);
            const id = options.clientServerMode === 'server' ? 'server'
                : (options.clientServerMode === 'client' ? portPlusMeta.get('client_id') : null);
            const pingData = { ['.wq']: wqOptions, ping: 'connect', id };

            this._postMessage
                ? this._postMessage(pingData, { transfer: [messageChannel.port2] })
                : super.postMessage(pingData, { transfer: [messageChannel.port2] });
        }

        close(...args) {
            const readyStateInternals = getReadyStateInternals.call(this);

            if (readyStateInternals.close.state) return;
            readyStateInternals.close.state = true;

            const portPlusMeta = _meta(this);
            const options = _options(this);

            if (!portPlusMeta.get('remote.close.called')
                && (this instanceof BroadcastChannel || this instanceof MessagePort)) {

                const { wqOptions } = preProcessPostMessage.call(this);
                const id = options.clientServerMode === 'server' ? 'server'
                    : (options.clientServerMode === 'client' ? portPlusMeta.get('client_id') : null);
                const pingData = { ['.wq']: wqOptions, ping: 'disconnect', id };

                this._postMessage
                    ? this._postMessage(pingData)
                    : super.postMessage(pingData);
            }

            // This should come before event:
            // Nodejs natively sends a close event to other port (port2) for MessagePort
            // this ensures:
            //  port2.ping() -> port2.close() -> port2.customCloseEvent()
            //  -> port1.customCloseEvent()
            this._close
                ? this._close(...args)
                : super.close(...args);

            readyStateInternals.close.resolve();

            const openEvent = new MessageEventPlus(null, { type: 'close' });
            this._dispatchEvent
                ? this._dispatchEvent(openEvent)
                : super.dispatchEvent(openEvent);

            garbageCollect.call(this);
        }
    };
}

export function MessagePortPlusMockPortsMixin(superClass) {
    return class extends MessagePortPlusMixin(superClass) {

        static _hydrateMessage(portPlus, event) {
            // But only one with ['.wq'].numPorts & ['.wq'].eventID is valid for port hydration
            if (typeof event.data?.['.wq']?.numPorts !== 'number' || typeof event.data['.wq'].eventID !== 'string') {
                return event;
            }

            const garbageCollection = getGarbageCollection.call(portPlus);
            const numPorts = event.data['.wq'].numPorts;
            Object.defineProperty(event, 'ports', { value: [], configurable: true });

            for (let i = 0; i < numPorts; i++) {
                const channel = new MessageChannel;
                channel.port1.start();

                MessagePortPlus.upgradeInPlace(channel.port1);
                garbageCollection.add(portPlus.forwardPort('*', channel.port1, { bidirectional: true, namespace1: `${event.data['.wq'].eventID}:${i}` }));
                event.ports.push(channel.port2);

                portPlus.readyStateChange('close').then(() => {
                    channel.port1.close();
                    channel.port2.close();
                });
            }

            return event;
        }

        _postMessage(payload, portOptions = {}) {
            const { transfer = [], ..._portOptions } = portOptions;

            if (typeof payload?.['.wq']?.eventID === 'string') {
                const garbageCollection = getGarbageCollection.call(this);

                const messagePorts = transfer.filter((t) => t instanceof MessagePort);
                const numPorts = messagePorts.length;

                for (let i = 0; i < numPorts; i++) {
                    MessagePortPlus.upgradeInPlace(messagePorts[i]);
                    garbageCollection.add(this.forwardPort('*', messagePorts[i], { bidirectional: true, namespace1: `${payload['.wq'].eventID}:${i}` }));
                }

                payload['.wq'].numPorts = numPorts; // IMPORTANT: numPorts must be set before ports are added
            }

            return this.__postMessage(payload, _portOptions);
        }
    };
}

export function propagateEvent(event) {
    if (event.propagationStopped) return;
    const portMeta = _meta(this);

    if (portMeta.get('parentNode') instanceof EventTarget && (
        event.bubbles
        || portMeta.get('parentNode')?.findPort?.((port) => port === this) && event instanceof MessageEventPlus)
    ) {
        portMeta.get('parentNode').dispatchEvent(event);
        // "parentNode" is typically a StarPort feature
        // in case "this" is a RelayPort
    }

    const downstreamRegistry = getDownstreamRegistry.call(this);
    if (!downstreamRegistry.size) return;

    if (event instanceof MessageEventPlus) {
        const { type, eventID, data, live, bubbles, ports } = event;

        const called = new WeakSet;
        for (const { targetPort, eventTypes, options } of downstreamRegistry) {
            if (called.has(targetPort)) continue;

            let $type = type;
            if (options.namespace1) {
                [, $type] = (new RegExp(`^${options.namespace1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:([^:]+)$`)).exec(type) || [];
                if (!$type) continue;
            }

            const matches = typeof eventTypes === 'function'
                ? eventTypes($type, this, targetPort, options)
                : [].concat(eventTypes).find((t) => {
                    return t === $type || t === '*';
                });

            if (!matches) continue;
            called.add(targetPort);

            targetPort.postMessage(options.resolveData ? options.resolveData(data, this, targetPort, options) : data, {
                transfer: ports,
                type: options.namespace2 ? `${options.namespace2}:${$type}` : $type,
                eventID,
                bubbles,
                live,
                forwarded: true,
                relayedFrom: this
                // "relayedFrom" is typically a RelayPort feature
                // in case targetPort is a RelayPort
            });
        }
    }
}

export function getGarbageCollection() {
    const portPlusMeta = _meta(this);
    if (!portPlusMeta.has('garbage_collection')) {
        portPlusMeta.set('garbage_collection', new Set);
    }
    return portPlusMeta.get('garbage_collection');
}

export function getDownstreamRegistry() {
    const portPlusMeta = _meta(this);
    if (!portPlusMeta.has('downstream_registry')) {
        portPlusMeta.set('downstream_registry', new Set);
    }
    return portPlusMeta.get('downstream_registry');
}

export function getReadyStateInternals() {
    const portPlusMeta = _meta(this);
    if (!portPlusMeta.has('readystate_registry')) {
        const $ref = (o) => {
            o.promise = new Promise((resolve) => o.resolve = resolve);
            return o;
        };
        portPlusMeta.set('readystate_registry', {
            open: $ref({}),
            messaging: $ref({}),
            error: $ref({}),
            close: $ref({}),
        });
    }
    return portPlusMeta.get('readystate_registry');
}

export function garbageCollect() {
    const portPlusMeta = _meta(this);

    for (const dispose of portPlusMeta.get('garbage_collection') || []) {
        if (dispose instanceof AbortController) {
            dispose.abort();
        } else if (typeof dispose === 'function') dispose();
    }
    portPlusMeta.get('garbage_collection')?.clear();
    portPlusMeta.get('downstream_registry')?.clear();
}

export function preProcessPostMessage(message = undefined, transferOrOptions = {}) {
    if (Array.isArray(transferOrOptions)) {
        transferOrOptions = { transfer: transferOrOptions };
    } else if (!transferOrOptions
        || typeof transferOrOptions !== 'object') {
        throw new TypeError('transferOrOptions must be an array or an object');
    }

    let {
        type = 'message',
        eventID = null,
        live = false,
        observing = false,
        bubbles = false,
        forwarded = false,
        relayedFrom = null,
        signal = null,
        withArrayMethodDescriptors = false,
        honourDoneMutationFlags = false,
        ...portOptions
    } = transferOrOptions;

    if (!eventID) eventID = `${type}-${(0 | Math.random() * 9e6).toString(36)}`;

    if (!observing && !forwarded && _isTypeObject(message) && live && !type?.endsWith('.mutate')) {
        publishMutations.call(this, message, eventID, { signal, withArrayMethodDescriptors, honourDoneMutationFlags });
        observing = true;
    }

    return {
        portOptions,
        wqOptions: {
            type,
            eventID,
            live,
            observing,
            honourDoneMutationFlags,
            bubbles,
            forwarded,
            relayedFrom
        }
    };
}

export function publishMutations(message, eventID, { signal, withArrayMethodDescriptors = true, honourDoneMutationFlags = false } = {}) {
    if (!_isTypeObject(message)) throw new TypeError('data must be a plain object and not a stream');
    if (typeof eventID !== 'string') throw new TypeError('eventID must be a non-empty string');

    const mutationHandler = (mutations) => {
        let mutationsDone;

        if (withArrayMethodDescriptors
            && Array.isArray(mutations[0].target)
            && !mutations[0].argumentsList
            && !['set', 'defineProperty', 'deleteProperty'].includes(mutations[0].operation)) return;

        this.postMessage(
            mutations.map((m) => {
                mutationsDone = !mutationsDone
                    && honourDoneMutationFlags
                    && m.detail?.done;
                return { ...m, target: undefined };
            }),
            { type: `${eventID}.mutate` }
        );

        if (mutationsDone) dispose.abort();
    };

    const dispose = Observer.observe(message, Observer.subtree(), mutationHandler, { signal, withArrayMethodDescriptors });
    const garbageCollection = getGarbageCollection.call(this);
    garbageCollection.add(dispose);

    return dispose;
}

export function applyMutations(message, eventID, { signal, honourDoneMutationFlags = false } = {}) {
    if (!_isTypeObject(message)) throw new TypeError('data must be a plain object and not a stream');
    if (typeof eventID !== 'string') throw new TypeError('eventID must be a non-empty string');

    const messageHandler = (e) => {
        if (!e.data?.length) return;

        let mutationsDone;

        Observer.batch(message, () => {
            for (const mutation of e.data) {
                mutationsDone = !mutationsDone
                    && honourDoneMutationFlags
                    && mutation.detail?.done;

                if (mutation.argumentsList) {
                    const target = !mutation.path.length ? message : Observer.get(message, Observer.path(...mutation.path));
                    Observer.proxy(target)[mutation.operation](...mutation.argumentsList);
                    continue;
                }

                if (mutation.key !== 'length'
                    || ['set', 'defineProperty', 'deleteProperty'].includes(mutation.operation)) {
                    const target = mutation.path.length === 1 ? message : Observer.get(message, Observer.path(...mutation.path.slice(0, -1)));
                    if (mutation.type === 'delete') {
                        Observer.deleteProperty(target, mutation.key);
                    } else {
                        Observer.set(target, mutation.key, mutation.value);
                    }
                }
            }
        });

        if (mutationsDone) cleanup();
    };

    this.addEventListener(`${eventID}.mutate`, messageHandler, { signal });
    const cleanup = () => this.removeEventListener(`${eventID}.mutate`, messageHandler);

    const garbageCollection = getGarbageCollection.call(this);
    garbageCollection.add(cleanup);

    return cleanup;
}