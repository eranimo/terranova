export function measure(name: string) {
  return function (target, name: string, descriptor: TypedPropertyDescriptor<any>) {
    const original = descriptor.value;
    if (typeof original === 'function') {
      descriptor.value = function (...args) {
        performance.mark(`${name}-start`);
        const result = original.apply(this, arguments);
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
        return result;
      }
    }
    return descriptor;
  }
}
