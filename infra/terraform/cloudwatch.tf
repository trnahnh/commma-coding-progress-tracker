data "aws_iam_policy_document" "ec2_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "commma-api-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "api_cloudwatch_agent" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy_attachment" "api_ssm" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "api" {
  name = "commma-api-instance"
  role = aws_iam_role.api.name
}

resource "aws_sns_topic" "alerts" {
  name = "commma-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "api_status_check" {
  alarm_name          = "commma-api-status-check-failed"
  alarm_description   = "EC2 instance or system status check failing on the API box."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  statistic           = "Maximum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  period              = 60
  evaluation_periods  = 2
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.api.id
  }
}

resource "aws_cloudwatch_metric_alarm" "api_system_recover" {
  alarm_name          = "commma-api-system-status-recover"
  alarm_description   = "System status check failing on the API box: auto-recover the instance to healthy hardware."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed_System"
  statistic           = "Maximum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  period              = 60
  evaluation_periods  = 2
  treat_missing_data  = "missing"
  alarm_actions = [
    "arn:aws:automate:${var.aws_region}:ec2:recover",
    aws_sns_topic.alerts.arn,
  ]
  ok_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.api.id
  }
}

resource "aws_cloudwatch_metric_alarm" "api_instance_reboot" {
  alarm_name          = "commma-api-instance-status-reboot"
  alarm_description   = "Instance status check failing on the API box: reboot to clear an OS-level hang."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed_Instance"
  statistic           = "Maximum"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  period              = 60
  evaluation_periods  = 3
  treat_missing_data  = "missing"
  alarm_actions = [
    "arn:aws:automate:${var.aws_region}:ec2:reboot",
    aws_sns_topic.alerts.arn,
  ]
  ok_actions = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.api.id
  }
}

resource "aws_cloudwatch_metric_alarm" "api_cpu_high" {
  alarm_name          = "commma-api-cpu-high"
  alarm_description   = "Sustained high CPU on the API box."
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.cpu_alarm_threshold
  period              = 300
  evaluation_periods  = 3
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.api.id
  }
}

resource "aws_cloudwatch_metric_alarm" "api_mem_high" {
  alarm_name          = "commma-api-mem-high"
  alarm_description   = "High memory pressure on the API box (CloudWatch Agent)."
  namespace           = "CWAgent"
  metric_name         = "mem_used_percent"
  statistic           = "Average"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.mem_alarm_threshold
  period              = 300
  evaluation_periods  = 3
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.api.id
  }
}

resource "aws_cloudwatch_metric_alarm" "api_disk_high" {
  alarm_name          = "commma-api-disk-high"
  alarm_description   = "Root volume filling up on the API box (CloudWatch Agent)."
  namespace           = "CWAgent"
  metric_name         = "disk_used_percent"
  statistic           = "Average"
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.disk_alarm_threshold
  period              = 300
  evaluation_periods  = 1
  treat_missing_data  = "missing"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.api.id
    path       = "/"
    fstype     = var.root_fstype
  }
}

resource "aws_route53_health_check" "api" {
  fqdn              = "api.commma.dev"
  type              = "HTTPS"
  port              = 443
  resource_path     = "/health"
  request_interval  = 30
  failure_threshold = 3

  tags = {
    Name = "commma-api-health"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_health" {
  alarm_name          = "commma-api-health-down"
  alarm_description   = "api.commma.dev/health failing the Route 53 health check."
  namespace           = "AWS/Route53"
  metric_name         = "HealthCheckStatus"
  statistic           = "Minimum"
  comparison_operator = "LessThanThreshold"
  threshold           = 1
  period              = 60
  evaluation_periods  = 2
  treat_missing_data  = "breaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    HealthCheckId = aws_route53_health_check.api.id
  }
}

output "alerts_topic_arn" {
  value = aws_sns_topic.alerts.arn
}
