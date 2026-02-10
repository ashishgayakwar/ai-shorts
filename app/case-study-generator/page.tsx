import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import CaseStudyClient from "./case-study-client";

export default async function CaseStudyGeneratorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/api/auth/signin?callbackUrl=/case-study-generator");
  }

  return <CaseStudyClient />;
}
