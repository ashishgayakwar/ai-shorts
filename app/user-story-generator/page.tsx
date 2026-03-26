import type { Metadata } from "next";

import UserStoryGeneratorClient from "./user-story-generator-client";

export const metadata: Metadata = {
  title: "User Story Suite Generator",
  description:
    "Generate a complete PM-grade user story suite with epics, priorities, acceptance criteria, edge cases, and definition of done.",
};

export default function UserStoryGeneratorPage() {
  return <UserStoryGeneratorClient />;
}
