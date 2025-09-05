class EventBus {
  constructor() {
    if (EventBus._instance) return EventBus._instance;
    this.listeners = new Map();
    EventBus._instance = this;
  }
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }
  emit(event, payload) {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {
        console.error(e);
      }
    });
  }
}
export const bus = new EventBus();
