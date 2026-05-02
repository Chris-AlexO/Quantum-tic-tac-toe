import { Link } from "react-router-dom";

function buttonClassName(variant = "secondary", className = "") {
  return ["app-button", `app-button-${variant}`, className].filter(Boolean).join(" ");
}

export function Button({ variant = "secondary", className = "", type = "button", ...props }) {
  return (
    <button
      type={type}
      className={buttonClassName(variant, className)}
      {...props}
    />
  );
}

export function ButtonLink({ variant = "secondary", className = "", ...props }) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
