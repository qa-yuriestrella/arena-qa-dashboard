locals {
  account_id = data.aws_caller_identity.current.account_id
  hearthbeat_tests_map = {
    for test in var.hearthbeat_tests :
    test.name => test
  }

  gui_workflow_tests_map = {
    for test in var.gui_workflow_tests :
    test.name => test
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
  count = length(var.hearthbeat_tests) > 0 ? 1 : 0
  type  = "zip"
  source {
    content  = templatefile("${path.module}/../modules/hearthbeat-${values(local.hearthbeat_tests_map)[0].runtime}.js", {})
    filename = "index.js"
  }
  output_path = "${path.module}/../modules/hearthbeat-${values(local.hearthbeat_tests_map)[0].runtime}.zip"
}

resource "aws_synthetics_canary" "heartbeats" {
  for_each             = local.hearthbeat_tests_map
  name                 = each.value.name
  artifact_s3_location = "s3://cw-syn-results-${local.account_id}-us-east-1/canary/${var.region}/${each.value.name}"
  execution_role_arn   = "arn:aws:iam::${local.account_id}:role/synthetics-monitor-role-${var.env}-${var.region}"
  handler              = "index.handler"
  zip_file             = "${path.module}/../modules/hearthbeat-${each.value.runtime}.zip"
  runtime_version      = "syn-nodejs-${each.value.runtime}"
  delete_lambda        = true
  start_canary         = true

  schedule {
    expression = "rate(${each.value.schedule} minutes)"
  }

  run_config {
    environment_variables = {
      URLS = jsonencode(each.value.urls)
    }
  }
}

data "archive_file" "gui_workflow_zipfile" {
  for_each = local.gui_workflow_tests_map
  type     = "zip"
  source {
    content = templatefile("${path.module}/../modules/gui-workflow-${each.value.runtime}.js", {
      custom_code = try(file(each.value.custom_code_path), "")
    })
    filename = "index.js"
  }
  output_path = "${path.module}/../modules/gui-workflow-${each.value.runtime}-${each.key}.zip"
}

resource "aws_synthetics_canary" "gui_workflows" {
  for_each             = local.gui_workflow_tests_map
  name                 = each.value.name
  artifact_s3_location = "s3://cw-syn-results-${local.account_id}-us-east-1/canary/${var.region}/${each.value.name}"
  execution_role_arn   = "arn:aws:iam::${local.account_id}:role/synthetics-monitor-role-${var.env}-${var.region}"
  handler              = "index.handler"
  zip_file             = "${path.module}/../modules/gui-workflow-${each.value.runtime}-${each.key}.zip"
  runtime_version      = "syn-nodejs-${each.value.runtime}"
  delete_lambda        = true
  start_canary         = true

  schedule {
    expression = "rate(${each.value.schedule} minutes)"
  }

  run_config {
    environment_variables = {
      URL     = each.value.url
      ACTIONS = jsonencode(each.value.actions)
    }
  }
}