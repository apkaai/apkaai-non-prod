/**
 * sagemaker.js — ApkaAI SageMaker Dashboard API
 *
 * Routes:
 *   GET  /api/sagemaker/status              → AWS connectivity check
 *
 *   Training Jobs:
 *   GET  /api/sagemaker/training-jobs       → list training jobs
 *   GET  /api/sagemaker/training-jobs/:name → describe single job
 *   POST /api/sagemaker/training-jobs       → create training job
 *   POST /api/sagemaker/training-jobs/:name/stop → stop job
 *
 *   Endpoints (Inference):
 *   GET  /api/sagemaker/endpoints           → list endpoints
 *   GET  /api/sagemaker/endpoints/:name     → describe endpoint
 *   POST /api/sagemaker/endpoints           → create endpoint
 *   DELETE /api/sagemaker/endpoints/:name   → delete endpoint
 *
 *   Notebook Instances:
 *   GET  /api/sagemaker/notebooks           → list notebook instances
 *   POST /api/sagemaker/notebooks           → create notebook
 *   POST /api/sagemaker/notebooks/:name/start → start notebook
 *   POST /api/sagemaker/notebooks/:name/stop  → stop notebook
 *   DELETE /api/sagemaker/notebooks/:name     → delete notebook
 *
 *   Models:
 *   GET  /api/sagemaker/models              → list models
 *   POST /api/sagemaker/models              → create model
 *   DELETE /api/sagemaker/models/:name      → delete model
 *
 *   Metrics:
 *   GET  /api/sagemaker/metrics/:jobName    → get training metrics from CloudWatch
 *
 *   Cost estimate:
 *   POST /api/sagemaker/cost-estimate       → estimate cost for instance type
 */

'use strict'
const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')

// ── AWS SDK v3 — lazy-load so missing dep doesn't crash the whole server ──────
let SageMakerClient, ListTrainingJobsCommand, DescribeTrainingJobCommand,
    CreateTrainingJobCommand, StopTrainingJobCommand,
    ListEndpointsCommand, DescribeEndpointCommand, CreateEndpointCommand,
    CreateEndpointConfigCommand, DeleteEndpointCommand,
    ListNotebookInstancesCommand, DescribeNotebookInstanceCommand,
    CreateNotebookInstanceCommand, StartNotebookInstanceCommand,
    StopNotebookInstanceCommand, DeleteNotebookInstanceCommand,
    ListModelsCommand, CreateModelCommand, DeleteModelCommand

let CloudWatchClient, GetMetricDataCommand

try {
  const sm = require('@aws-sdk/client-sagemaker')
  SageMakerClient                  = sm.SageMakerClient
  ListTrainingJobsCommand          = sm.ListTrainingJobsCommand
  DescribeTrainingJobCommand       = sm.DescribeTrainingJobCommand
  CreateTrainingJobCommand         = sm.CreateTrainingJobCommand
  StopTrainingJobCommand           = sm.StopTrainingJobCommand
  ListEndpointsCommand             = sm.ListEndpointsCommand
  DescribeEndpointCommand          = sm.DescribeEndpointCommand
  CreateEndpointCommand            = sm.CreateEndpointCommand
  CreateEndpointConfigCommand      = sm.CreateEndpointConfigCommand
  DeleteEndpointCommand            = sm.DeleteEndpointCommand
  ListNotebookInstancesCommand     = sm.ListNotebookInstancesCommand
  DescribeNotebookInstanceCommand  = sm.DescribeNotebookInstanceCommand
  CreateNotebookInstanceCommand    = sm.CreateNotebookInstanceCommand
  StartNotebookInstanceCommand     = sm.StartNotebookInstanceCommand
  StopNotebookInstanceCommand      = sm.StopNotebookInstanceCommand
  DeleteNotebookInstanceCommand    = sm.DeleteNotebookInstanceCommand
  ListModelsCommand                = sm.ListModelsCommand
  CreateModelCommand               = sm.CreateModelCommand
  DeleteModelCommand               = sm.DeleteModelCommand
} catch (e) {
  console.warn('[SageMaker] @aws-sdk/client-sagemaker not available:', e.message)
}

try {
  const cw = require('@aws-sdk/client-cloudwatch')
  CloudWatchClient       = cw.CloudWatchClient
  GetMetricDataCommand   = cw.GetMetricDataCommand
} catch (e) {
  console.warn('[SageMaker] @aws-sdk/client-cloudwatch not available:', e.message)
}

