import { z } from 'zod'
import { executeNode } from '../runtime/executors'

const scheduleTriggerConfigSchema = z.object({
  triggerMode: z.string().optional(),
  scheduleMode: z.enum(['cron', 'every', 'once']),
  cronExpression: z.string().optional(),
  every: z.string().optional(),
  everyMinutes: z.number().optional(),
  runAt: z.string().optional(),
  timezone: z.string().min(1),
  enabled: z.boolean().optional(),
  triggerLabel: z.string().optional(),
  scheduleSummary: z.string().optional(),
  cronJobId: z.string().nullable().optional(),
  scheduleBindingId: z.string().nullable().optional(),
}).superRefine((config, ctx) => {
  if (config.scheduleMode === 'cron' && !config.cronExpression) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'cronExpression is required for cron schedule mode' })
  }
  if (config.scheduleMode === 'every' && !config.every && !config.everyMinutes) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'every or everyMinutes is required for every schedule mode' })
  }
  if (config.scheduleMode === 'once' && !config.runAt) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'runAt is required for once schedule mode' })
  }
})

const promptConfigSchema = z.object({
  runtimeTarget: z.string().min(1),
  inputMapping: z.record(z.string(), z.any()).optional(),
  outputMode: z.string().optional(),
  expectedSchema: z.record(z.string(), z.any()).optional(),
  audience: z.string().optional(),
  theme: z.string().optional(),
})

const googleDriveSaveFileConfigSchema = z.object({
  targetAccount: z.string().optional(),
  accountId: z.string().optional(),
  destination: z.string().min(1),
  fileNameTemplate: z.string().min(1),
  contentMapping: z.string().optional(),
  contentType: z.string().min(1).optional(),
})

const downloadFileConfigSchema = z.object({
  fileNameTemplate: z.string().min(1),
  contentMapping: z.string().optional(),
  contentType: z.string().min(1).optional(),
})

const sendMessageConfigSchema = z.object({
  destinationType: z.string().optional(),
  destination: z.string().min(1),
})

const returnResultConfigSchema = z.object({
  visibleInApp: z.boolean().optional(),
  displayMode: z.string().optional(),
})

