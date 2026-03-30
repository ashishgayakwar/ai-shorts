import type { MetadataRoute } from "next";
import { concepts } from "@/data/concepts";
import questionsData from "@/interview_prep/data/questions.json";
import { getAllTopicSlugs } from "@/interview_prep/lib/qna";

// Same slugify logic you already use elsewhere
function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.aipmworld.com";
  const lastModified = new Date();

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified },
    { url: `${baseUrl}/basics`, lastModified },
    { url: `${baseUrl}/swipe`, lastModified },
    { url: `${baseUrl}/compare`, lastModified },
    { url: `${baseUrl}/quiz`, lastModified },
    { url: `${baseUrl}/visualize`, lastModified },
    { url: `${baseUrl}/user-story-generator`, lastModified },
    { url: `${baseUrl}/competitor-analysis`, lastModified },
    { url: `${baseUrl}/book-summarizer`, lastModified },
    { url: `${baseUrl}/city-guide`, lastModified },
    { url: `${baseUrl}/pm-resume-screener`, lastModified },
    { url: `${baseUrl}/case-study-generator`, lastModified },
    { url: `${baseUrl}/interview`, lastModified },
    { url: `${baseUrl}/maang-interview-series`, lastModified },
    { url: `${baseUrl}/qna`, lastModified },
    { url: `${baseUrl}/privacy`, lastModified },
    { url: `${baseUrl}/terms`, lastModified },
  ];

  // Concept pages
  const conceptRoutes: MetadataRoute.Sitemap = concepts.map((c) => ({
    url: `${baseUrl}/concept/${slugify(c.topic)}`,
    lastModified,
  }));

  const swipeConceptRoutes: MetadataRoute.Sitemap = concepts.map((c) => ({
    url: `${baseUrl}/swipe/${slugify(c.topic)}`,
    lastModified,
  }));

  const questions = (
    questionsData as {
      questions?: Array<{ question_id: string }>;
    }
  ).questions ?? [];

  const interviewQuestionRoutes: MetadataRoute.Sitemap = questions
    .map((q) => q.question_id?.trim())
    .filter(Boolean)
    .map((id) => ({
      url: `${baseUrl}/interview/${id}`,
      lastModified,
    }));

  const qnaTopicRoutes: MetadataRoute.Sitemap = getAllTopicSlugs().map((topicSlug) => ({
    url: `${baseUrl}/qna/${encodeURIComponent(topicSlug)}`,
    lastModified,
  }));

  return [
    ...staticRoutes,
    ...conceptRoutes,
    ...swipeConceptRoutes,
    ...interviewQuestionRoutes,
    ...qnaTopicRoutes,
  ];
}