// ── Config ────────────────────────────────────────────────────────────────────
const REGION          = process.env.AWS_REGION               || 'ap-south-1'
const SAGEMAKER_ROLE  = process.env.SAGEMAKER_EXECUTION_ROLE || ''
const DEFAULT_BUCKET  = process.env.SAGEMAKER_S3_BUCKET      || ''

// ── Client factories ──────────────────────────────────────────────────────────
function getSMClient() {
  if (!SageMakerClient) throw new Error('@aws-sdk/client-sagemaker not installed. Run: npm install @aws-sdk/client-sagemaker')
  return new SageMakerClient({ region: REGION })
}
function getCWClient() {
  if (!CloudWatchClient) throw new Error('@aws-sdk/client-cloudwatch not installed')
  return new CloudWatchClient({ region: REGION })
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.')
    const secret   = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch { return null }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const decoded = verifyToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = decoded
  next()
}

function adminOnly(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const { query } = require('../lib/db')
      const r = await query('SELECT role FROM users WHERE user_id = $1', [req.user.userId])
      if (r.rows[0]?.role === 'admin') return next()
      return res.status(403).json({ error: 'Admin access required' })
    } catch (err) { next(err) }
  })
}

// ── Helper: handle AWS errors ─────────────────────────────────────────────────
function awsError(err, res) {
  console.error('[SageMaker API]', err.message)
  const status = err.$metadata?.httpStatusCode || 500
  return res.status(status).json({
    error: err.message,
    code:  err.name || 'AWSError',
    hint:  !SageMakerClient
      ? 'Install the AWS SDK: npm install @aws-sdk/client-sagemaker'
      : (!process.env.AWS_REGION ? 'Set AWS_REGION in .env' : undefined),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', requireAuth, async (req, res) => {
  const status = {
    sdkAvailable:      !!SageMakerClient,
    region:            REGION,
    roleConfigured:    !!SAGEMAKER_ROLE,
    bucketConfigured:  !!DEFAULT_BUCKET,
    cwAvailable:       !!CloudWatchClient,
    missing:           [],
  }
  if (!SageMakerClient)  status.missing.push('@aws-sdk/client-sagemaker (run: npm install @aws-sdk/client-sagemaker)')
  if (!SAGEMAKER_ROLE)   status.missing.push('SAGEMAKER_EXECUTION_ROLE env var')
  if (!DEFAULT_BUCKET)   status.missing.push('SAGEMAKER_S3_BUCKET env var')
  if (!CloudWatchClient) status.missing.push('@aws-sdk/client-cloudwatch')

  // Try a lightweight AWS call to verify credentials
  if (SageMakerClient) {
    try {
      const sm = getSMClient()
      await sm.send(new ListTrainingJobsCommand({ MaxResults: 1 }))
      status.awsConnected = true
    } catch (e) {
      status.awsConnected = false
      status.awsError = e.message
    }
  }
  res.json(status)
})

// ─────────────────────────────────────────────────────────────────────────────
// TRAINING JOBS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/training-jobs', requireAuth, async (req, res) => {
  try {
    const { maxResults = 20, statusFilter, nameContains, nextToken } = req.query
    const params = { MaxResults: Math.min(Number(maxResults), 100) }
    if (statusFilter)  params.StatusEquals = statusFilter
    if (nameContains)  params.NameContains = nameContains
    if (nextToken)     params.NextToken    = nextToken

    const sm   = getSMClient()
    const data = await sm.send(new ListTrainingJobsCommand(params))
    res.json({
      jobs:      data.TrainingJobSummaries || [],
      nextToken: data.NextToken || null,
    })
  } catch (err) { awsError(err, res) }
})

router.get('/training-jobs/:name', requireAuth, async (req, res) => {
  try {
    const sm   = getSMClient()
    const data = await sm.send(new DescribeTrainingJobCommand({ TrainingJobName: req.params.name }))
    res.json(data)
  } catch (err) { awsError(err, res) }
})

