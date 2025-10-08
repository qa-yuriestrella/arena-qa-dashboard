locals {
  account_id = data.aws_caller_identity.current.account_id
  hearthbeat_tests = {
    for t in var.tests : t.name => t
    if t.type == "hearthbeat"
  }

  tags = {
    "service"       = var.name
    "env"           = var.env
    "region"        = var.region
    "managed-by"    = "terraform"
    "arena:product" = var.name
  }
}

data "aws_caller_identity" "current" {}

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


data "archive_file" "hearthbeat_zipfile" {
  count = length(local.hearthbeat_tests) > 0 ? 1 : 0
  type  = "zip"
  source {
    content  = templatefile("${path.module}/../modules/${values(local.hearthbeat_tests)[0].type}-${values(local.hearthbeat_tests)[0].runtime}.js", {})
    filename = "index.js"
  }
  output_path = "${path.module}/../modules/${values(local.hearthbeat_tests)[0].type}-${values(local.hearthbeat_tests)[0].runtime}.zip"
}

resource "aws_synthetics_canary" "heartbeats" {
  for_each             = local.hearthbeat_tests
  name                 = each.value.name
  artifact_s3_location = "s3://cw-syn-results-${local.account_id}-us-east-1/canary/${var.region}/${each.value.name}"
  execution_role_arn   = "arn:aws:iam::${local.account_id}:role/synthetics-monitor-role-${var.env}"
  handler              = "index.handler"
  zip_file             = "${path.module}/../modules/${each.value.type}-${each.value.runtime}.zip"
  runtime_version      = "syn-nodejs-${each.value.runtime}"
  delete_lambda        = true

  schedule {
    expression = "rate(${each.value.schedule} minutes)"
  }

  run_config {
    environment_variables = {
      URLS = jsonencode(each.value.urls)
    }
  }
}