resource "aws_security_group" "api" {
  name        = "commma-api-sg"
  description = "launch-wizard-1 created 2026-06-14T19:47:03.952Z"
  vpc_id      = "vpc-05522ba85c5c69c82"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "commma-api-sg"
  }
}

resource "aws_instance" "api" {
  ami                         = "ami-06d5c141ec5b90893"
  instance_type               = "t4g.small"
  key_name                    = "commma-api"
  subnet_id                   = "subnet-0fbb9f1999bb173c1"
  vpc_security_group_ids      = [aws_security_group.api.id]
  associate_public_ip_address = true
  ebs_optimized               = true

  credit_specification {
    cpu_credits = "unlimited"
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    iops                  = 3000
    throughput            = 125
    delete_on_termination = true
    encrypted             = false
  }

  tags = {
    Name = "commma-api"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_eip" "api" {
  domain   = "vpc"
  instance = aws_instance.api.id

  tags = {
    Name = "commma-api"
  }
}
