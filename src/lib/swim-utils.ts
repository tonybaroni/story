export function parseTimeToSeconds(display: string): number {
  const s = display.trim()
  if (s.includes(':')) {
    const [m, sec] = s.split(':')
    return parseInt(m) * 60 + parseFloat(sec)
  }
  return parseFloat(s)
}

export function secondsToDisplay(total: number): string {
  if (total >= 60) {
    const m = Math.floor(total / 60)
    const s = (total % 60).toFixed(2).padStart(5, '0')
    return `${m}:${s}`
  }
  return total.toFixed(2)
}

export type RelayLeg = {
  swimmer_name: string
  time_display: string
  time_seconds: number
  is_student?: boolean
}

export type RelayResult = {
  relay_name: string
  ncaa_cut_display: string
  ncaa_cut_seconds: number
  current_lineup: RelayLeg[]
  with_student_lineup: RelayLeg[]
  current_total_display: string
  current_total_seconds: number
  with_student_total_display: string
  with_student_total_seconds: number
  makes_ncaa_without: boolean
  makes_ncaa_with: boolean
  student_slot: number
  student_leg_stroke: string
}

type SwimmerRow = {
  swimmer_name: string
  event: string
  time_seconds: number | null
  time_display: string | null
}

type NcaaCut = { cut_display: string; cut_seconds: number }

type StudentTimes = Record<string, { time_display: string; time_seconds: number }>

function bestByEvent(swimmers: SwimmerRow[], event: string): SwimmerRow[] {
  return swimmers
    .filter(s => s.event === event && s.time_seconds !== null)
    .sort((a, b) => a.time_seconds! - b.time_seconds!)
}

// For free relays: Parker competes for a spot against the top 4
export function computeFreeRelay(
  relayName: string,
  event: string,
  legStroke: string,
  cut: NcaaCut,
  swimmers: SwimmerRow[],
  studentTime: { time_display: string; time_seconds: number } | null
): RelayResult {
  const top4 = bestByEvent(swimmers, event).slice(0, 4)
  const currentLineup: RelayLeg[] = top4.map(s => ({
    swimmer_name: s.swimmer_name,
    time_display: s.time_display!,
    time_seconds: s.time_seconds!,
  }))
  const currentTotal = currentLineup.reduce((sum, l) => sum + l.time_seconds, 0)

  if (!studentTime) {
    const disp = currentLineup.length >= 4 ? secondsToDisplay(currentTotal) : 'N/A'
    return {
      relay_name: relayName,
      ncaa_cut_display: cut.cut_display,
      ncaa_cut_seconds: cut.cut_seconds,
      current_lineup: currentLineup,
      with_student_lineup: currentLineup,
      current_total_display: disp,
      current_total_seconds: currentTotal,
      with_student_total_display: disp,
      with_student_total_seconds: currentTotal,
      makes_ncaa_without: currentLineup.length >= 4 && currentTotal <= cut.cut_seconds,
      makes_ncaa_with: currentLineup.length >= 4 && currentTotal <= cut.cut_seconds,
      student_slot: -1,
      student_leg_stroke: legStroke,
    }
  }

  const allCandidates = [
    ...top4.map(s => ({ swimmer_name: s.swimmer_name, time_display: s.time_display!, time_seconds: s.time_seconds!, is_student: false })),
    { swimmer_name: 'Parker', time_display: studentTime.time_display, time_seconds: studentTime.time_seconds, is_student: true },
  ].sort((a, b) => a.time_seconds - b.time_seconds)

  const withParkerTop4 = allCandidates.slice(0, 4)
  const parkerSlot = withParkerTop4.findIndex(s => s.is_student)
  const withParkerTotal = withParkerTop4.reduce((sum, l) => sum + l.time_seconds, 0)

  return {
    relay_name: relayName,
    ncaa_cut_display: cut.cut_display,
    ncaa_cut_seconds: cut.cut_seconds,
    current_lineup: currentLineup,
    with_student_lineup: withParkerTop4,
    current_total_display: currentLineup.length >= 4 ? secondsToDisplay(currentTotal) : 'N/A',
    current_total_seconds: currentTotal,
    with_student_total_display: withParkerTop4.length >= 4 ? secondsToDisplay(withParkerTotal) : 'N/A',
    with_student_total_seconds: withParkerTotal,
    makes_ncaa_without: currentLineup.length >= 4 && currentTotal <= cut.cut_seconds,
    makes_ncaa_with: withParkerTop4.length >= 4 && withParkerTotal <= cut.cut_seconds,
    student_slot: parkerSlot >= 0 ? parkerSlot + 1 : -1,
    student_leg_stroke: legStroke,
  }
}

// For medley relays: Parker competes for the backstroke leg
export function computeMedleyRelay(
  relayName: string,
  legDistance: 50 | 100,
  cut: NcaaCut,
  swimmers: SwimmerRow[],
  studentTimes: StudentTimes
): RelayResult {
  const backEvent  = `${legDistance}_back`
  const breastEvent = `${legDistance}_breast`
  const flyEvent   = `${legDistance}_fly`
  const freeEvent  = `${legDistance}_free`

  const bestBack   = bestByEvent(swimmers, backEvent)[0]
  const bestBreast = bestByEvent(swimmers, breastEvent)[0]
  const bestFly    = bestByEvent(swimmers, flyEvent)[0]
  const bestFree   = bestByEvent(swimmers, freeEvent)[0]

  const toleg = (row: SwimmerRow | undefined): RelayLeg | null =>
    row ? { swimmer_name: row.swimmer_name, time_display: row.time_display!, time_seconds: row.time_seconds! } : null

  const legs = [toleg(bestBack), toleg(bestBreast), toleg(bestFly), toleg(bestFree)]
  const currentLineup = legs.filter(Boolean) as RelayLeg[]
  const currentTotal = currentLineup.reduce((sum, l) => sum + l.time_seconds, 0)

  // Parker competes for the backstroke (leg 1)
  const parkerBack = studentTimes[backEvent]
  let withParkerLineup = [...currentLineup]
  let parkerSlot = -1

  if (parkerBack) {
    const backLeg: RelayLeg = {
      swimmer_name: 'Parker',
      time_display: parkerBack.time_display,
      time_seconds: parkerBack.time_seconds,
      is_student: true,
    }
    // Replace school back leg with Parker's
    withParkerLineup = [backLeg, ...currentLineup.slice(1)]
    parkerSlot = 1
  }

  const withParkerTotal = withParkerLineup.reduce((sum, l) => sum + l.time_seconds, 0)
  const hasFullCurrent = currentLineup.length === 4
  const hasFullWithParker = withParkerLineup.length === 4

  return {
    relay_name: relayName,
    ncaa_cut_display: cut.cut_display,
    ncaa_cut_seconds: cut.cut_seconds,
    current_lineup: currentLineup,
    with_student_lineup: withParkerLineup,
    current_total_display: hasFullCurrent ? secondsToDisplay(currentTotal) : 'N/A',
    current_total_seconds: currentTotal,
    with_student_total_display: hasFullWithParker ? secondsToDisplay(withParkerTotal) : 'N/A',
    with_student_total_seconds: withParkerTotal,
    makes_ncaa_without: hasFullCurrent && currentTotal <= cut.cut_seconds,
    makes_ncaa_with: hasFullWithParker && withParkerTotal <= cut.cut_seconds,
    student_slot: parkerSlot,
    student_leg_stroke: 'back',
  }
}
