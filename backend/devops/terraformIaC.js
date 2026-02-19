/**
 * 🏗️ Infrastructure as Code (Terraform)
 *
 * Automated infrastructure provisioning
 * - AWS/Azure/GCP resource definitions
 * - Network configuration
 * - Database setup
 * - Load balancer configuration
 */

const terraformConfig = {
  // AWS Provider and Variables
  variables: `
variable "region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "app_name" {
  description = "Application name"
  default     = "alawael"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  default     = "prod"
}

variable "instance_count" {
  description = "Number of instances"
  default     = 3
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t3.medium"
}

variable "db_instance_class" {
  description = "RDS instance class"
  default     = "db.t3.micro"
}
  `,

  // Provider configuration
  provider: `
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "alawael-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.app_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
  `,

  // VPC and Networking
  network: `
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "\${var.app_name}-vpc"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.\${count.index + 1}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "\${var.app_name}-public-subnet-\${count.index + 1}"
  }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.\${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "\${var.app_name}-private-subnet-\${count.index + 1}"
  }
}

resource "aws_security_group" "app" {
  name        = "\${var.app_name}-sg"
  description = "Security group for \${var.app_name}"
  vpc_id      = aws_vpc.main.id

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
}
  `,

  // ECS Cluster (for container orchestration)
  ecs: `
resource "aws_ecs_cluster" "main" {
  name = "\${var.app_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_ecs_service" "app" {
  name            = "\${var.app_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.instance_count
  launch_type     = "EC2"

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = var.app_name
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.app]
}

resource "aws_ecs_task_definition" "app" {
  family                   = var.app_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["EC2"]
  cpu                      = "512"
  memory                   = "1024"

  container_definitions = jsonencode([{
    name      = var.app_name
    image     = "your-registry/alawael:latest"
    essential = true
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
    environment = [
      { name = "NODE_ENV", value = var.environment }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.app.name
        awslogs-region        = var.region
        awslogs-stream-prefix = "ecs"
      }
    }
  }])
}
  `,

  // RDS Database
  database: `
resource "aws_rds_cluster" "mongo" {
  cluster_identifier      = "\${var.app_name}-mongo-cluster"
  engine                  = "docdb"
  master_username         = "admin"
  master_password         = random_password.db_password.result
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"

  skip_final_snapshot       = false
  final_snapshot_identifier = "\${var.app_name}-mongo-final-snapshot"

  tags = {
    Name = "\${var.app_name}-mongo-cluster"
  }
}

resource "aws_db_instance" "redis" {
  identifier     = "\${var.app_name}-redis"
  engine         = "redis"
  engine_version = "7.0"
  node_type      = "cache.t3.micro"
  num_cache_nodes = 1
  
  parameter_group_name = "default.redis7"
  port                 = 6379
  multi_az             = true
  automatic_failover_enabled = true

  tags = {
    Name = "\${var.app_name}-redis"
  }
}
  `,

  // Load Balancer
  loadBalancer: `
resource "aws_lb" "app" {
  name               = "\${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.app.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "prod" ? true : false

  tags = {
    Name = "\${var.app_name}-alb"
  }
}

resource "aws_lb_target_group" "app" {
  name        = "\${var.app_name}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 3
    interval            = 30
    path                = "/health"
  }
}

resource "aws_lb_listener" "app" {
  load_balancer_arn = aws_lb.app.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
  `,

  // CloudWatch Monitoring
  monitoring: `
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/\${var.app_name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "\${var.app_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  name = "\${var.app_name}-alerts"
}
  `,

  // Outputs
  outputs: `
output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = aws_lb.app.dns_name
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "rds_endpoint" {
  description = "RDS cluster endpoint"
  value       = aws_rds_cluster.mongo.endpoint
}
  `,
};

/**
 * Terraform Infrastructure Manager
 */
class TerraformManager {
  /**
   * Get Terraform files structure
   */
  static getFileStructure() {
    return {
      'main.tf': terraformConfig.provider,
      'variables.tf': terraformConfig.variables,
      'network.tf': terraformConfig.network,
      'ecs.tf': terraformConfig.ecs,
      'database.tf': terraformConfig.database,
      'loadbalancer.tf': terraformConfig.loadBalancer,
      'monitoring.tf': terraformConfig.monitoring,
      'outputs.tf': terraformConfig.outputs,
    };
  }

  /**
   * Get Terraform commands
   */
  static getTerraformCommands() {
    return {
      init: 'terraform init',
      plan: 'terraform plan -out=tfplan',
      apply: 'terraform apply tfplan',
      destroy: 'terraform destroy',
      fmt: 'terraform fmt -recursive',
      validate: 'terraform validate',
      show: 'terraform show',
      state_list: 'terraform state list',
      state_show: 'terraform state show <resource>',
      import: 'terraform import <resource> <id>',
    };
  }

  /**
   * Get Terraform best practices
   */
  static getBestPractices() {
    return [
      '✅ Use remote state backend (S3 with DynamoDB locks)',
      '✅ Version your Terraform files in Git',
      '✅ Use separate directories for different environments',
      '✅ Implement state locking to prevent concurrent modifications',
      '✅ Use meaningful variable names and descriptions',
      '✅ Use locals for frequently used values',
      '✅ Implement proper tagging strategy',
      '✅ Use modules for code reusability',
      '✅ Validate and format code regularly',
      '✅ Review plans before applying',
      '✅ Implement cost monitoring',
      '✅ Use Terraform import for existing resources',
    ];
  }

  /**
   * Get AWS resource types
   */
  static getAwsResources() {
    return [
      'VPC and Networking (VPC, Subnets, Security Groups)',
      'Compute (EC2, ECS, Auto Scaling Groups)',
      'Databases (RDS, DocumentDB, ElastiCache)',
      'Load Balancing (ALB, NLB)',
      'Storage (S3, EBS)',
      'Monitoring (CloudWatch, SNS, CloudTrail)',
      'Security (IAM, Secrets Manager, KMS)',
      'Networking (Route53, CloudFront)',
    ];
  }
}

module.exports = { TerraformManager, terraformConfig };
