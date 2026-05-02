import leoProfanity from "leo-profanity";

export function normalizePlayerName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

export function validatePlayerName(name) {
  const normalizedName = normalizePlayerName(name);

  if (!normalizedName) {
    return {
      ok: false,
      name: "",
      message: "Enter a name"
    };
  }

  if (leoProfanity.check(normalizedName)) {
    return {
      ok: false,
      name: normalizedName,
      message: "Choose another name"
    };
  }

  return {
    ok: true,
    name: normalizedName,
    message: ""
  };
}
