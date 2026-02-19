# Terraform - Azure Infrastructure as Code
# نظام إدارة الجلسات العلاجية - البنية التحتية على أكسيوم

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "therapy-terraform"
    storage_account_name = "therapytfstate"
    container_name       = "tfstate"
    key                  = "prod.tfstate"
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

# ============================================================================
# VARIABLES
# ============================================================================

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "region" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "therapy"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.27.0"
}

variable "node_count" {
  description = "Number of AKS nodes"
  type        = number
  default     = 3
}

variable "vm_size" {
  description = "VM size for AKS nodes"
  type        = string
  default     = "Standard_D4s_v3"  # 4 CPU, 16GB RAM
}

# ============================================================================
# RESOURCE GROUP
# ============================================================================

resource "azurerm_resource_group" "main" {
  name     = "${var.project_name}-${var.environment}"
  location = var.region

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Project     = var.project_name
  }
}

# ============================================================================
# CONTAINER REGISTRY
# ============================================================================

resource "azurerm_container_registry" "main" {
  name                = "${var.project_name}registry${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  admin_enabled       = true
  sku                 = "Standard"

  tags = {
    Environment = var.environment
  }
}

# ============================================================================
# KUBERNETES CLUSTER
# ============================================================================

resource "azurerm_kubernetes_cluster" "main" {
  name                = "${var.project_name}-cluster-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "${var.project_name}-${var.environment}"
  kubernetes_version  = var.kubernetes_version

  # Default node pool
  default_node_pool {
    name       = "default"
    node_count = var.node_count
    vm_size    = var.vm_size

    health_probe_type            = "VHD"
    enable_host_encryption       = true
    enable_node_public_ip        = false
    only_critical_addons_enabled = false

    upgrade_settings {
      drain_timeout_in_minutes      = 30
      max_surge                     = "33%"
      node_soak_duration_in_minutes = 0
    }

    zones = ["1", "2", "3"]  # Multi-AZ deployment
  }

  # Managed identity
  identity {
    type = "SystemAssigned"
  }

  # Network
  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    service_cidr      = "10.0.0.0/16"
    dns_service_ip    = "10.0.0.10"
    docker_bridge_cidr = "172.17.0.1/16"
    load_balancer_sku = "standard"
  }

  # RBAC
  role_based_access_control_enabled = true
  azure_active_directory_role_based_access_control {
    managed                = true
    admin_group_object_ids = []  # Set via terraform.tfvars
  }

  # Monitoring
  monitor_metrics {
    annotations_allowed = "app.terraform.io/*"
    labels_allowed      = "app.terraform.io/*"
  }

  # Add-ons
  addon_profile {
    aci_connector_linux {
      enabled = false
    }
    azure_policy {
      enabled = true
    }
    http_application_routing {
      enabled = false
    }
    ingress_application_gateway {
      enabled = false
    }
    kube_dashboard {
      enabled = false
    }
    oms_agent {
      enabled                    = true
      log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
    }
  }

  tags = {
    Environment = var.environment
  }

  depends_on = [
    azurerm_resource_group.main
  ]
}

# Autoscaler
resource "azurerm_kubernetes_cluster_node_pool" "compute" {
  name                  = "compute"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = var.vm_size
  node_count            = 2

  enable_auto_scaling = true
  min_count           = 2
  max_count           = 20

  enable_node_public_ip = false
  zones                 = ["1", "2", "3"]

  labels = {
    workload = "compute"
  }

  tags = {
    Environment = var.environment
  }
}

# ============================================================================
# MONGODB (COSMOSDB)
# ============================================================================

resource "azurerm_cosmosdb_account" "mongodb" {
  name                = "${var.project_name}-mongodb-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  offer_type          = "Standard"
  kind                = "MongoDB"

  consistency_policy {
    consistency_level       = "Session"
    max_interval_in_seconds = 5
    max_staleness_prefix    = 100
  }

  geo_location {
    location          = azurerm_resource_group.main.location
    failover_priority = 0
  }

  # Backup
  backup {
    type                = "Continuous"
    interval_in_minutes = 60
    retention_in_hours  = 2160  # 90 days
  }

  # Security
  public_network_access_enabled = false
  ip_range_filter              = ""  # Private endpoint only

  tags = {
    Environment = var.environment
  }
}

resource "azurerm_cosmosdb_mongo_database" "therapy" {
  name                = "therapy"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.mongodb.name
  throughput          = 400  # RU/s
}

