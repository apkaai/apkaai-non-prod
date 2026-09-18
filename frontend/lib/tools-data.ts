export interface AITool {
  id: string
  name: string
  slug: string
  tagline: string
  description: string
  category: string
  categorySlug: string
  logo: string
  website: string
  pricing: 'Free' | 'Freemium' | 'Paid' | 'Free Trial'
  startingPrice: string
  monthlyPrice?: number // in INR for comparison
  rating: number
  reviews: number
  tags: string[]
  featured: boolean
  new: boolean
  badge?: string
  pricingPlans?: PricingPlan[]
}

export interface PricingPlan {
  name: string
  price: string
  monthly: number // INR
  features: string[]
  popular?: boolean
}

export interface Category {
  id: string
  name: string
  slug: string
  emoji: string
  description: string
  count: number
}

export const categories: Category[] = [
  { id: '1',  name: 'AI Chat & Research',       slug: 'ai-chat',          emoji: '💬', description: 'Conversational AI and research assistants', count: 8 },
  { id: '2',  name: 'Writing & Content',         slug: 'writing',          emoji: '✍️', description: 'AI-powered writing and content creation',   count: 6 },
  { id: '3',  name: 'Image Generation',          slug: 'image-generation', emoji: '🎨', description: 'Create stunning visuals with AI',            count: 6 },
  { id: '4',  name: 'Video Generation',          slug: 'video-generation', emoji: '🎬', description: 'Generate and edit videos with AI',           count: 6 },
  { id: '5',  name: 'Music & Audio',             slug: 'music-audio',      emoji: '🎵', description: 'AI music composition and audio tools',       count: 4 },
  { id: '6',  name: 'Coding',                    slug: 'coding',           emoji: '💻', description: 'AI-powered coding assistants',               count: 6 },
  { id: '7',  name: 'Presentations',             slug: 'presentations',    emoji: '📊', description: 'Create beautiful presentations with AI',     count: 4 },
  { id: '8',  name: 'Research & Productivity',   slug: 'research',         emoji: '📚', description: 'AI research and productivity tools',         count: 4 },
  { id: '9',  name: 'Design',                    slug: 'design',           emoji: '🖼️', description: 'AI design and creative tools',              count: 4 },
  { id: '10', name: 'Voice & Avatars',           slug: 'voice-avatars',    emoji: '🗣️', description: 'AI voice cloning and avatar creation',      count: 4 },
  { id: '11', name: 'Automation',                slug: 'automation',       emoji: '🤖', description: 'AI workflow automation tools',               count: 4 },
  { id: '12', name: 'Business & Marketing',      slug: 'business',         emoji: '📈', description: 'AI tools for business and marketing',        count: 4 },
  { id: '13', name: 'Meetings & Transcription',  slug: 'meetings',         emoji: '📝', description: 'AI meeting assistants and transcription',    count: 4 },
  { id: '14', name: 'Learning',                  slug: 'learning',         emoji: '🧠', description: 'AI-powered learning platforms',              count: 4 },
  { id: '15', name: 'AI Search',                 slug: 'ai-search',        emoji: '🔍', description: 'Next-gen AI search engines',                 count: 4 },
  { id: '16', name: 'Backup & Data Protection',  slug: 'backup-protection',emoji: '🔄', description: 'Enterprise backup, recovery & data management', count: 7 },
]

