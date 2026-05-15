export function makeHistory() {
  let stack = [];
  let cursor = -1;

  return {
    push(id) {
      if (id == null) return;
      if (cursor >= 0 && stack[cursor] === id) return;
      stack = stack.slice(0, cursor + 1);
      stack.push(id);
      cursor = stack.length - 1;
    },
    back() {
      if (cursor <= 0) return null;
      cursor -= 1;
      return stack[cursor];
    },
    forward() {
      if (cursor >= stack.length - 1) return null;
      cursor += 1;
      return stack[cursor];
    },
    current() { return cursor >= 0 ? stack[cursor] : null; },
    canBack()    { return cursor > 0; },
    canForward() { return cursor < stack.length - 1; },
    size() { return stack.length; }
  };
}