router.post('/training-jobs', adminOnly, async (req, res) => {
  try {
    const {
      name, algorithmImage, instanceType = 'ml.m5.xlarge', instanceCount = 1,
      volumeSizeGB = 50, maxRuntimeSeconds = 86400,
      hyperparameters = {}, inputChannels = [], outputPath,
      roleArn,
    } = req.body

    if (!name)           return res.status(400).json({ error: 'name is required' })
    if (!algorithmImage) return res.status(400).json({ error: 'algorithmImage is required' })

    const role = roleArn || SAGEMAKER_ROLE
    if (!role) return res.status(400).json({ error: 'SageMaker execution role not configured. Set SAGEMAKER_EXECUTION_ROLE in .env' })

    const output = outputPath || (DEFAULT_BUCKET ? `s3://${DEFAULT_BUCKET}/training-output/${name}/` : null)
    if (!output) return res.status(400).json({ error: 'outputPath or SAGEMAKER_S3_BUCKET required' })

    const params = {
      TrainingJobName: name,
      RoleArn:         role,
      AlgorithmSpecification: {
        TrainingImage:     algorithmImage,
        TrainingInputMode: 'File',
      },
      ResourceConfig: {
        InstanceType:   instanceType,
        InstanceCount:  instanceCount,
        VolumeSizeInGB: volumeSizeGB,
      },
      StoppingCondition: { MaxRuntimeInSeconds: maxRuntimeSeconds },
      OutputDataConfig:  { S3OutputPath: output },
      HyperParameters:   hyperparameters,
    }

    if (inputChannels.length > 0) {
      params.InputDataConfig = inputChannels.map(ch => ({
        ChannelName:    ch.name,
        DataSource:     { S3DataSource: { S3Uri: ch.s3Uri, S3DataType: 'S3Prefix', S3DataDistributionType: 'FullyReplicated' } },
        ContentType:    ch.contentType || 'text/csv',
        CompressionType:'None',
      }))
    }

    const sm   = getSMClient()
    const data = await sm.send(new CreateTrainingJobCommand(params))
    res.status(201).json({ trainingJobArn: data.TrainingJobArn, name })
  } catch (err) { awsError(err, res) }
})

router.post('/training-jobs/:name/stop', adminOnly, async (req, res) => {
  try {
    const sm = getSMClient()
    await sm.send(new StopTrainingJobCommand({ TrainingJobName: req.params.name }))
    res.json({ success: true, name: req.params.name })
  } catch (err) { awsError(err, res) }
})

// ─────────────────────────────────────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/endpoints', requireAuth, async (req, res) => {
  try {
    const { maxResults = 20, statusFilter, nextToken } = req.query
    const params = { MaxResults: Math.min(Number(maxResults), 100) }
    if (statusFilter) params.StatusEquals = statusFilter
    if (nextToken)    params.NextToken    = nextToken

    const sm   = getSMClient()
    const data = await sm.send(new ListEndpointsCommand(params))
    res.json({ endpoints: data.Endpoints || [], nextToken: data.NextToken || null })
  } catch (err) { awsError(err, res) }
})

router.get('/endpoints/:name', requireAuth, async (req, res) => {
  try {
    const sm   = getSMClient()
    const data = await sm.send(new DescribeEndpointCommand({ EndpointName: req.params.name }))
    res.json(data)
  } catch (err) { awsError(err, res) }
})

router.post('/endpoints', adminOnly, async (req, res) => {
  try {
    const { name, modelName, instanceType = 'ml.t2.medium', initialInstanceCount = 1, roleArn } = req.body
    if (!name)      return res.status(400).json({ error: 'name is required' })
    if (!modelName) return res.status(400).json({ error: 'modelName is required' })

    const sm = getSMClient()

    // 1. Create endpoint config
    const configName = `${name}-config-${Date.now()}`
    await sm.send(new CreateEndpointConfigCommand({
      EndpointConfigName: configName,
      ProductionVariants: [{
        VariantName:          'AllTraffic',
        ModelName:            modelName,
        InstanceType:         instanceType,
        InitialInstanceCount: initialInstanceCount,
        InitialVariantWeight: 1,
      }],
    }))

    // 2. Create endpoint
    const data = await sm.send(new CreateEndpointCommand({
      EndpointName:       name,
      EndpointConfigName: configName,
    }))

    res.status(201).json({ endpointArn: data.EndpointArn, name, configName })
  } catch (err) { awsError(err, res) }
})

router.delete('/endpoints/:name', adminOnly, async (req, res) => {
  try {
    const sm = getSMClient()
    await sm.send(new DeleteEndpointCommand({ EndpointName: req.params.name }))
    res.json({ success: true, name: req.params.name })
  } catch (err) { awsError(err, res) }
})

