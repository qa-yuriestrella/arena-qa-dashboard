export interface TestRun {
  id: string
  created_at: string
  triggered_by: string | null
  cats: string
  status: 'running' | 'passed' | 'failed' | 'error' | 'cancelled'
  github_run_id: string | null
  github_run_url: string | null
  total_tests: number
  passed_tests: number
  failed_tests: number
  skipped_tests: number
  completed_at: string | null
  duration_ms: number | null
}

export interface TestResult {
  id: string
  run_id: string
  cat: string
  scenario_name: string
  status: 'passed' | 'failed' | 'skipped'
  duration_ms: number
  error_message: string | null
  video_url: string | null
  screenshot_url: string | null
  created_at: string
}

export interface CatInfo {
  id: string        // "CAT01"
  name: string      // "Signup"
  tag: string       // "signup"
  description: string
  active: boolean
}
