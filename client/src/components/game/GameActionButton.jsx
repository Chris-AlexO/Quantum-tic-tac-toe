export function GameActionButton({
  model,
  variant = "primary",
  className = "",
  onAction,
  children,
  ...props
}) {
  if (model?.hidden) {
    return null;
  }

  const actionType = model?.actionType;
  const buttonClassName = [
    variant === "primary" ? "game-action-button" : "game-secondary-button",
    className
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={buttonClassName}
      disabled={model?.disabled}
      {...props}
      onClick={() => {
        if (actionType && onAction) {
          onAction(actionType);
          return;
        }

        props.onClick?.();
      }}
    >
      {children ?? model?.label}
    </button>
  );
}
