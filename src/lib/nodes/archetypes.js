export const nodeArchetypes = {
  trigger: {
    id: 'trigger',
    title: 'Trigger',
    description: 'Starts a workflow from manual, schedule, or external initiation.',
    requiredQuestions: ['start_condition'],
    defaultableQuestions: ['labeling', 'schedule_defaults'],
  },
  source_fetch: {
    id: 'source_fetch',
    title: 'Source / Fetch',
    description: 'Loads or receives records from an upstream system or source node.',
    requiredQuestions: ['input_contract'],
    defaultableQuestions: ['pagination', 'retry_behavior', 'error_surface'],
  },
  transform: {
    id: 'transform',
    title: 'Transform',
    description: 'Transforms incoming data into a new structure or representation.',
    requiredQuestions: ['input_contract', 'transform_goal'],
    defaultableQuestions: ['error_behavior', 'pass_through_behavior'],
  },
  scoring_ranking: {
    id: 'scoring_ranking',
    title: 'Scoring / Ranking',
    description: 'Scores records against criteria and returns a ranked result.',
    requiredQuestions: ['criteria_fields', 'criteria_weights', 'criteria_direction'],
    defaultableQuestions: ['normalization', 'missing_data', 'tie_handling', 'output_shape', 'determinism', 'explainability'],
  },
  approval: {
    id: 'approval',
    title: 'Approval',
    description: 'Collects or enforces a human or policy approval decision.',
    requiredQuestions: ['decision_space'],
    defaultableQuestions: ['editable_fields', 'default_decision'],
  },
  branch: {
    id: 'branch',
    title: 'Branch',
    description: 'Routes workflow execution based on a condition.',
    requiredQuestions: ['branch_condition'],
    defaultableQuestions: ['default_route', 'comparison_behavior'],
  },
  output_delivery: {
    id: 'output_delivery',
    title: 'Output / Delivery',
    description: 'Returns, saves, or delivers output to a destination.',
    requiredQuestions: ['delivery_target_or_surface'],
    defaultableQuestions: ['formatting', 'retry_behavior', 'artifact_shape'],
  },
  ai_generation: {
    id: 'ai_generation',
    title: 'AI Generation',
    description: 'Uses an AI runtime to generate or edit structured or unstructured output.',
    requiredQuestions: ['generation_goal'],
    defaultableQuestions: ['output_mode', 'audience', 'schema', 'runtime_target'],
  },
  validation: {
    id: 'validation',
    title: 'Validation',
    description: 'Validates input records, links, or fields against rules.',
    requiredQuestions: ['validation_rules'],
    defaultableQuestions: ['failure_behavior', 'report_shape'],
  },
  aggregation: {
    id: 'aggregation',
    title: 'Aggregation',
    description: 'Combines multiple inputs or records into a summarized output.',
    requiredQuestions: ['aggregation_goal'],
    defaultableQuestions: ['grouping', 'rollup_fields', 'output_shape'],
  },
}

export function getNodeArchetype(archetypeId) {
  return nodeArchetypes[archetypeId] || null
}

export function listNodeArchetypes() {
  return Object.values(nodeArchetypes)
}
