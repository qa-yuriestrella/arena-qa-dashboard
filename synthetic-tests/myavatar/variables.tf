variable "name" {
  type        = string
  description = "Service name"
}

variable "env" {
  type        = string
  description = "Environment name"
}

variable "region" {
  type        = string
  description = "Region name"
  default     = "us-west-2"
}

variable "assume_role_arn" {
  type        = string
  description = "Role to be assumed to another account"
  default     = ""
}

variable "hearthbeat_tests" {
  type = list(object({
    name     = string
    runtime  = string
    urls     = list(string)
    schedule = string
    alarm = optional(object({
      threshold          = number
      period             = number
      evaluation_periods = number
      missing_data       = string
    }))
  }))
  description = "Configuration for Hearthbeat synthetic tests"
}

variable "gui_workflow_tests" {
  type = list(object({
    name    = string
    runtime = string
    url     = string
    actions = list(object({
      type     = string
      selector = string
      text     = optional(string)
    }))
    schedule         = string
    custom_code_path = optional(string)
    alarm = optional(object({
      threshold          = number
      period             = number
      evaluation_periods = number
      missing_data       = string
    }))
  }))
  description = "Configuration for GUI Workflow synthetic tests"
}