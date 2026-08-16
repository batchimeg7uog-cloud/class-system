export type Profile = {
  id: string;
  full_name: string;
  kindergarten_name: string | null;
  phone: string | null;
};

export type Group = {
  id: string;
  teacher_id: string;
  name: string;
  school_year: string;
  age_band: string | null;
  color: string;
  created_at: string;
};

export type Child = {
  id: string;
  teacher_id: string;
  group_id: string;
  first_name: string;
  last_name: string | null;
  preferred_name: string | null;
  gender: string | null;
  birth_date: string | null;
  enrollment_date: string | null;
  parent_one_name: string | null;
  parent_one_phone: string | null;
  parent_two_name: string | null;
  parent_two_phone: string | null;
  emergency_contact: string | null;
  address: string | null;
  medical_notes: string | null;
  notes: string | null;
  created_at: string;
};

export type Observation = {
  id: string;
  teacher_id: string;
  child_id: string;
  group_id: string;
  observed_on: string;
  language_score: number;
  language_notes: string | null;
  numeracy_score: number;
  numeracy_notes: string | null;
  movement_score: number;
  movement_notes: string | null;
  social_score: number;
  social_notes: string | null;
  art_score: number;
  art_notes: string | null;
  development_score: number;
  development_notes: string | null;
  environment_score: number;
  environment_notes: string | null;
  summary: string | null;
  next_steps: string | null;
  created_at: string;
};

export type ObservationMedia = {
  id: string;
  observation_id: string;
  child_id: string;
  storage_path: string;
  file_name: string;
  signed_url?: string;
};

export type PeriodSummary = {
  id: string;
  teacher_id: string;
  child_id: string;
  period_type: "week" | "month" | "quarter" | "year";
  period_start: string;
  period_end: string;
  overall_summary: string;
  strengths: string | null;
  recommendations: string | null;
  created_at: string;
};

export type ViewKey = "groups" | "children" | "observations" | "analysis" | "reports" | "settings";
