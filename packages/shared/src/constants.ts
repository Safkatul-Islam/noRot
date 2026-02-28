import type { AppRule, Persona, PersonaId, Severity } from './types'

export const POLL_INTERVAL = 1000 // 1 second
export const SCORING_WINDOW = 10 * 60 * 1000 // 10 minutes
export const INTERVENTION_COOLDOWN = 60 * 1000 // 60 seconds between interventions
export const INTERVENTION_CHECK_INTERVAL = 30 * 1000 // check every 30s

export const SEVERITY_BANDS: { max: number; severity: Severity }[] = [
  { max: 30, severity: 'chill' },
  { max: 55, severity: 'warning' },
  { max: 75, severity: 'danger' },
  { max: 100, severity: 'critical' }
]

export const SCORE_WEIGHTS = {
  distractionRatio: 0.55,
  switchRate: 0.30,
  snoozePressure: 0.15
}

export const LATE_NIGHT_MULTIPLIER = 1.25
export const LATE_NIGHT_START = 23 // 11 PM
export const LATE_NIGHT_END = 5 // 5 AM

export const SNOOZE_ESCALATION = [0, 5, 15, 25] // extra score per snooze

export const SEVERITY_THRESHOLDS: Record<Severity, number> = {
  chill: 0,
  warning: 30,
  danger: 55,
  critical: 75
}

export const INTERVENTION_SCORE_THRESHOLD = 45