// ─────────────────────────────────────────────────────────────────────────────
// NOTEBOOK INSTANCES
// ─────────────────────────────────────────────────────────────────────────────
router.get('/notebooks', requireAuth, async (req, res) => {
  try {
    const { maxResults = 20, statusFilter, nextToken } = req.query
    const params = { MaxResults: Math.min(Number(maxResults), 100) }
    if (statusFilter) params.StatusEquals = statusFilter
    if (nextToken)    params.NextToken    = nextToken

    const sm   = getSMClient()
    const data = await sm.send(new ListNotebookInstancesCommand(params))
    res.json({ notebooks: data.NotebookInstances || [], nextToken: data.NextToken || null })
  } catch (err) { awsError(err, res) }
})

router.post('/notebooks', adminOnly, async (req, res) => {
  try {
    const {
      name, instanceType = 'ml.t3.medium', volumeSizeGB = 5,
      roleArn, defaultRepoUrl,
    } = req.body
    if (!name) return res.status(400).json({ error: 'name is required' })

    const role = roleArn || SAGEMAKER_ROLE
    if (!role) return res.status(400).json({ error: 'SAGEMAKER_EXECUTION_ROLE not configured' })

    const params = {
      NotebookInstanceName: name,
      InstanceType:         instanceType,
      RoleArn:              role,
      VolumeSizeInGB:       volumeSizeGB,
    }
    if (defaultRepoUrl) params.DefaultCodeRepository = defaultRepoUrl

    const sm   = getSMClient()
    const data = await sm.send(new CreateNotebookInstanceCommand(params))
    res.status(201).json({ notebookArn: data.NotebookInstanceArn, name })
  } catch (err) { awsError(err, res) }
})

router.post('/notebooks/:name/start', adminOnly, async (req, res) => {
  try {
    const sm = getSMClient()
    await sm.send(new StartNotebookInstanceCommand({ NotebookInstanceName: req.params.name }))
    res.json({ success: true, name: req.params.name, action: 'start' })
  } catch (err) { awsError(err, res) }
})

router.post('/notebooks/:name/stop', adminOnly, async (req, res) => {
  try {
    const sm = getSMClient()
    await sm.send(new StopNotebookInstanceCommand({ NotebookInstanceName: req.params.name }))
    res.json({ success: true, name: req.params.name, action: 'stop' })
  } catch (err) { awsError(err, res) }
})

router.delete('/notebooks/:name', adminOnly, async (req, res) => {
  try {
    const sm = getSMClient()
    await sm.send(new DeleteNotebookInstanceCommand({ NotebookInstanceName: req.params.name }))
    res.json({ success: true, name: req.params.name })
  } catch (err) { awsError(err, res) }
})

// ─────────────────────────────────────────────────────────────────────────────
// MODELS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/models', requireAuth, async (req, res) => {
  try {
    const { maxResults = 20, nextToken } = req.query
    const sm   = getSMClient()
    const data = await sm.send(new ListModelsCommand({
      MaxResults: Math.min(Number(maxResults), 100),
      ...(nextToken && { NextToken: nextToken }),
    }))
    res.json({ models: data.Models || [], nextToken: data.NextToken || null })
  } catch (err) { awsError(err, res) }
})

router.post('/models', adminOnly, async (req, res) => {
  try {
    const { name, imageUri, modelDataUrl, roleArn } = req.body
    if (!name)     return res.status(400).json({ error: 'name is required' })
    if (!imageUri) return res.status(400).json({ error: 'imageUri is required' })

    const role = roleArn || SAGEMAKER_ROLE
    if (!role) return res.status(400).json({ error: 'SAGEMAKER_EXECUTION_ROLE not configured' })

    const sm   = getSMClient()
    const data = await sm.send(new CreateModelCommand({
      ModelName:        name,
      ExecutionRoleArn: role,
      PrimaryContainer: {
        Image:        imageUri,
        ...(modelDataUrl && { ModelDataUrl: modelDataUrl }),
      },
    }))
    res.status(201).json({ modelArn: data.ModelArn, name })
  } catch (err) { awsError(err, res) }
})

router.delete('/models/:name', adminOnly, async (req, res) => {
  try {
    const sm = getSMClient()
    await sm.send(new DeleteModelCommand({ ModelName: req.params.name }))
    res.json({ success: true, name: req.params.name })
  } catch (err) { awsError(err, res) }
})

