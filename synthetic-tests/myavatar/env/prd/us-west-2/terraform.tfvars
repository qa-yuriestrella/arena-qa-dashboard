region = "us-west-2"
env    = "prd"
name   = "myavatar"

hearthbeat_tests = [
  {
    name     = "my-avatar-hearthbeat",
    runtime  = "playwright-3.0",
    urls     = ["https://myavatar.ai"],
    schedule = "rate(5 minutes)",
    alarm = {
      evaluation_periods = 2
      period             = 300
      threshold          = 99
      missing_data       = "breaching"
    }
  },
]

hearthbeat_salomao_tests = [
  {
    name     = "salomao-api-healthcheck"
    runtime  = "http"
    urls     = ["https://salomao.myavatar.ai/api/v1/healthcheck"]
    schedule = "rate(5 minutes)"

    request = {
      method = "GET"
      headers = {
        "Accept"     = "application/json"
        "User-Agent" = "kulala.nvim/5.3.3"
      }
    }

    assertions = [
      {
        type     = "statusCode"
        operator = "is"
        target   = 200
      },
      {
        type     = "body"
        operator = "contains"
        target   = "\"salomaoApi\":\"ok\""
      }
    ]

    alarm = {
      evaluation_periods = 2
      period             = 300
      threshold          = 99
      missing_data       = "breaching"
    }
  }
]

gui_workflow_tests = [
  {
    name    = "myavatar-onboarding-login",
    runtime = "playwright-3.0",
    url     = "https://myavatar.ai/",
    actions = [
      {
        type     = "click",
        selector = "#menu-item-867 a"
      },
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
        type     = "verifySelector",
        selector = "img[alt='Arena logo']"
      }
    ]
    schedule = "cron(0 11 * * ? *)",
    alarm = {
      evaluation_periods = 1
      period             = 86400
      threshold          = 99
      missing_data       = "breaching"
    }
  },
  {
    name    = "myavatar-onboarding-create",
    runtime = "playwright-3.0",
    url     = "https://myavatar.ai/",
    actions = [
      {
        type     = "click",
        selector = "[class*='menu-item menu-item-362'] a",
      },
      {
        type     = "verifyText",
        selector = "[class*="text-center leading-5"]",
        text     = "Create an account or sign in to continue"
      },
    ]
    schedule = "cron(0 11 * * ? *)",
    alarm = {
      evaluation_periods = 1
      period             = 86400
      threshold          = 99
      missing_data       = "breaching"
    }
  },
  {
    name    = "myavatar-knowledge-base-page-load",
    runtime = "playwright-3.0",
    url     = "https://app.myavatar.ai/onboarding/login",
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
    schedule         = "cron(0 11 * * ? *)",
    alarm = {
      evaluation_periods = 1
      period             = 86400
      threshold          = 99
      missing_data       = "breaching"
    }
  },
  {
    name    = "myavatar-voice-call",
    runtime = "playwright-3.0",
    url     = "https://myavatar.ai/ronaldo",
    actions = [
    ],
    custom_code_path = "./voice-call.js",
    schedule         = "cron(0 11 * * ? *)",
    alarm = {
      evaluation_periods = 1
      period             = 86400
      threshold          = 99
      missing_data       = "breaching"
    }
  },
]
