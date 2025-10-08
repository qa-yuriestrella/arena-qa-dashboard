assume_role_arn = "arn:aws:iam::590570470196:role/assume-role-terraform"
region          = "us-east-1"
env             = "dev"
name            = "myavatar"

tests = [
  {
    name     = "my-avatar-hearbeat",
    type     = "hearthbeat",
    runtime  = "playwright-3.0",
    urls     = ["https://myavatar.ai"],
    schedule = "5"
  },
  {
    name     = "arena-im-hearbeat",
    type     = "hearthbeat",
    runtime  = "playwright-3.0",
    urls     = ["https://arena.im"],
    schedule = "10"
  },
]