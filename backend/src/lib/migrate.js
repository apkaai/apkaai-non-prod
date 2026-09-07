/**
 * migrate.js — Run schema + seed data against PostgreSQL
 * Usage: node src/lib/migrate.js
 */
require('dotenv').config()
const fs      = require('fs')
const path    = require('path')
const { pool, query } = require('./db')

// ── All AI tool data ──────────────────────────────────────────────────────────
const categories = [
  { slug: 'ai-chat',          name: 'AI Chat & Research',       emoji: '💬', description: 'Conversational AI and research assistants',    tool_count: 8 },
  { slug: 'writing',          name: 'Writing & Content',         emoji: '✍️', description: 'AI-powered writing and content creation',      tool_count: 6 },
  { slug: 'image-generation', name: 'Image Generation',          emoji: '🎨', description: 'Create stunning visuals with AI',              tool_count: 6 },
  { slug: 'video-generation', name: 'Video Generation',          emoji: '🎬', description: 'Generate and edit videos with AI',             tool_count: 6 },
  { slug: 'music-audio',      name: 'Music & Audio',             emoji: '🎵', description: 'AI music composition and audio tools',         tool_count: 4 },
  { slug: 'coding',           name: 'Coding',                    emoji: '💻', description: 'AI-powered coding assistants',                 tool_count: 6 },
  { slug: 'presentations',    name: 'Presentations',             emoji: '📊', description: 'Create beautiful presentations with AI',       tool_count: 4 },
  { slug: 'research',         name: 'Research & Productivity',   emoji: '📚', description: 'AI research and productivity tools',           tool_count: 4 },
  { slug: 'design',           name: 'Design',                    emoji: '🖼️', description: 'AI design and creative tools',                tool_count: 4 },
  { slug: 'voice-avatars',    name: 'Voice & Avatars',           emoji: '🗣️', description: 'AI voice cloning and avatar creation',        tool_count: 4 },
  { slug: 'automation',       name: 'Automation',                emoji: '🤖', description: 'AI workflow automation tools',                 tool_count: 4 },
  { slug: 'business',         name: 'Business & Marketing',      emoji: '📈', description: 'AI tools for business and marketing',          tool_count: 4 },
  { slug: 'meetings',         name: 'Meetings & Transcription',  emoji: '📝', description: 'AI meeting assistants and transcription',      tool_count: 4 },
  { slug: 'learning',         name: 'Learning',                  emoji: '🧠', description: 'AI-powered learning platforms',                tool_count: 4 },
  { slug: 'ai-search',        name: 'AI Search',                 emoji: '🔍', description: 'Next-gen AI search engines',                   tool_count: 4 },
]