export const nodeDefinitions = {
  'trigger.schedule': {
    toolId: 'trigger.schedule',
    title: 'Schedule Trigger',
    description: 'Start a workflow on a real schedule.',
    nodeType: 'trigger',
    toolKind: 'system',
    defaultLabel: 'Schedule Trigger',
    defaultConfig: {
      triggerMode: 'schedule',
      scheduleMode: 'cron',
      cronExpression: '0 7 * * 1-5',
      timezone: 'America/Los_Angeles',
      enabled: true,
      triggerLabel: 'Scheduled workflow',
      scheduleSummary: 'Every weekday at 7:00 AM',
      cronJobId: null,
      scheduleBindingId: null,
    },
    configSchema: scheduleTriggerConfigSchema,
    editorFields: [
      { key: 'scheduleMode', label: 'Mode', type: 'select', required: true },
      { key: 'cronExpression', label: 'Cron', type: 'text' },
      { key: 'every', label: 'Every', type: 'text' },
      { key: 'runAt', label: 'Run At', type: 'text' },
      { key: 'timezone', label: 'Timezone', type: 'text', required: true },
      { key: 'enabled', label: 'Enabled', type: 'boolean' },
      { key: 'triggerLabel', label: 'Trigger Label', type: 'text' },
    ],
    organizer: { ready: true, visibility: 'live', reason: 'Reusable schedule primitive' },
    maturity: 'fallback-only',
    executor: executeNode,
  },
  'ai.prompt': {
    toolId: 'ai.prompt',
    title: 'Prompt',
    description: 'Run a prompt and return text output.',
    nodeType: 'tool',
    toolKind: 'openclaw',
    defaultLabel: 'Prompt',
    defaultConfig: { runtimeTarget: 'daedalus' },
    configSchema: promptConfigSchema,
    editorFields: [
      { key: 'runtimeTarget', label: 'Runtime Target', type: 'text', required: true },
      { key: 'outputMode', label: 'Output Mode', type: 'text' },
    ],
    organizer: { ready: true, visibility: 'live', reason: 'Core reusable AI primitive' },
    maturity: 'fallback-only',
    executor: executeNode,
  },
  'ai.prompt.edit': {
    toolId: 'ai.prompt.edit',
    title: 'Prompt',
    description: 'Run an editing prompt and return text output.',
    nodeType: 'tool',
    toolKind: 'openclaw',
    defaultLabel: 'Prompt',
    defaultConfig: { runtimeTarget: 'daedalus' },
    configSchema: promptConfigSchema,
    editorFields: [
      { key: 'runtimeTarget', label: 'Runtime Target', type: 'text', required: true },
      { key: 'outputMode', label: 'Output Mode', type: 'text' },
    ],
    organizer: { ready: true, visibility: 'live', reason: 'Core reusable AI primitive' },
    maturity: 'fallback-only',
    executor: executeNode,
  },
  'ai.structured_prompt': {
    toolId: 'ai.structured_prompt',
    title: 'Structured Prompt',
    description: 'Run a prompt and return structured output.',
    nodeType: 'tool',
    toolKind: 'openclaw',
    defaultLabel: 'Structured Prompt',
    defaultConfig: { runtimeTarget: 'daedalus' },
    configSchema: promptConfigSchema,
    editorFields: [
      { key: 'runtimeTarget', label: 'Runtime Target', type: 'text', required: true },
      { key: 'expectedSchema', label: 'Expected Schema', type: 'schema' },
    ],
    organizer: { ready: true, visibility: 'live', reason: 'Core reusable AI primitive' },
    maturity: 'fallback-only',
    executor: executeNode,
  },
  'integrations.google_drive.save_file': {
    toolId: 'integrations.google_drive.save_file',
    title: 'Google Drive Save File',
    description: 'Save generated content to Google Drive.',
    nodeType: 'output',
    toolKind: 'integration',
    defaultLabel: 'Google Drive Save File',
    defaultConfig: {
      destination: 'Workflow Studio',
      fileNameTemplate: '{{title}}.txt',
      contentType: 'text/plain',
    },
    configSchema: googleDriveSaveFileConfigSchema,
    editorFields: [
      { key: 'destination', label: 'Destination', type: 'text', required: true },
      { key: 'fileNameTemplate', label: 'File Name Template', type: 'text', required: true },
      { key: 'accountId', label: 'Account', type: 'select' },
    ],
    organizer: { ready: true, visibility: 'live', reason: 'Useful reusable integration output' },
    maturity: 'fallback-only',
    executor: executeNode,
  },
  'outputs.download_file': {
    toolId: 'outputs.download_file',
    title: 'Download File',
    description: 'Prepare a downloadable artifact.',
    nodeType: 'output',
    toolKind: 'ui',
    defaultLabel: 'Download File',
    defaultConfig: {
      fileNameTemplate: '{{title}}.txt',
      contentType: 'text/plain',
    },
    configSchema: downloadFileConfigSchema,
    editorFields: [
      { key: 'fileNameTemplate', label: 'File Name Template', type: 'text', required: true },
      { key: 'contentType', label: 'Content Type', type: 'text' },
    ],
    organizer: { ready: true, visibility: 'live', reason: 'Reusable terminal artifact output' },
    maturity: 'real',
    executor: executeNode,
  },
  'outputs.send_message': {
    toolId: 'outputs.send_message',
    title: 'Send Message',
    description: 'Deliver content to a configured destination.',
    nodeType: 'output',
    toolKind: 'delivery',
    defaultLabel: 'Send Message',
    defaultConfig: {
      destinationType: 'telegram-dm',
      destination: 'Unconfigured destination',
    },
    configSchema: sendMessageConfigSchema,
    editorFields: [
      { key: 'destinationType', label: 'Destination Type', type: 'text' },
      { key: 'destination', label: 'Destination', type: 'text', required: true },
    ],
    organizer: { ready: true, visibility: 'live', reason: 'Reusable delivery node candidate' },
    maturity: 'scaffold',
    executor: executeNode,
  },
  'outputs.return_result': {
    toolId: 'outputs.return_result',
    title: 'Return Result',
    description: 'Return a final in-app result.',
    nodeType: 'output',
    toolKind: 'ui',
    defaultLabel: 'Return Result',
    defaultConfig: { visibleInApp: true },
    configSchema: returnResultConfigSchema,
    editorFields: [
      { key: 'visibleInApp', label: 'Visible In App', type: 'boolean' },
      { key: 'displayMode', label: 'Display Mode', type: 'text' },
    ],
    organizer: { ready: true, visibility: 'live', reason: 'Reusable terminal UI node' },
    maturity: 'fallback-only',
    executor: executeNode,
  },
}
