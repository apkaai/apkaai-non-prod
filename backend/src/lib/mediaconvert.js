/**
 * mediaconvert.js — MediaConvert job orchestration
 *
 * Starts an AWS Elemental MediaConvert job to transcode a source video
 * into 360p / 480p / 720p / 1080p HLS outputs.
 *
 * Environment variables:
 *   MEDIACONVERT_ENDPOINT  — account-specific endpoint (required)
 *   MEDIACONVERT_ROLE_ARN  — IAM role ARN for MediaConvert (required)
 *   VIDEO_OUTPUT_BUCKET    — output S3 bucket name
 *   AWS_REGION             — default ap-south-1
 */
const { MediaConvertClient, CreateJobCommand, GetJobCommand } = require('@aws-sdk/client-mediaconvert')

const REGION   = process.env.AWS_REGION             || 'ap-south-1'
const ENDPOINT = process.env.MEDIACONVERT_ENDPOINT  || ''
const ROLE_ARN = process.env.MEDIACONVERT_ROLE_ARN  || ''
const OUTPUT_BUCKET = process.env.VIDEO_OUTPUT_BUCKET || 'ci-video-new'

function getClient() {
  if (!ENDPOINT) {
    throw new Error('MEDIACONVERT_ENDPOINT is not configured. Add it to your .env file.')
  }
  return new MediaConvertClient({
    region:   REGION,
    endpoint: ENDPOINT,
  })
}

// Resolution presets — each output is capped to source dimensions
const RESOLUTIONS = [
  { name: '360p',  width: 640,  height: 360,  bitrate: 800000,  audioBitrate: 96000  },
  { name: '480p',  width: 854,  height: 480,  bitrate: 1500000, audioBitrate: 128000 },
  { name: '720p',  width: 1280, height: 720,  bitrate: 4000000, audioBitrate: 192000 },
  { name: '1080p', width: 1920, height: 1080, bitrate: 8000000, audioBitrate: 256000 },
]

function buildOutputGroup(outputPrefix, videoId) {
  return {
    Name: 'ApkaAI Video Outputs',
    OutputGroupSettings: {
      Type: 'FILE_GROUP_SETTINGS',
      FileGroupSettings: {
        Destination: `s3://${OUTPUT_BUCKET}/${outputPrefix}`,
      },
    },
    Outputs: RESOLUTIONS.map(res => ({
      NameModifier: `_${res.name}`,
      ContainerSettings: {
        Container: 'MP4',
        Mp4Settings: { CslgAtom: 'INCLUDE', FreeSpaceBox: 'EXCLUDE', MoovPlacement: 'PROGRESSIVE_DOWNLOAD' },
      },
      VideoDescription: {
        Width:  res.width,
        Height: res.height,
        ScalingBehavior: 'DEFAULT',
        TimecodeInsertion: 'DISABLED',
        AntiAlias: 'ENABLED',
        Sharpness: 50,
        CodecSettings: {
          Codec: 'H_264',
          H264Settings: {
            InterlaceMode: 'PROGRESSIVE',
            NumberReferenceFrames: 3,
            Syntax: 'DEFAULT',
            Softness: 0,
            GopClosedCadence: 1,
            GopSize: 90,
            Slices: 1,
            GopBReference: 'DISABLED',
            MaxBitrate: res.bitrate,
            RateControlMode: 'QVBR',
            QvbrSettings: { QvbrQualityLevel: 8 },
            CodecProfile: 'HIGH',
            Telecine: 'NONE',
            MinIInterval: 0,
            AdaptiveQuantization: 'HIGHER',
            CodecLevel: 'AUTO',
            FieldEncoding: 'PAFF',
            SceneChangeDetect: 'ENABLED',
            QualityTuningLevel: 'SINGLE_PASS_HQ',
            FramerateControl: 'INITIALIZE_FROM_SOURCE',
            NumberBFramesBetweenReferenceFrames: 2,
          },
        },
      },
      AudioDescriptions: [{
        AudioTypeControl: 'FOLLOW_INPUT',
        CodecSettings: {
          Codec: 'AAC',
          AacSettings: {
            AudioDescriptionBroadcasterMix: 'NORMAL',
            Bitrate: res.audioBitrate,
            RateControlMode: 'CBR',
            CodecProfile: 'LC',
            CodingMode: 'CODING_MODE_2_0',
            RawFormat: 'NONE',
            SampleRate: 48000,
            Specification: 'MPEG4',
          },
        },
      }],
    })),
  }
}

/**
 * Start a MediaConvert transcoding job.
 * @param {object} params
 * @param {string} params.videoId
 * @param {string} params.inputBucket
 * @param {string} params.inputKey
 * @param {string} params.outputBucket  (ignored — uses OUTPUT_BUCKET env var)
 * @param {string} params.outputPrefix  e.g. "processed/{videoId}/"
 * @returns {Promise<string>} MediaConvert job ID
 */
async function startMediaConvertJob({ videoId, inputBucket, inputKey, outputPrefix }) {
  if (!ENDPOINT || !ROLE_ARN) {
    throw new Error(
      'MediaConvert not fully configured. ' +
      'Set MEDIACONVERT_ENDPOINT and MEDIACONVERT_ROLE_ARN in your .env file.'
    )
  }

  const client = getClient()
  const inputS3 = `s3://${inputBucket}/${inputKey}`

  const jobSettings = {
    Inputs: [{
      AudioSelectors:  { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
      VideoSelector:   { ColorSpace: 'FOLLOW', Rotate: 'AUTO' },
      FilterEnable:    'AUTO',
      PsiControl:      'USE_PSI',
      FilterStrength:  0,
      DeblockFilter:   'DISABLED',
      DenoiseFilter:   'DISABLED',
      TimecodeSource:  'EMBEDDED',
      FileInput:       inputS3,
    }],
    OutputGroups: [buildOutputGroup(outputPrefix, videoId)],
    TimecodeConfig: { Source: 'EMBEDDED' },
    AdAvailOffset: 0,
  }

  const command = new CreateJobCommand({
    Role:           ROLE_ARN,
    Settings:       jobSettings,
    StatusUpdateInterval: 'SECONDS_60',
    UserMetadata: {
      videoId,
      inputKey,
      source: 'apkaai',
    },
  })

  const resp = await client.send(command)
  const jobId = resp.Job?.Id
  if (!jobId) throw new Error('MediaConvert did not return a job ID')
  console.log(`[MediaConvert] Started job ${jobId} for video ${videoId}`)
  return jobId
}

/**
 * Check the status of an existing MediaConvert job.
 * @param {string} jobId
 * @returns {Promise<{status: string, jobId: string}>}
 */
async function getJobStatus(jobId) {
  const client  = getClient()
  const command = new GetJobCommand({ Id: jobId })
  const resp    = await client.send(command)
  return {
    jobId,
    status:      resp.Job?.Status,
    createdAt:   resp.Job?.CreatedAt,
    finishedAt:  resp.Job?.FinishedAt,
    errorMessage: resp.Job?.ErrorMessage,
  }
}

module.exports = { startMediaConvertJob, getJobStatus, RESOLUTIONS }
