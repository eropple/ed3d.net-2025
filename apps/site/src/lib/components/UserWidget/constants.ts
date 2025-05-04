import { faDiscord, faGithub, faGoogle, type IconDefinition } from "@fortawesome/free-brands-svg-icons";

export type AuthMethod = {
  id: string;
  label: string;
  icon: IconDefinition;
};

export const AUTH_METHODS: AuthMethod[] = [
  {
    id: "github",
    label: "GitHub",
    icon: faGithub
  },
  {
    id: "google",
    label: "Google",
    icon: faGoogle
  },
  {
    id: "discord",
    label: "Discord",
    icon: faDiscord
  }
];
