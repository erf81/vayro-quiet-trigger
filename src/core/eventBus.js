/**
 * Lightweight event bus with explicit unsubscribe to prevent memory leaks.
 */
'use strict';

class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    const set = this._listeners.get(event);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      this._listeners.delete(event);
    }
  }

  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[ZAU EventBus] Error in "${event}" listener:`, err);
      }
    }
  }

  clear() {
    this._listeners.clear();
  }
}

module.exports = { EventBus };
