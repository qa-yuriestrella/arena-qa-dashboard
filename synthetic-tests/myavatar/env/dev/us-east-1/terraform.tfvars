assume_role_arn = "arn:aws:iam::590570470196:role/assume-role-terraform"
region          = "us-east-1"
env             = "dev"
name            = "myavatar"

hearthbeat_tests = [

]


gui_workflow_tests = [
  {
    name    = "myavatar-onboarding-signup",
    runtime = "playwright-3.0",
    url     = "https://arena-develop-avatar-onboarding.vercel.app/onboarding",
    actions = [
      {
        type     = "verifyText",
        selector = ".text-2xl",
        text     = "Boom! Here's an Avatar preview"
      }
    ],
    custom_code_path = "./onboarding-signup.js",
    schedule         = "cron(0 11 * * ? *)",
    alarm = {
      evaluation_periods = 1
      period             = 86400
      threshold          = 99
      missing_data       = "breaching"
    }
  },
  {
    name    = "myavatar-onboarding-checkout",
    runtime = "playwright-3.0",
    url     = "https://arena-develop-avatar-onboarding.vercel.app/onboarding",
    actions = [
      {
        type     = "verifyText",
        selector = "menu-item-867 a",
        text     = "Boom! Here's an Avatar preview"
      }
    ],
    custom_code_path = "./onboarding-checkout.js",
    schedule         = "cron(0 11 * * ? *)",
    alarm = {
      evaluation_periods = 1
      period             = 86400
      threshold          = 99
      missing_data       = "breaching"
    }
  },
]
