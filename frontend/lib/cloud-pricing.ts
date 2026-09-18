/**
 * Cloud Pricing Engine — ApkaAI Cloud Intelligence Platform
 *
 * Centralised pricing data for AWS, Azure, GCP, ACE Cloud.
 * All prices are in USD, On-Demand unless noted.
 * Last updated: September 2026
 *
 * Architecture:
 *   Provider → Category → Service → Region → SKU → PricingRecord
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProviderId = 'aws' | 'azure' | 'gcp' | 'ace'
export type PricingModel = 'on-demand' | 'reserved-1yr' | 'reserved-3yr' | 'spot' | 'savings-plan'
export type CategoryId =
  | 'compute' | 'storage' | 'database' | 'networking'
  | 'containers' | 'kubernetes' | 'serverless' | 'ai-ml'
  | 'cdn' | 'security' | 'monitoring' | 'messaging'
  | 'analytics' | 'backup' | 'other'

export interface CloudProvider {
  id:        ProviderId
  name:      string
  shortName: string
  color:     string
  bgColor:   string
  logo:      string   // emoji fallback
}

export interface CloudRegion {
  id:       string
  name:     string
  provider: ProviderId
  location: string
}

export interface InstanceType {
  id:      string
  vcpu:    number
  ram:     number   // GB
  storage?: number  // GB — 0 means EBS/network only
  network?: string
  price:   number   // $/hr on-demand Linux
}

export interface ServiceConfig {
  id:          string
  name:        string
  category:    CategoryId
  provider:    ProviderId
  description: string
  pricingUnit: 'hour' | 'gb-month' | 'request' | 'gb' | 'instance-hour'
  fields:      FieldDef[]
}

export type FieldType = 'select' | 'number' | 'toggle'

export interface FieldDef {
  id:           string
  label:        string
  type:         FieldType
  defaultValue: string | number | boolean
  options?:     { value: string; label: string }[]
  min?:         number
  max?:         number
  unit?:        string
  helpText?:    string
}

export interface BillLineItem {
  id:        string
  provider:  ProviderId
  service:   string
  serviceId: string
  config:    Record<string, string | number | boolean>
  qty:       number
  unitPrice: number   // per hour equivalent
  hourly:    number
  monthly:   number
  category:  CategoryId
  label:     string
}

export interface PricingResult {
  hourly:  number
  daily:   number
  monthly: number
  annual:  number
  breakdown: { label: string; cost: number }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Providers
// ─────────────────────────────────────────────────────────────────────────────

export const PROVIDERS: CloudProvider[] = [
  {
    id: 'aws', name: 'Amazon Web Services', shortName: 'AWS',
    color: '#FF9900', bgColor: 'rgba(255,153,0,0.1)', logo: '🟠',
  },
  {
    id: 'azure', name: 'Microsoft Azure', shortName: 'Azure',
    color: '#0078D4', bgColor: 'rgba(0,120,212,0.1)', logo: '🔵',
  },
  {
    id: 'gcp', name: 'Google Cloud Platform', shortName: 'GCP',
    color: '#4285F4', bgColor: 'rgba(66,133,244,0.1)', logo: '🔴',
  },
  {
    id: 'ace', name: 'ACE Cloud', shortName: 'ACE',
    color: '#00C4B4', bgColor: 'rgba(0,196,180,0.1)', logo: '🟢',
  },
]

export const getProvider = (id: ProviderId) => PROVIDERS.find(p => p.id === id)!

// ─────────────────────────────────────────────────────────────────────────────
// Regions
// ─────────────────────────────────────────────────────────────────────────────

export const REGIONS: Record<ProviderId, CloudRegion[]> = {
  aws: [
    { id: 'ap-south-1',    name: 'Asia Pacific (Mumbai)',     provider: 'aws', location: 'India' },
    { id: 'us-east-1',     name: 'US East (N. Virginia)',     provider: 'aws', location: 'USA' },
    { id: 'us-west-2',     name: 'US West (Oregon)',          provider: 'aws', location: 'USA' },
    { id: 'eu-west-1',     name: 'Europe (Ireland)',          provider: 'aws', location: 'EU' },
    { id: 'ap-southeast-1',name: 'Asia Pacific (Singapore)',  provider: 'aws', location: 'Singapore' },
    { id: 'ap-northeast-1',name: 'Asia Pacific (Tokyo)',      provider: 'aws', location: 'Japan' },
  ],
  azure: [
    { id: 'centralindia',  name: 'Central India',            provider: 'azure', location: 'India' },
    { id: 'eastus',        name: 'East US',                  provider: 'azure', location: 'USA' },
    { id: 'westeurope',    name: 'West Europe',              provider: 'azure', location: 'EU' },
    { id: 'southeastasia', name: 'Southeast Asia',           provider: 'azure', location: 'Singapore' },
    { id: 'japaneast',     name: 'Japan East',               provider: 'azure', location: 'Japan' },
  ],
  gcp: [
    { id: 'asia-south1',   name: 'Mumbai',                   provider: 'gcp', location: 'India' },
    { id: 'us-central1',   name: 'Iowa',                     provider: 'gcp', location: 'USA' },
    { id: 'us-east1',      name: 'South Carolina',           provider: 'gcp', location: 'USA' },
    { id: 'europe-west1',  name: 'Belgium',                  provider: 'gcp', location: 'EU' },
    { id: 'asia-southeast1',name: 'Singapore',               provider: 'gcp', location: 'Singapore' },
  ],
  ace: [
    { id: 'ace-ind-1',     name: 'India (Primary)',          provider: 'ace', location: 'India' },
    { id: 'ace-ind-2',     name: 'India (DR)',               provider: 'ace', location: 'India' },
    { id: 'ace-sg-1',      name: 'Singapore',                provider: 'ace', location: 'Singapore' },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Instance Types
// ─────────────────────────────────────────────────────────────────────────────

// AWS EC2 — ap-south-1 on-demand Linux pricing (USD/hr)
export const AWS_INSTANCES: InstanceType[] = [
  { id: 't3.micro',    vcpu: 2,  ram: 1,   price: 0.0116 },
  { id: 't3.small',    vcpu: 2,  ram: 2,   price: 0.0232 },
  { id: 't3.medium',   vcpu: 2,  ram: 4,   price: 0.0464 },
  { id: 't3.large',    vcpu: 2,  ram: 8,   price: 0.0928 },
  { id: 't3.xlarge',   vcpu: 4,  ram: 16,  price: 0.1856 },
  { id: 't3.2xlarge',  vcpu: 8,  ram: 32,  price: 0.3712 },
  { id: 'm5.large',    vcpu: 2,  ram: 8,   price: 0.1060 },
  { id: 'm5.xlarge',   vcpu: 4,  ram: 16,  price: 0.2120 },
  { id: 'm5.2xlarge',  vcpu: 8,  ram: 32,  price: 0.4240 },
  { id: 'm5.4xlarge',  vcpu: 16, ram: 64,  price: 0.8480 },
  { id: 'c5.large',    vcpu: 2,  ram: 4,   price: 0.0960 },
  { id: 'c5.xlarge',   vcpu: 4,  ram: 8,   price: 0.1920 },
  { id: 'c5.2xlarge',  vcpu: 8,  ram: 16,  price: 0.3840 },
  { id: 'r5.large',    vcpu: 2,  ram: 16,  price: 0.1520 },
  { id: 'r5.xlarge',   vcpu: 4,  ram: 32,  price: 0.3040 },
  { id: 'r5.2xlarge',  vcpu: 8,  ram: 64,  price: 0.6080 },
]

// Azure VMs — Central India (USD/hr, Linux)
export const AZURE_INSTANCES: InstanceType[] = [
  { id: 'B1s',         vcpu: 1,  ram: 1,   price: 0.0094 },
  { id: 'B2s',         vcpu: 2,  ram: 4,   price: 0.0375 },
  { id: 'D2s_v3',      vcpu: 2,  ram: 8,   price: 0.0940 },
  { id: 'D4s_v3',      vcpu: 4,  ram: 16,  price: 0.1880 },
  { id: 'D8s_v3',      vcpu: 8,  ram: 32,  price: 0.3760 },
  { id: 'D16s_v3',     vcpu: 16, ram: 64,  price: 0.7520 },
  { id: 'F2s_v2',      vcpu: 2,  ram: 4,   price: 0.0846 },
  { id: 'F4s_v2',      vcpu: 4,  ram: 8,   price: 0.1692 },
  { id: 'E4s_v3',      vcpu: 4,  ram: 32,  price: 0.2940 },
  { id: 'E8s_v3',      vcpu: 8,  ram: 64,  price: 0.5880 },
]

// GCP — asia-south1 (USD/hr, Linux)
export const GCP_INSTANCES: InstanceType[] = [
  { id: 'e2-micro',      vcpu: 2,  ram: 1,   price: 0.0100 },
  { id: 'e2-small',      vcpu: 2,  ram: 2,   price: 0.0200 },
  { id: 'e2-medium',     vcpu: 2,  ram: 4,   price: 0.0400 },
  { id: 'e2-standard-4', vcpu: 4,  ram: 16,  price: 0.1600 },
  { id: 'e2-standard-8', vcpu: 8,  ram: 32,  price: 0.3200 },
  { id: 'n2-standard-2', vcpu: 2,  ram: 8,   price: 0.1050 },
  { id: 'n2-standard-4', vcpu: 4,  ram: 16,  price: 0.2100 },
  { id: 'n2-standard-8', vcpu: 8,  ram: 32,  price: 0.4200 },
  { id: 'c2-standard-4', vcpu: 4,  ram: 16,  price: 0.2088 },
  { id: 'c2-standard-8', vcpu: 8,  ram: 32,  price: 0.4176 },
]

// ACE Cloud — India (USD/hr)
export const ACE_INSTANCES: InstanceType[] = [
  { id: 'ace.s1.micro',   vcpu: 1,  ram: 1,   price: 0.0080 },
  { id: 'ace.s1.small',   vcpu: 2,  ram: 2,   price: 0.0160 },
  { id: 'ace.s1.medium',  vcpu: 2,  ram: 4,   price: 0.0320 },
  { id: 'ace.s1.large',   vcpu: 4,  ram: 8,   price: 0.0640 },
  { id: 'ace.s1.xlarge',  vcpu: 4,  ram: 16,  price: 0.1280 },
  { id: 'ace.s1.2xlarge', vcpu: 8,  ram: 32,  price: 0.2560 },
  { id: 'ace.m1.large',   vcpu: 2,  ram: 8,   price: 0.0900 },
  { id: 'ace.m1.xlarge',  vcpu: 4,  ram: 16,  price: 0.1800 },
]

export const INSTANCE_TYPES: Record<ProviderId, InstanceType[]> = {
  aws:   AWS_INSTANCES,
  azure: AZURE_INSTANCES,
  gcp:   GCP_INSTANCES,
  ace:   ACE_INSTANCES,
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Pricing ($/GB-month)
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_PRICING: Record<ProviderId, {
  objectStandard: number   // S3 Standard / Blob Hot / GCS Standard / ACE Object
  objectIA:       number   // Infrequent Access
  blockSSD:       number   // EBS gp3 / Premium SSD / PD SSD / ACE Block
  blockHDD:       number   // EBS sc1 / Standard HDD / PD Standard
}> = {
  aws:   { objectStandard: 0.023, objectIA: 0.0125, blockSSD: 0.08,  blockHDD: 0.015 },
  azure: { objectStandard: 0.018, objectIA: 0.010,  blockSSD: 0.12,  blockHDD: 0.020 },
  gcp:   { objectStandard: 0.020, objectIA: 0.010,  blockSSD: 0.17,  blockHDD: 0.040 },
  ace:   { objectStandard: 0.016, objectIA: 0.008,  blockSSD: 0.07,  blockHDD: 0.012 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Pricing
// ─────────────────────────────────────────────────────────────────────────────

export interface DBInstance {
  id:     string
  vcpu:   number
  ram:    number
  price:  number   // $/hr
  engine: string[]
}

export const DB_INSTANCES: Record<ProviderId, DBInstance[]> = {
  aws: [
    { id: 'db.t3.micro',   vcpu: 2, ram: 1,  price: 0.018, engine: ['MySQL','PostgreSQL','MariaDB'] },
    { id: 'db.t3.small',   vcpu: 2, ram: 2,  price: 0.036, engine: ['MySQL','PostgreSQL','MariaDB'] },
    { id: 'db.t3.medium',  vcpu: 2, ram: 4,  price: 0.072, engine: ['MySQL','PostgreSQL','MariaDB'] },
    { id: 'db.m5.large',   vcpu: 2, ram: 8,  price: 0.210, engine: ['MySQL','PostgreSQL','MariaDB','Oracle','SQL Server'] },
    { id: 'db.m5.xlarge',  vcpu: 4, ram: 16, price: 0.420, engine: ['MySQL','PostgreSQL','MariaDB','Oracle','SQL Server'] },
    { id: 'db.r5.large',   vcpu: 2, ram: 16, price: 0.290, engine: ['MySQL','PostgreSQL','Aurora'] },
  ],
  azure: [
    { id: 'GP_Gen5_2',  vcpu: 2, ram: 10, price: 0.200, engine: ['MySQL','PostgreSQL','MariaDB'] },
    { id: 'GP_Gen5_4',  vcpu: 4, ram: 20, price: 0.400, engine: ['MySQL','PostgreSQL','MariaDB'] },
    { id: 'MO_Gen5_4',  vcpu: 4, ram: 32, price: 0.500, engine: ['MySQL','PostgreSQL'] },
  ],
  gcp: [
    { id: 'db-f1-micro',   vcpu: 1, ram: 0.6, price: 0.013, engine: ['MySQL','PostgreSQL'] },
    { id: 'db-n1-standard-1', vcpu: 1, ram: 3.75, price: 0.096, engine: ['MySQL','PostgreSQL','SQL Server'] },
    { id: 'db-n1-standard-2', vcpu: 2, ram: 7.5,  price: 0.192, engine: ['MySQL','PostgreSQL','SQL Server'] },
    { id: 'db-n1-standard-4', vcpu: 4, ram: 15,   price: 0.384, engine: ['MySQL','PostgreSQL','SQL Server'] },
  ],
  ace: [
    { id: 'ace-db-small',  vcpu: 2, ram: 4,  price: 0.060, engine: ['MySQL','PostgreSQL'] },
    { id: 'ace-db-medium', vcpu: 4, ram: 8,  price: 0.120, engine: ['MySQL','PostgreSQL'] },
    { id: 'ace-db-large',  vcpu: 4, ram: 16, price: 0.200, engine: ['MySQL','PostgreSQL'] },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Networking / Transfer Pricing ($/GB)
// ─────────────────────────────────────────────────────────────────────────────

export const TRANSFER_PRICING: Record<ProviderId, {
  inbound:   number   // almost always free
  outbound:  number   // first 10TB/month tier
  interAZ:   number
  cdnOrigin: number
}> = {
  aws:   { inbound: 0,     outbound: 0.09,  interAZ: 0.02, cdnOrigin: 0.0085 },
  azure: { inbound: 0,     outbound: 0.087, interAZ: 0.01, cdnOrigin: 0.0080 },
  gcp:   { inbound: 0,     outbound: 0.08,  interAZ: 0.01, cdnOrigin: 0.0075 },
  ace:   { inbound: 0,     outbound: 0.07,  interAZ: 0.005,cdnOrigin: 0.006  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Lambda / Serverless
// ─────────────────────────────────────────────────────────────────────────────

export const SERVERLESS_PRICING: Record<ProviderId, {
  requestCost:    number   // per 1M requests
  durationCost:   number   // per GB-second
  freeTierReq:    number   // million requests/month
  freeTierDur:    number   // GB-seconds/month
}> = {
  aws:   { requestCost: 0.20,  durationCost: 0.0000166667, freeTierReq: 1, freeTierDur: 400000 },
  azure: { requestCost: 0.20,  durationCost: 0.000016,     freeTierReq: 1, freeTierDur: 400000 },
  gcp:   { requestCost: 0.40,  durationCost: 0.0000025,    freeTierReq: 2, freeTierDur: 400000 },
  ace:   { requestCost: 0.15,  durationCost: 0.000014,     freeTierReq: 1, freeTierDur: 500000 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Load Balancer Pricing
// ─────────────────────────────────────────────────────────────────────────────

export const LB_PRICING: Record<ProviderId, {
  hourly:    number   // per LB per hour
  lcu:       number   // per LCU/hour (capacity unit)
}> = {
  aws:   { hourly: 0.008, lcu: 0.008 },
  azure: { hourly: 0.007, lcu: 0.007 },
  gcp:   { hourly: 0.008, lcu: 0.006 },
  ace:   { hourly: 0.006, lcu: 0.005 },
}

// ─────────────────────────────────────────────────────────────────────────────
// Currency Exchange Rates (vs USD)
// ─────────────────────────────────────────────────────────────────────────────

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  INR: 84,
  EUR: 0.92,
  GBP: 0.79,
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Definitions (what fields to show in calculator)
// ─────────────────────────────────────────────────────────────────────────────

export const SERVICES: Record<ProviderId, ServiceConfig[]> = {
  aws: [
    {
      id: 'ec2', name: 'EC2 — Compute', category: 'compute', provider: 'aws',
      description: 'Virtual servers in the cloud',
      pricingUnit: 'hour',
      fields: [
        { id: 'instanceType', label: 'Instance Type', type: 'select', defaultValue: 't3.medium',
          options: AWS_INSTANCES.map(i => ({ value: i.id, label: `${i.id} (${i.vcpu} vCPU, ${i.ram} GB RAM)` })) },
        { id: 'os', label: 'Operating System', type: 'select', defaultValue: 'Linux',
          options: [{ value: 'Linux', label: 'Linux' }, { value: 'Windows', label: 'Windows (+40%)' }] },
        { id: 'instances', label: 'Number of Instances', type: 'number', defaultValue: 1, min: 1, unit: 'instances' },
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, max: 744, unit: 'hours' },
        { id: 'storage', label: 'EBS Storage (gp3)', type: 'number', defaultValue: 30, min: 1, unit: 'GB' },
        { id: 'transfer', label: 'Data Transfer Out', type: 'number', defaultValue: 0, min: 0, unit: 'GB' },
      ],
    },
    {
      id: 's3', name: 'S3 — Object Storage', category: 'storage', provider: 'aws',
      description: 'Scalable object storage',
      pricingUnit: 'gb-month',
      fields: [
        { id: 'storage', label: 'Storage', type: 'number', defaultValue: 100, min: 1, unit: 'GB' },
        { id: 'storageClass', label: 'Storage Class', type: 'select', defaultValue: 'standard',
          options: [
            { value: 'standard', label: 'Standard ($0.023/GB)' },
            { value: 'ia', label: 'Standard-IA ($0.0125/GB)' },
            { value: 'glacier', label: 'Glacier ($0.004/GB)' },
          ] },
        { id: 'putRequests', label: 'PUT/COPY/POST Requests', type: 'number', defaultValue: 10000, min: 0, unit: 'requests' },
        { id: 'getRequests', label: 'GET/SELECT Requests', type: 'number', defaultValue: 100000, min: 0, unit: 'requests' },
        { id: 'transfer', label: 'Data Transfer Out', type: 'number', defaultValue: 0, min: 0, unit: 'GB' },
      ],
    },
    {
      id: 'rds', name: 'RDS — Managed Database', category: 'database', provider: 'aws',
      description: 'Managed relational database service',
      pricingUnit: 'hour',
      fields: [
        { id: 'engine', label: 'Database Engine', type: 'select', defaultValue: 'MySQL',
          options: [
            { value: 'MySQL', label: 'MySQL' },
            { value: 'PostgreSQL', label: 'PostgreSQL' },
            { value: 'MariaDB', label: 'MariaDB' },
            { value: 'Aurora MySQL', label: 'Aurora MySQL (+20%)' },
          ] },
        { id: 'instanceClass', label: 'Instance Class', type: 'select', defaultValue: 'db.t3.medium',
          options: DB_INSTANCES.aws.map(i => ({ value: i.id, label: `${i.id} (${i.vcpu} vCPU, ${i.ram} GB)` })) },
        { id: 'multiAZ', label: 'Multi-AZ Deployment', type: 'toggle', defaultValue: false, helpText: 'Doubles the instance cost' },
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, unit: 'hours' },
        { id: 'storage', label: 'Allocated Storage', type: 'number', defaultValue: 20, min: 20, unit: 'GB' },
        { id: 'iops', label: 'Provisioned IOPS', type: 'number', defaultValue: 0, min: 0, unit: 'IOPS', helpText: '0 = gp2 storage' },
        { id: 'backupStorage', label: 'Backup Storage', type: 'number', defaultValue: 0, min: 0, unit: 'GB' },
      ],
    },
    {
      id: 'lambda', name: 'Lambda — Serverless', category: 'serverless', provider: 'aws',
      description: 'Run code without provisioning servers',
      pricingUnit: 'request',
      fields: [
        { id: 'requests', label: 'Monthly Requests', type: 'number', defaultValue: 1000000, min: 0, unit: 'requests' },
        { id: 'memory', label: 'Memory', type: 'select', defaultValue: '512',
          options: [128,256,512,1024,2048,3008,10240].map(m => ({ value: String(m), label: `${m} MB` })) },
        { id: 'duration', label: 'Avg Duration', type: 'number', defaultValue: 200, min: 1, unit: 'ms' },
        { id: 'freeTier', label: 'Include Free Tier', type: 'toggle', defaultValue: true },
      ],
    },
    {
      id: 'cloudfront', name: 'CloudFront — CDN', category: 'cdn', provider: 'aws',
      description: 'Global content delivery network',
      pricingUnit: 'gb',
      fields: [
        { id: 'transfer', label: 'Data Transfer Out', type: 'number', defaultValue: 100, min: 0, unit: 'GB' },
        { id: 'httpRequests', label: 'HTTP Requests', type: 'number', defaultValue: 1000000, min: 0, unit: 'requests' },
        { id: 'httpsRequests', label: 'HTTPS Requests', type: 'number', defaultValue: 1000000, min: 0, unit: 'requests' },
      ],
    },
    {
      id: 'alb', name: 'ALB — Load Balancer', category: 'networking', provider: 'aws',
      description: 'Application Load Balancer',
      pricingUnit: 'hour',
      fields: [
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, unit: 'hours' },
        { id: 'lcu', label: 'Load Balancer Capacity Units', type: 'number', defaultValue: 1, min: 1, unit: 'LCUs' },
      ],
    },
    {
      id: 'eks', name: 'EKS — Kubernetes', category: 'kubernetes', provider: 'aws',
      description: 'Managed Kubernetes service',
      pricingUnit: 'hour',
      fields: [
        { id: 'clusters', label: 'Number of Clusters', type: 'number', defaultValue: 1, min: 1, unit: 'clusters' },
        { id: 'nodeInstanceType', label: 'Worker Node Type', type: 'select', defaultValue: 't3.medium',
          options: AWS_INSTANCES.map(i => ({ value: i.id, label: `${i.id} (${i.vcpu} vCPU, ${i.ram} GB)` })) },
        { id: 'nodes', label: 'Worker Nodes', type: 'number', defaultValue: 3, min: 1, unit: 'nodes' },
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, unit: 'hours' },
      ],
    },
    {
      id: 'ebs', name: 'EBS — Block Storage', category: 'storage', provider: 'aws',
      description: 'Elastic Block Store volumes',
      pricingUnit: 'gb-month',
      fields: [
        { id: 'volumeType', label: 'Volume Type', type: 'select', defaultValue: 'gp3',
          options: [
            { value: 'gp3', label: 'gp3 — General Purpose SSD ($0.08/GB)' },
            { value: 'gp2', label: 'gp2 — General Purpose SSD ($0.10/GB)' },
            { value: 'io1', label: 'io1 — Provisioned IOPS SSD ($0.125/GB)' },
            { value: 'sc1', label: 'sc1 — Cold HDD ($0.015/GB)' },
            { value: 'st1', label: 'st1 — Throughput HDD ($0.045/GB)' },
          ] },
        { id: 'storage', label: 'Storage', type: 'number', defaultValue: 100, min: 1, unit: 'GB' },
        { id: 'iops', label: 'Provisioned IOPS (io1 only)', type: 'number', defaultValue: 0, min: 0, unit: 'IOPS' },
      ],
    },
  ],
  azure: [
    {
      id: 'vm', name: 'Virtual Machines', category: 'compute', provider: 'azure',
      description: 'Scalable cloud compute',
      pricingUnit: 'hour',
      fields: [
        { id: 'instanceType', label: 'VM Size', type: 'select', defaultValue: 'D2s_v3',
          options: AZURE_INSTANCES.map(i => ({ value: i.id, label: `${i.id} (${i.vcpu} vCPU, ${i.ram} GB RAM)` })) },
        { id: 'os', label: 'Operating System', type: 'select', defaultValue: 'Linux',
          options: [{ value: 'Linux', label: 'Linux' }, { value: 'Windows', label: 'Windows (+35%)' }] },
        { id: 'instances', label: 'Number of VMs', type: 'number', defaultValue: 1, min: 1, unit: 'VMs' },
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, unit: 'hours' },
        { id: 'storage', label: 'Managed Disk (Standard SSD)', type: 'number', defaultValue: 30, min: 1, unit: 'GB' },
        { id: 'transfer', label: 'Data Transfer Out', type: 'number', defaultValue: 0, min: 0, unit: 'GB' },
      ],
    },
    {
      id: 'blob', name: 'Blob Storage', category: 'storage', provider: 'azure',
      description: 'Object storage for unstructured data',
      pricingUnit: 'gb-month',
      fields: [
        { id: 'storage', label: 'Storage', type: 'number', defaultValue: 100, min: 1, unit: 'GB' },
        { id: 'tier', label: 'Access Tier', type: 'select', defaultValue: 'hot',
          options: [
            { value: 'hot', label: 'Hot ($0.018/GB)' },
            { value: 'cool', label: 'Cool ($0.01/GB)' },
            { value: 'archive', label: 'Archive ($0.00099/GB)' },
          ] },
        { id: 'writeOps', label: 'Write Operations', type: 'number', defaultValue: 10000, min: 0, unit: 'ops' },
        { id: 'readOps', label: 'Read Operations', type: 'number', defaultValue: 100000, min: 0, unit: 'ops' },
        { id: 'transfer', label: 'Data Transfer Out', type: 'number', defaultValue: 0, min: 0, unit: 'GB' },
      ],
    },
    {
      id: 'azure-db', name: 'Azure Database', category: 'database', provider: 'azure',
      description: 'Fully managed relational databases',
      pricingUnit: 'hour',
      fields: [
        { id: 'engine', label: 'Database Engine', type: 'select', defaultValue: 'MySQL',
          options: [{ value: 'MySQL', label: 'MySQL' }, { value: 'PostgreSQL', label: 'PostgreSQL' }] },
        { id: 'tier', label: 'Service Tier', type: 'select', defaultValue: 'GP_Gen5_2',
          options: DB_INSTANCES.azure.map(i => ({ value: i.id, label: `${i.id} (${i.vcpu} vCPU, ${i.ram} GB)` })) },
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, unit: 'hours' },
        { id: 'storage', label: 'Storage', type: 'number', defaultValue: 20, min: 5, unit: 'GB' },
      ],
    },
    {
      id: 'azure-fn', name: 'Azure Functions', category: 'serverless', provider: 'azure',
      description: 'Event-driven serverless compute',
      pricingUnit: 'request',
      fields: [
        { id: 'requests', label: 'Monthly Executions', type: 'number', defaultValue: 1000000, min: 0, unit: 'executions' },
        { id: 'memory', label: 'Memory', type: 'select', defaultValue: '512',
          options: [128,256,512,1024,2048].map(m => ({ value: String(m), label: `${m} MB` })) },
        { id: 'duration', label: 'Avg Duration', type: 'number', defaultValue: 200, min: 1, unit: 'ms' },
        { id: 'freeTier', label: 'Include Free Tier', type: 'toggle', defaultValue: true },
      ],
    },
  ],
  gcp: [
    {
      id: 'gce', name: 'Compute Engine', category: 'compute', provider: 'gcp',
      description: 'Virtual machines running on Google infrastructure',
      pricingUnit: 'hour',
      fields: [
        { id: 'instanceType', label: 'Machine Type', type: 'select', defaultValue: 'e2-medium',
          options: GCP_INSTANCES.map(i => ({ value: i.id, label: `${i.id} (${i.vcpu} vCPU, ${i.ram} GB RAM)` })) },
        { id: 'os', label: 'Operating System', type: 'select', defaultValue: 'Linux',
          options: [{ value: 'Linux', label: 'Linux / Container-Optimized' }, { value: 'Windows', label: 'Windows (+35%)' }] },
        { id: 'instances', label: 'Number of VMs', type: 'number', defaultValue: 1, min: 1, unit: 'VMs' },
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, unit: 'hours' },
        { id: 'storage', label: 'Persistent Disk (Standard)', type: 'number', defaultValue: 30, min: 1, unit: 'GB' },
        { id: 'transfer', label: 'Egress Traffic', type: 'number', defaultValue: 0, min: 0, unit: 'GB' },
      ],
    },
    {
      id: 'gcs', name: 'Cloud Storage', category: 'storage', provider: 'gcp',
      description: 'Object storage for companies of all sizes',
      pricingUnit: 'gb-month',
      fields: [
        { id: 'storage', label: 'Storage', type: 'number', defaultValue: 100, min: 1, unit: 'GB' },
        { id: 'storageClass', label: 'Storage Class', type: 'select', defaultValue: 'standard',
          options: [
            { value: 'standard', label: 'Standard ($0.020/GB)' },
            { value: 'nearline', label: 'Nearline ($0.010/GB)' },
            { value: 'coldline', label: 'Coldline ($0.004/GB)' },
            { value: 'archive', label: 'Archive ($0.0012/GB)' },
          ] },
        { id: 'classA', label: 'Class A Operations (writes)', type: 'number', defaultValue: 10000, min: 0, unit: 'ops' },
        { id: 'classB', label: 'Class B Operations (reads)', type: 'number', defaultValue: 100000, min: 0, unit: 'ops' },
        { id: 'transfer', label: 'Egress Traffic', type: 'number', defaultValue: 0, min: 0, unit: 'GB' },
      ],
    },
    {
      id: 'cloud-sql', name: 'Cloud SQL', category: 'database', provider: 'gcp',
      description: 'Fully managed relational database service',
      pricingUnit: 'hour',
      fields: [
        { id: 'engine', label: 'Database Engine', type: 'select', defaultValue: 'MySQL',
          options: [{ value: 'MySQL', label: 'MySQL' }, { value: 'PostgreSQL', label: 'PostgreSQL' }, { value: 'SQL Server', label: 'SQL Server' }] },
        { id: 'instanceType', label: 'Machine Type', type: 'select', defaultValue: 'db-n1-standard-2',
          options: DB_INSTANCES.gcp.map(i => ({ value: i.id, label: `${i.id} (${i.vcpu} vCPU, ${i.ram} GB)` })) },
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, unit: 'hours' },
        { id: 'storage', label: 'Storage (SSD)', type: 'number', defaultValue: 20, min: 10, unit: 'GB' },
      ],
    },
    {
      id: 'cloud-functions', name: 'Cloud Functions', category: 'serverless', provider: 'gcp',
      description: 'Scalable pay-as-you-go functions',
      pricingUnit: 'request',
      fields: [
        { id: 'requests', label: 'Monthly Invocations', type: 'number', defaultValue: 1000000, min: 0, unit: 'invocations' },
        { id: 'memory', label: 'Memory', type: 'select', defaultValue: '512',
          options: [128,256,512,1024,2048,4096].map(m => ({ value: String(m), label: `${m} MB` })) },
        { id: 'duration', label: 'Avg Duration', type: 'number', defaultValue: 200, min: 1, unit: 'ms' },
        { id: 'freeTier', label: 'Include Free Tier', type: 'toggle', defaultValue: true },
      ],
    },
  ],
  ace: [
    {
      id: 'ace-compute', name: 'ACE Compute', category: 'compute', provider: 'ace',
      description: 'Virtual machines on ACE Cloud infrastructure',
      pricingUnit: 'hour',
      fields: [
        { id: 'instanceType', label: 'Instance Type', type: 'select', defaultValue: 'ace.s1.medium',
          options: ACE_INSTANCES.map(i => ({ value: i.id, label: `${i.id} (${i.vcpu} vCPU, ${i.ram} GB RAM)` })) },
        { id: 'os', label: 'Operating System', type: 'select', defaultValue: 'Linux',
          options: [{ value: 'Linux', label: 'Linux' }, { value: 'Windows', label: 'Windows (+30%)' }] },
        { id: 'instances', label: 'Number of Instances', type: 'number', defaultValue: 1, min: 1, unit: 'instances' },
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, unit: 'hours' },
        { id: 'storage', label: 'Block Storage (SSD)', type: 'number', defaultValue: 30, min: 1, unit: 'GB' },
        { id: 'transfer', label: 'Data Transfer Out', type: 'number', defaultValue: 0, min: 0, unit: 'GB' },
      ],
    },
    {
      id: 'ace-object', name: 'ACE Object Storage', category: 'storage', provider: 'ace',
      description: 'Scalable object storage',
      pricingUnit: 'gb-month',
      fields: [
        { id: 'storage', label: 'Storage', type: 'number', defaultValue: 100, min: 1, unit: 'GB' },
        { id: 'requests', label: 'API Requests', type: 'number', defaultValue: 100000, min: 0, unit: 'requests' },
        { id: 'transfer', label: 'Data Transfer Out', type: 'number', defaultValue: 0, min: 0, unit: 'GB' },
      ],
    },
    {
      id: 'ace-db', name: 'ACE Database', category: 'database', provider: 'ace',
      description: 'Managed database service',
      pricingUnit: 'hour',
      fields: [
        { id: 'engine', label: 'Database Engine', type: 'select', defaultValue: 'MySQL',
          options: [{ value: 'MySQL', label: 'MySQL' }, { value: 'PostgreSQL', label: 'PostgreSQL' }] },
        { id: 'instanceClass', label: 'Instance Class', type: 'select', defaultValue: 'ace-db-small',
          options: DB_INSTANCES.ace.map(i => ({ value: i.id, label: `${i.id} (${i.vcpu} vCPU, ${i.ram} GB)` })) },
        { id: 'hours', label: 'Hours per Month', type: 'number', defaultValue: 730, min: 1, unit: 'hours' },
        { id: 'storage', label: 'Storage', type: 'number', defaultValue: 20, min: 10, unit: 'GB' },
      ],
    },
  ],
}

export const getAllServices = (provider: ProviderId) => SERVICES[provider] || []
export const getService = (provider: ProviderId, serviceId: string) =>
  SERVICES[provider]?.find(s => s.id === serviceId)

// ─────────────────────────────────────────────────────────────────────────────
// Calculation Engine
// ─────────────────────────────────────────────────────────────────────────────

export function calculateCost(
  provider: ProviderId,
  serviceId: string,
  config: Record<string, string | number | boolean>
): PricingResult {
  const breakdown: { label: string; cost: number }[] = []
  let totalMonthly = 0

  // ── EC2 / Compute VMs ──────────────────────────────────────────────────────
  if (['ec2', 'vm', 'gce', 'ace-compute'].includes(serviceId)) {
    const instances = config.instances as number || 1
    const hours     = config.hours as number || 730
    const storage   = config.storage as number || 30
    const transfer  = config.transfer as number || 0
    const os        = config.os as string || 'Linux'

    // Instance cost
    const instanceKey = (config.instanceType || config.nodeInstanceType) as string
    const instanceList = INSTANCE_TYPES[provider]
    const instance = instanceList.find(i => i.id === instanceKey) || instanceList[2]
    const osMultiplier = os !== 'Linux' ? (provider === 'aws' ? 1.4 : provider === 'azure' ? 1.35 : 1.35) : 1
    const instanceCost = instance.price * osMultiplier * instances * hours
    breakdown.push({ label: `Compute (${instances}× ${instance.id}, ${hours}h)`, cost: instanceCost })

    // Storage cost
    const storagePricePerGB = STORAGE_PRICING[provider].blockSSD
    const storageCost = storage * instances * storagePricePerGB
    breakdown.push({ label: `Storage (${storage * instances} GB SSD)`, cost: storageCost })

    // Transfer
    if (transfer > 0) {
      const transferCost = transfer * TRANSFER_PRICING[provider].outbound
      breakdown.push({ label: `Data Transfer (${transfer} GB)`, cost: transferCost })
    }

    // EKS cluster fee
    if (serviceId === 'eks') {
      const clusters = config.clusters as number || 1
      breakdown.push({ label: `EKS Cluster Fee (${clusters} cluster × $0.10/hr)`, cost: clusters * 0.10 * hours })
    }
  }

  // ── S3 / Object Storage ────────────────────────────────────────────────────
  else if (['s3', 'blob', 'gcs', 'ace-object'].includes(serviceId)) {
    const storage     = config.storage as number || 100
    const storageClass= (config.storageClass || config.tier || 'standard') as string
    const putReqs     = (config.putRequests || config.writeOps || config.classA || 0) as number
    const getReqs     = (config.getRequests || config.readOps || config.classB || 0) as number
    const transfer    = config.transfer as number || 0

    // Storage cost
    const priceMap: Record<string, number> = {
      standard: STORAGE_PRICING[provider].objectStandard,
      hot:      0.018, cool: 0.010, archive: 0.00099,
      ia:       STORAGE_PRICING[provider].objectIA,
      nearline: 0.010, coldline: 0.004,
      glacier:  0.004,
    }
    const storageCost = storage * (priceMap[storageClass] || STORAGE_PRICING[provider].objectStandard)
    breakdown.push({ label: `Storage (${storage} GB ${storageClass})`, cost: storageCost })

    // Requests
    if (putReqs > 0) {
      const putCost = (putReqs / 1000) * (provider === 'gcp' ? 0.05 : 0.005)
      breakdown.push({ label: `Write requests (${putReqs.toLocaleString()})`, cost: putCost })
    }
    if (getReqs > 0) {
      const getCost = (getReqs / 1000) * (provider === 'gcp' ? 0.004 : 0.0004)
      breakdown.push({ label: `Read requests (${getReqs.toLocaleString()})`, cost: getCost })
    }
    if (transfer > 0) {
      const transferCost = transfer * TRANSFER_PRICING[provider].outbound
      breakdown.push({ label: `Data Transfer (${transfer} GB)`, cost: transferCost })
    }
  }

  // ── RDS / Database ─────────────────────────────────────────────────────────
  else if (['rds', 'azure-db', 'cloud-sql', 'ace-db'].includes(serviceId)) {
    const hours     = config.hours as number || 730
    const storage   = config.storage as number || 20
    const multiAZ   = config.multiAZ as boolean || false
    const iops      = config.iops as number || 0
    const backup    = config.backupStorage as number || 0

    const instanceKey = (config.instanceClass || config.tier || config.instanceType) as string
    const dbList = DB_INSTANCES[provider]
    const db = dbList.find(d => d.id === instanceKey) || dbList[0]
    const multiAZFactor = multiAZ ? 2 : 1
    const instanceCost = db.price * hours * multiAZFactor
    breakdown.push({ label: `DB Instance (${db.id}${multiAZ ? ' Multi-AZ' : ''}, ${hours}h)`, cost: instanceCost })

    const storageCost = storage * 0.115   // gp2/SSD storage
    breakdown.push({ label: `Database Storage (${storage} GB)`, cost: storageCost })

    if (iops > 0) {
      breakdown.push({ label: `Provisioned IOPS (${iops})`, cost: iops * 0.10 })
    }
    if (backup > 0) {
      breakdown.push({ label: `Backup Storage (${backup} GB)`, cost: backup * 0.095 })
    }
  }

  // ── Lambda / Serverless ────────────────────────────────────────────────────
  else if (['lambda', 'azure-fn', 'cloud-functions'].includes(serviceId)) {
    const requests   = config.requests as number || 1000000
    const memoryMB   = parseInt(String(config.memory || 512))
    const durationMs = config.duration as number || 200
    const freeTier   = config.freeTier as boolean

    const pricing = SERVERLESS_PRICING[provider]
    const gbSeconds = (memoryMB / 1024) * (durationMs / 1000) * requests

    let reqCost = (requests / 1_000_000) * pricing.requestCost
    let durCost = gbSeconds * pricing.durationCost

    if (freeTier) {
      reqCost = Math.max(0, reqCost - (pricing.freeTierReq * pricing.requestCost))
      durCost = Math.max(0, durCost - (pricing.freeTierDur * pricing.durationCost))
    }

    breakdown.push({ label: `Requests (${(requests / 1e6).toFixed(1)}M)`, cost: reqCost })
    breakdown.push({ label: `Duration (${memoryMB}MB × ${durationMs}ms)`, cost: durCost })
  }

  // ── CloudFront / CDN ───────────────────────────────────────────────────────
  else if (['cloudfront'].includes(serviceId)) {
    const transfer     = config.transfer as number || 100
    const httpRequests = config.httpRequests as number || 1000000
    const httpsRequests= config.httpsRequests as number || 1000000

    // First 10TB: $0.0085/GB (Mumbai)
    const transferCost = Math.min(transfer, 10240) * 0.0085
    breakdown.push({ label: `Data Transfer (${transfer} GB)`, cost: transferCost })

    const httpCost  = (httpRequests  / 10000) * 0.0090
    const httpsCost = (httpsRequests / 10000) * 0.0100
    breakdown.push({ label: `HTTP Requests (${(httpRequests/1e6).toFixed(1)}M)`, cost: httpCost })
    breakdown.push({ label: `HTTPS Requests (${(httpsRequests/1e6).toFixed(1)}M)`, cost: httpsCost })
  }

  // ── ALB / Load Balancer ────────────────────────────────────────────────────
  else if (['alb'].includes(serviceId)) {
    const hours = config.hours as number || 730
    const lcu   = config.lcu as number || 1
    const lbPricing = LB_PRICING[provider]
    breakdown.push({ label: `Load Balancer (${hours}h)`, cost: lbPricing.hourly * hours })
    breakdown.push({ label: `LCU (${lcu} × ${hours}h)`, cost: lbPricing.lcu * lcu * hours })
  }

  // ── EBS Block Storage ──────────────────────────────────────────────────────
  else if (['ebs'].includes(serviceId)) {
    const storage    = config.storage as number || 100
    const volumeType = config.volumeType as string || 'gp3'
    const iops       = config.iops as number || 0
    const priceMap: Record<string, number> = {
      gp3: 0.08, gp2: 0.10, io1: 0.125, sc1: 0.015, st1: 0.045,
    }
    const storageCost = storage * (priceMap[volumeType] || 0.08)
    breakdown.push({ label: `${volumeType} Volume (${storage} GB)`, cost: storageCost })
    if (volumeType === 'io1' && iops > 0) {
      breakdown.push({ label: `Provisioned IOPS (${iops})`, cost: iops * 0.065 })
    }
  }

  // ── Fallback ───────────────────────────────────────────────────────────────
  else {
    breakdown.push({ label: 'Service (estimated)', cost: 50 })
  }

  totalMonthly = breakdown.reduce((s, b) => s + b.cost, 0)
  const hourly  = totalMonthly / 730
  const daily   = totalMonthly / 30
  const annual  = totalMonthly * 12

  return {
    hourly:    Math.round(hourly  * 10000) / 10000,
    daily:     Math.round(daily   * 100)   / 100,
    monthly:   Math.round(totalMonthly * 100) / 100,
    annual:    Math.round(annual  * 100)   / 100,
    breakdown: breakdown.map(b => ({ ...b, cost: Math.round(b.cost * 100) / 100 })),
  }
}

/** Convert USD to another currency */
export function convertCurrency(usdAmount: number, currency: string): number {
  const rate = EXCHANGE_RATES[currency] || 1
  return Math.round(usdAmount * rate * 100) / 100
}

