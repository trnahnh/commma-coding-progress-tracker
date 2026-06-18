#!/usr/bin/env bash
set -uo pipefail

TF="${TF:-terraform}"
ACCOUNT="654801597077"
ZONE="Z035432635LJA3P51GWPB"
CERT="arn:aws:acm:us-east-1:${ACCOUNT}:certificate/1e3a8036-1474-40d4-be24-9135ac334035"
POLICY="arn:aws:iam::${ACCOUNT}:policy/commma-deploy-web"

tf_import() {
  local addr="$1" id="$2"
  if "$TF" state list 2>/dev/null | grep -qx "$addr"; then
    echo "skip (in state): $addr"
  else
    echo "import: $addr <- $id"
    "$TF" import "$addr" "$id"
  fi
}

tf_import aws_security_group.api "sg-0dcdd25e1db90cd77"
tf_import aws_instance.api "i-066e0ba33b711ff85"
tf_import aws_eip.api "eipalloc-0d4403592516410a5"

tf_import aws_s3_bucket.web "commma-web"
tf_import aws_s3_bucket_public_access_block.web "commma-web"
tf_import aws_s3_bucket_ownership_controls.web "commma-web"
tf_import aws_s3_bucket_server_side_encryption_configuration.web "commma-web"
tf_import aws_s3_bucket_policy.web "commma-web"

tf_import aws_cloudfront_origin_access_control.web "E38WV0EC71Z8C5"
tf_import aws_cloudfront_distribution.web "E20DGG72SOB2P0"

tf_import aws_acm_certificate.web "$CERT"

tf_import aws_route53_zone.main "$ZONE"
tf_import aws_route53_record.apex_a "${ZONE}_commma.dev_A"
tf_import aws_route53_record.apex_aaaa "${ZONE}_commma.dev_AAAA"
tf_import aws_route53_record.api_a "${ZONE}_api.commma.dev_A"
tf_import aws_route53_record.acm_validation "${ZONE}__d2d07a73fb62737aa425b04e28a21022.commma.dev_CNAME"
tf_import aws_route53_record.dmarc "${ZONE}__dmarc.commma.dev_TXT"
tf_import aws_route53_record.resend_dkim "${ZONE}_resend._domainkey.commma.dev_TXT"
tf_import aws_route53_record.send_mx "${ZONE}_send.commma.dev_MX"
tf_import aws_route53_record.send_txt "${ZONE}_send.commma.dev_TXT"

tf_import aws_iam_user.deploy "commma-deploy-local"
tf_import aws_iam_policy.deploy_web "$POLICY"
tf_import aws_iam_user_policy_attachment.deploy_web "commma-deploy-local/${POLICY}"

echo "import pass complete"
