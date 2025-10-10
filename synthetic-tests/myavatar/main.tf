provider "aws" {
  region = var.region
  assume_role {
    role_arn = var.assume_role_arn
  }
}

terraform {
  backend "s3" {
    # details in env/<env>/<region>/backend.tfvars
  }
}

module "heartbeats_tests" {
  source = "git@github.com:stationfy/terraform-arena-modules//aws/synthetic-tests/hearthbeat?ref=v0.0.46"
  name   = var.name
  tests  = var.hearthbeat_tests
  env    = var.env
  region = var.region
}

module "gui_workflow_tests" {
  source = "git@github.com:stationfy/terraform-arena-modules//aws/synthetic-tests/gui_workflow?ref=v0.0.46"
  name   = var.name
  tests  = var.gui_workflow_tests
  env    = var.env
  region = var.region
}