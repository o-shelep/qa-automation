export const errorSchema = {
  type: 'object',
  properties: {
    code: { type: 'string', pattern: '^[A-Z_]+$' },
  },
  required: ['code'],
  additionalProperties: false,
} as const;