export const APP_RULES: AppRule[] = [
  // Development & Coding
  { pattern: 'code', category: 'development', label: 'VS Code' },
  { pattern: 'visual studio', category: 'development', label: 'Visual Studio' },
  { pattern: 'intellij', category: 'development', label: 'IntelliJ' },
  { pattern: 'webstorm', category: 'development', label: 'WebStorm' },
  { pattern: 'pycharm', category: 'development', label: 'PyCharm' },
  { pattern: 'sublime', category: 'development', label: 'Sublime Text' },
  { pattern: 'atom', category: 'development', label: 'Atom' },
  { pattern: 'vim', category: 'development', label: 'Vim' },
  { pattern: 'neovim', category: 'development', label: 'Neovim' },
  { pattern: 'emacs', category: 'development', label: 'Emacs' },
  { pattern: 'terminal', category: 'development', label: 'Terminal' },
  { pattern: 'powershell', category: 'development', label: 'PowerShell' },
  { pattern: 'cmd.exe', category: 'development', label: 'Command Prompt' },
  { pattern: 'windows terminal', category: 'development', label: 'Windows Terminal' },
  { pattern: 'iterm', category: 'development', label: 'iTerm' },
  { pattern: 'warp', category: 'development', label: 'Warp' },
  { pattern: 'github desktop', category: 'development', label: 'GitHub Desktop' },
  { pattern: 'postman', category: 'development', label: 'Postman' },
  { pattern: 'insomnia', category: 'development', label: 'Insomnia' },
  { pattern: 'docker', category: 'development', label: 'Docker' },
  { pattern: 'pgadmin', category: 'development', label: 'pgAdmin' },
  { pattern: 'datagrip', category: 'development', label: 'DataGrip' },
  { pattern: 'azure data studio', category: 'development', label: 'Azure Data Studio' },
  { pattern: 'cursor', category: 'development', label: 'Cursor' },
  { pattern: 'zed', category: 'development', label: 'Zed' },

  // Productive - Writing & Docs
  { pattern: 'notion', category: 'writing', label: 'Notion' },
  { pattern: 'obsidian', category: 'writing', label: 'Obsidian' },
  { pattern: 'word', category: 'writing', label: 'Microsoft Word' },
  { pattern: 'google docs', category: 'writing', label: 'Google Docs' },
  { pattern: 'overleaf', category: 'writing', label: 'Overleaf' },
  { pattern: 'typora', category: 'writing', label: 'Typora' },
  { pattern: 'bear', category: 'writing', label: 'Bear' },
  { pattern: 'ulysses', category: 'writing', label: 'Ulysses' },
  { pattern: 'scrivener', category: 'writing', label: 'Scrivener' },

  // Design
  { pattern: 'figma', category: 'design', label: 'Figma' },
  { pattern: 'sketch', category: 'design', label: 'Sketch' },
  { pattern: 'photoshop', category: 'design', label: 'Photoshop' },
  { pattern: 'illustrator', category: 'design', label: 'Illustrator' },
  { pattern: 'xd', category: 'design', label: 'Adobe XD' },
  { pattern: 'canva', category: 'design', label: 'Canva' },
  { pattern: 'blender', category: 'design', label: 'Blender' },
  { pattern: 'after effects', category: 'design', label: 'After Effects' },
  { pattern: 'premiere', category: 'design', label: 'Premiere Pro' },
  { pattern: 'davinci', category: 'design', label: 'DaVinci Resolve' },

  // Research
  { pattern: 'arxiv', category: 'research', label: 'arXiv' },
  { pattern: 'scholar.google', category: 'research', label: 'Google Scholar' },
  { pattern: 'stackoverflow', category: 'research', label: 'Stack Overflow' },
  { pattern: 'stack overflow', category: 'research', label: 'Stack Overflow' },
  { pattern: 'documentation', category: 'research', label: 'Documentation' },
  { pattern: 'docs.', category: 'research', label: 'Documentation' },
  { pattern: 'mdn', category: 'research', label: 'MDN' },
  { pattern: 'devdocs', category: 'research', label: 'DevDocs' },
  { pattern: 'github.com', category: 'research', label: 'GitHub' },
  { pattern: 'gitlab', category: 'research', label: 'GitLab' },
  { pattern: 'chatgpt', category: 'research', label: 'ChatGPT' },
  { pattern: 'claude.ai', category: 'research', label: 'Claude' },
  { pattern: 'perplexity', category: 'research', label: 'Perplexity' },
  { pattern: 'wikipedia', category: 'research', label: 'Wikipedia' },

  // Productive - Communication (work)
  { pattern: 'slack', category: 'communication', label: 'Slack' },
  { pattern: 'teams', category: 'communication', label: 'Microsoft Teams' },
  { pattern: 'zoom', category: 'communication', label: 'Zoom' },
  { pattern: 'meet.google', category: 'communication', label: 'Google Meet' },
  { pattern: 'outlook', category: 'communication', label: 'Outlook' },
  { pattern: 'gmail', category: 'communication', label: 'Gmail' },
  { pattern: 'thunderbird', category: 'communication', label: 'Thunderbird' },
  { pattern: 'linear', category: 'communication', label: 'Linear' },
  { pattern: 'jira', category: 'communication', label: 'Jira' },
  { pattern: 'asana', category: 'communication', label: 'Asana' },
  { pattern: 'trello', category: 'communication', label: 'Trello' },

  // Neutral
  { pattern: 'finder', category: 'neutral', label: 'Finder' },
  { pattern: 'explorer', category: 'neutral', label: 'File Explorer' },
  { pattern: 'settings', category: 'neutral', label: 'Settings' },
  { pattern: 'system preferences', category: 'neutral', label: 'System Preferences' },
  { pattern: 'calculator', category: 'neutral', label: 'Calculator' },
  { pattern: 'preview', category: 'neutral', label: 'Preview' },
  { pattern: 'photos', category: 'neutral', label: 'Photos' },
  { pattern: 'calendar', category: 'neutral', label: 'Calendar' },
  { pattern: 'notes', category: 'neutral', label: 'Notes' },
  { pattern: 'spotlight', category: 'neutral', label: 'Spotlight' },
  { pattern: 'alfred', category: 'neutral', label: 'Alfred' },
  { pattern: 'raycast', category: 'neutral', label: 'Raycast' },
  { pattern: '1password', category: 'neutral', label: '1Password' },
  { pattern: 'bitwarden', category: 'neutral', label: 'Bitwarden' },
  { pattern: 'keepass', category: 'neutral', label: 'KeePass' },
  { pattern: 'spotify', category: 'neutral', label: 'Spotify' },
  { pattern: 'music', category: 'neutral', label: 'Music' },

  // Social Media (distraction)
  { pattern: 'twitter', category: 'social_media', label: 'Twitter/X' },
  { pattern: 'x.com', category: 'social_media', label: 'Twitter/X' },
  { pattern: 'instagram', category: 'social_media', label: 'Instagram' },
  { pattern: 'facebook', category: 'social_media', label: 'Facebook' },
  { pattern: 'tiktok', category: 'social_media', label: 'TikTok' },
  { pattern: 'snapchat', category: 'social_media', label: 'Snapchat' },
  { pattern: 'reddit', category: 'social_media', label: 'Reddit' },
  { pattern: 'pinterest', category: 'social_media', label: 'Pinterest' },
  { pattern: 'tumblr', category: 'social_media', label: 'Tumblr' },
  { pattern: 'linkedin', category: 'social_media', label: 'LinkedIn' },
  { pattern: 'threads', category: 'social_media', label: 'Threads' },
  { pattern: 'mastodon', category: 'social_media', label: 'Mastodon' },
  { pattern: 'bluesky', category: 'social_media', label: 'Bluesky' },
  { pattern: 'hacker news', category: 'social_media', label: 'Hacker News' },
  { pattern: 'news.ycombinator', category: 'social_media', label: 'Hacker News' },

  // Entertainment (distraction)
  { pattern: 'youtube', category: 'entertainment', label: 'YouTube' },
  { pattern: 'netflix', category: 'entertainment', label: 'Netflix' },
  { pattern: 'twitch', category: 'entertainment', label: 'Twitch' },
  { pattern: 'hulu', category: 'entertainment', label: 'Hulu' },
  { pattern: 'disney+', category: 'entertainment', label: 'Disney+' },
  { pattern: 'hbo', category: 'entertainment', label: 'HBO Max' },
  { pattern: 'prime video', category: 'entertainment', label: 'Prime Video' },
  { pattern: 'crunchyroll', category: 'entertainment', label: 'Crunchyroll' },
  { pattern: 'funimation', category: 'entertainment', label: 'Funimation' },
  { pattern: '9anime', category: 'entertainment', label: '9anime' },
  { pattern: 'anime', category: 'entertainment', label: 'Anime' },
  { pattern: 'plex', category: 'entertainment', label: 'Plex' },
  { pattern: 'vlc', category: 'entertainment', label: 'VLC' },
  { pattern: 'mpv', category: 'entertainment', label: 'mpv' },

  // Gaming (distraction)
  { pattern: 'steam', category: 'gaming', label: 'Steam' },
  { pattern: 'epic games', category: 'gaming', label: 'Epic Games' },
  { pattern: 'discord', category: 'gaming', label: 'Discord' },
  { pattern: 'battle.net', category: 'gaming', label: 'Battle.net' },
  { pattern: 'riot', category: 'gaming', label: 'Riot Client' },
  { pattern: 'league of legends', category: 'gaming', label: 'League of Legends' },
  { pattern: 'valorant', category: 'gaming', label: 'Valorant' },
  { pattern: 'minecraft', category: 'gaming', label: 'Minecraft' },
  { pattern: 'fortnite', category: 'gaming', label: 'Fortnite' },
  { pattern: 'roblox', category: 'gaming', label: 'Roblox' },
  { pattern: 'xbox', category: 'gaming', label: 'Xbox' },
  { pattern: 'genshin', category: 'gaming', label: 'Genshin Impact' },
  { pattern: 'overwatch', category: 'gaming', label: 'Overwatch' },
  { pattern: 'apex legends', category: 'gaming', label: 'Apex Legends' },
  { pattern: 'cs2', category: 'gaming', label: 'Counter-Strike 2' },
  { pattern: 'counter-strike', category: 'gaming', label: 'Counter-Strike' },
  { pattern: 'dota', category: 'gaming', label: 'Dota 2' },

  // Distraction - Shopping & Misc
  { pattern: 'amazon', category: 'distraction', label: 'Amazon' },
  { pattern: 'ebay', category: 'distraction', label: 'eBay' },
  { pattern: 'etsy', category: 'distraction', label: 'Etsy' },
  { pattern: 'aliexpress', category: 'distraction', label: 'AliExpress' },
  { pattern: 'wish', category: 'distraction', label: 'Wish' },
  { pattern: 'zillow', category: 'distraction', label: 'Zillow' },
  { pattern: 'buzzfeed', category: 'distraction', label: 'BuzzFeed' },
  { pattern: 'imgur', category: 'distraction', label: 'Imgur' },
  { pattern: '9gag', category: 'distraction', label: '9GAG' },
  { pattern: 'news', category: 'distraction', label: 'News' },
  { pattern: 'cnn', category: 'distraction', label: 'CNN' },
  { pattern: 'bbc', category: 'distraction', label: 'BBC' },
  { pattern: 'fox', category: 'distraction', label: 'Fox News' },
  { pattern: 'dailymail', category: 'distraction', label: 'Daily Mail' },
  { pattern: 'whatsapp', category: 'distraction', label: 'WhatsApp' },
  { pattern: 'telegram', category: 'distraction', label: 'Telegram' },
  { pattern: 'messenger', category: 'distraction', label: 'Messenger' },
  { pattern: 'signal', category: 'distraction', label: 'Signal' },
  { pattern: 'imessage', category: 'distraction', label: 'iMessage' },
  { pattern: 'messages', category: 'distraction', label: 'Messages' },
]

