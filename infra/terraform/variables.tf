variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "commma"
}

variable "ssh_allowed_cidr" {
  type        = string
  description = "CIDR allowed to reach the API box on port 22 (e.g. operator IP /32). Set in terraform.tfvars; never 0.0.0.0/0."
}
