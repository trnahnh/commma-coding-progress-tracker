resource "aws_iam_user" "deploy" {
  name = "commma-deploy-local"
}

data "aws_iam_policy_document" "deploy_web" {
  statement {
    sid    = "WebBucketSync"
    effect = "Allow"

    actions = [
      "s3:ListBucket",
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = [
      aws_s3_bucket.web.arn,
      "${aws_s3_bucket.web.arn}/*",
    ]
  }

  statement {
    sid    = "CloudFrontInvalidate"
    effect = "Allow"

    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_policy" "deploy_web" {
  name   = "commma-deploy-web"
  policy = data.aws_iam_policy_document.deploy_web.json
}

resource "aws_iam_user_policy_attachment" "deploy_web" {
  user       = aws_iam_user.deploy.name
  policy_arn = aws_iam_policy.deploy_web.arn
}
