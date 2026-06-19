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
  description = "CIDR allowed to reach the API box on port 22. Set in terraform.tfvars. Use an operator IP /32 for laptop-only access, or 0.0.0.0/0 to let GitLab CI runners (dynamic IPs) deploy via SSH. 0.0.0.0/0 is acceptable here because the box is key-only: Amazon Linux 2023 ships PasswordAuthentication no, so only the holder of the .pem can connect."
}
