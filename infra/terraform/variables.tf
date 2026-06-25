variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project" {
  type    = string
  default = "commma"
}

variable "github_repo" {
  type        = string
  default     = "trnahnh/commma-coding-progress-tracker"
  description = "owner/repo whose GitHub Actions may assume the web deploy role via OIDC"
}

variable "ssh_allowed_cidr" {
  type        = string
  description = "CIDR allowed to reach the API box on port 22. Set in terraform.tfvars. Use an operator IP /32 for laptop-only access, or 0.0.0.0/0 to let hosted CI runners (GitHub Actions, dynamic IPs) deploy via SSH. 0.0.0.0/0 is acceptable here because the box is key-only: Amazon Linux 2023 ships PasswordAuthentication no, so only the holder of the .pem can connect."
}

variable "alert_email" {
  type        = string
  description = "Email address subscribed to the commma-alerts SNS topic. AWS sends a one-time confirmation link that must be clicked before alarms deliver. Set in terraform.tfvars."
}

variable "root_fstype" {
  type        = string
  default     = "xfs"
  description = "Filesystem type of the API box root volume, used to match the CloudWatch Agent disk_used_percent dimension. Amazon Linux 2023 roots on xfs."
}

variable "cpu_alarm_threshold" {
  type        = number
  default     = 80
  description = "CPUUtilization percent that triggers the high-CPU alarm on the API box."
}

variable "mem_alarm_threshold" {
  type        = number
  default     = 85
  description = "mem_used_percent that triggers the high-memory alarm on the API box."
}

variable "disk_alarm_threshold" {
  type        = number
  default     = 85
  description = "disk_used_percent on / that triggers the low-disk alarm on the API box."
}
