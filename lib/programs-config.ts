export const programTypes = ["FIXED", "ROLLING", "COHORT"] as const;
export const programCategories = [
  "CAREER",
  "ACADEMIC",
  "ENTREPRENEURSHIP",
  "LEADERSHIP",
  "MENTAL_HEALTH",
  "LIFE_SKILLS",
] as const;
export const programStatuses = ["DRAFT", "PUBLISHED", "ENROLLMENT_OPEN", "ACTIVE", "COMPLETED", "ARCHIVED"] as const;
export const programFormats = ["VIRTUAL", "IN_PERSON", "HYBRID"] as const;
export const sessionFrequencies = ["WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"] as const;
export const targetAgeGroups = ["EARLY_SECONDARY", "SENIOR_SECONDARY", "UNIVERSITY", "YOUNG_PROFESSIONALS"] as const;
export const geographicScopes = ["SCHOOL", "COUNTY", "REGIONAL", "NATIONAL", "INTERNATIONAL"] as const;
export const educationLevels = ["PRIMARY", "SECONDARY", "COLLEGE", "UNIVERSITY", "VOCATIONAL"] as const;
export const mentorIndustries = [
  "ALL",
  "Technology",
  "Education",
  "Healthcare",
  "Finance",
  "Agriculture",
  "Manufacturing",
  "Media",
  "Public Service",
  "Law",
  "Engineering",
  "Construction",
  "Energy",
  "Logistics",
  "Hospitality",
  "Retail",
  "Nonprofit",
  "Telecommunications",
  "Creative Arts",
  "Research",
] as const;
export const programThemes = [
  "Career Exploration",
  "Interview Preparation",
  "CV Writing",
  "Goal Setting",
  "Leadership Development",
  "Confidence Building",
  "Public Speaking",
  "Entrepreneurship",
  "Business Planning",
  "Innovation",
  "Financial Literacy",
  "Digital Skills",
  "STEM Exposure",
  "Academic Support",
  "Exam Readiness",
  "University Readiness",
  "Work Readiness",
  "Networking",
  "Wellbeing",
  "Mental Health Awareness",
  "Resilience",
  "Life Skills",
  "Communication Skills",
  "Problem Solving",
] as const;
export const kenyaCounties = [
  "Baringo",
  "Bomet",
  "Bungoma",
  "Busia",
  "Elgeyo-Marakwet",
  "Embu",
  "Garissa",
  "Homa Bay",
  "Isiolo",
  "Kajiado",
  "Kakamega",
  "Kericho",
  "Kiambu",
  "Kilifi",
  "Kirinyaga",
  "Kisii",
  "Kisumu",
  "Kitui",
  "Kwale",
  "Laikipia",
  "Lamu",
  "Machakos",
  "Makueni",
  "Mandera",
  "Marsabit",
  "Meru",
  "Migori",
  "Mombasa",
  "Murang'a",
  "Nairobi",
  "Nakuru",
  "Nandi",
  "Narok",
  "Nyamira",
  "Nyandarua",
  "Nyeri",
  "Samburu",
  "Siaya",
  "Taita-Taveta",
  "Tana River",
  "Tharaka-Nithi",
  "Trans Nzoia",
  "Turkana",
  "Uasin Gishu",
  "Vihiga",
  "Wajir",
  "West Pokot",
] as const;

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function parseCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

export function suggestProgramThemes(input: {
  name?: string;
  description?: string;
  category?: (typeof programCategories)[number];
}) {
  const haystack = `${input.name ?? ""} ${input.description ?? ""}`.toLowerCase();
  const suggestions = new Set<string>();

  switch (input.category) {
    case "CAREER":
      suggestions.add("Career Exploration");
      suggestions.add("Work Readiness");
      suggestions.add("Networking");
      break;
    case "ACADEMIC":
      suggestions.add("Academic Support");
      suggestions.add("Goal Setting");
      break;
    case "ENTREPRENEURSHIP":
      suggestions.add("Entrepreneurship");
      suggestions.add("Business Planning");
      suggestions.add("Innovation");
      break;
    case "LEADERSHIP":
      suggestions.add("Leadership Development");
      suggestions.add("Communication Skills");
      break;
    case "MENTAL_HEALTH":
      suggestions.add("Wellbeing");
      suggestions.add("Mental Health Awareness");
      suggestions.add("Resilience");
      break;
    case "LIFE_SKILLS":
      suggestions.add("Life Skills");
      suggestions.add("Confidence Building");
      suggestions.add("Financial Literacy");
      break;
    default:
      break;
  }

  if (includesAny(haystack, ["career", "profession", "job"])) suggestions.add("Career Exploration");
  if (includesAny(haystack, ["interview", "cv", "resume"])) {
    suggestions.add("Interview Preparation");
    suggestions.add("CV Writing");
  }
  if (includesAny(haystack, ["lead", "leadership"])) suggestions.add("Leadership Development");
  if (includesAny(haystack, ["confidence", "self-esteem", "self esteem"])) suggestions.add("Confidence Building");
  if (includesAny(haystack, ["entrepreneur", "startup", "business"])) {
    suggestions.add("Entrepreneurship");
    suggestions.add("Business Planning");
  }
  if (includesAny(haystack, ["finance", "money", "budget"])) suggestions.add("Financial Literacy");
  if (includesAny(haystack, ["digital", "technology", "tech", "coding"])) suggestions.add("Digital Skills");
  if (includesAny(haystack, ["stem", "science", "engineering", "math"])) suggestions.add("STEM Exposure");
  if (includesAny(haystack, ["exam", "academic", "school"])) suggestions.add("Academic Support");
  if (includesAny(haystack, ["university", "college", "admission"])) suggestions.add("University Readiness");
  if (includesAny(haystack, ["network", "connections", "mentors"])) suggestions.add("Networking");
  if (includesAny(haystack, ["wellbeing", "well-being", "mental health", "stress"])) {
    suggestions.add("Wellbeing");
    suggestions.add("Mental Health Awareness");
  }
  if (includesAny(haystack, ["resilience", "coping", "bounce back"])) suggestions.add("Resilience");
  if (includesAny(haystack, ["life skills", "communication", "soft skills"])) {
    suggestions.add("Life Skills");
    suggestions.add("Communication Skills");
  }
  if (includesAny(haystack, ["goal", "roadmap", "plan"])) suggestions.add("Goal Setting");
  if (includesAny(haystack, ["problem solving", "critical thinking"])) suggestions.add("Problem Solving");
  if (includesAny(haystack, ["public speaking", "presentation"])) suggestions.add("Public Speaking");

  return Array.from(suggestions).filter((item) => programThemes.includes(item as (typeof programThemes)[number]));
}