// ─────────────────────────────────────────────────────────────────────────────
// METRICS (from CloudWatch)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/metrics/:jobName', requireAuth, async (req, res) => {
  try {
    const { jobName } = req.params
    const { hours = 24 } = req.query

    const cw      = getCWClient()
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - Number(hours) * 3600 * 1000)

    const metricNames = ['train:loss', 'validation:loss', 'train:accuracy', 'validation:accuracy']
    const queries = metricNames.map((metric, i) => ({
      Id:         `m${i}`,
      Label:      metric,
      MetricStat: {
        Metric: {
          Namespace:  '/aws/sagemaker/TrainingJobs',
          MetricName: metric,
          Dimensions: [{ Name: 'TrainingJobName', Value: jobName }],
        },
        Period: 60,
        Stat:   'Average',
      },
    }))

    const data = await cw.send(new GetMetricDataCommand({
      MetricDataQueries: queries,
      StartTime:         startTime,
      EndTime:           endTime,
    }))

    const metrics = (data.MetricDataResults || []).map(r => ({
      name:       r.Label,
      timestamps: r.Timestamps?.map(t => t.toISOString()) || [],
      values:     r.Values || [],
    })).filter(m => m.values.length > 0)

    res.json({ jobName, metrics, startTime, endTime })
  } catch (err) { awsError(err, res) }
})

// ─────────────────────────────────────────────────────────────────────────────
// COST ESTIMATE
// ─────────────────────────────────────────────────────────────────────────────

// Approximate on-demand prices in USD/hr (ap-south-1) — June 2026
const INSTANCE_PRICES = {
  'ml.t3.medium':   0.056, 'ml.t3.large':    0.110, 'ml.t3.xlarge':   0.230,
  'ml.t2.medium':   0.056, 'ml.t2.large':    0.110, 'ml.t2.xlarge':   0.230,
  'ml.m5.large':    0.115, 'ml.m5.xlarge':   0.230, 'ml.m5.2xlarge':  0.461,
  'ml.m5.4xlarge':  0.922, 'ml.m5.12xlarge': 2.765, 'ml.m5.24xlarge': 5.530,
  'ml.c5.xlarge':   0.204, 'ml.c5.2xlarge':  0.408, 'ml.c5.4xlarge':  0.816,
  'ml.c5.9xlarge':  1.836, 'ml.c5.18xlarge': 3.672,
  'ml.p2.xlarge':   1.125, 'ml.p2.8xlarge':  9.000, 'ml.p2.16xlarge': 18.000,
  'ml.p3.2xlarge':  3.825, 'ml.p3.8xlarge':  15.300,'ml.p3.16xlarge': 30.600,
  'ml.p4d.24xlarge':32.770,
  'ml.g4dn.xlarge': 0.736, 'ml.g4dn.2xlarge':1.210, 'ml.g4dn.4xlarge':2.264,
  'ml.g4dn.8xlarge':4.352, 'ml.g4dn.12xlarge':5.952,'ml.g4dn.16xlarge':8.704,
  'ml.inf1.xlarge': 0.297, 'ml.inf1.2xlarge': 0.594,'ml.inf1.6xlarge': 1.782,
}

router.post('/cost-estimate', requireAuth, (req, res) => {
  const { instanceType, instanceCount = 1, durationHours = 1, type = 'training' } = req.body
  if (!instanceType) return res.status(400).json({ error: 'instanceType is required' })

  const pricePerHr = INSTANCE_PRICES[instanceType]
  if (!pricePerHr) {
    return res.json({
      instanceType,
      warning: 'Price not found for this instance type. Check AWS pricing page.',
      availableTypes: Object.keys(INSTANCE_PRICES),
    })
  }

  const usdTotal    = pricePerHr * instanceCount * durationHours
  const inrTotal    = usdTotal * 83.5   // approximate INR conversion
  const inrPerHour  = pricePerHr * instanceCount * 83.5

  res.json({
    instanceType,
    instanceCount,
    durationHours,
    type,
    pricePerHrUSD:   pricePerHr.toFixed(4),
    pricePerHrINR:   inrPerHour.toFixed(2),
    totalUSD:        usdTotal.toFixed(4),
    totalINR:        inrTotal.toFixed(2),
    note:            'Approximate prices. Check AWS console for exact billing.',
  })
})

module.exports = router