export const tools: AITool[] = [
  // ── AI Chat & Research ──────────────────────────────────────────────────────
  {
    id: '1', name: 'ChatGPT', slug: 'chatgpt',
    tagline: "The world's most popular AI assistant",
    description: 'ChatGPT by OpenAI is an advanced conversational AI capable of writing, coding, analysis, and much more. With GPT-4o, it understands text, images, and voice in real time.',
    category: 'AI Chat & Research', categorySlug: 'ai-chat', logo: '🤖',
    website: 'https://chat.openai.com', pricing: 'Freemium', startingPrice: '₹1,650/mo', monthlyPrice: 1650,
    rating: 4.8, reviews: 124000, tags: ['Chat', 'Writing', 'Coding', 'GPT-4o', 'Vision'],
    featured: true, new: false, badge: 'Most Popular',
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['GPT-4o mini', '40 messages/day', 'Web browsing', 'Image generation (limited)'] },
      { name: 'Plus', price: '₹1,650/mo', monthly: 1650, features: ['GPT-4o full access', 'Unlimited messages', 'Advanced tools', 'Custom GPTs'], popular: true },
      { name: 'Team', price: '₹2,490/mo', monthly: 2490, features: ['Everything in Plus', 'Admin controls', 'Higher limits', 'Data privacy'] },
    ]
  },
  {
    id: '2', name: 'Claude', slug: 'claude',
    tagline: "Anthropic's most thoughtful AI assistant",
    description: 'Claude by Anthropic excels at long-context understanding, nuanced reasoning, and safety. Claude 3.5 Sonnet is one of the most capable AI models, with a 200K token context window.',
    category: 'AI Chat & Research', categorySlug: 'ai-chat', logo: '🧡',
    website: 'https://claude.ai', pricing: 'Freemium', startingPrice: '₹1,650/mo', monthlyPrice: 1650,
    rating: 4.7, reviews: 82000, tags: ['Chat', 'Long Context', 'Coding', 'Analysis', 'Safe AI'],
    featured: true, new: false, badge: "Editor's Choice",
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Claude 3 Haiku', 'Limited messages/day', 'Projects', 'Web search'] },
      { name: 'Pro', price: '₹1,650/mo', monthly: 1650, features: ['Claude 3.5 Sonnet', '5x more usage', 'Priority access', 'Projects & Artifacts'], popular: true },
      { name: 'Team', price: '₹2,490/mo', monthly: 2490, features: ['Everything in Pro', 'Collaboration', 'Admin panel', 'SSO'] },
    ]
  },
  {
    id: '3', name: 'Gemini', slug: 'gemini',
    tagline: "Google's most capable multimodal AI",
    description: 'Gemini by Google is a multimodal AI that understands text, images, audio, video, and code. Deeply integrated with Google Workspace — Docs, Gmail, Sheets, and more.',
    category: 'AI Chat & Research', categorySlug: 'ai-chat', logo: '💎',
    website: 'https://gemini.google.com', pricing: 'Freemium', startingPrice: '₹1,950/mo', monthlyPrice: 1950,
    rating: 4.6, reviews: 71000, tags: ['Multimodal', 'Google', 'Workspace', 'Search', 'Coding'],
    featured: true, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Gemini 1.5 Flash', 'Google integration', 'Image generation', 'Web browsing'] },
      { name: 'Advanced', price: '₹1,950/mo', monthly: 1950, features: ['Gemini 1.5 Pro', '1M token context', 'Deep Research', 'Workspace integration'], popular: true },
    ]
  },
  {
    id: '4', name: 'Perplexity', slug: 'perplexity',
    tagline: 'AI-powered answer engine with citations',
    description: 'Perplexity is an AI search engine that provides accurate, cited answers in real time with live web access. Ideal for research, fact-checking, and staying current.',
    category: 'AI Chat & Research', categorySlug: 'ai-chat', logo: '🔵',
    website: 'https://perplexity.ai', pricing: 'Freemium', startingPrice: '₹1,660/mo', monthlyPrice: 1660,
    rating: 4.6, reviews: 53000, tags: ['Search', 'Research', 'Citations', 'Real-time', 'Web'],
    featured: true, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['5 Pro searches/day', 'Basic AI answers', 'Web citations', 'File uploads'] },
      { name: 'Pro', price: '₹1,660/mo', monthly: 1660, features: ['Unlimited Pro searches', 'GPT-4o & Claude access', 'Image generation', 'API access'], popular: true },
    ]
  },
  {
    id: '5', name: 'Microsoft Copilot', slug: 'microsoft-copilot',
    tagline: 'AI built into Microsoft 365',
    description: 'Microsoft Copilot integrates GPT-4 into Word, Excel, PowerPoint, Teams and Outlook. The free version is one of the most capable AI tools available at no cost.',
    category: 'AI Chat & Research', categorySlug: 'ai-chat', logo: '🪟',
    website: 'https://copilot.microsoft.com', pricing: 'Freemium', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.4, reviews: 41000, tags: ['Microsoft', 'Office', 'Productivity', 'Free', 'Windows'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['GPT-4 access', 'Image generation (DALL-E)', 'Web search', 'Code generation'] },
      { name: 'Pro', price: '₹1,660/mo', monthly: 1660, features: ['Priority access', 'Faster responses', 'M365 deep integration', 'Copilot Studio'], popular: true },
    ]
  },
  {
    id: '6', name: 'Grok', slug: 'grok',
    tagline: "xAI's real-time AI with X integration",
    description: 'Grok by xAI (Elon Musk) has real-time access to X (Twitter) data, making it unique for current events and trending topics. Grok 2 is a highly capable model.',
    category: 'AI Chat & Research', categorySlug: 'ai-chat', logo: '⚡',
    website: 'https://grok.com', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.3, reviews: 28000, tags: ['Real-time', 'Twitter/X', 'News', 'Grok 2', 'xAI'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Grok 2 mini', '10 messages/2hr', 'X integration', 'Image generation'] },
      { name: 'X Premium', price: '₹830/mo', monthly: 830, features: ['Full Grok 2 access', 'Higher limits', 'Real-time X data', 'Priority'], popular: true },
    ]
  },
  {
    id: '7', name: 'Meta AI', slug: 'meta-ai',
    tagline: "Meta's free AI across WhatsApp, Instagram, Facebook",
    description: 'Meta AI powered by Llama 3 is built into WhatsApp, Instagram, Facebook, and Messenger. Completely free and deeply integrated into apps billions already use.',
    category: 'AI Chat & Research', categorySlug: 'ai-chat', logo: '🌐',
    website: 'https://meta.ai', pricing: 'Free', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.2, reviews: 35000, tags: ['Free', 'WhatsApp', 'Instagram', 'Llama 3', 'Meta'],
    featured: false, new: false,
    pricingPlans: [{ name: 'Free', price: '₹0/mo', monthly: 0, features: ['Llama 3 powered', 'WhatsApp integration', 'Instagram integration', 'Image generation'] }]
  },
  {
    id: '8', name: 'Poe', slug: 'poe',
    tagline: 'Access all AI models in one app',
    description: "Poe by Quora gives you access to ChatGPT, Claude, Gemini, Llama, and many more in a single app. Perfect for comparing AI models side by side.",
    category: 'AI Chat & Research', categorySlug: 'ai-chat', logo: '🎯',
    website: 'https://poe.com', pricing: 'Freemium', startingPrice: '₹1,990/mo', monthlyPrice: 1990,
    rating: 4.4, reviews: 19000, tags: ['Multi-model', 'Claude', 'GPT-4', 'Llama', 'Gemini'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['3,000 daily points', 'Access to basic bots', 'Limited GPT-4 usage'] },
      { name: 'Subscriber', price: '₹1,990/mo', monthly: 1990, features: ['1M monthly points', 'All premium bots', 'Faster responses', 'Early access'], popular: true },
    ]
  },

  // ── Coding ──────────────────────────────────────────────────────────────────
  {
    id: '9', name: 'Cursor', slug: 'cursor',
    tagline: 'The AI-first code editor',
    description: "Cursor is a VS Code fork supercharged with AI. Chat with your entire codebase, generate code with Composer, and get context-aware completions powered by Claude and GPT-4.",
    category: 'Coding', categorySlug: 'coding', logo: '⚡',
    website: 'https://cursor.sh', pricing: 'Freemium', startingPrice: '₹1,660/mo', monthlyPrice: 1660,
    rating: 4.9, reviews: 98000, tags: ['Code Editor', 'AI Completion', 'Chat', 'VSCode', 'Claude'],
    featured: true, new: false, badge: 'Top Rated',
    pricingPlans: [
      { name: 'Hobby', price: '₹0/mo', monthly: 0, features: ['2 weeks Pro trial', '200 completions', 'AI chat', 'Basic features'] },
      { name: 'Pro', price: '₹1,660/mo', monthly: 1660, features: ['Unlimited completions', 'GPT-4 & Claude access', 'Composer', 'Background agent'], popular: true },
      { name: 'Business', price: '₹3,300/mo', monthly: 3300, features: ['Everything in Pro', 'Team management', 'Privacy mode', 'SSO'] },
    ]
  },
  {
    id: '10', name: 'GitHub Copilot', slug: 'github-copilot',
    tagline: 'AI pair programmer by GitHub',
    description: 'GitHub Copilot uses OpenAI to suggest code and complete functions in real-time. Available in VS Code, JetBrains, Neovim, and more. The most widely used AI coding tool.',
    category: 'Coding', categorySlug: 'coding', logo: '🐙',
    website: 'https://github.com/features/copilot', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.7, reviews: 112000, tags: ['Code', 'GitHub', 'Autocomplete', 'VS Code', 'JetBrains'],
    featured: true, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['2,000 completions/mo', '50 chat messages/mo', 'VS Code & JetBrains', 'PR summaries'] },
      { name: 'Pro', price: '₹830/mo', monthly: 830, features: ['Unlimited completions', 'Unlimited chat', 'Multi-model access', 'CLI tool'], popular: true },
      { name: 'Business', price: '₹1,660/mo', monthly: 1660, features: ['Everything in Pro', 'Admin controls', 'Audit logs', 'Policy management'] },
    ]
  },
  {
    id: '11', name: 'Windsurf', slug: 'windsurf',
    tagline: 'Agentic AI IDE by Codeium',
    description: "Windsurf is an agentic AI IDE that understands your entire codebase and makes multi-file edits autonomously. Cascade can plan, write, and debug complex tasks end-to-end.",
    category: 'Coding', categorySlug: 'coding', logo: '🏄',
    website: 'https://codeium.com/windsurf', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.6, reviews: 32000, tags: ['IDE', 'Agentic', 'Codeium', 'Multi-file', 'Cascade'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['5 Cascade flows/day', 'Basic completions', 'VS Code extension', 'Codeium models'] },
      { name: 'Pro', price: '₹830/mo', monthly: 830, features: ['Unlimited Cascade', 'GPT-4o & Claude', 'Priority access', 'Advanced models'], popular: true },
    ]
  },
  {
    id: '12', name: 'Replit', slug: 'replit',
    tagline: 'Build software with AI in your browser',
    description: 'Replit is a cloud IDE with an AI agent that builds full-stack apps from a description. No setup needed — code, run, and deploy in one place with instant preview.',
    category: 'Coding', categorySlug: 'coding', logo: '🔁',
    website: 'https://replit.com', pricing: 'Freemium', startingPrice: '₹1,250/mo', monthlyPrice: 1250,
    rating: 4.4, reviews: 67000, tags: ['Cloud IDE', 'Deploy', 'Full-Stack', 'Agent', 'No Setup'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Basic IDE', '0.5 vCPU', 'Community support', 'Limited AI'] },
      { name: 'Core', price: '₹1,250/mo', monthly: 1250, features: ['AI agent', '4 vCPUs', 'Always-on repls', 'Custom domains'], popular: true },
    ]
  },
  {
    id: '13', name: 'Claude Code', slug: 'claude-code',
    tagline: 'Agentic coding by Anthropic in terminal',
    description: "Claude Code is Anthropic's terminal-based agentic coding tool. It reads your entire codebase, writes, tests, and commits code autonomously with deep context understanding.",
    category: 'Coding', categorySlug: 'coding', logo: '🖥️',
    website: 'https://docs.anthropic.com/claude-code', pricing: 'Paid', startingPrice: 'Usage-based', monthlyPrice: 1650,
    rating: 4.7, reviews: 21000, tags: ['Terminal', 'Agentic', 'Anthropic', 'Git', 'Full-codebase'],
    featured: false, new: true,
    pricingPlans: [
      { name: 'API Usage', price: '$3/MTok input', monthly: 1650, features: ['Claude 3.5 Sonnet', 'Full codebase context', 'Git integration', 'Multi-file edits'], popular: true },
    ]
  },
  {
    id: '14', name: 'Tabnine', slug: 'tabnine',
    tagline: 'Privacy-first AI coding assistant',
    description: 'Tabnine is an AI coding assistant focused on privacy and enterprise security. Runs locally on your machine or air-gapped servers. Supports 30+ languages and all major IDEs.',
    category: 'Coding', categorySlug: 'coding', logo: '🛡️',
    website: 'https://tabnine.com', pricing: 'Freemium', startingPrice: '₹1,080/mo', monthlyPrice: 1080,
    rating: 4.3, reviews: 45000, tags: ['Privacy', 'Local', 'Enterprise', 'Autocomplete', 'Secure'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Basic completions', '30+ languages', 'All major IDEs', 'Cloud-based'] },
      { name: 'Pro', price: '₹1,080/mo', monthly: 1080, features: ['Full AI completions', 'Chat feature', 'Local model option', 'Priority support'], popular: true },
    ]
  },

  // ── Image Generation ────────────────────────────────────────────────────────
  {
    id: '15', name: 'Midjourney', slug: 'midjourney',
    tagline: 'Create stunning AI art and photography',
    description: 'Midjourney produces the most aesthetic and photorealistic AI images. Used by artists, designers, and creators worldwide. Now available via web without Discord.',
    category: 'Image Generation', categorySlug: 'image-generation', logo: '🎨',
    website: 'https://midjourney.com', pricing: 'Paid', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.8, reviews: 156000, tags: ['Art', 'Photorealistic', 'Web', 'Creative', 'High Quality'],
    featured: true, new: false, badge: 'Best for Art',
    pricingPlans: [
      { name: 'Basic', price: '₹830/mo', monthly: 830, features: ['200 image generations', 'General commercial terms', 'Access to member gallery', 'Web & Discord'] },
      { name: 'Standard', price: '₹1,660/mo', monthly: 1660, features: ['15hr fast GPU/mo', 'Unlimited relaxed gen', 'Stealth mode', 'Commercial license'], popular: true },
      { name: 'Pro', price: '₹4,150/mo', monthly: 4150, features: ['30hr fast GPU/mo', 'Stealth mode', 'Max concurrent jobs', 'Full commercial'] },
    ]
  },
  {
    id: '16', name: 'Adobe Firefly', slug: 'adobe-firefly',
    tagline: 'Commercially safe generative AI for creatives',
    description: 'Adobe Firefly is commercially safe AI image generation built into Adobe Creative Cloud. Generate images, vectors, and text effects — all trained on licensed content.',
    category: 'Image Generation', categorySlug: 'image-generation', logo: '🔥',
    website: 'https://firefly.adobe.com', pricing: 'Freemium', startingPrice: '₹1,650/mo', monthlyPrice: 1650,
    rating: 4.5, reviews: 48000, tags: ['Adobe', 'Commercial', 'Creative Cloud', 'Vector', 'Safe'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['25 generative credits/mo', 'Basic features', 'Web app access'] },
      { name: 'Creative Cloud', price: '₹1,650/mo', monthly: 1650, features: ['1000 credits/mo', 'All Firefly models', 'Photoshop integration', 'Commercial license'], popular: true },
    ]
  },
  {
    id: '17', name: 'Ideogram', slug: 'ideogram',
    tagline: 'AI images with perfectly rendered text',
    description: 'Ideogram excels at generating images with accurate, beautiful text — logos, posters, and typography. One of the best tools for design-oriented image creation.',
    category: 'Image Generation', categorySlug: 'image-generation', logo: '💡',
    website: 'https://ideogram.ai', pricing: 'Freemium', startingPrice: '₹580/mo', monthlyPrice: 580,
    rating: 4.6, reviews: 32000, tags: ['Text in Images', 'Logo', 'Design', 'Typography', 'Poster'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['10 slow generations/day', 'Public gallery', 'Basic models'] },
      { name: 'Basic', price: '₹580/mo', monthly: 580, features: ['400 priority credits/mo', 'Private images', 'Upscaling'], popular: true },
      { name: 'Plus', price: '₹1,660/mo', monthly: 1660, features: ['1000 priority credits', 'Faster gen', 'API access'] },
    ]
  },
  {
    id: '18', name: 'Leonardo AI', slug: 'leonardo-ai',
    tagline: 'Professional AI image creation platform',
    description: 'Leonardo AI offers fine-tuned models for game assets, concept art, and product imagery. Features real-time generation, ControlNet, and custom model training.',
    category: 'Image Generation', categorySlug: 'image-generation', logo: '🦁',
    website: 'https://leonardo.ai', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.5, reviews: 51000, tags: ['Game Art', 'Concept Art', 'Fine-tune', 'Real-time', 'Custom Models'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['150 tokens/day', 'Basic models', 'Community feed', 'Standard quality'] },
      { name: 'Apprentice', price: '₹830/mo', monthly: 830, features: ['8,500 tokens/mo', 'Private images', 'No watermark'], popular: true },
    ]
  },
  {
    id: '19', name: 'DALL-E 3', slug: 'dalle-3',
    tagline: "OpenAI's most advanced image generator",
    description: "DALL-E 3 by OpenAI creates highly detailed images from text descriptions and is built directly into ChatGPT. Known for precise prompt following and photorealistic quality.",
    category: 'Image Generation', categorySlug: 'image-generation', logo: '🖼️',
    website: 'https://openai.com/dall-e-3', pricing: 'Paid', startingPrice: '₹1,650/mo', monthlyPrice: 1650,
    rating: 4.6, reviews: 89000, tags: ['OpenAI', 'ChatGPT', 'Photorealistic', 'Precise', 'API'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'ChatGPT Plus', price: '₹1,650/mo', monthly: 1650, features: ['DALL-E 3 in ChatGPT', 'HD quality', 'Inpainting', 'Variations'], popular: true },
      { name: 'API', price: '₹1.65/image', monthly: 0, features: ['Direct API access', 'HD & Standard', 'Inpainting', 'Batch generation'] },
    ]
  },
  {
    id: '20', name: 'Stable Diffusion', slug: 'stable-diffusion',
    tagline: 'Open-source AI image generation',
    description: 'Stable Diffusion is a free, open-source AI image model you can run locally. Unlimited generations, full control, and thousands of community models via CivitAI.',
    category: 'Image Generation', categorySlug: 'image-generation', logo: '🌊',
    website: 'https://stability.ai', pricing: 'Free', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.4, reviews: 67000, tags: ['Open Source', 'Free', 'Local', 'Unlimited', 'Community Models'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free (Local)', price: '₹0', monthly: 0, features: ['Run locally', 'Unlimited generations', 'All community models', 'Full control'], popular: true },
      { name: 'DreamStudio', price: '₹830/mo', monthly: 830, features: ['Cloud-based', 'No GPU needed', 'Latest models', 'API access'] },
    ]
  },

  // ── Video Generation ────────────────────────────────────────────────────────
  {
    id: '21', name: 'Runway', slug: 'runway',
    tagline: 'Industry-standard AI video generation',
    description: 'Runway Gen-3 creates high-quality videos from text or image prompts. The industry standard for AI video in film and content production with professional-grade output.',
    category: 'Video Generation', categorySlug: 'video-generation', logo: '🎬',
    website: 'https://runwayml.com', pricing: 'Freemium', startingPrice: '₹1,250/mo', monthlyPrice: 1250,
    rating: 4.6, reviews: 63000, tags: ['Text-to-Video', 'Video Editing', 'Gen-3', 'Professional', 'Film'],
    featured: true, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['125 one-time credits', 'Gen-3 Turbo', '720p output', 'Watermark'] },
      { name: 'Standard', price: '₹1,250/mo', monthly: 1250, features: ['625 credits/mo', 'No watermark', '1080p output', 'Upscaling'], popular: true },
      { name: 'Pro', price: '₹2,490/mo', monthly: 2490, features: ['2250 credits/mo', '4K output', 'Turbo speed', 'Commercial license'] },
    ]
  },
  {
    id: '22', name: 'HeyGen', slug: 'heygen',
    tagline: 'AI avatar videos for business',
    description: 'HeyGen lets you create professional videos with AI avatars and voice cloning. Perfect for marketing, training, product demos, and corporate videos without a camera.',
    category: 'Video Generation', categorySlug: 'video-generation', logo: '👤',
    website: 'https://heygen.com', pricing: 'Freemium', startingPrice: '₹2,490/mo', monthlyPrice: 2490,
    rating: 4.7, reviews: 42000, tags: ['Avatar', 'Marketing', 'Corporate', 'Voice Clone', 'Multilingual'],
    featured: true, new: false, badge: 'Best for Business',
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['1 credit/mo', 'Basic avatar', '720p', 'Watermark'] },
      { name: 'Creator', price: '₹2,490/mo', monthly: 2490, features: ['15 credits/mo', 'Custom avatar', '1080p', 'No watermark'], popular: true },
      { name: 'Business', price: '₹8,300/mo', monthly: 8300, features: ['30 credits/mo', 'Video translate', 'Brand kit', 'API'] },
    ]
  },
  {
    id: '23', name: 'Pika', slug: 'pika',
    tagline: 'Turn ideas into cinematic videos instantly',
    description: 'Pika 2.0 creates cinematic short videos from text or image with stunning visual quality. Known for smooth motion, realistic physics, and creative visual effects.',
    category: 'Video Generation', categorySlug: 'video-generation', logo: '✨',
    website: 'https://pika.art', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.5, reviews: 29000, tags: ['Text-to-Video', 'Cinematic', 'Effects', 'Motion', 'Creative'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['150 credits/mo', 'Basic video gen', '720p', 'Watermark'] },
      { name: 'Basic', price: '₹830/mo', monthly: 830, features: ['700 credits/mo', 'No watermark', '1080p', 'Fast queue'], popular: true },
    ]
  },
  {
    id: '24', name: 'Kling AI', slug: 'kling-ai',
    tagline: 'High-quality video generation by Kuaishou',
    description: "Kling AI by China's Kuaishou produces strikingly realistic videos with natural motion and cinematic quality. Supports up to 2 minutes of video generation.",
    category: 'Video Generation', categorySlug: 'video-generation', logo: '🎥',
    website: 'https://klingai.com', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.6, reviews: 24000, tags: ['Long Video', 'Realistic', 'Cinematic', '2min', 'Kuaishou'],
    featured: false, new: true,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['66 credits/day', 'Standard quality', '5sec videos', 'Basic features'] },
      { name: 'Pro', price: '₹830/mo', monthly: 830, features: ['660 credits/mo', 'High quality', '2min videos', 'Priority queue'], popular: true },
    ]
  },
  {
    id: '25', name: 'Synthesia', slug: 'synthesia',
    tagline: 'AI video with realistic human presenters',
    description: 'Synthesia creates professional training and marketing videos with realistic AI presenters in 130+ languages. Used by enterprise teams for scalable video content.',
    category: 'Video Generation', categorySlug: 'video-generation', logo: '🎭',
    website: 'https://synthesia.io', pricing: 'Paid', startingPrice: '₹2,490/mo', monthlyPrice: 2490,
    rating: 4.5, reviews: 31000, tags: ['Training', 'Enterprise', '130+ Languages', 'Presenters', 'Corporate'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Starter', price: '₹2,490/mo', monthly: 2490, features: ['10 videos/mo', '120+ avatars', 'Screen recorder', 'Basic brand kit'], popular: true },
      { name: 'Creator', price: '₹8,300/mo', monthly: 8300, features: ['30 videos/mo', 'Custom avatar', 'Full brand kit', 'API access'] },
    ]
  },
  {
    id: '26', name: 'Luma AI', slug: 'luma-ai',
    tagline: 'Dream Machine — world-class video generation',
    description: "Luma AI's Dream Machine creates high-quality, realistic videos with smooth motion. Exceptional at character consistency, physics simulation, and smooth camera movements.",
    category: 'Video Generation', categorySlug: 'video-generation', logo: '🌙',
    website: 'https://lumalabs.ai', pricing: 'Freemium', startingPrice: '₹1,250/mo', monthlyPrice: 1250,
    rating: 4.6, reviews: 19000, tags: ['Dream Machine', 'Physics', 'Character', 'Smooth', 'Realistic'],
    featured: false, new: true,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['30 generations/mo', '5sec video', 'Standard quality', 'Watermark'] },
      { name: 'Plus', price: '₹1,250/mo', monthly: 1250, features: ['120 gens/mo', '9sec video', 'HD quality', 'No watermark'], popular: true },
    ]
  },

  // ── Writing & Content ───────────────────────────────────────────────────────
  {
    id: '27', name: 'Jasper', slug: 'jasper',
    tagline: 'Enterprise AI writing for marketing teams',
    description: 'Jasper is an enterprise AI writing platform built for marketing teams. Generate blogs, ads, emails, social content, and brand voice content at scale.',
    category: 'Writing & Content', categorySlug: 'writing', logo: '✍️',
    website: 'https://jasper.ai', pricing: 'Paid', startingPrice: '₹2,900/mo', monthlyPrice: 2900,
    rating: 4.4, reviews: 72000, tags: ['Marketing', 'Blog', 'Copywriting', 'Enterprise', 'Brand Voice'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Creator', price: '₹2,900/mo', monthly: 2900, features: ['1 user seat', 'Unlimited words', 'SEO integration', 'Jasper Chat'], popular: true },
      { name: 'Teams', price: '₹4,550/mo', monthly: 4550, features: ['3 user seats', 'Brand voice', 'Collaboration', 'Campaign assistant'] },
    ]
  },
  {
    id: '28', name: 'Grammarly', slug: 'grammarly',
    tagline: 'AI writing assistant used by 30M+ people',
    description: 'Grammarly uses AI to check grammar, tone, clarity, and plagiarism across all your writing. Available as browser extension, desktop app, and integrates everywhere you write.',
    category: 'Writing & Content', categorySlug: 'writing', logo: '📝',
    website: 'https://grammarly.com', pricing: 'Freemium', startingPrice: '₹1,250/mo', monthlyPrice: 1250,
    rating: 4.6, reviews: 189000, tags: ['Grammar', 'Writing', 'Browser Extension', 'Plagiarism', 'Tone'],
    featured: true, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Basic grammar', 'Spelling check', 'Conciseness', 'Tone detection'] },
      { name: 'Premium', price: '₹1,250/mo', monthly: 1250, features: ['Full grammar suite', 'Plagiarism check', 'AI rewrites', 'Clarity improvements'], popular: true },
      { name: 'Business', price: '₹1,660/mo', monthly: 1660, features: ['Team management', 'Style guides', 'Analytics', 'Priority support'] },
    ]
  },
  {
    id: '29', name: 'Copy.ai', slug: 'copy-ai',
    tagline: 'AI-powered marketing copy at scale',
    description: 'Copy.ai helps marketing teams generate high-converting copy for ads, emails, landing pages, and social media. Features a powerful workflows engine for automated content.',
    category: 'Writing & Content', categorySlug: 'writing', logo: '📣',
    website: 'https://copy.ai', pricing: 'Freemium', startingPrice: '₹3,300/mo', monthlyPrice: 3300,
    rating: 4.3, reviews: 61000, tags: ['Copywriting', 'Marketing', 'Ads', 'Email', 'Workflows'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['2000 words/mo', 'Basic templates', '1 seat', 'Chat'] },
      { name: 'Pro', price: '₹3,300/mo', monthly: 3300, features: ['Unlimited words', 'Workflows', '5 seats', 'Brand voice'], popular: true },
    ]
  },
  {
    id: '30', name: 'Writesonic', slug: 'writesonic',
    tagline: 'SEO-optimised AI content at scale',
    description: 'Writesonic generates SEO-optimized blogs, articles, landing pages, and ads. Features Chatsonic (ChatGPT alternative with web access) and Botsonic for website chatbots.',
    category: 'Writing & Content', categorySlug: 'writing', logo: '🖊️',
    website: 'https://writesonic.com', pricing: 'Freemium', startingPrice: '₹1,250/mo', monthlyPrice: 1250,
    rating: 4.3, reviews: 43000, tags: ['SEO', 'Blog', 'Landing Page', 'Ads', 'Chatsonic'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['10,000 words/mo', 'Basic templates', 'Chatsonic', '25+ languages'] },
      { name: 'Individual', price: '₹1,250/mo', monthly: 1250, features: ['Unlimited words', 'All templates', 'SEO checker', 'Brand voice'], popular: true },
    ]
  },
  {
    id: '31', name: 'Notion AI', slug: 'notion-ai',
    tagline: 'AI built into your workspace',
    description: 'Notion AI is built directly into Notion and can summarize notes, write drafts, translate, fill tables, and answer questions about your workspace content.',
    category: 'Writing & Content', categorySlug: 'writing', logo: '📓',
    website: 'https://notion.so/product/ai', pricing: 'Paid', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.5, reviews: 55000, tags: ['Workspace', 'Notes', 'Summary', 'Notion', 'Productivity'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'AI Add-on', price: '₹830/mo', monthly: 830, features: ['Unlimited AI responses', 'Q&A on workspace', 'Write & summarize', 'All Notion plans'], popular: true },
    ]
  },
  {
    id: '32', name: 'Rytr', slug: 'rytr',
    tagline: 'Affordable AI writing for everyone',
    description: 'Rytr is one of the most affordable AI writing tools with 40+ use cases, 30+ languages, and 20+ tones. Great for blogs, social media, emails, and ad copy.',
    category: 'Writing & Content', categorySlug: 'writing', logo: '✏️',
    website: 'https://rytr.me', pricing: 'Freemium', startingPrice: '₹580/mo', monthlyPrice: 580,
    rating: 4.2, reviews: 38000, tags: ['Affordable', 'Blog', 'Social Media', '40+ Use Cases', '30+ Languages'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['10,000 characters/mo', '40+ use cases', 'Chrome extension'] },
      { name: 'Saver', price: '₹580/mo', monthly: 580, features: ['100k characters/mo', 'Custom use case', 'Priority access'], popular: true },
      { name: 'Unlimited', price: '₹830/mo', monthly: 830, features: ['Unlimited characters', 'Dedicated account manager', 'Premium support'] },
    ]
  },

  // ── Music & Audio ───────────────────────────────────────────────────────────
  {
    id: '33', name: 'Suno', slug: 'suno',
    tagline: 'Create full songs with vocals from text',
    description: 'Suno generates complete songs with vocals, instruments, and lyrics from a single text prompt. The most accessible and high-quality AI music creation tool available.',
    category: 'Music & Audio', categorySlug: 'music-audio', logo: '🎵',
    website: 'https://suno.com', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.7, reviews: 89000, tags: ['Music', 'Vocals', 'Lyrics', 'Song Generation', 'Any Genre'],
    featured: true, new: false, badge: 'Trending',
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['50 credits/day', 'Non-commercial use', 'Basic features', 'Standard quality'] },
      { name: 'Pro', price: '₹830/mo', monthly: 830, features: ['2500 credits/mo', 'Commercial license', 'Priority generation', 'No queue'], popular: true },
      { name: 'Premier', price: '₹2,490/mo', monthly: 2490, features: ['10000 credits/mo', 'Commercial license', 'Highest quality', 'Custom styles'] },
    ]
  },
  {
    id: '34', name: 'ElevenLabs', slug: 'elevenlabs',
    tagline: 'Most realistic AI voice generation & cloning',
    description: 'ElevenLabs creates hyper-realistic AI voices and voice clones from a short audio sample. Industry standard for audiobooks, dubbing, podcasts, and voice-over production.',
    category: 'Music & Audio', categorySlug: 'music-audio', logo: '🔊',
    website: 'https://elevenlabs.io', pricing: 'Freemium', startingPrice: '₹415/mo', monthlyPrice: 415,
    rating: 4.8, reviews: 112000, tags: ['Voice Clone', 'TTS', 'Dubbing', 'Audiobook', 'Realistic'],
    featured: true, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['10k chars/mo', '3 custom voices', 'Basic API', 'Non-commercial'] },
      { name: 'Starter', price: '₹415/mo', monthly: 415, features: ['30k chars/mo', '10 voices', 'Commercial license', 'API access'], popular: true },
      { name: 'Creator', price: '₹1,660/mo', monthly: 1660, features: ['100k chars/mo', 'Instant voice clone', 'Projects', 'Dubbing studio'] },
    ]
  },
  {
    id: '35', name: 'Udio', slug: 'udio',
    tagline: 'AI music creation with studio quality',
    description: "Udio generates high-quality, studio-grade music from text descriptions. Known for exceptional audio fidelity and the ability to create custom stems and extend songs.",
    category: 'Music & Audio', categorySlug: 'music-audio', logo: '🎸',
    website: 'https://udio.com', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.5, reviews: 29000, tags: ['Studio Quality', 'Music', 'Stems', 'Extend', 'High Fidelity'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['100 credits/mo', 'Basic generation', 'Standard quality', 'Personal use'] },
      { name: 'Standard', price: '₹830/mo', monthly: 830, features: ['1200 credits/mo', 'Commercial license', 'High quality', 'Custom styles'], popular: true },
    ]
  },
  {
    id: '36', name: 'Adobe Podcast', slug: 'adobe-podcast',
    tagline: 'AI audio enhancement for podcasts',
    description: 'Adobe Podcast uses AI to enhance audio quality, remove background noise, and make recordings sound studio-quality. The Enhance Speech feature is industry-leading.',
    category: 'Music & Audio', categorySlug: 'music-audio', logo: '🎙️',
    website: 'https://podcast.adobe.com', pricing: 'Freemium', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.6, reviews: 41000, tags: ['Podcast', 'Audio Enhancement', 'Noise Removal', 'Adobe', 'Studio Quality'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Enhance Speech', 'Mic Check', 'Basic recording', 'Personal use'] },
      { name: 'Creative Cloud', price: '₹1,650/mo', monthly: 1650, features: ['Full podcast suite', 'Advanced editing', 'Commercial use', 'Adobe integration'], popular: true },
    ]
  },

  // ── Presentations ───────────────────────────────────────────────────────────
  {
    id: '37', name: 'Gamma', slug: 'gamma',
    tagline: 'Beautiful AI presentations in seconds',
    description: "Gamma uses AI to create stunning presentations, documents, and websites from a text prompt. Just describe your topic and get a fully designed, professional deck instantly.",
    category: 'Presentations', categorySlug: 'presentations', logo: '✨',
    website: 'https://gamma.app', pricing: 'Freemium', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.6, reviews: 45000, tags: ['Presentations', 'Slides', 'Design', 'Quick', 'Documents'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['400 AI credits', 'Unlimited decks', 'Basic templates', 'Gamma watermark'] },
      { name: 'Plus', price: '₹830/mo', monthly: 830, features: ['Unlimited AI', 'No watermark', 'Custom fonts', 'Analytics'], popular: true },
    ]
  },
  {
    id: '38', name: 'Canva AI', slug: 'canva-ai',
    tagline: 'Design anything with AI magic',
    description: "Canva's Magic Studio includes AI image generation, video creation, text-to-design, background removal, and hundreds of AI-powered design features in one platform.",
    category: 'Presentations', categorySlug: 'presentations', logo: '🎨',
    website: 'https://canva.com', pricing: 'Freemium', startingPrice: '₹415/mo', monthlyPrice: 415,
    rating: 4.7, reviews: 198000, tags: ['Design', 'AI Magic', 'Templates', 'Presentation', 'Social Media'],
    featured: true, new: false, badge: 'Most Versatile',
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Basic templates', 'Limited AI', '5GB storage', 'Web & mobile'] },
      { name: 'Pro', price: '₹415/mo', monthly: 415, features: ['Magic Studio AI', 'Brand kit', '1TB storage', 'Background remover'], popular: true },
      { name: 'Teams', price: '₹580/mo', monthly: 580, features: ['Everything in Pro', 'Team workflows', 'Admin tools', 'Approval flows'] },
    ]
  },
  {
    id: '39', name: 'Beautiful.ai', slug: 'beautiful-ai',
    tagline: 'Smart presentation design automation',
    description: "Beautiful.ai automatically applies design principles to your slides. As you add content, it intelligently arranges and formats everything to look professional.",
    category: 'Presentations', categorySlug: 'presentations', logo: '💫',
    website: 'https://beautiful.ai', pricing: 'Paid', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.4, reviews: 22000, tags: ['Smart Design', 'Auto-layout', 'Templates', 'Business', 'Professional'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Pro', price: '₹830/mo', monthly: 830, features: ['Unlimited slides', 'All templates', 'AI Designer', 'Custom themes'], popular: true },
      { name: 'Team', price: '₹2,490/mo', monthly: 2490, features: ['5 seats', 'Shared workspace', 'Brand controls', 'Analytics'] },
    ]
  },
  {
    id: '40', name: 'Tome', slug: 'tome',
    tagline: 'AI-native storytelling presentations',
    description: "Tome creates narrative-driven presentations with AI. It understands context and creates cohesive stories with text, images, and data — built for modern storytelling.",
    category: 'Presentations', categorySlug: 'presentations', logo: '📖',
    website: 'https://tome.app', pricing: 'Freemium', startingPrice: '₹1,250/mo', monthlyPrice: 1250,
    rating: 4.3, reviews: 19000, tags: ['Storytelling', 'Narrative', 'AI', 'Modern', 'Pitch Deck'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['500 AI credits', 'Basic features', 'Personal use'] },
      { name: 'Pro', price: '₹1,250/mo', monthly: 1250, features: ['Unlimited AI', 'Custom domain', 'Analytics', 'Remove branding'], popular: true },
    ]
  },

  // ── Research & Productivity ─────────────────────────────────────────────────
  {
    id: '41', name: 'NotebookLM', slug: 'notebooklm',
    tagline: 'AI research assistant by Google',
    description: "NotebookLM by Google lets you upload documents, PDFs, and URLs, then ask questions and get cited answers from your own source material. The Audio Overview feature creates podcasts.",
    category: 'Research & Productivity', categorySlug: 'research', logo: '📓',
    website: 'https://notebooklm.google.com', pricing: 'Free', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.7, reviews: 32000, tags: ['Research', 'Documents', 'Google', 'Citations', 'Audio Overview'],
    featured: false, new: false,
    pricingPlans: [{ name: 'Free', price: '₹0/mo', monthly: 0, features: ['50 sources/notebook', 'Q&A on docs', 'Audio overview', 'Unlimited notebooks'] }]
  },
  {
    id: '42', name: 'Elicit', slug: 'elicit',
    tagline: 'AI research assistant for academics',
    description: "Elicit uses AI to help researchers find, summarize, and extract data from academic papers. Searches millions of papers and automatically extracts key information.",
    category: 'Research & Productivity', categorySlug: 'research', logo: '🔬',
    website: 'https://elicit.com', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.5, reviews: 18000, tags: ['Academic', 'Research', 'Papers', 'Literature Review', 'Extraction'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['5 searches/mo', 'Basic extraction', 'Paper summaries'] },
      { name: 'Plus', price: '₹830/mo', monthly: 830, features: ['Unlimited searches', 'Full extraction', 'CSV export', 'Priority access'], popular: true },
    ]
  },

  // ── Design ──────────────────────────────────────────────────────────────────
  {
    id: '43', name: 'Figma AI', slug: 'figma-ai',
    tagline: 'AI-powered design directly in Figma',
    description: 'Figma AI adds generative design features directly into Figma. Generate UI mockups, write copy, create assets, and use auto-layout with AI assistance in your design workflow.',
    category: 'Design', categorySlug: 'design', logo: '🎯',
    website: 'https://figma.com/ai', pricing: 'Paid', startingPrice: '₹1,250/mo', monthlyPrice: 1250,
    rating: 4.6, reviews: 37000, tags: ['UI Design', 'Figma', 'Mockup', 'Assets', 'Wireframe'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Professional', price: '₹1,250/mo', monthly: 1250, features: ['AI features included', 'Unlimited projects', 'Dev mode', 'Advanced prototyping'], popular: true },
    ]
  },

  // ── Voice & Avatars ─────────────────────────────────────────────────────────
  {
    id: '44', name: 'PlayHT', slug: 'playht',
    tagline: 'Ultra-realistic AI voice generation',
    description: "PlayHT generates ultra-realistic AI voices with emotional control. Supports 900+ voices, 142 languages, and real-time voice cloning from just 3 seconds of audio.",
    category: 'Voice & Avatars', categorySlug: 'voice-avatars', logo: '🎭',
    website: 'https://play.ht', pricing: 'Freemium', startingPrice: '₹1,660/mo', monthlyPrice: 1660,
    rating: 4.5, reviews: 24000, tags: ['Voice Clone', 'TTS', '142 Languages', 'Emotional', 'Real-time'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['12,500 chars/mo', '3 voice clones', 'Standard voices'] },
      { name: 'Creator', price: '₹1,660/mo', monthly: 1660, features: ['100k chars/mo', 'Instant voice clone', 'Commercial use', 'API'], popular: true },
    ]
  },

  // ── Automation ──────────────────────────────────────────────────────────────
  {
    id: '45', name: 'Zapier AI', slug: 'zapier-ai',
    tagline: 'Automate workflows with AI in plain English',
    description: 'Zapier AI lets you build powerful automations using natural language. Connect 6000+ apps and automate repetitive tasks with AI-powered Zaps — no coding required.',
    category: 'Automation', categorySlug: 'automation', logo: '⚡',
    website: 'https://zapier.com/ai', pricing: 'Freemium', startingPrice: '₹1,990/mo', monthlyPrice: 1990,
    rating: 4.5, reviews: 92000, tags: ['Automation', 'No-Code', 'Workflows', 'Integration', '6000+ Apps'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['5 Zaps', '100 tasks/mo', 'Basic apps', 'Single-step'] },
      { name: 'Starter', price: '₹1,990/mo', monthly: 1990, features: ['20 Zaps', '750 tasks/mo', 'All apps', 'Multi-step'], popular: true },
      { name: 'Professional', price: '₹4,150/mo', monthly: 4150, features: ['Unlimited Zaps', '2000 tasks/mo', 'Premium apps', 'Paths'] },
    ]
  },
  {
    id: '46', name: 'Make', slug: 'make',
    tagline: 'Visual no-code automation platform',
    description: "Make (formerly Integromat) provides a visual drag-and-drop automation builder with more power than Zapier for complex workflows. Handles conditional logic and loops.",
    category: 'Automation', categorySlug: 'automation', logo: '🔧',
    website: 'https://make.com', pricing: 'Freemium', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.5, reviews: 54000, tags: ['Visual', 'Automation', 'No-Code', 'Webhooks', 'Complex Logic'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['1000 ops/mo', '2 active scenarios', '15 min interval'] },
      { name: 'Core', price: '₹830/mo', monthly: 830, features: ['10,000 ops/mo', 'Unlimited scenarios', '1 min interval', 'Full history'], popular: true },
    ]
  },
  {
    id: '47', name: 'n8n', slug: 'n8n',
    tagline: 'Open-source workflow automation with AI',
    description: 'n8n is an open-source workflow automation tool you can self-host for free. Build complex automations with 400+ integrations, AI nodes, and custom code support.',
    category: 'Automation', categorySlug: 'automation', logo: '🔗',
    website: 'https://n8n.io', pricing: 'Freemium', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.6, reviews: 38000, tags: ['Open Source', 'Self-hosted', 'Free', '400+ Integrations', 'AI Nodes'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free (Self-host)', price: '₹0', monthly: 0, features: ['Unlimited workflows', 'Self-hosted', 'All features', 'Community support'] },
      { name: 'Starter', price: '₹1,660/mo', monthly: 1660, features: ['Cloud-hosted', '5 active workflows', '2500 executions/mo', 'Support'], popular: true },
    ]
  },
  {
    id: '48', name: 'Microsoft Power Automate', slug: 'power-automate',
    tagline: "Microsoft's enterprise automation with AI",
    description: 'Microsoft Power Automate (formerly Flow) connects Microsoft 365 apps with AI Builder for document processing, automated approvals, and enterprise workflow automation.',
    category: 'Automation', categorySlug: 'automation', logo: '🌊',
    website: 'https://powerautomate.microsoft.com', pricing: 'Freemium', startingPrice: '₹580/mo', monthlyPrice: 580,
    rating: 4.3, reviews: 47000, tags: ['Microsoft', 'Enterprise', 'Power Platform', 'RPA', 'Office 365'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Basic flows', 'Standard connectors', 'M365 integration'] },
      { name: 'Premium', price: '₹580/mo', monthly: 580, features: ['Premium connectors', 'RPA', 'AI Builder', 'Process mining'], popular: true },
    ]
  },

  // ── Business & Marketing ─────────────────────────────────────────────────────
  {
    id: '49', name: 'HubSpot AI', slug: 'hubspot-ai',
    tagline: 'AI-powered CRM and marketing platform',
    description: 'HubSpot AI adds generative content creation, predictive lead scoring, conversation intelligence, and AI-powered analytics to the leading CRM platform.',
    category: 'Business & Marketing', categorySlug: 'business', logo: '🔶',
    website: 'https://hubspot.com/artificial-intelligence', pricing: 'Freemium', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.4, reviews: 68000, tags: ['CRM', 'Marketing', 'Sales', 'AI Writing', 'Lead Scoring'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Basic CRM', 'Email marketing', 'Limited AI', '1 user'] },
      { name: 'Starter', price: '₹1,990/mo', monthly: 1990, features: ['Marketing hub', 'AI content tools', 'Email automation', '2 users'], popular: true },
    ]
  },
  {
    id: '50', name: 'Salesforce Einstein', slug: 'salesforce-einstein',
    tagline: "AI for the world's #1 CRM",
    description: 'Salesforce Einstein AI brings predictive analytics, natural language processing, and generative AI to Sales Cloud, Service Cloud, and Marketing Cloud.',
    category: 'Business & Marketing', categorySlug: 'business', logo: '⚡',
    website: 'https://salesforce.com/ai', pricing: 'Paid', startingPrice: '₹1,660/mo', monthlyPrice: 1660,
    rating: 4.3, reviews: 41000, tags: ['CRM', 'Salesforce', 'Enterprise', 'Predictive', 'Sales AI'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Einstein for Sales', price: '₹1,660/mo', monthly: 1660, features: ['Lead scoring', 'Opportunity insights', 'AI forecasting', 'Einstein Copilot'], popular: true },
    ]
  },

  // ── Meetings & Transcription ─────────────────────────────────────────────────
  {
    id: '51', name: 'Otter.ai', slug: 'otter-ai',
    tagline: 'AI meeting notes and transcription',
    description: 'Otter.ai automatically transcribes meetings, generates summaries, and captures action items from Zoom, Google Meet, Teams, and in-person conversations in real-time.',
    category: 'Meetings & Transcription', categorySlug: 'meetings', logo: '🦦',
    website: 'https://otter.ai', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.5, reviews: 78000, tags: ['Transcription', 'Meeting Notes', 'Zoom', 'Summaries', 'Action Items'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['300 min/mo transcription', '3 imports/mo', 'Basic summaries', 'Mobile app'] },
      { name: 'Pro', price: '₹830/mo', monthly: 830, features: ['1200 min/mo', 'Advanced summaries', 'Custom vocabulary', 'Zoom integration'], popular: true },
    ]
  },
  {
    id: '52', name: 'Fireflies.ai', slug: 'fireflies-ai',
    tagline: 'AI notetaker for every meeting',
    description: 'Fireflies.ai records, transcribes, and summarizes all your meetings. Search across transcripts, extract action items, and integrate with 50+ tools including Slack and CRM.',
    category: 'Meetings & Transcription', categorySlug: 'meetings', logo: '🦋',
    website: 'https://fireflies.ai', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.5, reviews: 52000, tags: ['Meeting Notes', 'Transcript Search', 'CRM Integration', 'Slack', 'Action Items'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['800 min storage', 'AI summaries', 'Basic search', 'Zapier integration'] },
      { name: 'Pro', price: '₹830/mo', monthly: 830, features: ['Unlimited storage', 'Smart search', 'CRM sync', 'Analytics'], popular: true },
    ]
  },
  {
    id: '53', name: 'Fathom', slug: 'fathom',
    tagline: 'Free AI meeting recorder and summarizer',
    description: 'Fathom is a completely free AI meeting recorder that takes notes, highlights key moments, and creates summaries so you can focus on the conversation. No time limit.',
    category: 'Meetings & Transcription', categorySlug: 'meetings', logo: '🐳',
    website: 'https://fathom.video', pricing: 'Free', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.7, reviews: 29000, tags: ['Free', 'Meeting Recorder', 'Highlights', 'Summaries', 'No Limit'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Unlimited recordings', 'AI summaries', 'Video highlights', 'CRM sync'] },
      { name: 'Team', price: '₹830/mo', monthly: 830, features: ['Team workspace', 'Analytics', 'Custom templates', 'Priority support'], popular: true },
    ]
  },
  {
    id: '54', name: 'Granola', slug: 'granola',
    tagline: 'AI notepad that enhances your meeting notes',
    description: 'Granola sits quietly in the background of your Mac, listens to meetings, and enhances the notes you take with AI — giving you smarter, richer meeting notes effortlessly.',
    category: 'Meetings & Transcription', categorySlug: 'meetings', logo: '🌾',
    website: 'https://granola.ai', pricing: 'Freemium', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.6, reviews: 12000, tags: ['Mac', 'Notes Enhancement', 'Background', 'Meeting', 'Smart Notes'],
    featured: false, new: true,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['25 meetings/mo', 'AI note enhancement', 'Mac app', 'Basic features'] },
      { name: 'Pro', price: '₹830/mo', monthly: 830, features: ['Unlimited meetings', 'CRM integration', 'Custom prompts', 'Sharing'], popular: true },
    ]
  },

  // ── Learning ────────────────────────────────────────────────────────────────
  {
    id: '55', name: 'Khanmigo', slug: 'khanmigo',
    tagline: "Khan Academy's AI tutor for everyone",
    description: "Khanmigo by Khan Academy is an AI tutor that guides students through problems using the Socratic method — asking questions instead of giving answers to promote deeper learning.",
    category: 'Learning', categorySlug: 'learning', logo: '🎓',
    website: 'https://khanacademy.org/khanmigo', pricing: 'Paid', startingPrice: '₹830/mo', monthlyPrice: 830,
    rating: 4.6, reviews: 24000, tags: ['Tutoring', 'Socratic Method', 'Khan Academy', 'Students', 'K-12'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Khanmigo', price: '₹830/mo', monthly: 830, features: ['Unlimited tutoring', 'All subjects', 'Safe for kids', 'Progress tracking'], popular: true },
    ]
  },
  {
    id: '56', name: 'Quizlet AI', slug: 'quizlet-ai',
    tagline: 'AI-powered study tools and flashcards',
    description: 'Quizlet uses AI to create personalized study plans, generate flashcards from any content, and explain concepts with Q-Chat — an AI tutor built on ChatGPT.',
    category: 'Learning', categorySlug: 'learning', logo: '📚',
    website: 'https://quizlet.com', pricing: 'Freemium', startingPrice: '₹580/mo', monthlyPrice: 580,
    rating: 4.5, reviews: 87000, tags: ['Flashcards', 'Study', 'AI Tutor', 'Students', 'Personalized'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Basic flashcards', 'Study modes', 'Mobile app', 'Limited AI'] },
      { name: 'Quizlet+', price: '₹580/mo', monthly: 580, features: ['Q-Chat AI tutor', 'Unlimited AI', 'Ad-free', 'Advanced study modes'], popular: true },
    ]
  },

  // ── AI Search ───────────────────────────────────────────────────────────────
  {
    id: '57', name: 'You.com', slug: 'youcom',
    tagline: 'Private AI search engine',
    description: "You.com is an AI search engine that doesn't track you. Features YouChat (ChatGPT-like), YouCode (coding), YouImagine (image gen), and standard web search — all free.",
    category: 'AI Search', categorySlug: 'ai-search', logo: '🔍',
    website: 'https://you.com', pricing: 'Freemium', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.3, reviews: 28000, tags: ['Search', 'Privacy', 'AI Chat', 'Free', 'No Tracking'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['YouChat', 'YouCode', 'Web search', 'No tracking'] },
      { name: 'YouPro', price: '₹1,660/mo', monthly: 1660, features: ['GPT-4 access', 'Claude access', 'Unlimited AI', 'Priority speed'], popular: true },
    ]
  },
  {
    id: '58', name: 'ChatGPT Search', slug: 'chatgpt-search',
    tagline: "OpenAI's AI search replacing Google",
    description: "ChatGPT Search gives real-time, cited web search results directly in ChatGPT. No ads, no tracking — just clean AI-powered answers with sources, now free for all users.",
    category: 'AI Search', categorySlug: 'ai-search', logo: '🌐',
    website: 'https://chatgpt.com', pricing: 'Freemium', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.6, reviews: 45000, tags: ['Search', 'Real-time', 'Citations', 'OpenAI', 'Free'],
    featured: false, new: true,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['Real-time web search', 'Cited answers', 'News & sports', 'Stock prices'] },
      { name: 'Plus', price: '₹1,650/mo', monthly: 1650, features: ['Unlimited search', 'GPT-4o', 'Advanced analysis', 'Priority'], popular: true },
    ]
  },
  {
    id: '59', name: 'Phind', slug: 'phind',
    tagline: 'AI search engine for developers',
    description: 'Phind is an AI search engine built specifically for developers. It searches technical documentation, GitHub, Stack Overflow, and the web to answer coding questions.',
    category: 'AI Search', categorySlug: 'ai-search', logo: '💻',
    website: 'https://phind.com', pricing: 'Freemium', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.5, reviews: 19000, tags: ['Developer Search', 'Coding', 'Technical', 'GitHub', 'Stack Overflow'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['AI search', 'Developer focused', 'Code generation', 'Web search'] },
      { name: 'Pro', price: '₹1,660/mo', monthly: 1660, features: ['GPT-4 & Claude', 'Unlimited searches', 'Faster results', 'No limits'], popular: true },
    ]
  },
  {
    id: '60', name: 'Google Gemini Search', slug: 'google-ai-overviews',
    tagline: "Google's AI-powered search overviews",
    description: "Google's AI Overviews (formerly SGE) adds AI-generated summaries at the top of search results. Powered by Gemini, it answers complex queries with synthesized information from multiple sources.",
    category: 'AI Search', categorySlug: 'ai-search', logo: '🔍',
    website: 'https://google.com', pricing: 'Free', startingPrice: 'Free', monthlyPrice: 0,
    rating: 4.4, reviews: 89000, tags: ['Google', 'Search', 'AI Overview', 'Free', 'Gemini'],
    featured: false, new: false,
    pricingPlans: [{ name: 'Free', price: '₹0', monthly: 0, features: ['AI search overviews', 'Google integration', 'Gemini powered', 'Everyone'] }]
  },

  // ── Backup & Data Protection ─────────────────────────────────────────────────
  {
    id: '61', name: 'Commvault', slug: 'commvault',
    tagline: 'Intelligent data protection and cyber resilience',
    description: 'Commvault is a leading enterprise data protection platform offering backup, recovery, disaster recovery, and cyber resilience across on-premises, cloud, and SaaS environments. Trusted by Fortune 500 companies globally.',
    category: 'Backup & Data Protection', categorySlug: 'backup-protection', logo: '🛡️',
    website: 'https://commvault.com', pricing: 'Paid', startingPrice: 'Custom', monthlyPrice: 0,
    rating: 4.5, reviews: 18500, tags: ['Enterprise Backup', 'Cyber Resilience', 'Disaster Recovery', 'Cloud', 'SaaS Protection'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Backup & Recovery', price: 'Contact Sales', monthly: 0, features: ['On-prem & cloud backup', 'Granular recovery', 'Deduplication', 'Policy automation'] },
      { name: 'Complete Data Protection', price: 'Contact Sales', monthly: 0, features: ['Everything in Backup', 'Disaster recovery', 'Compliance', 'Air-gap protection'], popular: true },
      { name: 'Cloud Rewind', price: 'Contact Sales', monthly: 0, features: ['SaaS backup', 'Microsoft 365', 'Salesforce', 'Cloud-native recovery'] },
    ]
  },
  {
    id: '62', name: 'Cohesity', slug: 'cohesity',
    tagline: 'AI-powered data security and management',
    description: 'Cohesity provides a unified data management platform powered by AI. It combines backup, disaster recovery, file/object services, and data insights — eliminating mass data fragmentation across your enterprise.',
    category: 'Backup & Data Protection', categorySlug: 'backup-protection', logo: '🔵',
    website: 'https://cohesity.com', pricing: 'Paid', startingPrice: 'Custom', monthlyPrice: 0,
    rating: 4.6, reviews: 12400, tags: ['AI Data Management', 'Backup', 'Cyber Security', 'Multi-cloud', 'DataHawk'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'DataProtect', price: 'Contact Sales', monthly: 0, features: ['Backup & recovery', 'Instant mass restore', 'Global search', 'Cloud archival'] },
      { name: 'DataGovern', price: 'Contact Sales', monthly: 0, features: ['Data classification', 'Threat intelligence', 'Sensitive data scanning', 'Compliance'], popular: true },
      { name: 'Fort Knox', price: 'Contact Sales', monthly: 0, features: ['Isolated cloud vault', 'Ransomware recovery', 'Immutable backups', 'SaaS delivery'] },
    ]
  },
  {
    id: '63', name: 'Acronis', slug: 'acronis',
    tagline: 'Cyber protection — backup meets cybersecurity',
    description: 'Acronis pioneered cyber protection by combining backup, disaster recovery, and cybersecurity in one platform. Protects 20+ platforms including Windows, Mac, Linux, iOS, and Android.',
    category: 'Backup & Data Protection', categorySlug: 'backup-protection', logo: '🔐',
    website: 'https://acronis.com', pricing: 'Paid', startingPrice: '₹580/mo', monthlyPrice: 580,
    rating: 4.4, reviews: 31200, tags: ['Cyber Protection', 'Backup', 'Anti-ransomware', 'Cloud Backup', 'MSP'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Cyber Protect Essentials', price: '₹580/mo', monthly: 580, features: ['Backup & recovery', 'Ransomware protection', '5 devices', '50 GB cloud storage'] },
      { name: 'Cyber Protect Advanced', price: '₹1,250/mo', monthly: 1250, features: ['Everything in Essentials', 'Vulnerability assessment', 'Remote desktop', '500 GB cloud'], popular: true },
      { name: 'Cyber Protect Backup', price: '₹830/mo', monthly: 830, features: ['Backup-focused', 'Physical & virtual', 'Deduplication', 'Flexible storage'] },
    ]
  },
  {
    id: '64', name: 'Veeam', slug: 'veeam',
    tagline: 'The #1 data protection and ransomware recovery',
    description: 'Veeam is the global leader in data protection with 450,000+ customers. Provides backup, recovery, and data management for virtual, physical, cloud, SaaS, and Kubernetes environments.',
    category: 'Backup & Data Protection', categorySlug: 'backup-protection', logo: '🟢',
    website: 'https://veeam.com', pricing: 'Paid', startingPrice: '₹2,490/mo', monthlyPrice: 2490,
    rating: 4.7, reviews: 54300, tags: ['Backup', 'VMware', 'Azure', 'Kubernetes', 'Ransomware Recovery'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Foundation', price: '₹2,490/mo', monthly: 2490, features: ['VM backup', 'Physical server backup', 'Cloud storage', 'Basic monitoring'] },
      { name: 'Advanced', price: '₹4,150/mo', monthly: 4150, features: ['Everything in Foundation', 'SaaS backup', 'Advanced analytics', 'Instant VM recovery'], popular: true },
      { name: 'Premium', price: '₹6,640/mo', monthly: 6640, features: ['Everything in Advanced', 'Kubernetes backup', 'AI threat detection', 'Immutable storage', '24/7 support'] },
    ]
  },
  {
    id: '65', name: 'Dhruva', slug: 'dhruva',
    tagline: "India's trusted cloud backup and DR platform",
    description: 'Dhruva is an Indian cloud backup and disaster recovery platform designed for SMBs and enterprises. Offers localized data sovereignty with data centers in India, affordable pricing in INR, and 24/7 Indian support.',
    category: 'Backup & Data Protection', categorySlug: 'backup-protection', logo: '🇮🇳',
    website: 'https://dhruvacloud.com', pricing: 'Paid', startingPrice: '₹1,500/mo', monthlyPrice: 1500,
    rating: 4.3, reviews: 3800, tags: ['India Backup', 'Data Sovereignty', 'SMB', 'Cloud DR', 'INR Pricing'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Starter', price: '₹1,500/mo', monthly: 1500, features: ['100 GB backup', 'File & folder backup', 'Indian data center', 'Email support'] },
      { name: 'Business', price: '₹4,500/mo', monthly: 4500, features: ['1 TB backup', 'Server backup', 'Disaster recovery', '24/7 support'], popular: true },
      { name: 'Enterprise', price: 'Contact Sales', monthly: 0, features: ['Unlimited storage', 'Custom DR plans', 'Dedicated account manager', 'SLA guarantee'] },
    ]
  },
  {
    id: '66', name: 'Veritas / OpenText', slug: 'veritas-opentext',
    tagline: 'Enterprise data management and information governance',
    description: 'Veritas (now part of OpenText) provides enterprise-grade backup, recovery, storage management, and information governance. Powers data protection for 87% of Fortune 500 companies with NetBackup and Backup Exec.',
    category: 'Backup & Data Protection', categorySlug: 'backup-protection', logo: '🏢',
    website: 'https://veritas.com', pricing: 'Paid', startingPrice: 'Custom', monthlyPrice: 0,
    rating: 4.4, reviews: 22100, tags: ['NetBackup', 'Enterprise', 'Compliance', 'eDiscovery', 'Information Governance'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'NetBackup', price: 'Contact Sales', monthly: 0, features: ['Backup & recovery', 'Deduplication', 'Cloud storage', 'Orchestrated recovery'] },
      { name: 'Backup Exec', price: 'Contact Sales', monthly: 0, features: ['SMB-focused', 'Physical & virtual', 'Cloud storage', 'Simple management'], popular: true },
      { name: 'Alta Data Protection', price: 'Contact Sales', monthly: 0, features: ['SaaS-based', 'Multi-cloud', 'Ransomware recovery', 'Compliance & governance'] },
    ]
  },
  {
    id: '67', name: 'Rubrik', slug: 'rubrik',
    tagline: 'Cyber recovery and data security cloud',
    description: 'Rubrik is a cloud data management and cyber recovery platform. Provides zero-trust data security, ransomware protection, and instant recovery for enterprise workloads across cloud, on-premises, and SaaS.',
    category: 'Backup & Data Protection', categorySlug: 'backup-protection', logo: '💎',
    website: 'https://rubrik.com', pricing: 'Paid', startingPrice: 'Custom', monthlyPrice: 0,
    rating: 4.7, reviews: 15700, tags: ['Zero Trust', 'Ransomware Recovery', 'Cloud Data', 'Immutable', 'Microsoft 365'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Security Cloud', price: 'Contact Sales', monthly: 0, features: ['Data observability', 'Ransomware investigation', 'Threat hunting', 'Sensitive data monitoring'] },
      { name: 'Data Protection', price: 'Contact Sales', monthly: 0, features: ['Backup & recovery', 'Instant recovery', 'Cloud archive', 'Cluster management'], popular: true },
      { name: 'Cyber Recovery', price: 'Contact Sales', monthly: 0, features: ['Everything in Data Protection', 'Isolated recovery environment', 'Orchestrated DR', 'Compliance'] },
    ]
  },
]

