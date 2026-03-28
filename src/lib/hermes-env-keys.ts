/**
 * Hermes Agent environment variable key suggestions.
 * Extracted from the official hermes-agent .env.example.
 * Used by EnvKeyCombobox to provide autocomplete suggestions.
 */

export interface HermesEnvKeyGroup {
  category: string;
  keys: string[];
}

export const HERMES_ENV_KEY_GROUPS: HermesEnvKeyGroup[] = [
  {
    category: 'LLM Provider',
    keys: [
      'OPENROUTER_API_KEY',
      'LLM_MODEL',
      'GLM_API_KEY',
      'GLM_BASE_URL',
      'KIMI_API_KEY',
      'KIMI_BASE_URL',
      'MINIMAX_API_KEY',
      'MINIMAX_BASE_URL',
      'MINIMAX_CN_API_KEY',
      'MINIMAX_CN_BASE_URL',
      'OPENCODE_ZEN_API_KEY',
      'OPENCODE_ZEN_BASE_URL',
      'OPENCODE_GO_API_KEY',
      'OPENCODE_GO_BASE_URL',
    ],
  },
  {
    category: 'Tool API Keys',
    keys: ['PARALLEL_API_KEY', 'FIRECRAWL_API_KEY', 'FAL_KEY', 'HONCHO_API_KEY'],
  },
  {
    category: 'Terminal',
    keys: [
      'TERMINAL_ENV',
      'TERMINAL_DOCKER_IMAGE',
      'TERMINAL_SINGULARITY_IMAGE',
      'TERMINAL_MODAL_IMAGE',
      'TERMINAL_CWD',
      'TERMINAL_TIMEOUT',
      'TERMINAL_LIFETIME_SECONDS',
      'TERMINAL_SSH_HOST',
      'TERMINAL_SSH_USER',
      'TERMINAL_SSH_PORT',
      'TERMINAL_SSH_KEY',
      'SUDO_PASSWORD',
    ],
  },
  {
    category: 'Browser',
    keys: [
      'BROWSERBASE_API_KEY',
      'BROWSERBASE_PROJECT_ID',
      'BROWSERBASE_PROXIES',
      'BROWSERBASE_ADVANCED_STEALTH',
      'BROWSER_SESSION_TIMEOUT',
      'BROWSER_INACTIVITY_TIMEOUT',
    ],
  },
  {
    category: 'Voice・STT',
    keys: [
      'VOICE_TOOLS_OPENAI_KEY',
      'GROQ_API_KEY',
      'GROQ_BASE_URL',
      'STT_GROQ_MODEL',
      'STT_OPENAI_MODEL',
      'STT_OPENAI_BASE_URL',
    ],
  },
  {
    category: 'Gateway',
    keys: [
      'SLACK_BOT_TOKEN',
      'SLACK_APP_TOKEN',
      'SLACK_ALLOWED_USERS',
      'WHATSAPP_ENABLED',
      'WHATSAPP_ALLOWED_USERS',
      'EMAIL_ADDRESS',
      'EMAIL_PASSWORD',
      'EMAIL_IMAP_HOST',
      'EMAIL_IMAP_PORT',
      'EMAIL_SMTP_HOST',
      'EMAIL_SMTP_PORT',
      'EMAIL_POLL_INTERVAL',
      'EMAIL_ALLOWED_USERS',
      'EMAIL_HOME_ADDRESS',
      'GATEWAY_ALLOW_ALL_USERS',
      'HERMES_HUMAN_DELAY_MODE',
      'HERMES_HUMAN_DELAY_MIN_MS',
      'HERMES_HUMAN_DELAY_MAX_MS',
    ],
  },
  {
    category: 'Debug',
    keys: [
      'WEB_TOOLS_DEBUG',
      'VISION_TOOLS_DEBUG',
      'MOA_TOOLS_DEBUG',
      'IMAGE_TOOLS_DEBUG',
      'CONTEXT_COMPRESSION_ENABLED',
      'CONTEXT_COMPRESSION_THRESHOLD',
    ],
  },
  {
    category: 'RL Training',
    keys: ['TINKER_API_KEY', 'WANDB_API_KEY', 'RL_API_URL'],
  },
  {
    category: 'Skills Hub',
    keys: [
      'GITHUB_TOKEN',
      'GITHUB_APP_ID',
      'GITHUB_APP_PRIVATE_KEY_PATH',
      'GITHUB_APP_INSTALLATION_ID',
    ],
  },
];

/** Flat list of all known key names for quick lookup */
export const ALL_HERMES_ENV_KEYS: string[] = HERMES_ENV_KEY_GROUPS.flatMap((group) => group.keys);
