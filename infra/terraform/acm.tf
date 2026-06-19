resource "aws_acm_certificate" "web" {
  domain_name               = "commma.dev"
  subject_alternative_names = ["docs.commma.dev"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "web" {
  certificate_arn         = aws_acm_certificate.web.arn
  validation_record_fqdns = [for record in aws_route53_record.acm_validation : record.fqdn]
}
