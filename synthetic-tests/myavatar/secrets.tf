locals {
  secret_json = jsondecode(data.aws_secretsmanager_secret_version.secrets.secret_string)
  hearthbeat_tests = [
    for test in var.hearthbeat_tests : {
      name             = test.name
      runtime          = test.runtime
      url              = test.url
      schedule         = test.schedule
      alarm            = test.alarm
      custom_code_path = test.custom_code_path

      actions = [
        for action in test.actions : {
          type     = action.type
          selector = action.selector

          text = (
            try(action.secret, null) != null ?
            local.secret_json[action.secret] :
            action.text
          )
        }
      ]
    }
  ]
  gui_workflow_tests = [
    for test in var.gui_workflow_tests : {
      name             = test.name
      runtime          = test.runtime
      url              = test.url
      schedule         = test.schedule
      alarm            = test.alarm
      custom_code_path = test.custom_code_path

      actions = [
        for action in test.actions : {
          type     = action.type
          selector = action.selector

          text = (
            try(action.secret_key, null) != null ?
            local.secret_json[action.secret_key] :
            action.text
          )
        }
      ]
    }
  ]
}

data "aws_secretsmanager_secret_version" "secrets" {
  secret_id = var.secret_id
}