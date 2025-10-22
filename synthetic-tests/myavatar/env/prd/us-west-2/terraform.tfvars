region = "us-west-2"
env    = "prd"
name   = "myavatar"

hearthbeat_tests = [
  {
    name     = "my-avatar-hearthbeat",
    runtime  = "playwright-3.0",
    urls     = ["https://myavatar.ai"],
    schedule = "rate(5 minutes)"
  },
]

gui_workflow_tests = [
  {
    name    = "myavatar-onboarding-login",
    runtime = "playwright-3.0",
    url     = "https://myavatar.ai/",
    actions = [
      {
        type     = "input",
        selector = "[name='email']",
        text     = "Synthetics@test.com"
      },
      {
        type     = "input",
        selector = "[name='password']",
        text     = ""
      },
      {
        type     = "click",
        selector = "[type='submit']",
      },
      {
        type     = "redirection",
        selector = "[type='submit']"
      }
    ]
    schedule = "cron(0 12 * * ? *)",
  },
  {
    name    = "myavatar-onboarding-create",
    runtime = "playwright-3.0",
    url     = "https://myavatar.ai/",
    actions = [
      {
        type     = "click",
        selector = "#menu-item-867 a",
      },
      {
        type     = "verifyText",
        selector = "menu-item-867 a",
        text     = "Boom! Here's an Avatar preview"
      },
    ]
    schedule = "cron(0 12 * * ? *)",
  },
  {
    name    = "myavatar-knowledge-base-page-load",
    runtime = "playwright-3.0",
    url     = "https://myavatar.ai/onboarding/login",
    actions = [
      {
        type     = "input",
        selector = "[name='email']",
        text     = "Synthetics@test.com"
      },
      {
        type     = "input",
        selector = "[name='password']",
        text     = ""
      },
      {
        type     = "click",
        selector = "[type='submit']",
      },
      {
        type     = "redirection",
        selector = "[type='submit']"
      }
    ],
    custom_code_path = "./kb-page-load.js",
    schedule         = "cron(0 12 * * ? *)",
  },
  {
    name    = "myavatar-voice-call",
    runtime = "playwright-3.0",
    url     = "https://myavatar.ai/ronaldo",
    actions = [
    ],
    custom_code_path = "./voice-call.js",
    schedule         = "cron(0 12 * * ? *)",
  },
]