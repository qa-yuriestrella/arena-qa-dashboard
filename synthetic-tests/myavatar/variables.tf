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

variable "tests" {
  type        = list(any)
  description = "Configuration for synthetic tests"
}