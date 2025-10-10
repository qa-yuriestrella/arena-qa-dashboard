# Arena QA
This repository groups all the automation and management tools to QA process to Arena Products

### Syntethic Tests

Each product should have it's own folder under `synthetic-test/` folder.

```
syntethic-test/
|__ myavatar/
|__ arenaim/
```

It's important to have all files inside each folder to configure terraform:

```
env/<env>/<aws-region>/backend.tf
env/<env>/<aws-region>/terraformvars.tf
terraform.tf
variables.tf
main.tf
.terraform-version
```

The most important file to create tests is `terraform.tfvars`
Edit it accordingly to environment, aws region and product.

```sh
  name = myavatar
  env = dev
  region = us-east-1
  
  # Each object is a individual test. 
  # Add as many as you want
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
        text     = "<FILL LATER ON AWS CONSOLE>"
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
```