const tools = [
  { id:'1',  slug:'chatgpt',        name:'ChatGPT',          tagline:"The world's most popular AI assistant",       description:'ChatGPT by OpenAI is an advanced conversational AI capable of writing, coding, analysis, and much more.',   category:'AI Chat & Research', category_slug:'ai-chat',          logo:'🤖', website:'https://chat.openai.com',                 pricing:'Freemium', starting_price:'₹1,650/mo', monthly_price:1650, rating:4.8, reviews:124000, tags:['Chat','Writing','Coding','GPT-4o'],           featured:true,  is_new:false, badge:'Most Popular' },
  { id:'2',  slug:'claude',         name:'Claude',           tagline:"Anthropic's most thoughtful AI assistant",    description:"Claude by Anthropic excels at long-context understanding, nuanced reasoning, and safety.",                   category:'AI Chat & Research', category_slug:'ai-chat',          logo:'🧡', website:'https://claude.ai',                       pricing:'Freemium', starting_price:'₹1,650/mo', monthly_price:1650, rating:4.7, reviews:82000,  tags:['Chat','Long Context','Coding','Analysis'],    featured:true,  is_new:false, badge:"Editor's Choice" },
  { id:'3',  slug:'gemini',         name:'Gemini',           tagline:"Google's most capable multimodal AI",         description:'Gemini by Google is a multimodal AI that understands text, images, audio, video, and code.',               category:'AI Chat & Research', category_slug:'ai-chat',          logo:'💎', website:'https://gemini.google.com',               pricing:'Freemium', starting_price:'₹1,950/mo', monthly_price:1950, rating:4.6, reviews:71000,  tags:['Multimodal','Google','Workspace'],            featured:true,  is_new:false, badge:null },
  { id:'4',  slug:'perplexity',     name:'Perplexity',       tagline:'AI-powered answer engine with citations',     description:'Perplexity is an AI search engine that provides accurate, cited answers in real time.',                      category:'AI Chat & Research', category_slug:'ai-chat',          logo:'🔵', website:'https://perplexity.ai',                   pricing:'Freemium', starting_price:'₹1,660/mo', monthly_price:1660, rating:4.6, reviews:53000,  tags:['Search','Research','Citations'],              featured:true,  is_new:false, badge:null },
  { id:'5',  slug:'microsoft-copilot', name:'Microsoft Copilot', tagline:'AI built into Microsoft 365',            description:'Microsoft Copilot integrates GPT-4 into Word, Excel, PowerPoint, Teams and Outlook.',                      category:'AI Chat & Research', category_slug:'ai-chat',          logo:'🪟', website:'https://copilot.microsoft.com',           pricing:'Freemium', starting_price:'Free',      monthly_price:0,    rating:4.4, reviews:41000,  tags:['Microsoft','Office','Productivity'],          featured:false, is_new:false, badge:null },
  { id:'9',  slug:'cursor',         name:'Cursor',           tagline:'The AI-first code editor',                   description:'Cursor is a VS Code fork supercharged with AI. Chat with your entire codebase.',                          category:'Coding',             category_slug:'coding',           logo:'⚡', website:'https://cursor.sh',                       pricing:'Freemium', starting_price:'₹1,660/mo', monthly_price:1660, rating:4.9, reviews:98000,  tags:['Code Editor','AI Completion','VSCode'],       featured:true,  is_new:false, badge:'Top Rated' },
  { id:'10', slug:'github-copilot', name:'GitHub Copilot',  tagline:'AI pair programmer by GitHub',               description:'GitHub Copilot uses OpenAI to suggest code and complete functions in real-time.',                           category:'Coding',             category_slug:'coding',           logo:'🐙', website:'https://github.com/features/copilot',     pricing:'Freemium', starting_price:'₹830/mo',   monthly_price:830,  rating:4.7, reviews:112000, tags:['Code','GitHub','Autocomplete'],               featured:true,  is_new:false, badge:null },
  { id:'15', slug:'midjourney',     name:'Midjourney',       tagline:'Create stunning AI art and photography',      description:'Midjourney produces the most aesthetic and photorealistic AI images.',                                      category:'Image Generation',   category_slug:'image-generation', logo:'🎨', website:'https://midjourney.com',                  pricing:'Paid',     starting_price:'₹830/mo',   monthly_price:830,  rating:4.8, reviews:156000, tags:['Art','Photorealistic','Creative'],            featured:true,  is_new:false, badge:'Best for Art' },
  { id:'16', slug:'adobe-firefly',  name:'Adobe Firefly',   tagline:'Commercially safe generative AI',             description:'Adobe Firefly is commercially safe AI image generation built into Adobe Creative Cloud.',                   category:'Image Generation',   category_slug:'image-generation', logo:'🔥', website:'https://firefly.adobe.com',               pricing:'Freemium', starting_price:'₹1,650/mo', monthly_price:1650, rating:4.5, reviews:48000,  tags:['Adobe','Commercial','Creative Cloud'],        featured:false, is_new:false, badge:null },
  { id:'21', slug:'runway',         name:'Runway',           tagline:'Industry-standard AI video generation',       description:'Runway Gen-3 creates high-quality videos from text or image prompts.',                                     category:'Video Generation',   category_slug:'video-generation', logo:'🎬', website:'https://runwayml.com',                    pricing:'Freemium', starting_price:'₹1,250/mo', monthly_price:1250, rating:4.6, reviews:63000,  tags:['Text-to-Video','Gen-3','Professional'],       featured:true,  is_new:false, badge:null },
  { id:'22', slug:'heygen',         name:'HeyGen',           tagline:'AI avatar videos for business',               description:'HeyGen lets you create professional videos with AI avatars.',                                              category:'Video Generation',   category_slug:'video-generation', logo:'👤', website:'https://heygen.com',                      pricing:'Freemium', starting_price:'₹2,490/mo', monthly_price:2490, rating:4.7, reviews:42000,  tags:['Avatar','Marketing','Corporate'],             featured:true,  is_new:false, badge:'Best for Business' },
  { id:'27', slug:'jasper',         name:'Jasper',           tagline:'Enterprise AI writing for marketing teams',   description:'Jasper is an enterprise AI writing platform built for marketing teams.',                                     category:'Writing & Content',  category_slug:'writing',          logo:'✍️', website:'https://jasper.ai',                       pricing:'Paid',     starting_price:'₹2,900/mo', monthly_price:2900, rating:4.4, reviews:72000,  tags:['Marketing','Blog','Copywriting'],             featured:false, is_new:false, badge:null },
  { id:'28', slug:'grammarly',      name:'Grammarly',        tagline:'AI writing assistant used by 30M+ people',   description:'Grammarly uses AI to check grammar, tone, clarity, and plagiarism.',                                       category:'Writing & Content',  category_slug:'writing',          logo:'📝', website:'https://grammarly.com',                   pricing:'Freemium', starting_price:'₹1,250/mo', monthly_price:1250, rating:4.6, reviews:189000, tags:['Grammar','Writing','Plagiarism'],             featured:true,  is_new:false, badge:null },
  { id:'33', slug:'suno',           name:'Suno',             tagline:'Create full songs with vocals from text',     description:'Suno generates complete songs with vocals, instruments, and lyrics from a text prompt.',                    category:'Music & Audio',      category_slug:'music-audio',      logo:'🎵', website:'https://suno.com',                        pricing:'Freemium', starting_price:'₹830/mo',   monthly_price:830,  rating:4.7, reviews:89000,  tags:['Music','Vocals','Song Generation'],           featured:true,  is_new:false, badge:'Trending' },
  { id:'34', slug:'elevenlabs',     name:'ElevenLabs',       tagline:'Most realistic AI voice generation',          description:'ElevenLabs creates hyper-realistic AI voices and voice clones.',                                           category:'Music & Audio',      category_slug:'music-audio',      logo:'🔊', website:'https://elevenlabs.io',                   pricing:'Freemium', starting_price:'₹415/mo',   monthly_price:415,  rating:4.8, reviews:112000, tags:['Voice Clone','TTS','Dubbing'],                featured:true,  is_new:false, badge:null },
  { id:'37', slug:'gamma',          name:'Gamma',            tagline:'Beautiful AI presentations in seconds',       description:'Gamma uses AI to create stunning presentations from a text prompt.',                                      category:'Presentations',      category_slug:'presentations',    logo:'✨', website:'https://gamma.app',                       pricing:'Freemium', starting_price:'Free',      monthly_price:0,    rating:4.6, reviews:45000,  tags:['Presentations','Slides','Design'],            featured:false, is_new:false, badge:null },
  { id:'38', slug:'canva-ai',       name:'Canva AI',         tagline:'Design anything with AI magic',               description:"Canva's Magic Studio includes AI image generation, video creation, and text-to-design.",                  category:'Presentations',      category_slug:'presentations',    logo:'🎨', website:'https://canva.com',                       pricing:'Freemium', starting_price:'₹415/mo',   monthly_price:415,  rating:4.7, reviews:198000, tags:['Design','AI Magic','Templates'],              featured:true,  is_new:false, badge:'Most Versatile' },
  { id:'41', slug:'notebooklm',     name:'NotebookLM',       tagline:'AI research assistant by Google',             description:"NotebookLM by Google lets you upload documents and ask questions from your source material.",              category:'Research & Productivity', category_slug:'research',    logo:'📓', website:'https://notebooklm.google.com',           pricing:'Free',     starting_price:'Free',      monthly_price:0,    rating:4.7, reviews:32000,  tags:['Research','Documents','Google'],              featured:false, is_new:false, badge:null },
  { id:'45', slug:'zapier-ai',      name:'Zapier AI',        tagline:'Automate workflows with AI in plain English', description:'Zapier AI lets you build powerful automations using natural language.',                                    category:'Automation',         category_slug:'automation',       logo:'⚡', website:'https://zapier.com/ai',                   pricing:'Freemium', starting_price:'₹1,990/mo', monthly_price:1990, rating:4.5, reviews:92000,  tags:['Automation','No-Code','Workflows'],           featured:false, is_new:false, badge:null },
  { id:'51', slug:'otter-ai',       name:'Otter.ai',         tagline:'AI meeting notes and transcription',          description:'Otter.ai automatically transcribes meetings and generates summaries.',                                    category:'Meetings & Transcription', category_slug:'meetings',    logo:'🦦', website:'https://otter.ai',                        pricing:'Freemium', starting_price:'₹830/mo',   monthly_price:830,  rating:4.5, reviews:78000,  tags:['Transcription','Meeting Notes','Zoom'],       featured:false, is_new:false, badge:null },
  { id:'55', slug:'khanmigo',       name:'Khanmigo',         tagline:"Khan Academy's AI tutor for everyone",         description:"Khanmigo by Khan Academy guides students using the Socratic method.",                                    category:'Learning',           category_slug:'learning',         logo:'🎓', website:'https://khanacademy.org/khanmigo',        pricing:'Paid',     starting_price:'₹830/mo',   monthly_price:830,  rating:4.6, reviews:24000,  tags:['Tutoring','Khan Academy','Students'],         featured:false, is_new:false, badge:null },
  { id:'57', slug:'youcom',         name:'You.com',          tagline:'Private AI search engine',                    description:"You.com is an AI search engine that doesn't track you.",                                                  category:'AI Search',          category_slug:'ai-search',        logo:'🔍', website:'https://you.com',                         pricing:'Freemium', starting_price:'Free',      monthly_price:0,    rating:4.3, reviews:28000,  tags:['Search','Privacy','AI Chat'],                 featured:false, is_new:false, badge:null },
  { id:'58', slug:'chatgpt-search', name:'ChatGPT Search',  tagline:"OpenAI's AI search replacing Google",         description:'ChatGPT Search gives real-time, cited web search results directly in ChatGPT.',                           category:'AI Search',          category_slug:'ai-search',        logo:'🌐', website:'https://chatgpt.com',                     pricing:'Freemium', starting_price:'Free',      monthly_price:0,    rating:4.6, reviews:45000,  tags:['Search','Real-time','OpenAI'],                featured:false, is_new:true,  badge:null },
]

