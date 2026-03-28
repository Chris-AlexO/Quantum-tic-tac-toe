export function createSliceRenderer({
  select,
  render,
  equals = Object.is
}) {
  let hasRendered = false;
  let previousSlice;

  return {
    update(state, context = {}) {
      const nextSlice = select(state, context);
      if (hasRendered && equals(previousSlice, nextSlice)) {
        return false;
      }

      previousSlice = nextSlice;
      hasRendered = true;
      render(nextSlice, state, context);
      return true;
    },

    reset() {
      hasRendered = false;
      previousSlice = undefined;
    }
  };
}