export const DISTRACTION_CATEGORIES: Set<string> = new Set([
  'distraction',
  'social_media',
  'gaming',
  'entertainment'
])

export const PERSONA_CONFIGS: Record<PersonaId, Persona> = {
  drill_sergeant: {
    id: 'drill_sergeant',
    name: 'Drill Sergeant',
    description: 'No-nonsense, aggressive motivation. Will yell at you.',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam
    style: 'aggressive, commanding, uses military metaphors, short sentences, ALL CAPS for emphasis',
    exampleLine: 'SOLDIER! I see you on Reddit AGAIN. Drop and give me 20 minutes of REAL work!'
  },
  disappointed_parent: {
    id: 'disappointed_parent',
    name: 'Disappointed Parent',
    description: 'Guilt-trip master. Makes you feel bad about your choices.',
    voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella
    style: 'passive-aggressive, guilt-tripping, sighing, references "your potential", uses "honey" and "sweetie"',
    exampleLine: "Oh sweetie... YouTube again? I'm not mad, I'm just... disappointed. You had so much potential."
  },
  chill_friend: {
    id: 'chill_friend',
    name: 'Chill Friend',
    description: 'Supportive buddy who gently nudges you back on track.',
    voiceId: 'yoZ06aMxZJJ28mfd3POQ', // Sam
    style: 'casual, supportive, uses slang, encouraging, "bro/dude" energy, no judgment',
    exampleLine: "Hey dude, no judgment but you've been scrolling for a bit. Wanna get back to it? You got this!"
  },
  anime_rival: {
    id: 'anime_rival',
    name: 'Anime Rival',
    description: 'Your competitive rival who taunts your lack of discipline.',
    voiceId: 'onwK4e9ZLuTAKqWW03F9', // Daniel
    style: 'dramatic, competitive, anime-style speeches, references honor and power levels, uses "fool" and "weakling"',
    exampleLine: "Pathetic! While you waste time on TikTok, I've already completed THREE pull requests. You'll never surpass me at this rate!"
  },
  therapist: {
    id: 'therapist',
    name: 'Gentle Therapist',
    description: 'Calm, understanding approach. Helps you reflect on patterns.',
    voiceId: 'ThT5KcBeYPX3keUQqHPh', // Dorothy
    style: 'calm, reflective, asks questions, validates feelings, uses therapeutic language, non-judgmental',
    exampleLine: "I notice you've been switching between apps a lot. How are you feeling? Sometimes that restlessness signals something deeper."
  }
}