async function migrate() {
  console.log('Running schema migration...')
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(schemaSql)
  console.log('Schema created.')

  console.log('Seeding categories...')
  for (const cat of categories) {
    await query(
      `INSERT INTO categories (slug, name, emoji, description, tool_count)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (slug) DO UPDATE SET name=$2, emoji=$3, description=$4, tool_count=$5`,
      [cat.slug, cat.name, cat.emoji, cat.description, cat.tool_count]
    )
  }
  console.log(`  ${categories.length} categories seeded.`)

  console.log('Seeding tools...')
  for (const t of tools) {
    await query(
      `INSERT INTO tools (id,slug,name,tagline,description,category,category_slug,logo,website,pricing,starting_price,monthly_price,rating,reviews,tags,featured,is_new,badge)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (slug) DO UPDATE SET
         name=$3, tagline=$4, description=$5, category=$6, logo=$8,
         website=$9, pricing=$10, starting_price=$11, monthly_price=$12,
         rating=$13, reviews=$14, tags=$15, featured=$16, is_new=$17, badge=$18`,
      [t.id,t.slug,t.name,t.tagline,t.description,t.category,t.category_slug,
       t.logo,t.website,t.pricing,t.starting_price,t.monthly_price,
       t.rating,t.reviews,t.tags,t.featured,t.is_new,t.badge]
    )
  }
  console.log(`  ${tools.length} tools seeded.`)
  console.log('Migration complete!')
  await pool.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
