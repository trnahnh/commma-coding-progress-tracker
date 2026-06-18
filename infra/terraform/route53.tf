resource "aws_route53_zone" "main" {
  name    = "commma.dev"
  comment = ""
}

resource "aws_route53_record" "apex_a" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "commma.dev"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = aws_cloudfront_distribution.web.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex_aaaa" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "commma.dev"
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.web.domain_name
    zone_id                = aws_cloudfront_distribution.web.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "api_a" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.commma.dev"
  type    = "A"
  ttl     = 300
  records = [aws_eip.api.public_ip]
}

resource "aws_route53_record" "acm_validation" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_d2d07a73fb62737aa425b04e28a21022.commma.dev"
  type    = "CNAME"
  ttl     = 300
  records = ["_c8a5f9ad6e6914f97900d7caa31171c4.jkddzztszm.acm-validations.aws."]
}

resource "aws_route53_record" "dmarc" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "_dmarc.commma.dev"
  type    = "TXT"
  ttl     = 300
  records = ["v=DMARC1; p=none;"]
}

resource "aws_route53_record" "resend_dkim" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "resend._domainkey.commma.dev"
  type    = "TXT"
  ttl     = 300
  records = ["p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDFnOnWV2VYQ+p5v/qEFmhB0aCfyklyWgUyaNg2H3brMThOUxplpxRY4Opqivg2vSU4HFCkshM6lxGT29ycrZaFBpFZ3Y46vaGtX67ljxYCcyteNwNi+Z2ZwArFZW+RlLYQW1XEznGZfCiJakgfRR/+WCw7++uCBoQtMioOflwd7wIDAQAB"]
}

resource "aws_route53_record" "send_mx" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "send.commma.dev"
  type    = "MX"
  ttl     = 300
  records = ["10 feedback-smtp.us-east-1.amazonses.com"]
}

resource "aws_route53_record" "send_txt" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "send.commma.dev"
  type    = "TXT"
  ttl     = 300
  records = ["v=spf1 include:amazonses.com ~all"]
}