/** Format currency with symbol */
export function formatCurrency(amount: number, currency = 'USD'): string {
  const sym = CURRENCY_SYMBOLS[currency] || '$'
  if (amount >= 1000) {
    return `${sym}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${sym}${amount.toFixed(2)}`
}

/** Get comparable services across all providers for a given category */
export function getComparableServices(category: CategoryId): Record<ProviderId, ServiceConfig | null> {
  const result = {} as Record<ProviderId, ServiceConfig | null>
  for (const pid of ['aws', 'azure', 'gcp', 'ace'] as ProviderId[]) {
    result[pid] = SERVICES[pid]?.find(s => s.category === category) || null
  }
  return result
}

/** Service categories with metadata */
export const CATEGORIES: { id: CategoryId; label: string; emoji: string; description: string }[] = [
  { id: 'compute',    label: 'Compute',      emoji: '⚡', description: 'Virtual machines & computing power' },
  { id: 'storage',    label: 'Storage',      emoji: '💾', description: 'Object, block & file storage' },
  { id: 'database',   label: 'Database',     emoji: '🗃️',  description: 'Managed relational & NoSQL databases' },
  { id: 'networking', label: 'Networking',   emoji: '🌐', description: 'VPNs, load balancers & traffic' },
  { id: 'serverless', label: 'Serverless',   emoji: '⚙️',  description: 'Function-as-a-service platforms' },
  { id: 'kubernetes', label: 'Kubernetes',   emoji: '🚢', description: 'Managed container orchestration' },
  { id: 'cdn',        label: 'CDN',          emoji: '🚀', description: 'Content delivery networks' },
  { id: 'ai-ml',      label: 'AI / ML',      emoji: '🤖', description: 'Machine learning & AI services' },
  { id: 'containers', label: 'Containers',   emoji: '📦', description: 'Container registries & services' },
  { id: 'analytics',  label: 'Analytics',    emoji: '📊', description: 'Data analytics & processing' },
  { id: 'security',   label: 'Security',     emoji: '🔒', description: 'Identity, keys & compliance' },
  { id: 'monitoring', label: 'Monitoring',   emoji: '📈', description: 'Observability & logging' },
  { id: 'messaging',  label: 'Messaging',    emoji: '📨', description: 'Queues, topics & event buses' },
  { id: 'backup',     label: 'Backup',       emoji: '🔄', description: 'Data backup & recovery' },
  { id: 'other',      label: 'Other',        emoji: '🔧', description: 'Other cloud services' },
]

export const DATA_LAST_UPDATED = 'September 2026'

// ─────────────────────────────────────────────────────────────────────────────
// Backup & Data Protection Vendors
// Displayed in the Cloud section under "Backup & Data Protection"
// ─────────────────────────────────────────────────────────────────────────────

export interface BackupVendor {
  id:          string
  name:        string
  slug:        string
  logo:        string
  tagline:     string
  description: string
  website:     string
  founded:     string
  hq:          string
  deployments: string[]   // On-prem, Cloud, SaaS, Hybrid
  platforms:   string[]   // VMware, Azure, AWS, K8s, Physical, SaaS apps …
  strengths:   string[]
  badge?:      string
  pricingModel: 'subscription' | 'perpetual' | 'usage-based' | 'custom'
  startingPrice: string
  plans: {
    name:     string
    price:    string
    target:   string         // SMB / Enterprise / MSP
    features: string[]
    popular?: boolean
  }[]
}

export const BACKUP_VENDORS: BackupVendor[] = [
  {
    id:           'commvault',
    name:         'Commvault',
    slug:         'commvault',
    logo:         '🛡️',
    tagline:      'Intelligent data protection and cyber resilience',
    description:  'Commvault delivers enterprise-grade data protection, backup, recovery, and cyber resilience across on-premises, cloud, and SaaS. Its Metallic SaaS platform makes deployment fast without infrastructure overhead.',
    website:      'https://commvault.com',
    founded:      '1988',
    hq:           'Tinton Falls, NJ, USA',
    deployments:  ['On-Premises', 'Cloud', 'SaaS', 'Hybrid'],
    platforms:    ['VMware', 'Hyper-V', 'AWS', 'Azure', 'GCP', 'Microsoft 365', 'Salesforce', 'Kubernetes', 'Physical Servers'],
    strengths:    ['Ransomware recovery', 'Air-gap protection', 'Compliance & eDiscovery', 'Broad workload support'],
    badge:        'Gartner Leader',
    pricingModel: 'custom',
    startingPrice: 'Contact Sales',
    plans: [
      { name: 'Backup & Recovery', price: 'Contact Sales', target: 'Enterprise', features: ['On-prem & cloud backup', 'Granular recovery', 'Deduplication', 'Policy-based automation'] },
      { name: 'Complete Data Protection', price: 'Contact Sales', target: 'Enterprise', features: ['Backup + DR + compliance', 'Air-gap immutable copies', 'SLA dashboards', 'Global search'], popular: true },
      { name: 'Metallic SaaS', price: 'Contact Sales', target: 'SMB / Mid-market', features: ['SaaS-delivered backup', 'Microsoft 365', 'Salesforce', 'No infrastructure needed'] },
    ],
  },
  {
    id:           'cohesity',
    name:         'Cohesity',
    slug:         'cohesity',
    logo:         '🔵',
    tagline:      'AI-powered data security and management platform',
    description:  'Cohesity radically simplifies data management by consolidating backup, DR, file services, and analytics on a single hyperscale platform. DataHawk AI detects threats before they cause damage.',
    website:      'https://cohesity.com',
    founded:      '2013',
    hq:           'San Jose, CA, USA',
    deployments:  ['On-Premises', 'Cloud', 'SaaS', 'Hybrid'],
    platforms:    ['VMware', 'Hyper-V', 'AWS', 'Azure', 'GCP', 'NAS', 'Physical', 'Kubernetes', 'Microsoft 365'],
    strengths:    ['AI-powered threat detection', 'Instant mass restore', 'Data classification', 'Fort Knox vault'],
    badge:        'Gartner Magic Quadrant Leader',
    pricingModel: 'custom',
    startingPrice: 'Contact Sales',
    plans: [
      { name: 'DataProtect', price: 'Contact Sales', target: 'Enterprise', features: ['Backup & recovery', 'Instant mass restore', 'Global dedup', 'Cloud archive'] },
      { name: 'DataGovern', price: 'Contact Sales', target: 'Enterprise', features: ['Data classification', 'Sensitive data scanning', 'Threat detection', 'Compliance reporting'], popular: true },
      { name: 'Fort Knox', price: 'Contact Sales', target: 'Enterprise', features: ['Isolated cloud vault', 'Immutable backups', 'Ransomware recovery', 'SaaS delivery'] },
    ],
  },
  {
    id:           'acronis',
    name:         'Acronis',
    slug:         'acronis',
    logo:         '🔐',
    tagline:      'Cyber protection — backup meets cybersecurity',
    description:  'Acronis uniquely combines backup, disaster recovery, AI-based malware protection, and endpoint management in one agent. The Cyber Protect platform is popular with MSPs worldwide.',
    website:      'https://acronis.com',
    founded:      '2003',
    hq:           'Schaffhausen, Switzerland',
    deployments:  ['On-Premises', 'Cloud', 'Hybrid'],
    platforms:    ['Windows', 'Mac', 'Linux', 'VMware', 'Hyper-V', 'Microsoft 365', 'iOS', 'Android'],
    strengths:    ['Unified backup + security', 'Anti-ransomware AI', 'MSP-friendly', 'Easy deployment'],
    badge:        'MSP Favorite',
    pricingModel: 'subscription',
    startingPrice: '₹580/mo',
    plans: [
      { name: 'Cyber Protect Essentials', price: '₹580/mo', target: 'SMB', features: ['Backup & recovery', 'Ransomware protection', '5 devices', '50 GB cloud'] },
      { name: 'Cyber Protect Advanced', price: '₹1,250/mo', target: 'SMB / Mid-market', features: ['Vulnerability assessment', 'Patch management', 'Remote desktop', '500 GB cloud'], popular: true },
      { name: 'Cyber Protect for MSPs', price: 'Per-device pricing', target: 'MSPs', features: ['Multi-tenant portal', 'White-label', 'Automated billing', 'All features'] },
    ],
  },
  {
    id:           'veeam',
    name:         'Veeam',
    slug:         'veeam',
    logo:         '🟢',
    tagline:      '#1 global leader in data protection & recovery',
    description:  'Veeam protects 450,000+ customers across virtual, physical, cloud, SaaS, and Kubernetes workloads. Known for its Instant VM Recovery, 3-2-1-1-0 rule enforcement, and tight VMware/Azure integration.',
    website:      'https://veeam.com',
    founded:      '2006',
    hq:           'Columbus, OH, USA',
    deployments:  ['On-Premises', 'Cloud', 'SaaS', 'Hybrid'],
    platforms:    ['VMware', 'Hyper-V', 'AWS', 'Azure', 'GCP', 'Kubernetes', 'Microsoft 365', 'Physical', 'NAS'],
    strengths:    ['Instant VM recovery', 'Kubernetes-native backup', 'SureBackup verification', 'Immutable storage'],
    badge:        'Market Leader',
    pricingModel: 'subscription',
    startingPrice: '₹2,490/mo',
    plans: [
      { name: 'Foundation', price: '₹2,490/mo', target: 'SMB', features: ['VM backup', 'Physical backup', 'Cloud storage', 'Basic monitoring'] },
      { name: 'Advanced', price: '₹4,150/mo', target: 'Mid-market', features: ['SaaS backup', 'Advanced analytics', 'Instant VM recovery', 'Orchestrated DR'], popular: true },
      { name: 'Premium', price: '₹6,640/mo', target: 'Enterprise', features: ['Kubernetes backup', 'AI threat detection', 'Immutable storage', '24/7 support'] },
    ],
  },
  {
    id:           'dhruva',
    name:         'Dhruva',
    slug:         'dhruva',
    logo:         '🇮🇳',
    tagline:      "India's trusted cloud backup and DR platform",
    description:  "Dhruva is an Indian cloud backup and disaster recovery platform built for Indian enterprises. Offers complete data sovereignty with Indian data centers, INR pricing, and local 24/7 support — ideal for BFSI, healthcare, and government.",
    website:      'https://dhruvacloud.com',
    founded:      '2012',
    hq:           'Mumbai, India',
    deployments:  ['Cloud', 'Hybrid'],
    platforms:    ['Windows', 'Linux', 'VMware', 'Physical Servers', 'NAS/SAN'],
    strengths:    ['India data sovereignty', 'INR pricing', 'BFSI/healthcare compliance', 'Local support'],
    badge:        'Made in India',
    pricingModel: 'subscription',
    startingPrice: '₹1,500/mo',
    plans: [
      { name: 'Starter', price: '₹1,500/mo', target: 'SMB', features: ['100 GB backup', 'File & folder', 'Indian data center', 'Email support'] },
      { name: 'Business', price: '₹4,500/mo', target: 'Mid-market', features: ['1 TB backup', 'Server backup', 'Disaster recovery', '24/7 support'], popular: true },
      { name: 'Enterprise', price: 'Contact Sales', target: 'Enterprise', features: ['Unlimited storage', 'Custom DR SLA', 'Dedicated account manager', 'VAPT compliance'] },
    ],
  },
  {
    id:           'veritas-opentext',
    name:         'Veritas / OpenText',
    slug:         'veritas-opentext',
    logo:         '🏢',
    tagline:      'Enterprise data management and information governance',
    description:  "Veritas, now part of OpenText, has been protecting enterprise data since 1989. NetBackup is trusted by 87% of Fortune 500 companies. The platform spans backup, recovery, eDiscovery, compliance, and information governance.",
    website:      'https://veritas.com',
    founded:      '1989',
    hq:           'Waterloo, Canada (OpenText HQ)',
    deployments:  ['On-Premises', 'Cloud', 'SaaS', 'Hybrid'],
    platforms:    ['VMware', 'Hyper-V', 'AWS', 'Azure', 'GCP', 'Oracle', 'SAP', 'Physical', 'NAS'],
    strengths:    ['Fortune 500 trusted', 'eDiscovery & compliance', 'Broad platform support', 'NetBackup scalability'],
    badge:        'Fortune 500 Choice',
    pricingModel: 'custom',
    startingPrice: 'Contact Sales',
    plans: [
      { name: 'NetBackup', price: 'Contact Sales', target: 'Enterprise', features: ['Backup & recovery', 'Deduplication', 'Cloud storage', 'Orchestrated recovery'] },
      { name: 'Backup Exec', price: 'Contact Sales', target: 'SMB', features: ['Simplified management', 'Physical & virtual', 'Cloud storage tiers', 'Simple licensing'], popular: true },
      { name: 'Alta Data Protection', price: 'Contact Sales', target: 'Enterprise', features: ['SaaS-based', 'Multi-cloud', 'Ransomware recovery', 'Governance & compliance'] },
    ],
  },
  {
    id:           'rubrik',
    name:         'Rubrik',
    slug:         'rubrik',
    logo:         '💎',
    tagline:      'Zero-trust data security and cyber recovery',
    description:  'Rubrik is a next-gen cyber recovery platform that combines cloud data management with zero-trust security. Its Security Cloud provides ransomware protection, sensitive data monitoring, and orchestrated cyber recovery — all from a single platform.',
    website:      'https://rubrik.com',
    founded:      '2014',
    hq:           'Palo Alto, CA, USA',
    deployments:  ['Cloud', 'SaaS', 'Hybrid', 'On-Premises'],
    platforms:    ['VMware', 'Hyper-V', 'AWS', 'Azure', 'GCP', 'Microsoft 365', 'Kubernetes', 'NAS', 'Physical'],
    strengths:    ['Zero-trust architecture', 'Ransomware recovery', 'Sensitive data discovery', 'Instant recovery'],
    badge:        'Cloud-Native Pioneer',
    pricingModel: 'subscription',
    startingPrice: 'Contact Sales',
    plans: [
      { name: 'Security Cloud', price: 'Contact Sales', target: 'Enterprise', features: ['Data observability', 'Threat hunting', 'Sensitive data monitoring', 'Ransomware investigation'] },
      { name: 'Data Protection', price: 'Contact Sales', target: 'Enterprise', features: ['Backup & recovery', 'Instant recovery', 'Cloud archive', 'Policy automation'], popular: true },
      { name: 'Cyber Recovery', price: 'Contact Sales', target: 'Enterprise', features: ['Isolated recovery environment', 'Orchestrated DR', 'Compliance', 'Full Security Cloud'] },
    ],
  },
]

/** Get a backup vendor by slug */
export const getBackupVendor = (slug: string) => BACKUP_VENDORS.find(v => v.slug === slug)
