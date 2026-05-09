export type SchoolStatus =
  | 'current'
  | 'interested'
  | 'contacted'
  | 'offered'
  | 'visit_scheduled'
  | 'committed'
  | 'declined'

export type PriorityTier = 'A' | 'B' | 'C'

export type ScholarshipType = 'full_ride' | 'partial' | 'none' | 'unknown'

export type ActivityType =
  | 'call'
  | 'call_scheduled'
  | 'email'
  | 'visit'
  | 'offer'
  | 'portal'
  | 'other'

export interface School {
  id: number
  name: string
  location: string
  conference: string | null
  status: SchoolStatus
  priority_tier: PriorityTier
  scholarship_type: ScholarshipType
  scholarship_details: string | null
  coach_name: string | null
  coach_role: string | null
  coach_email: string | null
  coach_phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Activity {
  id: number
  school_id: number
  date: string
  time: string | null
  activity_type: ActivityType
  description: string
  created_at: string
}

export interface SchoolWithActivities extends School {
  activities: Activity[]
}

export interface UpcomingCall {
  activity_id: number
  school_id: number
  school_name: string
  date: string
  time: string | null
  description: string
}

export interface Stats {
  total: number
  offered: number
  a_list: number
  upcoming_calls: number
}

export type SwimEvent = '50_back' | '100_back' | '200_back' | '50_free' | '100_free' | '200_free'

export interface StudentGoals {
  engineering: boolean
  norcal_alumni: boolean
  lcm_summer: boolean
  coed_team: boolean
  ncaa_relay: boolean
  olympic_trials: boolean
}

export interface Student {
  id: number
  name: string
  swimcloud_url: string | null
  sport: string
  goals: string | null
  created_at: string
  updated_at: string
}

export interface StudentTime {
  id: number
  student_id: number
  event: SwimEvent
  time_seconds: number | null
  time_display: string | null
  source: string
  updated_at: string
}

export interface NcaaRelayCut {
  id: number
  sport: string
  gender: string
  division: string
  season_year: number
  relay_name: string
  cut_type: string
  cut_display: string
  cut_seconds: number
  legs: number
  leg_distance: number
  leg_stroke: string
}

export interface SchoolResearch {
  id: number
  school_id: number
  engineering_rank: string | null
  engineering_notes: string | null
  alumni_notes: string | null
  has_mens_team: number | null
  has_lcm_summer: number | null
  head_coach_name: string | null
  head_coach_linkedin: string | null
  ncaa_relay_history: string | null
  fit_score: number | null
  fit_summary: string | null
  researched_at: string | null
}

export interface SchoolSwimmer {
  id: number
  school_id: number
  swimmer_name: string
  event: string
  time_seconds: number | null
  time_display: string | null
  swimcloud_url: string | null
  researched_at: string
}

export interface RelayLeg {
  swimmer_name: string
  time_display: string
  time_seconds: number
  is_student?: boolean
}

export interface RelayProjection {
  id: number
  school_id: number
  relay_name: string
  ncaa_cut_display: string | null
  ncaa_cut_seconds: number | null
  current_total_display: string | null
  current_total_seconds: number | null
  with_student_total_display: string | null
  with_student_total_seconds: number | null
  makes_ncaa_without: number | null
  makes_ncaa_with: number | null
  student_slot: number | null
  student_leg_stroke: string | null
  lineup_json: string | null
  researched_at: string
}
