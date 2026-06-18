terraform {
  backend "s3" {
    bucket       = "commma-terraform-state-654801597077"
    key          = "commma/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