# Collections
resource "azurerm_cosmosdb_mongo_collection" "sessions" {
  name                = "therapeutic_sessions"
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.mongodb.name
  database_name       = azurerm_cosmosdb_mongo_database.therapy.name

  index {
    keys   = ["_id"]
    unique = true
  }

  index {
    keys = ["therapist_id", "date"]
  }

  index {
    keys = ["patient_id", "status"]
  }
}

# ============================================================================
# REDIS CACHE
# ============================================================================

resource "azurerm_redis_cache" "main" {
  name                = "${var.project_name}-redis-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  capacity            = 2
  family              = "P"  # Premium for cluster support
  sku_name            = "Premium"

  minimum_tls_version = "1.2"
  enable_non_ssl_port = false
  public_network_access_enabled = false

  redis_configuration {
    enable_authentication = true
    maxmemory_policy      = "allkeys-lru"
  }

  tags = {
    Environment = var.environment
  }
}

# ============================================================================
# STORAGE ACCOUNT (BACKUPS)
# ============================================================================

resource "azurerm_storage_account" "backups" {
  name                     = "${var.project_name}backups${var.environment}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant

  https_traffic_only_enabled       = true
  min_tls_version                  = "TLS1_2"
  public_network_access_enabled    = false
  shared_access_key_enabled        = true

  tags = {
    Environment = var.environment
  }
}

resource "azurerm_storage_container" "backups" {
  name                  = "database-backups"
  storage_account_name  = azurerm_storage_account.backups.name
  container_access_type = "private"
}

# ============================================================================
# KEY VAULT
# ============================================================================

resource "azurerm_key_vault" "main" {
  name                        = "${var.project_name}-kv-${var.environment}"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  enabled_for_disk_encryption = true
  enable_rbac_authorization   = true
  purge_protection_enabled    = true

  network_acls {
    bypass           = "AzureServices"
    default_action   = "Deny"
  }

  tags = {
    Environment = var.environment
  }
}

# DB Credentials
resource "azurerm_key_vault_secret" "mongodb_uri" {
  name         = "mongodb-uri"
  value        = "mongodb+srv://${azurerm_cosmosdb_account.mongodb.name}:${random_password.mongodb.result}@${azurerm_cosmosdb_account.mongodb.endpoint}"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "redis_auth" {
  name         = "redis-auth"
  value        = azurerm_redis_cache.main.primary_access_key
  key_vault_id = azurerm_key_vault.main.id
}

# ============================================================================
# LOG ANALYTICS
# ============================================================================

resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-logs-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    Environment = var.environment
  }
}

# ============================================================================
# APPLICATION INSIGHTS
# ============================================================================

resource "azurerm_application_insights" "main" {
  name                = "${var.project_name}-appi-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.main.id

  tags = {
    Environment = var.environment
  }
}

# ============================================================================
# VIRTUAL NETWORK & SECURITY
# ============================================================================

resource "azurerm_virtual_network" "main" {
  name                = "${var.project_name}-vnet-${var.environment}"
  address_space       = ["10.1.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    Environment = var.environment
  }
}

resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.1.0.0/22"]
}

resource "azurerm_network_security_group" "aks" {
  name                = "${var.project_name}-nsg-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = {
    Environment = var.environment
  }
}

# ============================================================================
# DATA SOURCES
# ============================================================================

data "azurerm_client_config" "current" {}

# ============================================================================
# RANDOM PASSWORDS
# ============================================================================

resource "random_password" "mongodb" {
  length  = 32
  special = true
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "k8s_cluster_name" {
  value       = azurerm_kubernetes_cluster.main.name
  description = "Kubernetes cluster name"
}

output "k8s_cluster_id" {
  value       = azurerm_kubernetes_cluster.main.id
  description = "Kubernetes cluster ID"
}

output "container_registry_url" {
  value       = azurerm_container_registry.main.login_server
  description = "Container registry URL"
}

output "cosmosdb_endpoint" {
  value       = azurerm_cosmosdb_account.mongodb.endpoint
  sensitive   = true
  description = "CosmosDB endpoint"
}

output "redis_hostname" {
  value       = azurerm_redis_cache.main.hostname
  description = "Redis cache hostname"
}

output "storage_account_name" {
  value       = azurerm_storage_account.backups.name
  description = "Backup storage account name"
}

output "key_vault_id" {
  value       = azurerm_key_vault.main.id
  description = "Key Vault ID"
}

output "resource_group_name" {
  value       = azurerm_resource_group.main.name
  description = "Resource group name"
}
