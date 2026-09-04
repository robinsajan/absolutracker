export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("absolut_logged_in") === "true";
}

export function getUsername(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("absolut_username") || "";
}

export function setLogin(username: string): void {
  localStorage.setItem("absolut_logged_in", "true");
  localStorage.setItem("absolut_username", username);
}

export function logout(): void {
  localStorage.removeItem("absolut_logged_in");
  localStorage.removeItem("absolut_username");
}
