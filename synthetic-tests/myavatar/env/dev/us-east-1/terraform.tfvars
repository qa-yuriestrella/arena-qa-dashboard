assume_role_arn = "arn:aws:iam::590570470196:role/assume-role-terraform"
region          = "us-east-1"
env             = "dev"
name            = "myavatar"

hearthbeat_tests = [
  {
    name     = "my-avatar-hearbeat",
    runtime  = "playwright-3.0",
    urls     = ["https://myavatar.ai"],
    schedule = "5"
  },
  {
    name     = "arena-im-hearbeat",
    runtime  = "playwright-3.0",
    urls     = ["https://arena.im"],
    schedule = "10"
  }
]

gui_workflow_tests = [
  {
    name    = "myavatar-gui-workflow",
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
    ]
    schedule         = "10",
    custom_code_path = "./snippet.js"
  },
]