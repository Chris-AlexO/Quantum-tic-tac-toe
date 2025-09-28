export const bus = new EventTarget();

export function emit(type, detail) {
  bus.dispatchEvent(new CustomEvent(type, { detail }));
  console.log(`event emitted: ${type}`);
}

export function on(type, fn) {
  const wrap = (e) => fn(e.detail, e);
  bus.addEventListener(type, wrap);
  // return unsubscribe
  return () => bus.removeEventListener(type, wrap);
}