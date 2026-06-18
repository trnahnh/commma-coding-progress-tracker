resource "aws_acm_certificate" "web" {
  domain_name       = "commma.dev"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
