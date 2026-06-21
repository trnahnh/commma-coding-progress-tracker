resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_deploy_web_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_deploy_web" {
  name               = "commma-github-deploy-web"
  assume_role_policy = data.aws_iam_policy_document.github_deploy_web_assume.json
}

resource "aws_iam_role_policy_attachment" "github_deploy_web" {
  role       = aws_iam_role.github_deploy_web.name
  policy_arn = aws_iam_policy.deploy_web.arn
}

output "github_deploy_web_role_arn" {
  value = aws_iam_role.github_deploy_web.arn
}
