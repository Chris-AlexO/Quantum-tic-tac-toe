export function createButton({
  label = "",
  className = "",
  onClick = null,
  signal = undefined,
  type = "button"
} = {}) {
  const button = document.createElement("button");
  button.type = type;
  button.className = className;
  button.textContent = label;

  if (typeof onClick === "function") {
    button.addEventListener("click", onClick, signal ? { signal } : undefined);
  }

  return button;
}
