import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'recruiting.db')

declare global {
  // eslint-disable-next-line no-var
  var __db: Database.Database | undefined
}

function getDb(): Database.Database {
  if (global.__db) return global.__db

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  seedIfEmpty(db)

  global.__db = db
  return db
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT NOT NULL,
      location            TEXT NOT NULL DEFAULT '',
      conference          TEXT,
      status              TEXT NOT NULL DEFAULT 'interested'
                            CHECK(status IN ('current','interested','contacted','offered',
                                             'visit_scheduled','committed','declined')),
      priority_tier       TEXT NOT NULL DEFAULT 'C'
                            CHECK(priority_tier IN ('A','B','C')),
      scholarship_type    TEXT NOT NULL DEFAULT 'unknown'
                            CHECK(scholarship_type IN ('full_ride','partial','none','unknown')),
      scholarship_details TEXT,
      coach_name          TEXT,
      coach_role          TEXT,
      coach_email         TEXT,
      coach_phone         TEXT,
      notes               TEXT,
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activities (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id     INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      date          TEXT NOT NULL,
      time          TEXT,
      activity_type TEXT NOT NULL DEFAULT 'other'
                      CHECK(activity_type IN ('call','call_scheduled','email','visit',
                                              'offer','portal','other')),
      description   TEXT NOT NULL DEFAULT '',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activities_school_id ON activities(school_id);
    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
    CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);

    -- Multi-student architecture: Parker is student id=1; adding students later requires no schema changes
    CREATE TABLE IF NOT EXISTS students (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      swimcloud_url  TEXT,
      sport          TEXT NOT NULL DEFAULT 'swimming',
      goals          TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- One row per event per student; UNIQUE(student_id, event) prevents duplicates
    CREATE TABLE IF NOT EXISTS student_times (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id    INTEGER NOT NULL REFERENCES students(id),
      event         TEXT NOT NULL,
      time_seconds  REAL,
      time_display  TEXT,
      source        TEXT NOT NULL DEFAULT 'manual',
      updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(student_id, event)
    );

    -- 2026 NCAA D1 Women's relay qualifying standards (editable; labeled by year)
    CREATE TABLE IF NOT EXISTS ncaa_relay_cuts (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      sport            TEXT NOT NULL DEFAULT 'swimming',
      gender           TEXT NOT NULL DEFAULT 'women',
      division         TEXT NOT NULL DEFAULT 'D1',
      season_year      INTEGER NOT NULL DEFAULT 2026,
      relay_name       TEXT NOT NULL,
      cut_type         TEXT NOT NULL DEFAULT 'qualifying',
      cut_display      TEXT NOT NULL,
      cut_seconds      REAL NOT NULL,
      legs             INTEGER NOT NULL DEFAULT 4,
      leg_distance     INTEGER NOT NULL,
      leg_stroke       TEXT NOT NULL,
      UNIQUE(sport, gender, division, season_year, relay_name, cut_type)
    );

    -- Cached AI research results per school
    CREATE TABLE IF NOT EXISTS school_research (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id             INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE UNIQUE,
      engineering_rank      TEXT,
      engineering_notes     TEXT,
      alumni_notes          TEXT,
      has_mens_team         INTEGER,
      has_lcm_summer        INTEGER,
      head_coach_name       TEXT,
      head_coach_linkedin   TEXT,
      ncaa_relay_history    TEXT,
      fit_score             INTEGER,
      fit_summary           TEXT,
      researched_at         TEXT
    );

    -- Roster swimmers fetched per school via AI research
    CREATE TABLE IF NOT EXISTS school_swimmers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id      INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      swimmer_name   TEXT NOT NULL,
      event          TEXT NOT NULL,
      time_seconds   REAL,
      time_display   TEXT,
      swimcloud_url  TEXT,
      researched_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_school_swimmers_school ON school_swimmers(school_id);
    CREATE INDEX IF NOT EXISTS idx_school_swimmers_event ON school_swimmers(event);

    -- Relay projections computed per school from roster + Parker's times
    CREATE TABLE IF NOT EXISTS relay_projections (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      school_id                 INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      relay_name                TEXT NOT NULL,
      ncaa_cut_display          TEXT,
      ncaa_cut_seconds          REAL,
      current_total_display     TEXT,
      current_total_seconds     REAL,
      with_student_total_display TEXT,
      with_student_total_seconds REAL,
      makes_ncaa_without        INTEGER,
      makes_ncaa_with           INTEGER,
      student_slot              INTEGER,
      student_leg_stroke        TEXT,
      lineup_json               TEXT,
      researched_at             TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(school_id, relay_name)
    );
  `)
}

function seedIfEmpty(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as n FROM schools').get() as { n: number }).n
  if (count > 0) return

  const insertSchool = db.prepare(`
    INSERT INTO schools
      (name, location, conference, status, priority_tier,
       scholarship_type, scholarship_details, coach_name, notes)
    VALUES
      (@name, @location, @conference, @status, @priority_tier,
       @scholarship_type, @scholarship_details, @coach_name, @notes)
  `)

  const insertActivity = db.prepare(`
    INSERT INTO activities (school_id, date, activity_type, description)
    VALUES (@school_id, @date, @activity_type, @description)
  `)

  const seed = db.transaction(() => {
    // University of Pittsburgh — current school
    const pitt = insertSchool.run({
      name: 'University of Pittsburgh',
      location: 'Pittsburgh, PA',
      conference: 'ACC',
      status: 'current',
      priority_tier: 'B',
      scholarship_type: 'partial',
      scholarship_details: '75% scholarship — only valid for 1 more year after head coach departure. 2 years of bachelor\'s eligibility remaining, 2 years of swimming eligibility.',
      coach_name: null,
      notes: 'Current school. Would consider staying with a competitive full ride offer. Head coach left which triggered portal entry.',
    })
    insertActivity.run({
      school_id: pitt.lastInsertRowid,
      date: '2026-05-09',
      activity_type: 'portal',
      description: 'Entered NCAA transfer portal. 75% scholarship valid only 1 more year after head coach departure.',
    })

    // University of Cincinnati — full ride offer
    const cin = insertSchool.run({
      name: 'University of Cincinnati',
      location: 'Cincinnati, OH',
      conference: 'Big 12',
      status: 'offered',
      priority_tier: 'B',
      scholarship_type: 'full_ride',
      scholarship_details: 'Full ride + all expenses covered. Formal offer received.',
      coach_name: null,
      notes: 'Not on A list but exciting. Full financial package on the table.',
    })
    insertActivity.run({
      school_id: cin.lastInsertRowid,
      date: '2026-05-09',
      activity_type: 'offer',
      description: 'Formal offer received: full ride + all expenses covered.',
    })

    // University of Hawaii at Manoa — head coach interest
    const haw = insertSchool.run({
      name: 'University of Hawaii at Manoa',
      location: 'Honolulu, HI',
      conference: 'Big West',
      status: 'interested',
      priority_tier: 'B',
      scholarship_type: 'partial',
      scholarship_details: 'Scholarship available; head coach indicated she will likely receive one.',
      coach_name: null,
      notes: 'Not on A list but exciting. Head coach personally reached out. Scholarship forthcoming.',
    })
    insertActivity.run({
      school_id: haw.lastInsertRowid,
      date: '2026-05-09',
      activity_type: 'portal',
      description: 'Head coach reached out expressing interest. Scholarship available, offer likely incoming.',
    })

    // University of Delaware — inbound interest
    const del_ = insertSchool.run({
      name: 'University of Delaware',
      location: 'Newark, DE',
      conference: 'CAA',
      status: 'interested',
      priority_tier: 'C',
      scholarship_type: 'unknown',
      scholarship_details: null,
      coach_name: null,
      notes: 'Reached out right away after portal entry.',
    })
    insertActivity.run({
      school_id: del_.lastInsertRowid,
      date: '2026-05-09',
      activity_type: 'portal',
      description: 'Coaching staff reached out expressing interest after portal entry.',
    })

    // Rice University — A list, outbound email
    const rice = insertSchool.run({
      name: 'Rice University',
      location: 'Houston, TX',
      conference: 'AAC',
      status: 'contacted',
      priority_tier: 'A',
      scholarship_type: 'unknown',
      scholarship_details: null,
      coach_name: null,
      notes: 'A list school. Emailed coaches to introduce herself.',
    })
    insertActivity.run({
      school_id: rice.lastInsertRowid,
      date: '2026-05-09',
      activity_type: 'email',
      description: 'Emailed coaching staff to introduce herself and express interest in the program.',
    })

    // UC San Diego — A list, outbound email
    const ucsd = insertSchool.run({
      name: 'UC San Diego',
      location: 'La Jolla, CA',
      conference: 'Big West',
      status: 'contacted',
      priority_tier: 'A',
      scholarship_type: 'unknown',
      scholarship_details: null,
      coach_name: null,
      notes: 'A list school. Emailed coaches to introduce herself.',
    })
    insertActivity.run({
      school_id: ucsd.lastInsertRowid,
      date: '2026-05-09',
      activity_type: 'email',
      description: 'Emailed coaching staff to introduce herself and express interest in the program.',
    })

    // UC Santa Barbara — A list, outbound email
    const ucsb = insertSchool.run({
      name: 'UC Santa Barbara',
      location: 'Santa Barbara, CA',
      conference: 'Big West',
      status: 'contacted',
      priority_tier: 'A',
      scholarship_type: 'unknown',
      scholarship_details: null,
      coach_name: null,
      notes: 'A list school. Emailed coaches to introduce herself.',
    })
    insertActivity.run({
      school_id: ucsb.lastInsertRowid,
      date: '2026-05-09',
      activity_type: 'email',
      description: 'Emailed coaching staff to introduce herself and express interest in the program.',
    })

    // University of Utah — outbound email
    const utah = insertSchool.run({
      name: 'University of Utah',
      location: 'Salt Lake City, UT',
      conference: 'Big 12',
      status: 'contacted',
      priority_tier: 'C',
      scholarship_type: 'unknown',
      scholarship_details: null,
      coach_name: null,
      notes: 'Emailed coaches to introduce herself.',
    })
    insertActivity.run({
      school_id: utah.lastInsertRowid,
      date: '2026-05-09',
      activity_type: 'email',
      description: 'Emailed coaching staff to introduce herself and express interest in the program.',
    })
  })

  seed()

  seedStudentIfEmpty(db)
  seedNcaaRelaysCutsIfEmpty(db)
}

function seedStudentIfEmpty(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as n FROM students').get() as { n: number }).n
  if (count > 0) return
  db.prepare(`
    INSERT INTO students (name, swimcloud_url, sport, goals)
    VALUES (?, ?, 'swimming', ?)
  `).run(
    'Parker',
    'https://www.swimcloud.com/swimmer/1305096/',
    JSON.stringify({
      engineering: true,
      norcal_alumni: true,
      lcm_summer: true,
      coed_team: true,
      ncaa_relay: true,
      olympic_trials: true,
    })
  )
}

function seedNcaaRelaysCutsIfEmpty(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as n FROM ncaa_relay_cuts').get() as { n: number }).n
  if (count > 0) return

  // 2026 NCAA D1 Women's relay qualifying standards (16th-best average over 3 seasons)
  // Source: NCAA 2025-26 D1 Swimming & Diving Qualifying Standards
  // Verify at: https://www.ncaa.org/sports/swimming-diving
  const cuts = [
    { relay_name: '200 Medley Relay', cut_display: '1:36.13', cut_seconds: 96.13,  legs: 4, leg_distance: 50,  leg_stroke: 'back/breast/fly/free' },
    { relay_name: '400 Medley Relay', cut_display: '3:32.44', cut_seconds: 212.44, legs: 4, leg_distance: 100, leg_stroke: 'back/breast/fly/free' },
    { relay_name: '400 Free Relay',   cut_display: '3:13.50', cut_seconds: 193.50, legs: 4, leg_distance: 100, leg_stroke: 'free' },
    { relay_name: '800 Free Relay',   cut_display: '7:05.18', cut_seconds: 425.18, legs: 4, leg_distance: 200, leg_stroke: 'free' },
  ]

  const insert = db.prepare(`
    INSERT INTO ncaa_relay_cuts
      (sport, gender, division, season_year, relay_name, cut_type, cut_display, cut_seconds, legs, leg_distance, leg_stroke)
    VALUES ('swimming','women','D1',2026,?,?,?,?,?,?,?)
  `)

  const insertAll = db.transaction(() => {
    for (const c of cuts) {
      insert.run(c.relay_name, 'qualifying', c.cut_display, c.cut_seconds, c.legs, c.leg_distance, c.leg_stroke)
    }
  })
  insertAll()
}

export default getDb