// ── Free Trial Tools ───────────────────────────────────────────────────────────
// Appended as separate entries with pricing: 'Free Trial'
const freeTrialTools: AITool[] = [
  {
    id: 'ft1', name: 'Jasper AI Trial', slug: 'jasper-trial',
    tagline: '7-day free trial of Jasper AI writing platform',
    description: 'Try Jasper AI free for 7 days — full access to all templates, Brand Voice, SEO integration, and AI chat. No credit card required to start.',
    category: 'Writing & Content', categorySlug: 'writing', logo: '✍️',
    website: 'https://jasper.ai/free-trial', pricing: 'Free Trial', startingPrice: '7 days free', monthlyPrice: 0,
    rating: 4.4, reviews: 72000, tags: ['Writing', 'Marketing', 'Trial', '7 Days', 'No Credit Card'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free Trial', price: '₹0 for 7 days', monthly: 0, features: ['Full feature access', 'All templates', 'AI chat', 'Brand Voice', 'No credit card'], popular: true },
      { name: 'Creator (after trial)', price: '₹2,900/mo', monthly: 2900, features: ['Unlimited words', 'SEO tools', '1 brand voice'] },
    ]
  },
  {
    id: 'ft2', name: 'HeyGen Trial', slug: 'heygen-trial',
    tagline: 'Create AI avatar videos free — 1 video on us',
    description: 'HeyGen offers a free trial with 1 video credit to create your first AI avatar video. Experience professional video creation without any upfront cost.',
    category: 'Video Generation', categorySlug: 'video-generation', logo: '👤',
    website: 'https://heygen.com', pricing: 'Free Trial', startingPrice: '1 video free', monthlyPrice: 0,
    rating: 4.7, reviews: 42000, tags: ['Avatar', 'Video', 'Trial', 'Free Credit', 'Marketing'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free Trial', price: '₹0', monthly: 0, features: ['1 free video', 'AI avatar', '720p quality', 'Watermark'], popular: true },
      { name: 'Creator (after trial)', price: '₹2,490/mo', monthly: 2490, features: ['15 credits/mo', 'No watermark', '1080p'] },
    ]
  },
  {
    id: 'ft3', name: 'Synthesia Trial', slug: 'synthesia-trial',
    tagline: 'Make 3 free AI presenter videos with Synthesia',
    description: 'Synthesia free trial includes 3 video scenes, access to 10+ AI avatars, 120+ languages, and text-to-speech. Perfect to test before committing.',
    category: 'Video Generation', categorySlug: 'video-generation', logo: '🎭',
    website: 'https://synthesia.io', pricing: 'Free Trial', startingPrice: '3 videos free', monthlyPrice: 0,
    rating: 4.5, reviews: 31000, tags: ['Presenter', 'Avatar', 'Trial', '120+ Languages', 'Enterprise'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free Trial', price: '₹0', monthly: 0, features: ['3 video scenes', '10+ AI avatars', '120+ languages', 'No credit card'], popular: true },
      { name: 'Starter (after trial)', price: '₹2,490/mo', monthly: 2490, features: ['10 videos/mo', '120+ avatars'] },
    ]
  },
  {
    id: 'ft4', name: 'Writesonic Trial', slug: 'writesonic-trial',
    tagline: '10,000 free words with Writesonic',
    description: 'Writesonic gives you 10,000 free words every month — no credit card needed. Access AI blog writer, ad copy generator, landing page builder and Chatsonic.',
    category: 'Writing & Content', categorySlug: 'writing', logo: '🖊️',
    website: 'https://writesonic.com', pricing: 'Free Trial', startingPrice: '10K words free', monthlyPrice: 0,
    rating: 4.3, reviews: 43000, tags: ['Writing', 'SEO', 'Blog', 'Free Words', 'No Credit Card'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free Trial', price: '₹0/mo', monthly: 0, features: ['10,000 words/mo', 'All templates', 'Chatsonic', '25+ languages'], popular: true },
      { name: 'Individual (paid)', price: '₹1,250/mo', monthly: 1250, features: ['Unlimited words', 'SEO checker'] },
    ]
  },
  {
    id: 'ft5', name: 'Runway Trial', slug: 'runway-trial',
    tagline: '125 free credits to generate AI videos',
    description: 'Runway gives every new user 125 one-time free credits to generate AI videos with Gen-3 Alpha. Experience professional video generation at no cost.',
    category: 'Video Generation', categorySlug: 'video-generation', logo: '🎬',
    website: 'https://runwayml.com', pricing: 'Free Trial', startingPrice: '125 credits free', monthlyPrice: 0,
    rating: 4.6, reviews: 63000, tags: ['Video', 'Gen-3', 'Trial', 'Free Credits', 'AI Video'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free Trial', price: '₹0 one-time', monthly: 0, features: ['125 one-time credits', 'Gen-3 Turbo access', '720p output', 'Watermark'], popular: true },
      { name: 'Standard (paid)', price: '₹1,250/mo', monthly: 1250, features: ['625 credits/mo', 'No watermark', '1080p'] },
    ]
  },
  {
    id: 'ft6', name: 'Adobe Firefly Trial', slug: 'adobe-firefly-trial',
    tagline: '25 free generative credits every month',
    description: 'Adobe Firefly gives 25 free generative credits per month with a free Adobe account — no Creative Cloud subscription needed. Generate images, vectors, and text effects.',
    category: 'Image Generation', categorySlug: 'image-generation', logo: '🔥',
    website: 'https://firefly.adobe.com', pricing: 'Free Trial', startingPrice: '25 credits/mo free', monthlyPrice: 0,
    rating: 4.5, reviews: 48000, tags: ['Image', 'Adobe', 'Free Credits', 'Commercial Safe', 'Monthly'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0/mo', monthly: 0, features: ['25 credits/mo', 'Image generation', 'Text effects', 'Web app', 'No CC needed'], popular: true },
      { name: 'Creative Cloud', price: '₹1,650/mo', monthly: 1650, features: ['1000 credits/mo', 'All Firefly models'] },
    ]
  },
  {
    id: 'ft7', name: 'ElevenLabs Trial', slug: 'elevenlabs-trial',
    tagline: '10,000 characters free every month',
    description: 'ElevenLabs free tier gives 10,000 characters per month — enough for 10+ minutes of premium AI voice audio. Includes 3 custom voice clones and API access.',
    category: 'Voice & Avatars', categorySlug: 'voice-avatars', logo: '🔊',
    website: 'https://elevenlabs.io', pricing: 'Free Trial', startingPrice: '10K chars/mo free', monthlyPrice: 0,
    rating: 4.8, reviews: 112000, tags: ['Voice', 'TTS', 'Free Tier', '10K Chars', 'Voice Clone'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free Tier', price: '₹0/mo', monthly: 0, features: ['10,000 chars/mo', '3 custom voices', 'Basic API', 'Personal use'], popular: true },
      { name: 'Starter', price: '₹415/mo', monthly: 415, features: ['30k chars/mo', 'Commercial license'] },
    ]
  },
  {
    id: 'ft8', name: 'Cursor Trial', slug: 'cursor-trial',
    tagline: '2 weeks free Pro trial of Cursor AI editor',
    description: 'Every new Cursor user gets a full 2-week Pro trial — unlimited AI completions, GPT-4o and Claude access, Composer, and background agents. No credit card required.',
    category: 'Coding', categorySlug: 'coding', logo: '⚡',
    website: 'https://cursor.sh', pricing: 'Free Trial', startingPrice: '14 days free Pro', monthlyPrice: 0,
    rating: 4.9, reviews: 98000, tags: ['Coding', 'IDE', 'Trial', '14 Days', 'Pro Access'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free Trial', price: '₹0 for 14 days', monthly: 0, features: ['Full Pro access', 'GPT-4o + Claude', 'Unlimited completions', 'Composer', 'No credit card'], popular: true },
      { name: 'Pro (after trial)', price: '₹1,660/mo', monthly: 1660, features: ['Unlimited completions', 'All models', 'Background agent'] },
    ]
  },
  {
    id: 'ft9', name: 'Midjourney Trial', slug: 'midjourney-trial',
    tagline: 'Try Midjourney via Discord free',
    description: 'New Midjourney users historically got 25 free image generations. While the free tier has changed, you can still explore via Discord server to see outputs before paying.',
    category: 'Image Generation', categorySlug: 'image-generation', logo: '🎨',
    website: 'https://midjourney.com', pricing: 'Free Trial', startingPrice: 'Discord preview', monthlyPrice: 0,
    rating: 4.8, reviews: 156000, tags: ['Image', 'Art', 'Discord', 'Preview', 'Trial'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Discord Preview', price: 'Free to view', monthly: 0, features: ['View community images', 'Try Discord bot', 'See capabilities', 'No generation'], popular: true },
      { name: 'Basic', price: '₹830/mo', monthly: 830, features: ['200 generations/mo', 'Web + Discord', 'Commercial use'] },
    ]
  },
  {
    id: 'ft10', name: 'Gamma Trial', slug: 'gamma-trial',
    tagline: '400 free AI credits for presentations',
    description: 'Gamma gives every new user 400 free AI credits — enough for 4-5 full presentations, websites, or documents. No time limit, no credit card required.',
    category: 'Presentations', categorySlug: 'presentations', logo: '✨',
    website: 'https://gamma.app', pricing: 'Free Trial', startingPrice: '400 credits free', monthlyPrice: 0,
    rating: 4.6, reviews: 45000, tags: ['Presentations', 'Free Credits', 'No Limit', 'Slides', 'Documents'],
    featured: false, new: false,
    pricingPlans: [
      { name: 'Free', price: '₹0', monthly: 0, features: ['400 AI credits', 'Unlimited decks', 'Share & publish', 'Gamma branding'], popular: true },
      { name: 'Plus', price: '₹830/mo', monthly: 830, features: ['Unlimited AI', 'No branding', 'Custom fonts', 'Analytics'] },
    ]
  },
]

// Merge free trial tools into main array
tools.push(...freeTrialTools)

export const featuredTools = tools.filter(t => t.featured)
export const newTools = tools.filter(t => t.new)

export function getToolBySlug(slug: string): AITool | undefined {
  return tools.find(t => t.slug === slug)
}

export function getToolsByCategory(categorySlug: string): AITool[] {
  return tools.filter(t => t.categorySlug === categorySlug)
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find(c => c.slug === slug)
}

export function searchTools(query: string): AITool[] {
  const q = query.toLowerCase()
  return tools.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.tagline.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q))
  )
}
