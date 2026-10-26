// Opening line for user emails: "Hi <full name>," from the signup name
// (auth user_metadata.full_name), or "Hi there," when it's missing.
export function greetingText(fullName?: string | null) {
  const name = fullName?.trim();
  return name ? `Hi ${name},` : "Hi there,";
}

// The name is user-entered, so it's escaped before landing in the HTML body.
export function greetingHtml(fullName?: string | null) {
  return greetingText(fullName)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
