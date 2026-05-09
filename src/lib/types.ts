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
