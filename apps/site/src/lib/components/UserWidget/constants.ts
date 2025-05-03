export type AuthMethod = {
  id: string;
  label: string;
  icon: string;
};

export const AUTH_METHODS: AuthMethod[] = [
  {
    id: "github",
    label: "GitHub",
    icon: "fa-brands fa-github"
  },
  {
    id: "google",
    label: "Google",
    icon: "fa-brands fa-google"
  }
];
