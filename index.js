import { characters, getRequestHeaders, this_chid, saveSettingsDebounced, generateRaw, name1 } from '../../../../script.js';
import { getContext, extension_settings, renderExtensionTemplateAsync } from '../../../extensions.js';
import { POPUP_TYPE, callGenericPopup, Popup } from '../../../popup.js';
import { initPersona, getUserAvatars, setUserAvatar, user_avatar } from '../../../personas.js';
import { power_user } from '../../../power-user.js';
import { tags, tag_map, addTagsToEntity, getTagKeyForEntity } from '../../../tags.js';

// Simple UUID generator
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const MODULE_NAME = 'Ultimate-Persona';
const EXTENSION_PATH = 'third-party/Ultimate-Persona'; // For template/asset loading
const TAG_NAME = 'Ultimate Persona';
const TAG_COLOR = '#9333ea';
const TAG_COLOR2 = '#c084fc';

// Offline data
let offlineData = {
    vibes: [], positiveTraits: [], negativeTraits: [],
    heights: [], bodyTypes: [], hairColors: [], hairTypes: [],
    clothing: {}, professions: {}, weapons: [],
    narrationStyles: [], plotModes: [], auTypes: [], nsfwScenarios: [],
    upbringings: [], lifeEvents: [], motivations: [], secrets: [],
    canonTropes: [
        { id: 'enemy_approaches', name: 'Enemy Approaches', description: 'A known enemy or antagonist enters the scene', keywords: ['enemy', 'antagonist', 'villain', 'rival', 'foe'] },
        { id: 'betrayal_revealed', name: 'Betrayal Revealed', description: 'A betrayal or secret is uncovered', keywords: ['betrayal', 'secret', 'reveal', 'truth', 'deception'] },
        { id: 'moral_dilemma', name: 'Moral Dilemma', description: 'Character faces a difficult moral choice', keywords: ['moral', 'dilemma', 'choice', 'ethics', 'decision'] },
        { id: 'power_struggle', name: 'Power Struggle', description: 'Conflict over authority or control', keywords: ['power', 'authority', 'control', 'leadership', 'dominance'] },
        { id: 'forbidden_knowledge', name: 'Forbidden Knowledge', description: 'Discovery of dangerous or restricted information', keywords: ['knowledge', 'secret', 'forbidden', 'hidden', 'discovery'] },
        { id: 'duty_vs_desire', name: 'Duty vs Desire', description: 'Conflict between obligations and personal wants', keywords: ['duty', 'desire', 'obligation', 'responsibility', 'conflict'] },
        { id: 'rescue_mission', name: 'Rescue Mission', description: 'Character must save someone or something', keywords: ['rescue', 'save', 'mission', 'help', 'aid'] },
        { id: 'ritual_ceremony', name: 'Ritual or Ceremony', description: 'Important ceremonial event', keywords: ['ritual', 'ceremony', 'rite', 'tradition', 'ceremonial'] },
        { id: 'ancient_prophecy', name: 'Ancient Prophecy', description: 'Prophecy coming to fruition', keywords: ['prophecy', 'prophesy', 'foretell', 'prediction', 'omen'] },
        { id: 'artifact_discovery', name: 'Artifact Discovery', description: 'Finding a powerful or significant object', keywords: ['artifact', 'relic', 'discovery', 'treasure', 'object'] },
        { id: 'alliance_formed', name: 'Alliance Formed', description: 'Forming a new partnership or alliance', keywords: ['alliance', 'partnership', 'pact', 'agreement', 'union'] },
        { id: 'war_begins', name: 'War Begins', description: 'Start of a major conflict or battle', keywords: ['war', 'battle', 'conflict', 'fight', 'combat'] },
    ],
    nsfwScenarios: [
        { id: 'first_time', name: 'First Time', description: 'New experiences, nervousness and discovery' },
        { id: 'tension_release', name: 'Tension Release', description: 'Built-up attraction finally breaks' },
        { id: 'reunion', name: 'Reunion', description: 'Meeting again after time apart' },
        { id: 'forbidden', name: 'Forbidden', description: 'Shouldn\'t happen but does anyway' },
        { id: 'rivals', name: 'Rivals to Lovers', description: 'Hate turns to passion' },
        { id: 'explicit_first_encounter', name: 'Explicit First Encounter', description: 'Direct, passionate first meeting with explicit physical intimacy' },
        { id: 'explicit_domination', name: 'Explicit Domination', description: 'Power dynamics with explicit dominant/submissive elements' },
        { id: 'explicit_rough', name: 'Explicit Rough', description: 'Intense, rough physical encounter with explicit details' },
        { id: 'explicit_tender', name: 'Explicit Tender', description: 'Gentle, loving intimate encounter with explicit romantic details' },
        { id: 'explicit_public', name: 'Explicit Public', description: 'Risky public encounter with explicit intimate details' },
        { id: 'explicit_roleplay', name: 'Explicit Roleplay', description: 'Fantasy roleplay scenario with explicit intimate elements' },
        { id: 'explicit_bdsm', name: 'Explicit BDSM', description: 'Bondage, dominance, submission with explicit details' },
    ],
    booruTagMappings: {},
};

// Default settings
const defaultSettings = {
    // Prompts
    personaPrompt: '',
    hooksPrompt: '',
    greetingPrompt: '',
    enhancePrompt: '',
    // Defaults
    defaultPlotMode: 'canon',
    defaultNarration: 'mixed',
    defaultSetting: 'modern',
    traitCount: 6,
    hookCount: 4,
    // Visual
    enableAnimations: true,
    enableConfetti: true,
    autoScroll: true,
    // Data
    templates: [],
    history: [],
    greetingLibrary: [],
};

// Default prompts
const DEFAULT_PERSONA_PROMPT = `Create a detailed persona based on these specifications:

TARGET CHARACTER: {{char_name}}
Character's traits: {{char_traits}}

PERSONA SPECIFICATIONS:
- Name: {{persona_name}}
- Gender: {{gender}}
- Vibe/Aesthetic: {{vibe}}
- Profession: {{profession}}
- Relationship dynamic: {{dynamic_type}} ({{dynamic_description}})

PHYSICAL APPEARANCE:
{{physical_description}}

PERSONALITY TRAITS:
- Positive: {{positive_traits}}
- Flaws: {{negative_traits}}

BACKGROUND ELEMENTS:
{{background_info}}

===== CRITICAL RULES - READ CAREFULLY =====
You are writing a CHARACTER PROFILE, NOT a story pitch.

FORBIDDEN CONTENT - DO NOT INCLUDE:
❌ Plot suggestions or story ideas
❌ "Potential scenarios" or "possible storylines"
❌ "Their story might unfold..." or similar
❌ "Adventures could include..."
❌ "This could lead to..."
❌ Any forward-looking narrative suggestions
❌ Speculation about what "might happen"

ONLY describe WHO this person IS right now - their static traits, not future possibilities.
===========================================

Write a structured persona description with these EXACT sections:

## Physical Appearance
Describe their physical appearance in present tense. Be vivid and specific about how they look RIGHT NOW.

## Personality  
Describe their personality traits and how they typically behave. Present tense only. No "this could lead to" statements.

## Background
Their past history - what ALREADY HAPPENED to make them who they are. Past tense narrative only.

## Interaction Style
How they typically act around {{char_name}} given their {{dynamic_type}} dynamic. Describe behavioral PATTERNS, not potential plot events.`;

const DEFAULT_HOOKS_PROMPT = `Generate {{hook_count}} plot hooks for these two characters.

CHARACTER: {{char_name}}
World/Setting: {{char_scenario}}
Traits: {{char_traits}}

PERSONA: {{persona_name}}
Profession: {{profession}}
Dynamic: {{dynamic_type}}
Traits: {{positive_traits}}
Flaws: {{negative_traits}}

PLOT MODE: {{plot_mode}}
{{plot_mode_instructions}}

Generate unique, specific hooks (2-3 sentences each).
Respond ONLY with JSON: { "hooks": ["hook1", "hook2", ...] }`;

const DEFAULT_GREETING_PROMPT = `Write an alternate greeting for {{char_name}}.

SCENARIO: {{plot_hook}}
NARRATION STYLE: {{narration_style}}

Write 2-4 paragraphs from {{char_name}}'s perspective.
Write ONLY the greeting text.`;

const DEFAULT_ENHANCE_PROMPT = `Enhance this into 2-3 vivid sentences:
"{{input}}"

Respond with ONLY the enhanced text.`;

async function loadOfflineData() {
    try {
        const response = await fetch(`/scripts/extensions/${EXTENSION_PATH}/data.json`);
        if (response.ok) {
            const loadedData = await response.json();
            // Merge with defaults, preserving defaults if loaded data doesn't have them
            offlineData = {
                ...loadedData,
                // Preserve default canon tropes if not in loaded data
                canonTropes: loadedData.canonTropes && loadedData.canonTropes.length > 0
                    ? loadedData.canonTropes
                    : offlineData.canonTropes,
                // Merge NSFW scenarios - combine defaults with loaded ones
                nsfwScenarios: loadedData.nsfwScenarios && loadedData.nsfwScenarios.length > 0
                    ? [...offlineData.nsfwScenarios, ...loadedData.nsfwScenarios.filter(s => !offlineData.nsfwScenarios.find(d => d.id === s.id))]
                    : offlineData.nsfwScenarios,
            };
        }
    } catch (e) {
        console.warn('[Ultimate Persona] Could not load offline data:', e);
    }
}

function loadSettings() {
    extension_settings[MODULE_NAME] = extension_settings[MODULE_NAME] || {};
    const s = extension_settings[MODULE_NAME];

    // Set defaults
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (s[key] === undefined) s[key] = value;
    }

    // Set default prompts if empty
    if (!s.personaPrompt) s.personaPrompt = DEFAULT_PERSONA_PROMPT;
    if (!s.hooksPrompt) s.hooksPrompt = DEFAULT_HOOKS_PROMPT;
    if (!s.greetingPrompt) s.greetingPrompt = DEFAULT_GREETING_PROMPT;
    if (!s.enhancePrompt) s.enhancePrompt = DEFAULT_ENHANCE_PROMPT;
}

function saveSettings() {
    saveSettingsDebounced();
}

function getSettings() {
    return extension_settings[MODULE_NAME];
}

// ==================== UTILITY FUNCTIONS ====================

function getCharacterData(charIndex) {
    if (charIndex < 0 || charIndex >= characters.length) return null;
    const char = characters[charIndex];
    return {
        name: char.name || '',
        description: char.description || char.data?.description || '',
        personality: char.personality || char.data?.personality || '',
        scenario: char.scenario || char.data?.scenario || '',
        first_mes: char.first_mes || char.data?.first_mes || '',
        avatar: char.avatar || '',
    };
}

function setButtonLoading(btn, loading) {
    if (loading) {
        btn.prop('disabled', true);
        btn.find('.btn-text').hide();
        btn.find('i:not(.fa-spinner)').hide();
        if (!btn.find('.fa-spinner').length) btn.prepend('<i class="fa-solid fa-spinner fa-spin"></i> ');
        btn.find('.fa-spinner').show();
    } else {
        btn.prop('disabled', false);
        btn.find('.btn-text').show();
        btn.find('i:not(.fa-spinner)').show();
        btn.find('.fa-spinner').hide();
    }
}

function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}

function getRandomFromOffline(type, count, exclude = []) {
    const source = offlineData[type] || [];
    return shuffle(source.filter(t => !exclude.includes(t))).slice(0, count);
}

// ==================== CONFETTI ====================

function launchConfetti(canvas) {
    if (!getSettings().enableConfetti) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const particles = [];

    // Group particles by color to minimize state changes
    colors.forEach(color => {
        for (let i = 0; i < 25; i++) { // 25 * 6 colors = 150 particles
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                r: Math.random() * 6 + 4,
                d: Math.random() * 150 + 50,
                color: color,
                tilt: Math.floor(Math.random() * 10) - 10,
                tiltAngleIncrement: Math.random() * 0.07 + 0.05,
                tiltAngle: 0,
            });
        }
    });

    let animationId;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allDone = true;

        // Batch drawing by color
        colors.forEach(color => {
            ctx.beginPath();
            ctx.strokeStyle = color;

            // Draw all particles of this color
            particles.filter(p => p.color === color).forEach(p => {
                ctx.lineWidth = p.r / 2;
                ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);

                // Update physics
                p.tiltAngle += p.tiltAngleIncrement;
                p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
                p.x += Math.sin(0);
                p.tilt = Math.sin(p.tiltAngle) * 15;

                if (p.y < canvas.height) allDone = false;
            });

            ctx.stroke();
        });

        if (!allDone) {
            animationId = requestAnimationFrame(draw);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    draw();
    setTimeout(() => {
        cancelAnimationFrame(animationId);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
}

// ==================== AI FUNCTIONS ====================

async function analyzeCharacter(charData) {
    const prompt = `Analyze this character:
Name: ${charData.name}
Description: ${charData.description}
Personality: ${charData.personality}
Scenario: ${charData.scenario}

Provide JSON: { "traits": [...], "motivations": [...], "story_hooks": [...] }`;

    try {
        const response = await generateRaw({ prompt, systemPrompt: 'Respond only with valid JSON.' });
        const match = response.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
    } catch (e) {
        console.error('[Ultimate Persona] Analysis error:', e);
    }
    return { traits: ['complex'], motivations: ['connection'], story_hooks: ['meeting'] };
}

async function generateTraitsFromAI(charAnalysis, dynamicType, gender, vibe, existingSelected = []) {
    const settings = getSettings();
    const prompt = `Generate traits for a ${gender || 'any gender'} persona with vibe "${vibe || 'interesting'}".
They have a ${dynamicType || 'complement'} relationship with someone with traits: ${(charAnalysis.traits || []).join(', ')}.
${existingSelected.length > 0 ? `EXCLUDE: ${existingSelected.join(', ')}` : ''}

Respond with JSON: { "positive": [...${settings.traitCount} traits], "negative": [...${Math.max(3, settings.traitCount - 1)} flaws] }`;

    try {
        const response = await generateRaw({ prompt, systemPrompt: 'Respond only with valid JSON.' });
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            return {
                positive: (parsed.positive || []).filter(t => !existingSelected.includes(t)),
                negative: (parsed.negative || []).filter(t => !existingSelected.includes(t)),
            };
        }
    } catch (e) {
        console.error('[Ultimate Persona] Trait generation error:', e);
    }
    return null;
}

function getTraitsFromOffline(exclude = []) {
    const settings = getSettings();
    return {
        positive: getRandomFromOffline('positiveTraits', settings.traitCount, exclude),
        negative: getRandomFromOffline('negativeTraits', Math.max(3, settings.traitCount - 1), exclude),
    };
}

async function enhanceText(input) {
    const prompt = getSettings().enhancePrompt.replace('{{input}}', input);
    try {
        const response = await generateRaw({ prompt, systemPrompt: 'Enhance the text.' });
        return response.trim();
    } catch (e) {
        throw new Error('Failed to enhance text.');
    }
}

async function generateBackgroundStory(upbringing, lifeEvent, motivation, secret) {
    const elements = [];
    if (upbringing) elements.push(`Upbringing: ${upbringing}`);
    if (lifeEvent) elements.push(`Defining Event: ${lifeEvent}`);
    if (motivation) elements.push(`Core Motivation: ${motivation}`);
    if (secret) elements.push(`Hidden Secret: ${secret}`);

    if (elements.length === 0) return '';

    const prompt = `Create a brief, cohesive background story (2-3 sentences) from these elements:
${elements.join('\n')}

Write ONLY the background paragraph. No headers or formatting.`;

    try {
        const response = await generateRaw({ prompt, systemPrompt: 'Write a brief character backstory.' });
        return response.trim();
    } catch (e) {
        console.error('[Ultimate Persona] Background generation error:', e);
        return elements.join('. ');
    }
}

function generateBooruTags(personaData) {
    const tags = [];
    const mappings = offlineData.booruTagMappings || {};

    // Gender
    if (personaData.gender && mappings.genders?.[personaData.gender]) {
        tags.push(mappings.genders[personaData.gender]);
    }

    // Height
    if (personaData.height && mappings.heights?.[personaData.height]) {
        const heightTag = mappings.heights[personaData.height];
        if (heightTag) tags.push(heightTag);
    }

    // Body type
    if (personaData.bodyType && mappings.bodyTypes?.[personaData.bodyType]) {
        tags.push(mappings.bodyTypes[personaData.bodyType]);
    }

    // Hair color
    if (personaData.hairColor) {
        const mapped = mappings.hairColors?.[personaData.hairColor];
        tags.push(mapped || `${personaData.hairColor.toLowerCase()} hair`);
    }

    // Hair type
    if (personaData.hairType) {
        const mapped = mappings.hairTypes?.[personaData.hairType];
        tags.push(mapped || personaData.hairType.toLowerCase());
    }

    // Eye color
    if (personaData.eyeColor) {
        tags.push(`${personaData.eyeColor.toLowerCase()} eyes`);
    }

    // Clothing
    if (personaData.clothing) {
        const mapped = mappings.clothingStyles?.[personaData.clothing];
        tags.push(mapped || personaData.clothing.toLowerCase());
    }

    // Additional physical details - parse for common features
    if (personaData.physicalNotes) {
        const notes = personaData.physicalNotes.toLowerCase();
        // Scars
        if (notes.includes('scar')) {
            if (notes.includes('face') || notes.includes('cheek') || notes.includes('eye')) tags.push('facial scar');
            else tags.push('scar');
        }
        // Tattoos
        if (notes.includes('tattoo')) tags.push('tattoo');
        // Piercings
        if (notes.includes('piercing') || notes.includes('earring')) tags.push('piercing');
        // Glasses
        if (notes.includes('glasses') || notes.includes('spectacles')) tags.push('glasses');
        // Freckles
        if (notes.includes('freckle')) tags.push('freckles');
        // Beard/facial hair
        if (notes.includes('beard')) tags.push('beard');
        if (notes.includes('stubble')) tags.push('stubble');
        // Eye patch
        if (notes.includes('eyepatch') || notes.includes('eye patch')) tags.push('eyepatch');
        // Heterochromia
        if (notes.includes('heterochromia')) tags.push('heterochromia');
        // Prosthetic
        if (notes.includes('prosthetic') || notes.includes('mechanical arm') || notes.includes('cybernetic')) tags.push('prosthetic');
    }

    // Add quality tags
    tags.push('masterpiece', 'best quality', 'detailed face', 'detailed eyes');

    // Add portrait tags
    tags.push('upper body', 'portrait', 'looking at viewer');

    return tags.filter(t => t).join(', ');
}

function generateNaturalPrompt(personaData) {
    const parts = [];

    // Gender
    const genderText = personaData.gender === 'male' ? 'A man' :
        personaData.gender === 'female' ? 'A woman' :
            personaData.gender === 'non-binary' ? 'An androgynous person' : 'A person';

    parts.push(genderText);

    // Physical description
    const physicalParts = [];
    if (personaData.height) physicalParts.push(personaData.height.toLowerCase());
    if (personaData.bodyType) physicalParts.push(`with a ${personaData.bodyType.toLowerCase()} build`);
    if (physicalParts.length) parts.push(physicalParts.join(' '));

    // Hair
    if (personaData.hairColor || personaData.hairType) {
        let hairDesc = '';
        if (personaData.hairColor) hairDesc += personaData.hairColor.toLowerCase();
        if (personaData.hairType) hairDesc += (hairDesc ? ', ' : '') + personaData.hairType.toLowerCase();
        parts.push(`${hairDesc} hair`);
    }

    // Eyes
    if (personaData.eyeColor) {
        parts.push(`${personaData.eyeColor.toLowerCase()} eyes`);
    }

    // Additional physical details
    if (personaData.physicalNotes) {
        parts.push(personaData.physicalNotes.toLowerCase());
    }

    // Clothing
    if (personaData.clothing) {
        parts.push(`wearing ${personaData.clothing.toLowerCase()}`);
    }

    // Add quality descriptors
    parts.push('. Highly detailed portrait, professional quality');

    return parts.join(' ').replace(/\s+/g, ' ').trim();
}

async function generateHooks(charData, charAnalysis, personaData, dynamicType, plotMode, auType, nsfwType) {
    const settings = getSettings();
    const hookCount = settings.hookCount || 4;
    let modeInstructions = '', modeName = '';

    if (plotMode === 'canon') {
        modeName = 'CANON INTEGRATION';
        modeInstructions = 'Stay within the character\'s established world and lore.';
    } else if (plotMode === 'au') {
        const auInfo = offlineData.auTypes.find(a => a.id === auType);
        modeName = `AU: ${auInfo?.name || 'Alternate Universe'}`;
        modeInstructions = `Alternate Universe: ${auInfo?.description || 'Different setting'}. Place BOTH characters in this new context.`;
    } else if (plotMode === 'nsfw') {
        const nsfwInfo = offlineData.nsfwScenarios.find(n => n.id === nsfwType);
        modeName = `ROMANTIC: ${nsfwInfo?.name || 'Romance'}`;
        modeInstructions = `Romantic scenario: ${nsfwInfo?.description || 'Intimate encounter'}. Focus on tension and chemistry.`;
    }

    // Build fresh prompt to ensure hook count is always correct
    const prompt = `Generate exactly ${hookCount} plot hooks for these two characters.

CHARACTER: ${charData.name}
World/Setting: ${charData.scenario || 'Not specified'}
Traits: ${(charAnalysis?.traits || []).join(', ')}

PERSONA: ${personaData?.name || '{{user}}'}
Profession: ${personaData?.profession || 'unspecified'}
Dynamic: ${dynamicType}
Traits: ${(personaData?.positiveTraits || []).join(', ')}
Flaws: ${(personaData?.negativeTraits || []).join(', ')}

PLOT MODE: ${modeName}
${modeInstructions}

Generate exactly ${hookCount} unique, specific hooks (2-3 sentences each).
Respond ONLY with JSON: { "hooks": ["hook1", "hook2", ...] }`;

    try {
        const response = await generateRaw({ prompt, systemPrompt: `You MUST generate exactly ${hookCount} plot hooks. Respond ONLY with valid JSON: { "hooks": [...] }` });
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const hooks = JSON.parse(match[0]).hooks || [];
            console.log(`[Ultimate Persona] Generated ${hooks.length} hooks (requested ${hookCount})`);
            return hooks.slice(0, hookCount);
        }
    } catch (e) {
        console.error('[Ultimate Persona] Hook generation error:', e);
    }
    // Fallback hooks if AI fails
    const fallbackHooks = [
        'They cross paths unexpectedly.',
        'A mutual acquaintance introduces them.',
        'Forced to cooperate on a task.',
        'A misunderstanding sparks interaction.',
        'They compete for the same goal.',
        'One saves the other from danger.',
        'They share a secret neither expected.',
        'A chance meeting changes everything.'
    ];
    return fallbackHooks.slice(0, hookCount);
}

// Generate hooks specifically for greeting generation with premise information
async function generateGreetingHooks(charData, storyType, selectedScenario, relationship, location, storyBeats, customScenario, personaData) {
    const settings = getSettings();
    const hookCount = settings.hookCount || 4;
    let modeInstructions = '', modeName = '';

    if (storyType === 'canon') {
        modeName = 'CANON INTEGRATION';
        modeInstructions = 'Stay within the character\'s established world, lore, and storyline. The greeting should feel authentic to their universe. Analyze the character card (description, personality, scenario, first_mes) to identify relevant canon story beats, conflicts, and tensions. Generate hooks that naturally emerge from the character\'s established canon.';
        // Don't use selectedScenario for canon - purely use character card analysis
    } else if (storyType === 'au') {
        const auInfo = offlineData.auTypes.find(a => a.id === selectedScenario);
        modeName = `AU: ${auInfo?.name || selectedScenario || 'Alternate Universe'}`;
        modeInstructions = `Alternate Universe setting: ${auInfo?.description || selectedScenario || 'Different context'}. Place the character in this new setting while maintaining their core personality.`;
    } else if (storyType === 'nsfw') {
        const nsfwInfo = offlineData.nsfwScenarios.find(n => n.id === selectedScenario);
        const isExplicit = nsfwInfo?.id && nsfwInfo.id.startsWith('explicit_');
        modeName = `ROMANTIC: ${nsfwInfo?.name || selectedScenario || 'Romance'}`;
        modeInstructions = `Romantic scenario: ${nsfwInfo?.description || selectedScenario || 'Intimate encounter'}. Focus on tension, chemistry, and emotional/physical connection.${isExplicit ? ' Include explicit, detailed descriptions of physical intimacy and sexual encounters. Be graphic and detailed while maintaining character authenticity.' : ''}`;
    }

    // Build premise context
    let premiseContext = '';
    if (relationship) premiseContext += `Relationship: ${relationship}. `;
    if (location) premiseContext += `Location: ${location}. `;
    if (storyBeats && storyBeats.length > 0) {
        premiseContext += `Story beats to include: ${Array.from(storyBeats).join(', ')}. `;
    }
    if (customScenario) premiseContext += `Additional context: ${customScenario}. `;

    // Build persona context - NEVER include persona name, always use {{user}}
    let personaContext = '';
    if (personaData) {
        // Sanitize ALL persona data to remove names
        const sanitizedDesc = sanitizePersonaText(personaData.description || 'Not specified', personaData);
        personaContext = `
PERSONA ({{user}}):
Description: ${sanitizedDesc}
Profession: ${personaData.profession || 'unspecified'}
Traits: ${(personaData.positiveTraits || []).join(', ')}
Flaws: ${(personaData.negativeTraits || []).join(', ')}
ABSOLUTELY CRITICAL: Always refer to this persona as {{user}}, NEVER use any name. NEVER use names like "Bob" or any other name - ONLY {{user}}.`;
    } else {
        personaContext = `
PERSONA: {{user}} (generic user, no specific persona)
ABSOLUTELY CRITICAL: Always refer to the user as {{user}}, NEVER use any name.`;
    }

    const prompt = `Generate exactly ${hookCount} plot hooks for a greeting between {{char}} and {{user}}.

CHARACTER: {{char}}
Description: ${charData.description || 'Not specified'}
Personality: ${charData.personality || 'Not specified'}
World/Setting: ${charData.scenario || 'Not specified'}
${personaContext}

STORY TYPE: ${modeName}
${modeInstructions}

PREMISE CONTEXT:
${premiseContext || 'A meeting between {{char}} and {{user}}.'}

CRITICAL: Always use {{char}} to refer to the character and {{user}} to refer to the user in the hooks, never use specific names.

Generate exactly ${hookCount} unique, specific plot hooks (2-3 sentences each) that could serve as the opening scenario for a greeting.
Each hook should be engaging and set up an interesting initial interaction.
Respond ONLY with JSON: { "hooks": ["hook1", "hook2", ...] }`;

    try {
        const response = await generateRaw({
            prompt,
            systemPrompt: `You MUST generate exactly ${hookCount} plot hooks for greeting generation. 

===== MANDATORY TEMPLATE FORMATTING =====
You MUST use these exact placeholders - they are TEMPLATES:
- {{char}} = the character (use this EXACT placeholder, never their actual name)
- {{user}} = the user/persona (use this EXACT placeholder, never any name)

===== CRITICAL RULES =====
- {{user}} is the DEFAULT TEMPLATE for referring to the user - use it ALWAYS
- NEVER generate any actual names (Bob, John, Alice, etc.) - ONLY use {{user}}
- NEVER use "you" or any pronoun - ONLY use {{user}}
- {{char}} and {{user}} are TEMPLATE PLACEHOLDERS - write them exactly as shown
- If you write any name instead of {{user}}, you have made an error
- The hooks MUST contain {{user}} to refer to the user - no exceptions

EXAMPLE CORRECT: "{{char}} meets {{user}} at the coffee shop."
EXAMPLE WRONG: "{{char}} meets Bob at the coffee shop." ❌

Respond ONLY with valid JSON: { "hooks": [...] }`
        });
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            let hooks = JSON.parse(match[0]).hooks || [];
            // Replace character name with {{char}} in hooks
            if (charData.name) {
                const nameRegex = new RegExp(`\\b${charData.name}\\b`, 'gi');
                hooks = hooks.map(hook => hook.replace(nameRegex, '{{char}}'));
            }
            // Replace persona name with {{user}} in hooks - use the aggressive replacement function
            hooks = hooks.map(hook => {
                // Multiple passes to catch all instances
                hook = replacePersonaNames(hook, personaData, charData);
                hook = replacePersonaNames(hook, personaData, charData); // Second pass
                hook = replacePersonaNames(hook, personaData, charData); // Third pass
                return hook;
            });
            // Normalize placeholders and ensure no character names leak through
            hooks = hooks.map(hook => {
                // Replace any remaining character name references
                if (charData.name && charData.name !== '{{char}}' && charData.name.trim()) {
                    const charNameRegex = new RegExp(`\\b${charData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
                    hook = hook.replace(charNameRegex, '{{char}}');
                }
                // Replace common incorrect names that might appear - "SillyTavern System" is a character name bug, should be {{char}}
                hook = hook.replace(/\bSillyTavern System\b/gi, '{{char}}');
                hook = hook.replace(/\bSillyTavern\b/gi, '{{char}}');
                hook = hook.replace(/\{\{user\}\}/gi, '{{user}}');
                hook = hook.replace(/\{\{char\}\}/gi, '{{char}}');
                return hook;
            });
            console.log(`[Ultimate Persona] Generated ${hooks.length} greeting hooks (requested ${hookCount})`);
            return hooks.slice(0, hookCount);
        }
    } catch (e) {
        console.error('[Ultimate Persona] Greeting hook generation error:', e);
        throw e;
    }
    // Fallback hooks if AI fails - use {{char}} placeholder
    const fallbackHooks = [
        `{{char}} and {{user}} cross paths unexpectedly.`,
        `A mutual acquaintance introduces {{char}} to {{user}}.`,
        `{{char}} and {{user}} are forced to cooperate on a task.`,
        `A misunderstanding sparks interaction between {{char}} and {{user}}.`,
        `{{char}} and {{user}} compete for the same goal.`,
        `{{char}} saves {{user}} from danger.`,
        `{{char}} and {{user}} share a secret neither expected.`,
        `A chance meeting changes everything for {{char}} and {{user}}.`
    ];
    return fallbackHooks.slice(0, hookCount);
}

async function generateFinalPersona(charData, charAnalysis, personaData) {
    const settings = getSettings();
    const dynamicDesc = personaData.dynamicType === 'complement' ? 'harmony' : 'tension and conflict';

    const physicalParts = [];
    if (personaData.height) physicalParts.push(`Height: ${personaData.height}`);
    if (personaData.bodyType) physicalParts.push(`Build: ${personaData.bodyType}`);
    if (personaData.hairColor || personaData.hairType) physicalParts.push(`Hair: ${[personaData.hairColor, personaData.hairType].filter(Boolean).join(', ')}`);
    if (personaData.eyeColor) physicalParts.push(`Eyes: ${personaData.eyeColor}`);
    if (personaData.clothing) physicalParts.push(`Style: ${personaData.clothing}`);
    if (personaData.weapon) physicalParts.push(`Combat: ${personaData.weapon}`);
    if (personaData.physicalNotes) physicalParts.push(`Details: ${personaData.physicalNotes}`);

    // Build background info
    const backgroundParts = [];
    if (personaData.backgroundFull) {
        backgroundParts.push(personaData.backgroundFull);
    } else {
        if (personaData.upbringing) backgroundParts.push(`Upbringing: ${personaData.upbringing}`);
        if (personaData.lifeEvent) backgroundParts.push(`Life Event: ${personaData.lifeEvent}`);
        if (personaData.motivation) backgroundParts.push(`Motivation: ${personaData.motivation}`);
        if (personaData.secret) backgroundParts.push(`Secret: ${personaData.secret}`);
    }

    const prompt = settings.personaPrompt
        .replace(/\{\{char_name\}\}/g, charData.name)
        .replace('{{char_traits}}', (charAnalysis.traits || []).join(', '))
        .replace(/\{\{persona_name\}\}/g, personaData.name || '{{user}}')
        .replace('{{gender}}', personaData.gender || 'unspecified')
        .replace('{{vibe}}', personaData.vibe || 'unique')
        .replace('{{profession}}', personaData.profession || 'unspecified')
        .replace('{{physical_description}}', physicalParts.join('\n') || 'Describe as fitting their vibe.')
        .replace('{{positive_traits}}', personaData.positiveTraits.join(', '))
        .replace('{{negative_traits}}', personaData.negativeTraits.join(', '))
        .replace('{{background_info}}', backgroundParts.join('\n') || 'Create a fitting backstory.')
        .replace(/\{\{dynamic_type\}\}/g, personaData.dynamicType)
        .replace('{{dynamic_description}}', dynamicDesc);

    try {
        const response = await generateRaw({
            prompt,
            systemPrompt: `You are writing a static character profile/bio. 
STRICT RULES:
1. NEVER suggest plot ideas, story hooks, or "what could happen"
2. NEVER use phrases like "potential scenarios", "adventures might include", "this could lead to", "storylines could involve"
3. ONLY describe who this person IS - their appearance, personality, history, and behavior patterns
4. Write in present tense for current traits, past tense for backstory
5. The "Interaction Style" section describes HOW they typically behave, NOT story possibilities

This is a CHARACTER SHEET, not a story pitch. No speculation about the future.`,
        });
        return { name: personaData.name || 'New Persona', description: response.trim() };
    } catch (e) {
        throw new Error('Failed to generate persona.');
    }
}

async function generateAlternateGreeting(charData, plotHook, narrationStyle) {
    const settings = getSettings();
    const styleText = { 'first': 'first person', 'second': 'second person', 'third': 'third person', 'mixed': 'natural' }[narrationStyle] || 'natural';

    const prompt = settings.greetingPrompt
        .replace(/\{\{char_name\}\}/g, charData.name)
        .replace('{{plot_hook}}', plotHook)
        .replace('{{narration_style}}', styleText);

    try {
        const response = await generateRaw({ prompt, systemPrompt: `Write as ${charData.name} in ${styleText} style.` });
        return response.trim();
    } catch (e) {
        throw new Error('Failed to generate greeting.');
    }
}

// ==================== TAG & SAVE FUNCTIONS ====================

function getOrCreateTag() {
    let existingTag = tags.find(t => t.name === TAG_NAME);
    if (!existingTag) {
        existingTag = { id: uuidv4(), name: TAG_NAME, color: TAG_COLOR, color2: TAG_COLOR2, create_date: Date.now() };
        tags.push(existingTag);
    }
    return existingTag;
}

function addTagToCharacter(charAvatar) {
    const tag = getOrCreateTag();
    const entityKey = getTagKeyForEntity(charAvatar);
    if (!entityKey) return false;
    const result = addTagsToEntity(tag, entityKey);
    saveSettings();
    return result;
}

async function saveAlternateGreeting(charIndex, greeting) {
    const char = characters[charIndex];
    if (!char) throw new Error('Character not found');

    const newGreetings = [...(char.data?.alternate_greetings || []), greeting];

    const response = await fetch('/api/characters/merge-attributes', {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify({ avatar: char.avatar, data: { alternate_greetings: newGreetings } }),
    });

    if (!response.ok) throw new Error('Failed to save greeting');

    addTagToCharacter(char.avatar);

    // Track in library
    const settings = getSettings();
    settings.greetingLibrary.push({
        id: uuidv4(),
        characterName: char.name,
        characterAvatar: char.avatar,
        greeting: greeting.substring(0, 200) + '...',
        date: Date.now(),
    });
    saveSettings();

    // Refresh characters array with updated data
    try {
        const charIndex = characters.findIndex(c => c.avatar === char.avatar);
        if (charIndex >= 0) {
            characters[charIndex].data = characters[charIndex].data || {};
            characters[charIndex].data.alternate_greetings = newGreetings;
        }
    } catch (e) { }

    return newGreetings.length;
}

async function createPersonaInST(name, description) {
    const avatarId = `${Date.now()}-${name.replace(/[^a-zA-Z0-9]/g, '')}.png`;
    initPersona(avatarId, name, description, '');

    try {
        const fetchResult = await fetch('/img/ai4.png');
        const blob = await fetchResult.blob();
        const formData = new FormData();
        formData.append('avatar', new File([blob], 'avatar.png', { type: 'image/png' }));
        formData.append('overwrite_name', avatarId);
        await fetch('/api/avatars/upload', { method: 'POST', headers: getRequestHeaders({ omitContentType: true }), body: formData });
    } catch (e) { }

    saveSettings();
    return avatarId;
}

// ==================== TEMPLATE & HISTORY ====================

function addToHistory(personaData, charName) {
    const settings = getSettings();
    settings.history.unshift({
        id: uuidv4(),
        name: personaData.name,
        characterName: charName,
        vibe: personaData.vibe,
        positiveTraits: personaData.positiveTraits,
        negativeTraits: personaData.negativeTraits,
        dynamicType: personaData.dynamicType,
        date: Date.now(),
    });
    // Keep only last 50
    if (settings.history.length > 50) settings.history = settings.history.slice(0, 50);
    saveSettings();
}

function saveTemplate(name, vibe, positiveTraits, negativeTraits) {
    const settings = getSettings();
    settings.templates.push({
        id: uuidv4(),
        name,
        vibe,
        positiveTraits,
        negativeTraits,
        date: Date.now(),
    });
    saveSettings();
}

function deleteTemplate(id) {
    const settings = getSettings();
    settings.templates = settings.templates.filter(t => t.id !== id);
    saveSettings();
}

// ==================== PERSONA MANAGEMENT ====================

function getAllPersonas() {
    const personas = [];
    if (power_user?.personas) {
        for (const [avatarId, name] of Object.entries(power_user.personas)) {
            personas.push({
                avatarId,
                name,
                description: power_user.persona_descriptions?.[avatarId]?.description || '',
            });
        }
    }
    return personas;
}

async function deletePersona(avatarId) {
    try {
        const response = await fetch('/api/avatars/delete', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ avatar: avatarId }),
        });
        if (response.ok) {
            delete power_user.personas[avatarId];
            delete power_user.persona_descriptions[avatarId];
            saveSettings();
            return true;
        }
    } catch (e) {
        console.error('[Ultimate Persona] Delete error:', e);
    }
    return false;
}

async function bulkDeletePersonas(avatarIds) {
    let deleted = 0;
    for (const id of avatarIds) {
        if (await deletePersona(id)) deleted++;
    }
    return deleted;
}

// ==================== UI RENDERING ====================

function renderCharacterCarousel(container, searchTerm = '') {
    container.empty();
    characters.filter(c => c?.name && (!searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()))).forEach(char => {
        const realIndex = characters.indexOf(char);
        const avatarUrl = char.avatar ? `/characters/${encodeURIComponent(char.avatar)}` : '/img/ai4.png';
        container.append(`
            <div class="up-char-card ${realIndex === this_chid ? 'selected' : ''}" data-index="${realIndex}">
                <img class="up-char-avatar" src="${avatarUrl}" alt="${char.name}" onerror="this.src='/img/ai4.png'">
                <div class="up-char-name">${char.name}</div>
            </div>
        `);
    });
}

function renderVibePresets(container) {
    container.empty();
    offlineData.vibes.forEach(v => {
        container.append(`<div class="up-vibe-chip" data-vibe="${v.description}" title="${v.description}">${v.name}</div>`);
    });
}

function renderSelectOptions(container, options, includeEmpty = true) {
    container.empty();
    if (includeEmpty) container.append('<option value="">-- Not specified --</option>');
    options.forEach(opt => container.append(`<option value="${opt}">${opt}</option>`));
}

function renderTraitChips(container, traits, selected) {
    container.empty();
    traits.forEach(trait => {
        const isSelected = selected.has(trait);
        container.append(`
            <div class="up-trait-chip ${isSelected ? 'selected' : ''}" data-trait="${trait}">
                <i class="fa-solid fa-check check-icon"></i>
                <span>${trait}</span>
                <i class="fa-solid fa-xmark remove-trait"></i>
            </div>
        `);
    });
}

function renderTraitSuggestions(container, type, exclude) {
    container.empty();
    const source = type === 'positive' ? 'positiveTraits' : 'negativeTraits';
    getRandomFromOffline(source, 5, exclude).forEach(trait => {
        container.append(`<span class="up-suggestion-chip" data-trait="${trait}">+ ${trait}</span>`);
    });
}

function renderHooks(container, hooks, selectedIndex) {
    container.empty();
    hooks.forEach((hook, i) => {
        container.append(`
            <div class="up-hook-item ${selectedIndex === i ? 'selected' : ''}" data-hook="${i}">
                <i class="fa-solid fa-bookmark"></i>
                <span>${hook}</span>
            </div>
        `);
    });
}

function renderTemplateChips(container) {
    const templates = getSettings().templates;
    container.empty();
    if (templates.length === 0) return;

    templates.slice(0, 5).forEach(t => {
        container.append(`<div class="up-template-chip" data-id="${t.id}"><i class="fa-solid fa-bookmark"></i> ${t.name}</div>`);
    });
}

function renderNarrationOptions(container, selected) {
    container.empty();
    offlineData.narrationStyles.forEach(s => {
        container.append(`
            <div class="up-narration-option ${selected === s.id ? 'selected' : ''}" data-style="${s.id}">
                <div class="narration-name">${s.name}</div>
                <div class="narration-example">${s.description}</div>
            </div>
        `);
    });
}

function renderPlotModeOptions(container, selected) {
    container.empty();
    offlineData.plotModes.forEach(m => {
        container.append(`
            <div class="up-plot-mode-option ${selected === m.id ? 'selected' : ''}" data-mode="${m.id}">
                <div class="mode-name">${m.name}</div>
                <div class="mode-desc">${m.description}</div>
            </div>
        `);
    });
}

function renderAUOptions(container, selected) {
    container.empty();
    offlineData.auTypes.forEach(au => {
        container.append(`<div class="up-au-option ${selected === au.id ? 'selected' : ''}" data-au="${au.id}" title="${au.description}">${au.name}</div>`);
    });
}

function renderNSFWOptions(container, selected) {
    container.empty();
    offlineData.nsfwScenarios.forEach(s => {
        container.append(`<div class="up-nsfw-option ${selected === s.id ? 'selected' : ''}" data-nsfw="${s.id}" title="${s.description}">${s.name}</div>`);
    });
}

function renderBackgroundChips(container, items, selectedId, dataAttr) {
    container.empty();
    items.forEach(item => {
        container.append(`
            <div class="up-background-chip ${selectedId === item.id ? 'selected' : ''}" 
                 data-${dataAttr}="${item.id}" 
                 data-name="${item.name}"
                 data-desc="${item.description}"
                 title="${item.description}">
                ${item.name}
            </div>
        `);
    });
}

// ==================== SETTINGS POPUP ====================

async function showSettingsPopup() {
    try {
        const html = await renderExtensionTemplateAsync(EXTENSION_PATH, 'settings');
        const dlg = $(html);
        const settings = getSettings();

        // Populate settings values
        dlg.find('#up_default_plot_mode').val(settings.defaultPlotMode);
        dlg.find('#up_default_narration').val(settings.defaultNarration);
        dlg.find('#up_default_setting').val(settings.defaultSetting);
        dlg.find('#up_trait_count').val(settings.traitCount);
        dlg.find('#up_hook_count').val(settings.hookCount);
        dlg.find('#up_enable_animations').prop('checked', settings.enableAnimations);
        dlg.find('#up_enable_confetti').prop('checked', settings.enableConfetti);
        dlg.find('#up_auto_scroll').prop('checked', settings.autoScroll);

        // Prompts
        dlg.find('#up_persona_prompt').val(settings.personaPrompt);
        dlg.find('#up_hooks_prompt').val(settings.hooksPrompt);
        dlg.find('#up_greeting_prompt').val(settings.greetingPrompt);

        // Tab switching
        dlg.find('.up-settings-tab').on('click', function () {
            dlg.find('.up-settings-tab').removeClass('active');
            $(this).addClass('active');
            dlg.find('.up-settings-panel').removeClass('active');
            dlg.find(`.up-settings-panel[data-panel="${$(this).data('tab')}"]`).addClass('active');

            // Load personas when switching to that tab
            if ($(this).data('tab') === 'personas') loadPersonaGrid(dlg);
        });

        // Templates
        renderTemplatesList(dlg);

        dlg.find('#up_save_new_template').on('click', () => {
            const name = dlg.find('#up_new_template_name').val().trim();
            const vibe = dlg.find('#up_new_template_vibe').val().trim();
            const positive = dlg.find('#up_new_template_positive').val().split(',').map(s => s.trim()).filter(Boolean);
            const negative = dlg.find('#up_new_template_negative').val().split(',').map(s => s.trim()).filter(Boolean);

            if (!name) { toastr.warning('Enter a template name'); return; }
            if (positive.length === 0) { toastr.warning('Enter at least one positive trait'); return; }

            saveTemplate(name, vibe, positive, negative);
            renderTemplatesList(dlg);
            dlg.find('#up_new_template_name, #up_new_template_vibe, #up_new_template_positive, #up_new_template_negative').val('');
            toastr.success('Template saved!');
        });

        // History
        renderHistoryList(dlg);

        dlg.find('#up_clear_history').on('click', async () => {
            const confirm = await Popup.show.confirm('Clear History', 'Are you sure you want to clear all history?');
            if (confirm) {
                settings.history = [];
                saveSettings();
                renderHistoryList(dlg);
                toastr.success('History cleared');
            }
        });

        dlg.find('#up_export_history').on('click', () => {
            const data = JSON.stringify(settings.history, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ultimate-persona-history.json';
            a.click();
            URL.revokeObjectURL(url);
        });

        // Reset prompts
        dlg.find('#up_reset_persona_prompt').on('click', () => {
            dlg.find('#up_persona_prompt').val(DEFAULT_PERSONA_PROMPT);
        });
        dlg.find('#up_reset_hooks_prompt').on('click', () => {
            dlg.find('#up_hooks_prompt').val(DEFAULT_HOOKS_PROMPT);
        });
        dlg.find('#up_reset_greeting_prompt').on('click', () => {
            dlg.find('#up_greeting_prompt').val(DEFAULT_GREETING_PROMPT);
        });

        // Persona management
        let selectedPersonas = new Set();

        function loadPersonaGrid(dlg) {
            const grid = dlg.find('#up_persona_grid');
            const personas = getAllPersonas();
            grid.empty();

            if (personas.length === 0) {
                grid.html('<div class="up-empty-state"><i class="fa-solid fa-users"></i><p>No personas found</p></div>');
                return;
            }

            personas.forEach(p => {
                const isSelected = selectedPersonas.has(p.avatarId);
                grid.append(`
                    <div class="up-persona-card ${isSelected ? 'selected' : ''}" data-avatar="${p.avatarId}">
                        <div class="up-persona-card-checkbox">${isSelected ? '<i class="fa-solid fa-check"></i>' : ''}</div>
                        <img class="up-persona-card-avatar" src="/User Avatars/${encodeURIComponent(p.avatarId)}" onerror="this.src='/img/ai4.png'">
                        <div class="up-persona-card-name">${p.name}</div>
                    </div>
                `);
            });

            updateDeleteButton();
        }

        function updateDeleteButton() {
            const btn = dlg.find('#up_delete_selected_personas');
            const count = selectedPersonas.size;
            dlg.find('#up_selected_count').text(count);
            btn.prop('disabled', count === 0);
        }

        dlg.on('click', '.up-persona-card', function () {
            const avatarId = $(this).data('avatar');
            if (selectedPersonas.has(avatarId)) {
                selectedPersonas.delete(avatarId);
                $(this).removeClass('selected').find('.up-persona-card-checkbox').html('');
            } else {
                selectedPersonas.add(avatarId);
                $(this).addClass('selected').find('.up-persona-card-checkbox').html('<i class="fa-solid fa-check"></i>');
            }
            updateDeleteButton();
        });

        dlg.find('#up_select_all_personas').on('click', () => {
            getAllPersonas().forEach(p => selectedPersonas.add(p.avatarId));
            loadPersonaGrid(dlg);
        });

        dlg.find('#up_deselect_all_personas').on('click', () => {
            selectedPersonas.clear();
            loadPersonaGrid(dlg);
        });

        dlg.find('#up_delete_selected_personas').on('click', async () => {
            const count = selectedPersonas.size;
            const confirm = await Popup.show.confirm('Delete Personas', `Are you sure you want to delete ${count} persona(s)? This cannot be undone.`);
            if (confirm) {
                const deleted = await bulkDeletePersonas([...selectedPersonas]);
                toastr.success(`Deleted ${deleted} persona(s)`);
                selectedPersonas.clear();
                loadPersonaGrid(dlg);
                await getUserAvatars(true);
            }
        });

        dlg.find('#up_persona_search').on('input', function () {
            const search = $(this).val().toLowerCase();
            dlg.find('.up-persona-card').each(function () {
                const name = $(this).find('.up-persona-card-name').text().toLowerCase();
                $(this).toggle(name.includes(search));
            });
        });

        // Save settings
        dlg.find('#up_save_settings').on('click', () => {
            settings.defaultPlotMode = dlg.find('#up_default_plot_mode').val();
            settings.defaultNarration = dlg.find('#up_default_narration').val();
            settings.defaultSetting = dlg.find('#up_default_setting').val();
            settings.traitCount = parseInt(dlg.find('#up_trait_count').val()) || 6;
            settings.hookCount = parseInt(dlg.find('#up_hook_count').val()) || 4;
            settings.enableAnimations = dlg.find('#up_enable_animations').is(':checked');
            settings.enableConfetti = dlg.find('#up_enable_confetti').is(':checked');
            settings.autoScroll = dlg.find('#up_auto_scroll').is(':checked');
            settings.personaPrompt = dlg.find('#up_persona_prompt').val();
            settings.hooksPrompt = dlg.find('#up_hooks_prompt').val();
            settings.greetingPrompt = dlg.find('#up_greeting_prompt').val();
            saveSettings();
            toastr.success('Settings saved!');
        });

        dlg.find('#up_close_settings').on('click', () => {
            $('.popup-button-cancel').trigger('click');
        });

        await callGenericPopup(dlg, POPUP_TYPE.TEXT, '', { wide: true, large: true, okButton: false, cancelButton: 'Close', allowVerticalScrolling: true });
    } catch (e) {
        console.error('[Ultimate Persona] Settings error:', e);
        toastr.error('Failed to open settings');
    }
}

function renderTemplatesList(dlg) {
    const list = dlg.find('#up_templates_list');
    const templates = getSettings().templates;
    list.empty();

    if (templates.length === 0) {
        list.html('<div class="up-empty-state"><i class="fa-solid fa-bookmark"></i><p>No templates saved yet</p><span>Create a persona and save it as a template!</span></div>');
        return;
    }

    templates.forEach(t => {
        list.append(`
            <div class="up-template-item" data-id="${t.id}">
                <div class="up-template-item-info">
                    <div class="up-template-item-name">${t.name}</div>
                    <div class="up-template-item-traits">${t.positiveTraits.slice(0, 3).join(', ')}${t.positiveTraits.length > 3 ? '...' : ''}</div>
                </div>
                <div class="up-template-item-actions">
                    <button class="up-btn up-btn-small up-btn-outline up-template-delete" data-id="${t.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `);
    });

    dlg.find('.up-template-delete').on('click', function (e) {
        e.stopPropagation();
        deleteTemplate($(this).data('id'));
        renderTemplatesList(dlg);
        toastr.success('Template deleted');
    });
}

function renderHistoryList(dlg) {
    const list = dlg.find('#up_history_list');
    const history = getSettings().history;
    list.empty();

    if (history.length === 0) {
        list.html('<div class="up-empty-state"><i class="fa-solid fa-clock-rotate-left"></i><p>No history yet</p><span>Create your first persona to see it here!</span></div>');
        return;
    }

    history.slice(0, 20).forEach(h => {
        const date = new Date(h.date).toLocaleDateString();
        list.append(`
            <div class="up-history-item">
                <div class="up-history-item-header">
                    <div class="up-history-item-name">${h.name || 'Unnamed'}</div>
                    <div class="up-history-item-date">${date}</div>
                </div>
                <div class="up-history-item-details">
                    For: ${h.characterName || 'Unknown'} • ${h.dynamicType || 'Unknown'} dynamic
                </div>
            </div>
        `);
    });
}

// ==================== QUICK STANDALONE PERSONA ====================

async function generateStandalonePersona(personaData) {
    const physicalParts = [];
    if (personaData.height) physicalParts.push(`Height: ${personaData.height}`);
    if (personaData.bodyType) physicalParts.push(`Build: ${personaData.bodyType}`);
    if (personaData.hairColor || personaData.hairType) physicalParts.push(`Hair: ${[personaData.hairColor, personaData.hairType].filter(Boolean).join(', ')}`);
    if (personaData.eyeColor) physicalParts.push(`Eyes: ${personaData.eyeColor}`);
    if (personaData.clothing) physicalParts.push(`Style: ${personaData.clothing}`);
    if (personaData.weapon) physicalParts.push(`Combat: ${personaData.weapon}`);
    if (personaData.physicalNotes) physicalParts.push(`Details: ${personaData.physicalNotes}`);

    const backgroundParts = [];
    if (personaData.backgroundFull) {
        backgroundParts.push(personaData.backgroundFull);
    } else {
        if (personaData.upbringing) backgroundParts.push(`Upbringing: ${personaData.upbringing}`);
        if (personaData.lifeEvent) backgroundParts.push(`Life Event: ${personaData.lifeEvent}`);
        if (personaData.motivation) backgroundParts.push(`Motivation: ${personaData.motivation}`);
        if (personaData.secret) backgroundParts.push(`Secret: ${personaData.secret}`);
    }

    const prompt = `Create a detailed standalone persona:

PERSONA SPECIFICATIONS:
- Name: ${personaData.name || '(Generate a fitting name)'}
- Gender: ${personaData.gender || 'unspecified'}
- Vibe/Aesthetic: ${personaData.vibe || 'unique and interesting'}
- Profession: ${personaData.profession || 'unspecified'}

PHYSICAL APPEARANCE:
${physicalParts.join('\n') || 'Create fitting physical appearance'}

PERSONALITY TRAITS:
- Positive: ${personaData.positiveTraits.join(', ') || 'creative, determined'}
- Flaws: ${personaData.negativeTraits.join(', ') || 'stubborn, impulsive'}

BACKGROUND:
${backgroundParts.join('\n') || 'Create a fitting backstory'}

Write a character profile with these sections:

## Physical Appearance
Vivid description of how they look.

## Personality
Their traits, behaviors, and quirks.

## Background
Their history and how they became who they are.

## Typical Behavior
How they generally act in social situations.`;

    try {
        const response = await generateRaw({
            prompt,
            systemPrompt: `Create a standalone character profile. This is a CHARACTER SHEET - describe WHO they ARE, not story possibilities. No plot hooks or "adventures might include" type content.`,
        });

        // Extract name if AI generated one
        let finalName = personaData.name;
        if (!finalName) {
            const nameMatch = response.match(/(?:Name:|Called:|Known as:)\s*([^\n,]+)/i);
            if (nameMatch) finalName = nameMatch[1].trim();
            else finalName = 'New Persona';
        }

        return { name: finalName, description: response.trim() };
    } catch (e) {
        throw new Error('Failed to generate persona.');
    }
}

async function showQuickPersonaPopup() {
    try {
        const html = await renderExtensionTemplateAsync(EXTENSION_PATH, 'quick');
        const dlg = $(html);
        const settings = getSettings();

        // Initialize UI
        renderVibePresets(dlg.find('#upq_vibe_presets'));
        renderSelectOptions(dlg.find('#upq_height'), offlineData.heights);
        renderSelectOptions(dlg.find('#upq_body_type'), offlineData.bodyTypes);
        renderSelectOptions(dlg.find('#upq_hair_color'), offlineData.hairColors);
        renderSelectOptions(dlg.find('#upq_hair_type'), offlineData.hairTypes);
        renderSelectOptions(dlg.find('#upq_clothing'), offlineData.clothing[settings.defaultSetting] || []);
        renderSelectOptions(dlg.find('#upq_profession'), offlineData.professions[settings.defaultSetting] || []);
        renderSelectOptions(dlg.find('#upq_weapon'), offlineData.weapons);
        renderBackgroundChips(dlg.find('#upq_upbringing_chips'), offlineData.upbringings || [], '', 'upbringing');
        renderBackgroundChips(dlg.find('#upq_motivation_chips'), offlineData.motivations || [], '', 'motivation');

        // State
        const state = {
            personaName: '', gender: '', vibe: '',
            setting: settings.defaultSetting,
            height: '', bodyType: '', hairColor: '', hairType: '', eyeColor: '',
            clothing: '', profession: '', weapon: '', physicalNotes: '',
            positiveTraits: [], negativeTraits: [],
            selectedPositive: new Set(), selectedNegative: new Set(),
            upbringing: '', motivation: '', backgroundFull: '',
            personaAvatarId: null,
        };

        let currentStep = 1;

        const updateStepDisplay = () => {
            dlg.find('.upq-step').hide();
            dlg.find(`.upq-step[data-step="${currentStep}"]`).show();
            dlg.find('.up-progress-step').removeClass('active completed');
            dlg.find('.up-progress-step').each(function () {
                const stepNum = parseInt($(this).data('step'));
                if (stepNum < currentStep) $(this).addClass('completed');
                else if (stepNum === currentStep) $(this).addClass('active');
            });
        };

        const getComboValue = (selectId, customId) => {
            const selectVal = dlg.find(`#${selectId}`).val();
            const customVal = dlg.find(`#${customId}`).val()?.trim();
            return customVal || selectVal || '';
        };

        // Combo input handlers
        dlg.on('input', '.upq-combo-text', function () {
            if ($(this).val().trim()) $(this).siblings('.upq-combo-select').val('');
        });
        dlg.on('change', '.upq-combo-select', function () {
            if ($(this).val()) $(this).siblings('.upq-combo-text').val('');
        });

        // Step 1: Identity & Appearance
        dlg.on('click', '#upq_vibe_presets .up-vibe-chip', function () {
            dlg.find('#upq_vibe_presets .up-vibe-chip').removeClass('selected');
            $(this).addClass('selected');
            state.vibe = $(this).data('vibe');
            dlg.find('#upq_persona_vibe').val(state.vibe);
        });

        dlg.find('#upq_persona_vibe').on('input', function () {
            state.vibe = $(this).val();
            dlg.find('#upq_vibe_presets .up-vibe-chip').removeClass('selected');
        });

        // AI Enhance buttons
        dlg.find('#upq_enhance_vibe').on('click', async function () {
            const input = dlg.find('#upq_persona_vibe').val().trim();
            if (!input) { toastr.warning('Enter a vibe first'); return; }
            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                const enhanced = await enhanceText(input);
                dlg.find('#upq_persona_vibe').val(enhanced);
                state.vibe = enhanced;
            } catch (e) { toastr.error('Failed'); }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        dlg.find('#upq_enhance_physical').on('click', async function () {
            const input = dlg.find('#upq_physical_notes').val().trim();
            if (!input) { toastr.warning('Enter details first'); return; }
            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                dlg.find('#upq_physical_notes').val(await enhanceText(input));
            } catch (e) { toastr.error('Failed'); }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        dlg.on('click', '.upq-setting-tab', function () {
            dlg.find('.upq-setting-tab').removeClass('active');
            $(this).addClass('active');
            state.setting = $(this).data('setting');
            renderSelectOptions(dlg.find('#upq_clothing'), offlineData.clothing[state.setting] || []);
            renderSelectOptions(dlg.find('#upq_profession'), offlineData.professions[state.setting] || []);
        });

        dlg.find('#upq_randomize_appearance').on('click', () => {
            const rand = arr => arr[Math.floor(Math.random() * arr.length)] || '';
            dlg.find('#upq_height').val(rand(offlineData.heights));
            dlg.find('#upq_body_type').val(rand(offlineData.bodyTypes));
            dlg.find('#upq_hair_color').val(rand(offlineData.hairColors));
            dlg.find('#upq_hair_type').val(rand(offlineData.hairTypes));
            dlg.find('#upq_clothing').val(rand(offlineData.clothing[state.setting] || []));
            dlg.find('#upq_profession').val(rand(offlineData.professions[state.setting] || []));
        });

        dlg.find('#upq_next_to_traits').on('click', () => {
            state.personaName = dlg.find('#upq_persona_name').val().trim();
            state.gender = dlg.find('#upq_persona_gender').val();
            state.vibe = dlg.find('#upq_persona_vibe').val().trim();
            state.height = getComboValue('upq_height', 'upq_height_custom');
            state.bodyType = getComboValue('upq_body_type', 'upq_body_type_custom');
            state.hairColor = getComboValue('upq_hair_color', 'upq_hair_color_custom');
            state.hairType = getComboValue('upq_hair_type', 'upq_hair_type_custom');
            state.eyeColor = dlg.find('#upq_eye_color').val().trim();
            state.clothing = getComboValue('upq_clothing', 'upq_clothing_custom');
            state.profession = getComboValue('upq_profession', 'upq_profession_custom');
            state.weapon = getComboValue('upq_weapon', 'upq_weapon_custom');
            state.physicalNotes = dlg.find('#upq_physical_notes').val().trim();

            // Generate initial traits
            if (state.positiveTraits.length === 0) {
                state.positiveTraits = getRandomFromOffline('positiveTraits', settings.traitCount, []);
                state.negativeTraits = getRandomFromOffline('negativeTraits', Math.max(3, settings.traitCount - 1), []);
            }
            renderTraitChips(dlg.find('#upq_positive_traits'), state.positiveTraits, state.selectedPositive);
            renderTraitChips(dlg.find('#upq_negative_traits'), state.negativeTraits, state.selectedNegative);
            renderTraitSuggestions(dlg.find('#upq_positive_suggestions'), 'positive', state.positiveTraits);
            renderTraitSuggestions(dlg.find('#upq_negative_suggestions'), 'negative', state.negativeTraits);

            currentStep = 2;
            updateStepDisplay();
        });

        // Step 2: Traits
        dlg.find('#upq_back_to_identity').on('click', () => { currentStep = 1; updateStepDisplay(); });

        dlg.on('click', '#upq_positive_traits .up-trait-chip', function (e) {
            const trait = $(this).data('trait');
            if ($(e.target).hasClass('remove-trait')) {
                state.positiveTraits = state.positiveTraits.filter(t => t !== trait);
                state.selectedPositive.delete(trait);
                $(this).remove();
            } else {
                state.selectedPositive.has(trait) ? state.selectedPositive.delete(trait) : state.selectedPositive.add(trait);
                $(this).toggleClass('selected');
            }
        });

        dlg.on('click', '#upq_negative_traits .up-trait-chip', function (e) {
            const trait = $(this).data('trait');
            if ($(e.target).hasClass('remove-trait')) {
                state.negativeTraits = state.negativeTraits.filter(t => t !== trait);
                state.selectedNegative.delete(trait);
                $(this).remove();
            } else {
                state.selectedNegative.has(trait) ? state.selectedNegative.delete(trait) : state.selectedNegative.add(trait);
                $(this).toggleClass('selected');
            }
        });

        dlg.on('click', '#upq_positive_suggestions .up-suggestion-chip', function () {
            const trait = $(this).data('trait');
            if (!state.positiveTraits.includes(trait)) {
                state.positiveTraits.push(trait);
                state.selectedPositive.add(trait);
                renderTraitChips(dlg.find('#upq_positive_traits'), state.positiveTraits, state.selectedPositive);
                renderTraitSuggestions(dlg.find('#upq_positive_suggestions'), 'positive', state.positiveTraits);
            }
        });

        dlg.on('click', '#upq_negative_suggestions .up-suggestion-chip', function () {
            const trait = $(this).data('trait');
            if (!state.negativeTraits.includes(trait)) {
                state.negativeTraits.push(trait);
                state.selectedNegative.add(trait);
                renderTraitChips(dlg.find('#upq_negative_traits'), state.negativeTraits, state.selectedNegative);
                renderTraitSuggestions(dlg.find('#upq_negative_suggestions'), 'negative', state.negativeTraits);
            }
        });

        dlg.find('#upq_regen_positive').on('click', () => {
            const selected = Array.from(state.selectedPositive);
            const newTraits = getRandomFromOffline('positiveTraits', settings.traitCount, [...selected, ...state.negativeTraits]);
            state.positiveTraits = [...selected, ...newTraits.slice(0, settings.traitCount - selected.length)];
            renderTraitChips(dlg.find('#upq_positive_traits'), state.positiveTraits, state.selectedPositive);
            renderTraitSuggestions(dlg.find('#upq_positive_suggestions'), 'positive', state.positiveTraits);
        });

        dlg.find('#upq_regen_negative').on('click', () => {
            const selected = Array.from(state.selectedNegative);
            const count = Math.max(3, settings.traitCount - 1);
            const newTraits = getRandomFromOffline('negativeTraits', count, [...selected, ...state.positiveTraits]);
            state.negativeTraits = [...selected, ...newTraits.slice(0, count - selected.length)];
            renderTraitChips(dlg.find('#upq_negative_traits'), state.negativeTraits, state.selectedNegative);
            renderTraitSuggestions(dlg.find('#upq_negative_suggestions'), 'negative', state.negativeTraits);
        });

        dlg.find('#upq_next_to_background').on('click', () => {
            if (state.selectedPositive.size === 0 && state.selectedNegative.size === 0) {
                toastr.warning('Please select at least one trait');
                return;
            }
            currentStep = 3;
            updateStepDisplay();
        });

        // Step 3: Background
        dlg.find('#upq_back_to_traits').on('click', () => { currentStep = 2; updateStepDisplay(); });

        dlg.on('click', '#upq_upbringing_chips .up-background-chip', function () {
            dlg.find('#upq_upbringing_chips .up-background-chip').removeClass('selected');
            $(this).addClass('selected');
            state.upbringing = $(this).data('name');
            dlg.find('#upq_upbringing_custom').val('');
        });

        dlg.find('#upq_upbringing_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#upq_upbringing_chips .up-background-chip').removeClass('selected');
                state.upbringing = $(this).val().trim();
            }
        });

        dlg.on('click', '#upq_motivation_chips .up-background-chip', function () {
            dlg.find('#upq_motivation_chips .up-background-chip').removeClass('selected');
            $(this).addClass('selected');
            state.motivation = $(this).data('name');
            dlg.find('#upq_motivation_custom').val('');
        });

        dlg.find('#upq_motivation_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#upq_motivation_chips .up-background-chip').removeClass('selected');
                state.motivation = $(this).val().trim();
            }
        });

        // Generate background from selections
        dlg.find('#upq_generate_background').on('click', async function () {
            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                const generated = await generateBackgroundStory(
                    state.upbringing || dlg.find('#upq_upbringing_custom').val().trim(),
                    '', // no life event in quick mode
                    state.motivation || dlg.find('#upq_motivation_custom').val().trim(),
                    '' // no secret in quick mode
                );
                dlg.find('#upq_background_full').val(generated);
                state.backgroundFull = generated;
            } catch (e) {
                toastr.error('Failed to generate background');
            }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        dlg.find('#upq_generate_persona').on('click', async function () {
            state.backgroundFull = dlg.find('#upq_background_full').val().trim();

            setButtonLoading($(this), true);
            try {
                const result = await generateStandalonePersona({
                    name: state.personaName,
                    gender: state.gender,
                    vibe: state.vibe,
                    height: state.height,
                    bodyType: state.bodyType,
                    hairColor: state.hairColor,
                    hairType: state.hairType,
                    eyeColor: state.eyeColor,
                    clothing: state.clothing,
                    profession: state.profession,
                    weapon: state.weapon,
                    physicalNotes: state.physicalNotes,
                    positiveTraits: Array.from(state.selectedPositive),
                    negativeTraits: Array.from(state.selectedNegative),
                    upbringing: state.upbringing,
                    motivation: state.motivation,
                    backgroundFull: state.backgroundFull,
                });

                dlg.find('#upq_final_name').val(state.personaName || result.name);
                dlg.find('#upq_final_description').val(result.description);
                currentStep = 4;
                updateStepDisplay();
            } catch (e) {
                toastr.error(e.message);
            } finally {
                setButtonLoading($(this), false);
            }
        });

        // Step 4: Review & Create
        dlg.find('#upq_back_to_background').on('click', () => { currentStep = 3; updateStepDisplay(); });

        dlg.find('#upq_regenerate').on('click', async function () {
            setButtonLoading($(this), true);
            try {
                const result = await generateStandalonePersona({
                    name: dlg.find('#upq_final_name').val().trim(),
                    gender: state.gender,
                    vibe: state.vibe,
                    height: state.height,
                    bodyType: state.bodyType,
                    hairColor: state.hairColor,
                    hairType: state.hairType,
                    eyeColor: state.eyeColor,
                    clothing: state.clothing,
                    profession: state.profession,
                    weapon: state.weapon,
                    physicalNotes: state.physicalNotes,
                    positiveTraits: Array.from(state.selectedPositive),
                    negativeTraits: Array.from(state.selectedNegative),
                    upbringing: state.upbringing,
                    motivation: state.motivation,
                    backgroundFull: state.backgroundFull,
                });
                dlg.find('#upq_final_description').val(result.description);
                toastr.success('Regenerated!');
            } catch (e) {
                toastr.error(e.message);
            }
            setButtonLoading($(this), false);
        });

        dlg.find('#upq_create_persona').on('click', async function () {
            const finalName = dlg.find('#upq_final_name').val().trim() || 'New Persona';
            const finalDescription = dlg.find('#upq_final_description').val().trim();
            if (!finalDescription) {
                toastr.warning('Add a description');
                return;
            }

            setButtonLoading($(this), true);
            try {
                state.personaAvatarId = await createPersonaInST(finalName, finalDescription);
                await getUserAvatars(true, state.personaAvatarId);

                addToHistory({
                    name: finalName,
                    vibe: state.vibe,
                    positiveTraits: Array.from(state.selectedPositive),
                    negativeTraits: Array.from(state.selectedNegative),
                    dynamicType: 'standalone',
                }, 'Standalone');

                toastr.success(`Persona "${finalName}" created!`);

                // Show success with image prompts
                dlg.find('.upq-step').hide();
                dlg.find('.upq-step[data-step="success"]').show().addClass('up-visible');
                dlg.find('.up-progress-step').addClass('completed');

                launchConfetti(dlg.find('#upq_confetti_canvas')[0]);

                // Generate image prompts
                const personaData = {
                    gender: state.gender,
                    height: state.height,
                    bodyType: state.bodyType,
                    hairColor: state.hairColor,
                    hairType: state.hairType,
                    eyeColor: state.eyeColor,
                    clothing: state.clothing,
                    physicalNotes: state.physicalNotes,
                };
                dlg.find('#upq_booru_tags').val(generateBooruTags(personaData));
                dlg.find('#upq_natural_prompt').val(generateNaturalPrompt(personaData));

                dlg.find('#upq_copy_booru').on('click', () => {
                    navigator.clipboard.writeText(dlg.find('#upq_booru_tags').val());
                    toastr.success('Copied!');
                });

                dlg.find('#upq_copy_natural').on('click', () => {
                    navigator.clipboard.writeText(dlg.find('#upq_natural_prompt').val());
                    toastr.success('Copied!');
                });

                dlg.find('#upq_use_persona').on('click', async () => {
                    await setUserAvatar(state.personaAvatarId);
                    toastr.success(`Now using "${finalName}"`);
                    $('.popup-button-cancel').trigger('click');
                });

                dlg.find('#upq_close_wizard').on('click', () => {
                    $('.popup-button-cancel').trigger('click');
                });

            } catch (e) {
                toastr.error('Failed: ' + e.message);
            } finally {
                setButtonLoading($(this), false);
            }
        });

        updateStepDisplay();
        await callGenericPopup(dlg, POPUP_TYPE.TEXT, '', { wide: true, large: true, okButton: false, cancelButton: 'Close', allowVerticalScrolling: true });
    } catch (e) {
        console.error('[Ultimate Persona] Quick popup error:', e);
        toastr.error('Failed to open: ' + e.message);
    }
}

// ==================== MAIN WIZARD POPUP ====================

async function showUltimatePersonaPopup() {
    try {
        const html = await renderExtensionTemplateAsync(EXTENSION_PATH, 'popup');
        const dlg = $(html);
        const settings = getSettings();

        // Initialize UI
        renderCharacterCarousel(dlg.find('#up_character_carousel'));
        renderVibePresets(dlg.find('#up_vibe_presets'));
        renderSelectOptions(dlg.find('#up_height'), offlineData.heights);
        renderSelectOptions(dlg.find('#up_body_type'), offlineData.bodyTypes);
        renderSelectOptions(dlg.find('#up_hair_color'), offlineData.hairColors);
        renderSelectOptions(dlg.find('#up_hair_type'), offlineData.hairTypes);
        renderSelectOptions(dlg.find('#up_clothing'), offlineData.clothing[settings.defaultSetting] || []);
        renderSelectOptions(dlg.find('#up_profession'), offlineData.professions[settings.defaultSetting] || []);
        renderSelectOptions(dlg.find('#up_weapon'), offlineData.weapons);
        renderNarrationOptions(dlg.find('#up_narration_options'), settings.defaultNarration);
        renderPlotModeOptions(dlg.find('#up_plot_mode_options'), settings.defaultPlotMode);
        renderAUOptions(dlg.find('#up_au_options'), '');
        renderNSFWOptions(dlg.find('#up_nsfw_options'), '');

        // Background chips
        renderBackgroundChips(dlg.find('#up_upbringing_chips'), offlineData.upbringings || [], '', 'upbringing');
        renderBackgroundChips(dlg.find('#up_life_event_chips'), offlineData.lifeEvents || [], '', 'lifeevent');
        renderBackgroundChips(dlg.find('#up_motivation_chips'), offlineData.motivations || [], '', 'motivation');
        renderBackgroundChips(dlg.find('#up_secret_chips'), offlineData.secrets || [], '', 'secret');

        // Show templates if available
        if (settings.templates.length > 0) {
            renderTemplateChips(dlg.find('#up_template_chips'));
            dlg.find('#up_template_quick_load').show();
        }

        // State
        const state = {
            charIndex: this_chid >= 0 ? this_chid : -1,
            charData: null, charAnalysis: null,
            personaName: '', gender: '', vibe: '',
            setting: settings.defaultSetting,
            height: '', bodyType: '', hairColor: '', hairType: '', eyeColor: '', clothing: '', profession: '', weapon: '', physicalNotes: '',
            positiveTraits: [], negativeTraits: [],
            selectedPositive: new Set(), selectedNegative: new Set(),
            // Background
            upbringing: '', upbringingId: '', lifeEvent: '', lifeEventId: '',
            motivation: '', motivationId: '', secret: '', secretId: '',
            backgroundFull: '',
            // Dynamic & Output
            dynamicType: '', hooks: [], selectedHookIndex: -1,
            useCustomHook: false,
            outputOption: 'persona-only', narrationStyle: settings.defaultNarration,
            plotMode: settings.defaultPlotMode, auType: '', nsfwType: '',
            personaAvatarId: null, generatedGreeting: '', length: 'medium',
        };

        let currentStep = 1;

        const updateSelectedDisplay = () => {
            const name = state.charIndex >= 0 ? characters[state.charIndex]?.name : 'None';
            dlg.find('#up_selected_char_name').text(name || 'None');
        };
        updateSelectedDisplay();

        const updateStepDisplay = () => {
            dlg.find('.up-step').hide();
            dlg.find(`.up-step[data-step="${currentStep}"]`).show();
            dlg.find('.up-progress-step').removeClass('active completed');
            dlg.find('.up-progress-step').each(function () {
                const stepNum = parseInt($(this).data('step'));
                if (stepNum < currentStep) $(this).addClass('completed');
                else if (stepNum === currentStep) $(this).addClass('active');
            });
        };

        // Helper to get value from combo input (dropdown or custom text)
        const getComboValue = (selectId, customId) => {
            const selectVal = dlg.find(`#${selectId}`).val();
            const customVal = dlg.find(`#${customId}`).val().trim();
            return customVal || selectVal || '';
        };

        const updateSummary = () => {
            dlg.find('#up_summary_name').text(state.personaName || '(AI will generate)');
            dlg.find('#up_summary_gender').text(state.gender || 'Any');
            dlg.find('#up_summary_profession').text(state.profession || '(Not specified)');
            dlg.find('#up_summary_vibe').text(state.vibe || '(Not specified)');
            dlg.find('#up_summary_dynamic').text(state.dynamicType === 'complement' ? '💕 Complement' : '🔥 Friction');
            dlg.find('#up_summary_appearance').text([state.height, state.bodyType, state.hairColor, state.hairType, state.eyeColor].filter(Boolean).join(', ') || '(Not specified)');
            // Background summary
            const bgParts = [state.upbringing, state.lifeEvent, state.motivation].filter(Boolean);
            dlg.find('#up_summary_background').text(bgParts.length > 0 ? bgParts.slice(0, 2).join(', ') + (bgParts.length > 2 ? '...' : '') : '(Not specified)');
            dlg.find('#up_summary_positive').html(Array.from(state.selectedPositive).map(t => `<span class="up-summary-trait">${t}</span>`).join(' ') || '<em>None</em>');
            dlg.find('#up_summary_negative').html(Array.from(state.selectedNegative).map(t => `<span class="up-summary-trait">${t}</span>`).join(' ') || '<em>None</em>');
            dlg.find('#up_option_char_name').text(state.charData?.name || 'the character');
        };

        const refreshSuggestions = () => {
            renderTraitSuggestions(dlg.find('#up_positive_suggestions'), 'positive', state.positiveTraits);
            renderTraitSuggestions(dlg.find('#up_negative_suggestions'), 'negative', state.negativeTraits);
        };

        const getFinalHook = () => state.useCustomHook ? dlg.find('#up_custom_hook').val().trim() : state.hooks[state.selectedHookIndex] || '';

        // Template quick load
        dlg.on('click', '.up-template-chip', function () {
            const template = settings.templates.find(t => t.id === $(this).data('id'));
            if (template) {
                state.vibe = template.vibe || '';
                state.positiveTraits = [...template.positiveTraits];
                state.negativeTraits = [...template.negativeTraits];
                state.selectedPositive = new Set(template.positiveTraits);
                state.selectedNegative = new Set(template.negativeTraits);
                dlg.find('#up_persona_vibe').val(template.vibe);
                toastr.success(`Loaded template: ${template.name}`);
            }
        });

        // Step 1 handlers
        dlg.find('#up_char_search').on('input', function () {
            renderCharacterCarousel(dlg.find('#up_character_carousel'), $(this).val());
        });

        dlg.find('#up_random_char').on('click', () => {
            const validChars = characters.filter(c => c?.name);
            if (validChars.length) {
                const random = validChars[Math.floor(Math.random() * validChars.length)];
                state.charIndex = characters.indexOf(random);
                dlg.find('.up-char-card').removeClass('selected');
                dlg.find(`.up-char-card[data-index="${state.charIndex}"]`).addClass('selected');
                updateSelectedDisplay();
                if (settings.autoScroll) {
                    dlg.find(`.up-char-card[data-index="${state.charIndex}"]`)[0]?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
                }
            }
        });

        dlg.find('#up_carousel_prev').on('click', () => dlg.find('#up_character_carousel').scrollLeft(dlg.find('#up_character_carousel').scrollLeft() - 250));
        dlg.find('#up_carousel_next').on('click', () => dlg.find('#up_character_carousel').scrollLeft(dlg.find('#up_character_carousel').scrollLeft() + 250));

        dlg.on('click', '.up-char-card', function () {
            dlg.find('.up-char-card').removeClass('selected');
            $(this).addClass('selected');
            state.charIndex = parseInt($(this).data('index'));
            updateSelectedDisplay();
        });

        dlg.find('#up_next_to_identity').on('click', async function () {
            if (state.charIndex < 0) { toastr.warning('Please select a character'); return; }
            state.charData = getCharacterData(state.charIndex);
            if (!state.charData) { toastr.error('Failed to load character'); return; }

            setButtonLoading($(this), true);
            try {
                state.charAnalysis = await analyzeCharacter(state.charData);
                dlg.find('#up_char_name_display').text(state.charData.name);
                dlg.find('#up_preview_traits').text((state.charAnalysis.traits || []).join(', '));
                dlg.find('#up_preview_motivations').text((state.charAnalysis.motivations || []).join(', '));
                currentStep = 2;
                updateStepDisplay();
            } catch (e) { toastr.error(e.message); }
            finally { setButtonLoading($(this), false); }
        });

        // Step 2 handlers
        dlg.find('#up_back_to_character').on('click', () => { currentStep = 1; updateStepDisplay(); });

        dlg.on('click', '.up-vibe-chip', function () {
            dlg.find('.up-vibe-chip').removeClass('selected');
            $(this).addClass('selected');
            state.vibe = $(this).data('vibe');
            dlg.find('#up_persona_vibe').val(state.vibe);
        });

        dlg.find('#up_persona_vibe').on('input', function () {
            state.vibe = $(this).val();
            dlg.find('.up-vibe-chip').removeClass('selected');
        });

        dlg.find('#up_enhance_vibe').on('click', async function () {
            const input = dlg.find('#up_persona_vibe').val().trim();
            if (!input) { toastr.warning('Enter a vibe first'); return; }
            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                const enhanced = await enhanceText(input);
                dlg.find('#up_persona_vibe').val(enhanced);
                state.vibe = enhanced;
            } catch (e) { toastr.error('Failed'); }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        dlg.find('#up_next_to_appearance').on('click', () => {
            state.personaName = dlg.find('#up_persona_name').val().trim();
            state.gender = dlg.find('#up_persona_gender').val();
            state.vibe = dlg.find('#up_persona_vibe').val().trim();
            currentStep = 3;
            updateStepDisplay();
        });

        // Step 3 handlers
        dlg.find('#up_back_to_identity').on('click', () => { currentStep = 2; updateStepDisplay(); });

        dlg.on('click', '.up-setting-tab', function () {
            dlg.find('.up-setting-tab').removeClass('active');
            $(this).addClass('active');
            state.setting = $(this).data('setting');
            renderSelectOptions(dlg.find('#up_clothing'), offlineData.clothing[state.setting] || []);
            renderSelectOptions(dlg.find('#up_profession'), offlineData.professions[state.setting] || []);
        });

        dlg.find('#up_randomize_appearance').on('click', () => {
            const rand = arr => arr[Math.floor(Math.random() * arr.length)] || '';
            dlg.find('#up_height').val(rand(offlineData.heights));
            dlg.find('#up_body_type').val(rand(offlineData.bodyTypes));
            dlg.find('#up_hair_color').val(rand(offlineData.hairColors));
            dlg.find('#up_hair_type').val(rand(offlineData.hairTypes));
            dlg.find('#up_clothing').val(rand(offlineData.clothing[state.setting] || []));
            dlg.find('#up_profession').val(rand(offlineData.professions[state.setting] || []));
            dlg.find('#up_weapon').val(rand(offlineData.weapons));
        });

        dlg.find('#up_clear_appearance').on('click', () => {
            dlg.find('#up_height, #up_body_type, #up_hair_color, #up_hair_type, #up_clothing, #up_profession, #up_weapon, #up_physical_notes').val('');
        });

        dlg.find('#up_enhance_physical').on('click', async function () {
            const input = dlg.find('#up_physical_notes').val().trim();
            if (!input) { toastr.warning('Enter details first'); return; }
            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                dlg.find('#up_physical_notes').val(await enhanceText(input));
            } catch (e) { toastr.error('Failed'); }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        // Combo input handlers - clear dropdown when typing custom, and vice versa
        dlg.on('input', '.up-combo-text', function () {
            if ($(this).val().trim()) {
                $(this).siblings('.up-combo-select').val('');
            }
        });
        dlg.on('change', '.up-combo-select', function () {
            if ($(this).val()) {
                $(this).siblings('.up-combo-text').val('');
            }
        });

        dlg.find('#up_next_to_traits').on('click', async function () {
            state.height = getComboValue('up_height', 'up_height_custom');
            state.bodyType = getComboValue('up_body_type', 'up_body_type_custom');
            state.hairColor = getComboValue('up_hair_color', 'up_hair_color_custom');
            state.hairType = getComboValue('up_hair_type', 'up_hair_type_custom');
            state.eyeColor = dlg.find('#up_eye_color').val().trim();
            state.clothing = getComboValue('up_clothing', 'up_clothing_custom');
            state.profession = getComboValue('up_profession', 'up_profession_custom');
            state.weapon = getComboValue('up_weapon', 'up_weapon_custom');
            state.physicalNotes = dlg.find('#up_physical_notes').val().trim();

            // Skip trait generation if template already loaded traits
            if (state.positiveTraits.length > 0 || state.negativeTraits.length > 0) {
                renderTraitChips(dlg.find('#up_positive_traits'), state.positiveTraits, state.selectedPositive);
                renderTraitChips(dlg.find('#up_negative_traits'), state.negativeTraits, state.selectedNegative);
                refreshSuggestions();
                currentStep = 4;
                updateStepDisplay();
                return;
            }

            setButtonLoading($(this), true);
            try {
                let traits = await generateTraitsFromAI(state.charAnalysis, 'complement', state.gender, state.vibe);
                if (!traits?.positive?.length) traits = getTraitsFromOffline();
                state.positiveTraits = traits.positive;
                state.negativeTraits = traits.negative;
                state.selectedPositive = new Set();
                state.selectedNegative = new Set();
                renderTraitChips(dlg.find('#up_positive_traits'), state.positiveTraits, state.selectedPositive);
                renderTraitChips(dlg.find('#up_negative_traits'), state.negativeTraits, state.selectedNegative);
                refreshSuggestions();
                currentStep = 4;
                updateStepDisplay();
            } catch (e) { toastr.error('Failed to generate traits'); }
            finally { setButtonLoading($(this), false); }
        });

        // Step 4 handlers (Traits)
        dlg.find('#up_back_to_appearance').on('click', () => { currentStep = 3; updateStepDisplay(); });

        dlg.on('click', '#up_positive_traits .up-trait-chip', function (e) {
            const trait = $(this).data('trait');
            if ($(e.target).hasClass('remove-trait')) {
                state.positiveTraits = state.positiveTraits.filter(t => t !== trait);
                state.selectedPositive.delete(trait);
                $(this).remove();
                refreshSuggestions();
            } else {
                state.selectedPositive.has(trait) ? state.selectedPositive.delete(trait) : state.selectedPositive.add(trait);
                $(this).toggleClass('selected');
            }
        });

        dlg.on('click', '#up_negative_traits .up-trait-chip', function (e) {
            const trait = $(this).data('trait');
            if ($(e.target).hasClass('remove-trait')) {
                state.negativeTraits = state.negativeTraits.filter(t => t !== trait);
                state.selectedNegative.delete(trait);
                $(this).remove();
                refreshSuggestions();
            } else {
                state.selectedNegative.has(trait) ? state.selectedNegative.delete(trait) : state.selectedNegative.add(trait);
                $(this).toggleClass('selected');
            }
        });

        dlg.on('click', '#up_positive_suggestions .up-suggestion-chip', function () {
            const trait = $(this).data('trait');
            if (!state.positiveTraits.includes(trait)) {
                state.positiveTraits.push(trait);
                state.selectedPositive.add(trait);
                renderTraitChips(dlg.find('#up_positive_traits'), state.positiveTraits, state.selectedPositive);
                refreshSuggestions();
            }
        });

        dlg.on('click', '#up_negative_suggestions .up-suggestion-chip', function () {
            const trait = $(this).data('trait');
            if (!state.negativeTraits.includes(trait)) {
                state.negativeTraits.push(trait);
                state.selectedNegative.add(trait);
                renderTraitChips(dlg.find('#up_negative_traits'), state.negativeTraits, state.selectedNegative);
                refreshSuggestions();
            }
        });

        dlg.find('#up_untick_positive').on('click', () => {
            state.selectedPositive.clear();
            renderTraitChips(dlg.find('#up_positive_traits'), state.positiveTraits, state.selectedPositive);
        });

        dlg.find('#up_untick_negative').on('click', () => {
            state.selectedNegative.clear();
            renderTraitChips(dlg.find('#up_negative_traits'), state.negativeTraits, state.selectedNegative);
        });

        dlg.find('#up_add_positive_btn').on('click', () => {
            const input = dlg.find('#up_add_positive');
            const trait = input.val().trim();
            if (trait && !state.positiveTraits.includes(trait)) {
                state.positiveTraits.push(trait);
                state.selectedPositive.add(trait);
                renderTraitChips(dlg.find('#up_positive_traits'), state.positiveTraits, state.selectedPositive);
                input.val('');
            }
        });

        dlg.find('#up_add_negative_btn').on('click', () => {
            const input = dlg.find('#up_add_negative');
            const trait = input.val().trim();
            if (trait && !state.negativeTraits.includes(trait)) {
                state.negativeTraits.push(trait);
                state.selectedNegative.add(trait);
                renderTraitChips(dlg.find('#up_negative_traits'), state.negativeTraits, state.selectedNegative);
                input.val('');
            }
        });

        dlg.find('#up_regen_positive').on('click', async function () {
            $(this).find('i').addClass('fa-spin');
            const selected = Array.from(state.selectedPositive);
            const traits = await generateTraitsFromAI(state.charAnalysis, state.dynamicType || 'complement', state.gender, state.vibe, [...selected, ...Array.from(state.selectedNegative)]);
            const newTraits = traits?.positive?.length ? traits.positive : getRandomFromOffline('positiveTraits', settings.traitCount, state.positiveTraits);
            state.positiveTraits = [...selected, ...newTraits.slice(0, settings.traitCount - selected.length)];
            renderTraitChips(dlg.find('#up_positive_traits'), state.positiveTraits, state.selectedPositive);
            refreshSuggestions();
            $(this).find('i').removeClass('fa-spin');
        });

        dlg.find('#up_regen_negative').on('click', async function () {
            $(this).find('i').addClass('fa-spin');
            const selected = Array.from(state.selectedNegative);
            const traits = await generateTraitsFromAI(state.charAnalysis, state.dynamicType || 'complement', state.gender, state.vibe, [...selected, ...Array.from(state.selectedPositive)]);
            const count = Math.max(3, settings.traitCount - 1);
            const newTraits = traits?.negative?.length ? traits.negative : getRandomFromOffline('negativeTraits', count, state.negativeTraits);
            state.negativeTraits = [...selected, ...newTraits.slice(0, count - selected.length)];
            renderTraitChips(dlg.find('#up_negative_traits'), state.negativeTraits, state.selectedNegative);
            refreshSuggestions();
            $(this).find('i').removeClass('fa-spin');
        });

        dlg.find('#up_save_as_template').on('click', async () => {
            const name = await Popup.show.input('Save Template', 'Enter a name for this template:');
            if (name) {
                saveTemplate(name, state.vibe, Array.from(state.selectedPositive), Array.from(state.selectedNegative));
                toastr.success('Template saved!');
            }
        });

        dlg.find('#up_next_to_background').on('click', () => {
            if (state.selectedPositive.size === 0 && state.selectedNegative.size === 0) {
                toastr.warning('Please select at least one trait');
                return;
            }
            currentStep = 5;
            updateStepDisplay();
        });

        // Step 5 handlers (Background)
        dlg.find('#up_back_to_traits').on('click', () => { currentStep = 4; updateStepDisplay(); });

        // Background chip handlers
        dlg.on('click', '#up_upbringing_chips .up-background-chip', function () {
            dlg.find('#up_upbringing_chips .up-background-chip').removeClass('selected');
            $(this).addClass('selected');
            state.upbringingId = $(this).data('upbringing');
            state.upbringing = $(this).data('name');
            dlg.find('#up_upbringing_custom').val('');
        });

        dlg.find('#up_upbringing_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#up_upbringing_chips .up-background-chip').removeClass('selected');
                state.upbringingId = '';
                state.upbringing = $(this).val().trim();
            }
        });

        dlg.on('click', '#up_life_event_chips .up-background-chip', function () {
            dlg.find('#up_life_event_chips .up-background-chip').removeClass('selected');
            $(this).addClass('selected');
            state.lifeEventId = $(this).data('lifeevent');
            state.lifeEvent = $(this).data('name');
            dlg.find('#up_life_event_custom').val('');
        });

        dlg.find('#up_life_event_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#up_life_event_chips .up-background-chip').removeClass('selected');
                state.lifeEventId = '';
                state.lifeEvent = $(this).val().trim();
            }
        });

        dlg.on('click', '#up_motivation_chips .up-background-chip', function () {
            dlg.find('#up_motivation_chips .up-background-chip').removeClass('selected');
            $(this).addClass('selected');
            state.motivationId = $(this).data('motivation');
            state.motivation = $(this).data('name');
            dlg.find('#up_motivation_custom').val('');
        });

        dlg.find('#up_motivation_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#up_motivation_chips .up-background-chip').removeClass('selected');
                state.motivationId = '';
                state.motivation = $(this).val().trim();
            }
        });

        dlg.on('click', '#up_secret_chips .up-background-chip', function () {
            dlg.find('#up_secret_chips .up-background-chip').removeClass('selected');
            $(this).addClass('selected');
            state.secretId = $(this).data('secret');
            state.secret = $(this).data('name');
            dlg.find('#up_secret_custom').val('');
        });

        dlg.find('#up_secret_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#up_secret_chips .up-background-chip').removeClass('selected');
                state.secretId = '';
                state.secret = $(this).val().trim();
            }
        });

        // Generate full background from selections
        dlg.find('#up_generate_background').on('click', async function () {
            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                const generated = await generateBackgroundStory(
                    state.upbringing || dlg.find('#up_upbringing_custom').val().trim(),
                    state.lifeEvent || dlg.find('#up_life_event_custom').val().trim(),
                    state.motivation || dlg.find('#up_motivation_custom').val().trim(),
                    state.secret || dlg.find('#up_secret_custom').val().trim()
                );
                dlg.find('#up_background_full').val(generated);
                state.backgroundFull = generated;
            } catch (e) {
                toastr.error('Failed to generate background');
            }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        // Randomize background
        dlg.find('#up_randomize_background').on('click', () => {
            const rand = arr => arr[Math.floor(Math.random() * arr.length)];

            // Random upbringing
            const upbringing = rand(offlineData.upbringings || []);
            if (upbringing) {
                dlg.find('#up_upbringing_chips .up-background-chip').removeClass('selected');
                dlg.find(`#up_upbringing_chips .up-background-chip[data-upbringing="${upbringing.id}"]`).addClass('selected');
                state.upbringingId = upbringing.id;
                state.upbringing = upbringing.name;
            }

            // Random life event
            const event = rand(offlineData.lifeEvents || []);
            if (event) {
                dlg.find('#up_life_event_chips .up-background-chip').removeClass('selected');
                dlg.find(`#up_life_event_chips .up-background-chip[data-lifeevent="${event.id}"]`).addClass('selected');
                state.lifeEventId = event.id;
                state.lifeEvent = event.name;
            }

            // Random motivation
            const motivation = rand(offlineData.motivations || []);
            if (motivation) {
                dlg.find('#up_motivation_chips .up-background-chip').removeClass('selected');
                dlg.find(`#up_motivation_chips .up-background-chip[data-motivation="${motivation.id}"]`).addClass('selected');
                state.motivationId = motivation.id;
                state.motivation = motivation.name;
            }

            // Random secret (50% chance)
            if (Math.random() > 0.5) {
                const secret = rand(offlineData.secrets || []);
                if (secret) {
                    dlg.find('#up_secret_chips .up-background-chip').removeClass('selected');
                    dlg.find(`#up_secret_chips .up-background-chip[data-secret="${secret.id}"]`).addClass('selected');
                    state.secretId = secret.id;
                    state.secret = secret.name;
                }
            }
        });

        // Clear background
        dlg.find('#up_clear_background').on('click', () => {
            dlg.find('.up-background-chip').removeClass('selected');
            dlg.find('#up_upbringing_custom, #up_life_event_custom, #up_motivation_custom, #up_secret_custom, #up_background_full').val('');
            state.upbringing = state.upbringingId = '';
            state.lifeEvent = state.lifeEventId = '';
            state.motivation = state.motivationId = '';
            state.secret = state.secretId = '';
            state.backgroundFull = '';
        });

        // Navigate to Dynamic
        dlg.find('#up_next_to_dynamic').on('click', () => {
            // Get final background text if provided
            state.backgroundFull = dlg.find('#up_background_full').val().trim();
            currentStep = 6;
            updateStepDisplay();
        });

        // Step 6 handlers (Dynamic)
        dlg.find('#up_back_to_background').on('click', () => { currentStep = 5; updateStepDisplay(); });

        dlg.find('.up-type-card').on('click', function () {
            dlg.find('.up-type-card').removeClass('selected');
            $(this).addClass('selected');
            state.dynamicType = $(this).data('type');
        });

        dlg.find('#up_next_to_summary').on('click', () => {
            if (!state.dynamicType) { toastr.warning('Please select a dynamic'); return; }
            updateSummary();
            currentStep = 7;
            updateStepDisplay();
        });

        // Step 7 handlers (Summary)
        dlg.find('#up_back_to_dynamic').on('click', () => { currentStep = 6; updateStepDisplay(); });

        dlg.find('.up-output-option').on('click', function () {
            dlg.find('.up-output-option').removeClass('selected').find('.up-option-radio i').removeClass('fa-circle-dot fa-solid').addClass('fa-circle fa-regular');
            $(this).addClass('selected').find('.up-option-radio i').removeClass('fa-circle fa-regular').addClass('fa-circle-dot fa-solid');
            state.outputOption = $(this).data('option');
            dlg.find('#up_hook_section').toggle(state.outputOption !== 'persona-only');
        });

        dlg.on('click', '.up-plot-mode-option', function () {
            dlg.find('.up-plot-mode-option').removeClass('selected');
            $(this).addClass('selected');
            state.plotMode = $(this).data('mode');
            dlg.find('#up_au_section').toggle(state.plotMode === 'au');
            dlg.find('#up_nsfw_section').toggle(state.plotMode === 'nsfw');
            state.hooks = [];
            dlg.find('#up_plot_hooks').empty();
            state.selectedHookIndex = -1;
        });

        dlg.on('click', '.up-au-option', function () {
            dlg.find('.up-au-option').removeClass('selected');
            $(this).addClass('selected');
            state.auType = $(this).data('au');
            state.hooks = [];
            dlg.find('#up_plot_hooks').empty();
        });

        dlg.find('#up_random_au').on('click', () => {
            const random = offlineData.auTypes[Math.floor(Math.random() * offlineData.auTypes.length)];
            if (random) {
                dlg.find('.up-au-option').removeClass('selected');
                dlg.find(`.up-au-option[data-au="${random.id}"]`).addClass('selected');
                state.auType = random.id;
            }
        });

        dlg.on('click', '.up-nsfw-option', function () {
            dlg.find('.up-nsfw-option').removeClass('selected');
            $(this).addClass('selected');
            state.nsfwType = $(this).data('nsfw');
            state.hooks = [];
            dlg.find('#up_plot_hooks').empty();
        });

        dlg.on('click', '.up-narration-option', function () {
            dlg.find('.up-narration-option').removeClass('selected');
            $(this).addClass('selected');
            state.narrationStyle = $(this).data('style');
        });

        dlg.find('#up_use_custom_hook').on('change', function () {
            state.useCustomHook = $(this).is(':checked');
            if (state.useCustomHook) {
                dlg.find('.up-hook-item').removeClass('selected');
                state.selectedHookIndex = -1;
            }
        });

        dlg.find('#up_regen_hooks').on('click', async function () {
            if (state.plotMode === 'au' && !state.auType) { toastr.warning('Select AU type'); return; }
            if (state.plotMode === 'nsfw' && !state.nsfwType) { toastr.warning('Select scenario type'); return; }

            setButtonLoading($(this), true);
            try {
                state.hooks = await generateHooks(state.charData, state.charAnalysis, {
                    name: state.personaName,
                    positiveTraits: Array.from(state.selectedPositive),
                    negativeTraits: Array.from(state.selectedNegative),
                    profession: state.profession,
                }, state.dynamicType, state.plotMode, state.auType, state.nsfwType);
                state.selectedHookIndex = 0;
                state.useCustomHook = false;
                dlg.find('#up_use_custom_hook').prop('checked', false);
                renderHooks(dlg.find('#up_plot_hooks'), state.hooks, state.selectedHookIndex);
            } catch (e) { toastr.error('Failed'); }
            setButtonLoading($(this), false);
        });

        dlg.on('click', '.up-hook-item', function () {
            dlg.find('.up-hook-item').removeClass('selected');
            $(this).addClass('selected');
            state.selectedHookIndex = parseInt($(this).data('hook'));
            state.useCustomHook = false;
            dlg.find('#up_use_custom_hook').prop('checked', false);
        });

        dlg.find('#up_enhance_hook').on('click', async function () {
            const input = dlg.find('#up_custom_hook').val().trim();
            if (!input) { toastr.warning('Enter scenario first'); return; }
            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                dlg.find('#up_custom_hook').val(await enhanceText(input));
                state.useCustomHook = true;
                dlg.find('#up_use_custom_hook').prop('checked', true);
                dlg.find('.up-hook-item').removeClass('selected');
            } catch (e) { toastr.error('Failed'); }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        dlg.find('#up_custom_hook').on('input', function () {
            if ($(this).val().trim()) {
                state.useCustomHook = true;
                dlg.find('#up_use_custom_hook').prop('checked', true);
                dlg.find('.up-hook-item').removeClass('selected');
            }
        });

        dlg.find('#up_generate_final').on('click', async function () {
            setButtonLoading($(this), true);
            try {
                const result = await generateFinalPersona(state.charData, state.charAnalysis, {
                    name: state.personaName || null,
                    gender: state.gender, vibe: state.vibe,
                    height: state.height, bodyType: state.bodyType,
                    hairColor: state.hairColor, hairType: state.hairType,
                    eyeColor: state.eyeColor,
                    clothing: state.clothing, profession: state.profession,
                    weapon: state.weapon, physicalNotes: state.physicalNotes,
                    positiveTraits: Array.from(state.selectedPositive),
                    negativeTraits: Array.from(state.selectedNegative),
                    dynamicType: state.dynamicType,
                    // Background
                    upbringing: state.upbringing,
                    lifeEvent: state.lifeEvent,
                    motivation: state.motivation,
                    secret: state.secret,
                    backgroundFull: state.backgroundFull,
                });
                dlg.find('#up_final_name').val(state.personaName || result.name);
                dlg.find('#up_final_description').val(result.description);
                currentStep = 8;
                updateStepDisplay();
            } catch (e) { toastr.error(e.message); }
            finally { setButtonLoading($(this), false); }
        });

        // Step 8 handlers (Review Persona)
        dlg.find('#up_back_to_summary').on('click', () => { currentStep = 7; updateStepDisplay(); });

        dlg.find('#up_regenerate').on('click', async function () {
            setButtonLoading($(this), true);
            try {
                const result = await generateFinalPersona(state.charData, state.charAnalysis, {
                    name: dlg.find('#up_final_name').val().trim() || null,
                    gender: state.gender, vibe: state.vibe,
                    height: state.height, bodyType: state.bodyType,
                    hairColor: state.hairColor, hairType: state.hairType,
                    eyeColor: state.eyeColor,
                    clothing: state.clothing, profession: state.profession,
                    weapon: state.weapon, physicalNotes: state.physicalNotes,
                    positiveTraits: Array.from(state.selectedPositive),
                    negativeTraits: Array.from(state.selectedNegative),
                    dynamicType: state.dynamicType,
                    upbringing: state.upbringing,
                    lifeEvent: state.lifeEvent,
                    motivation: state.motivation,
                    secret: state.secret,
                    backgroundFull: state.backgroundFull,
                });
                dlg.find('#up_final_description').val(result.description);
                toastr.success('Regenerated!');
            } catch (e) { toastr.error(e.message); }
            setButtonLoading($(this), false);
        });

        dlg.find('#up_next_to_greeting').on('click', async function () {
            const finalName = dlg.find('#up_final_name').val().trim() || 'New Persona';
            const finalDescription = dlg.find('#up_final_description').val().trim();
            if (!finalDescription) { toastr.warning('Add a description'); return; }

            setButtonLoading($(this), true);
            try {
                state.personaAvatarId = await createPersonaInST(finalName, finalDescription);
                await getUserAvatars(true, state.personaAvatarId);

                addToHistory({
                    name: finalName,
                    vibe: state.vibe,
                    positiveTraits: Array.from(state.selectedPositive),
                    negativeTraits: Array.from(state.selectedNegative),
                    dynamicType: state.dynamicType,
                }, state.charData?.name);

                toastr.success(`Persona "${finalName}" created!`);

                if (state.outputOption === 'add-greeting') {
                    const hook = getFinalHook();
                    if (!hook) {
                        showSuccessScreen(dlg, finalName, state.personaAvatarId, state);
                        return;
                    }

                    dlg.find('#up_greeting_char_name').text(state.charData.name);
                    dlg.find('#up_greeting_hook_preview').text(hook.length > 100 ? hook.substring(0, 100) + '...' : hook);
                    dlg.find('#up_greeting_preview').val('Generating greeting...');

                    currentStep = 9;
                    updateStepDisplay();

                    try {
                        // Use standard prompt builder for higher quality
                        const prompt = buildGreetingPrompt({
                            charData: state.charData,
                            storyType: state.plotMode === 'au' ? 'au' : (state.plotMode === 'nsfw' ? 'nsfw' : 'canon'),
                            auType: state.auType,
                            nsfwScenario: state.nsfwType,
                            plotHook: hook,
                            relationship: state.dynamicType,
                            narrationStyle: state.narrationStyle,
                            length: state.length,
                            personaData: { name: finalName, description: finalDescription },
                            personaFocus: 'balanced'
                        });

                        state.generatedGreeting = await generateGreetingFromPrompt(prompt, state.charData, { name: finalName });
                        dlg.find('#up_greeting_preview').val(state.generatedGreeting);
                    } catch (e) {
                        console.error(e);
                        dlg.find('#up_greeting_preview').val('Failed to generate. You can write your own.');
                        toastr.error('Greeting generation failed: ' + e.message);
                    }
                } else {
                    showSuccessScreen(dlg, finalName, state.personaAvatarId, state);
                }
            } catch (e) { toastr.error('Failed: ' + e.message); }
            finally { setButtonLoading($(this), false); }
        });

        // Step 9 handlers (Greeting)
        dlg.find('#up_back_to_persona').on('click', () => { currentStep = 8; updateStepDisplay(); });

        // Length selector
        dlg.on('click', '.ugw-length-option', function () {
            dlg.find('.ugw-length-option').removeClass('selected');
            $(this).addClass('selected');
            state.length = $(this).data('length');
        });

        // Quick Enhance Handlers
        dlg.find('#up_more_description').on('click', async function () {
            const current = dlg.find('#up_greeting_preview').val();
            if (!current) return;
            setButtonLoading($(this), true);
            try {
                const enhanced = await enhanceGreetingDescription(current, state.charData);
                dlg.find('#up_greeting_preview').val(enhanced.trim());
                toastr.success('Added more description!');
            } catch (e) { toastr.error('Failed to enhance'); }
            setButtonLoading($(this), false);
        });

        dlg.find('#up_more_dialogue').on('click', async function () {
            const current = dlg.find('#up_greeting_preview').val();
            if (!current) return;
            setButtonLoading($(this), true);
            try {
                const enhanced = await enhanceGreetingDialogue(current, state.charData);
                dlg.find('#up_greeting_preview').val(enhanced.trim());
                toastr.success('Added more dialogue!');
            } catch (e) { toastr.error('Failed to enhance'); }
            setButtonLoading($(this), false);
        });

        dlg.find('#up_more_persona').on('click', async function () {
            const current = dlg.find('#up_greeting_preview').val();
            const personaDummy = { name: dlg.find('#up_final_name').val(), description: dlg.find('#up_final_description').val() };
            if (!current) return;
            setButtonLoading($(this), true);
            try {
                const enhanced = await enhanceGreetingPersona(current, state.charData, personaDummy);
                dlg.find('#up_greeting_preview').val(enhanced.trim());
                toastr.success('Added more persona!');
            } catch (e) { toastr.error('Failed to enhance'); }
            setButtonLoading($(this), false);
        });

        dlg.find('#up_adjust_tone').on('click', async function () {
            const current = dlg.find('#up_greeting_preview').val();
            if (!current) return;
            const tone = await Popup.show.input('Adjust Tone', 'What tone? (e.g., darker, romantic, funny)');
            if (!tone) return;
            setButtonLoading($(this), true);
            try {
                const adjusted = await adjustGreetingTone(current, state.charData, tone);
                dlg.find('#up_greeting_preview').val(adjusted.trim());
                toastr.success('Tone adjusted!');
            } catch (e) { toastr.error('Failed'); }
            setButtonLoading($(this), false);
        });

        dlg.find('#up_regen_greeting').on('click', async function () {
            const hook = getFinalHook();
            if (!hook) { toastr.warning('No hook available'); return; }
            setButtonLoading($(this), true);
            try {
                // Construct standard prompt
                const personaName = dlg.find('#up_final_name').val().trim();
                const personaDesc = dlg.find('#up_final_description').val().trim();

                const prompt = buildGreetingPrompt({
                    charData: state.charData,
                    storyType: state.plotMode === 'au' ? 'au' : (state.plotMode === 'nsfw' ? 'nsfw' : 'canon'),
                    auType: state.auType,
                    nsfwScenario: state.nsfwType,
                    plotHook: hook,
                    relationship: state.dynamicType,
                    narrationStyle: state.narrationStyle,
                    length: state.length,
                    personaData: { name: personaName, description: personaDesc },
                    personaFocus: 'balanced'
                });

                state.generatedGreeting = await generateGreetingFromPrompt(prompt, state.charData, { name: personaName });
                dlg.find('#up_greeting_preview').val(state.generatedGreeting);
                toastr.success('Regenerated!');
            } catch (e) {
                console.error(e);
                toastr.error('Failed: ' + e.message);
            }
            setButtonLoading($(this), false);
        });

        dlg.find('#up_save_greeting').on('click', async function () {
            const greeting = dlg.find('#up_greeting_preview').val().trim();
            if (!greeting) { toastr.warning('Add greeting text'); return; }
            setButtonLoading($(this), true);
            try {
                const num = await saveAlternateGreeting(state.charIndex, greeting);
                toastr.success(`Greeting #${num} saved to ${state.charData.name}!`);
                showSuccessScreen(dlg, dlg.find('#up_final_name').val().trim(), state.personaAvatarId, state);
            } catch (e) { toastr.error('Failed: ' + e.message); }
            finally { setButtonLoading($(this), false); }
        });

        dlg.find('#up_skip_greeting').on('click', () => {
            showSuccessScreen(dlg, dlg.find('#up_final_name').val().trim(), state.personaAvatarId, state);
        });

        function showSuccessScreen(dlg, name, avatarId, personaState) {
            dlg.find('#up_success_message').text(`Your persona "${name}" has been created successfully!`);
            dlg.find('.up-step').hide().removeClass('up-visible');
            dlg.find('.up-step[data-step="success"]').show().addClass('up-visible');
            dlg.find('.up-progress-step').addClass('completed');

            launchConfetti(dlg.find('#up_confetti_canvas')[0]);

            // Generate image prompts
            const personaData = {
                gender: personaState.gender,
                height: personaState.height,
                bodyType: personaState.bodyType,
                hairColor: personaState.hairColor,
                hairType: personaState.hairType,
                eyeColor: personaState.eyeColor,
                clothing: personaState.clothing,
                physicalNotes: personaState.physicalNotes,
            };
            const booruTags = generateBooruTags(personaData);
            const naturalPrompt = generateNaturalPrompt(personaData);

            dlg.find('#up_booru_tags').val(booruTags);
            dlg.find('#up_natural_prompt').val(naturalPrompt);

            // Copy button handlers
            dlg.find('#up_copy_booru_tags').off('click').on('click', () => {
                navigator.clipboard.writeText(booruTags);
                toastr.success('Booru tags copied!');
            });

            dlg.find('#up_copy_natural_prompt').off('click').on('click', () => {
                navigator.clipboard.writeText(naturalPrompt);
                toastr.success('Prompt copied!');
            });

            // Regenerate prompts
            dlg.find('#up_regenerate_prompt').off('click').on('click', () => {
                const newBooru = generateBooruTags(personaData);
                const newNatural = generateNaturalPrompt(personaData);
                dlg.find('#up_booru_tags').val(newBooru);
                dlg.find('#up_natural_prompt').val(newNatural);
                toastr.success('Prompts regenerated!');
            });

            dlg.find('#up_use_persona_now').off('click').on('click', async () => {
                await setUserAvatar(avatarId);
                toastr.success(`Now using "${name}"`);
                $('.popup-button-cancel').trigger('click');
            });

            dlg.find('#up_create_another').off('click').on('click', () => {
                currentStep = 1;
                state.charIndex = -1;
                state.charData = null;
                state.positiveTraits = [];
                state.negativeTraits = [];
                state.selectedPositive = new Set();
                state.selectedNegative = new Set();
                state.hooks = [];
                // Reset background
                state.upbringing = state.upbringingId = '';
                state.lifeEvent = state.lifeEventId = '';
                state.motivation = state.motivationId = '';
                state.secret = state.secretId = '';
                state.backgroundFull = '';
                dlg.find('.up-background-chip').removeClass('selected');
                dlg.find('#up_upbringing_custom, #up_life_event_custom, #up_motivation_custom, #up_secret_custom, #up_background_full').val('');
                dlg.find('.up-step').removeClass('up-visible');
                dlg.find('.up-progress-step').removeClass('completed');
                updateStepDisplay();
                updateSelectedDisplay();
            });

            dlg.find('#up_close_wizard').off('click').on('click', () => {
                $('.popup-button-cancel').trigger('click');
            });
        }

        updateStepDisplay();
        await callGenericPopup(dlg, POPUP_TYPE.TEXT, '', { wide: true, large: true, okButton: false, cancelButton: 'Close', allowVerticalScrolling: true });
    } catch (e) {
        console.error('[Ultimate Persona] Error:', e);
        toastr.error('Failed to open: ' + e.message);
    }
}

// ==================== GREETING WIZARD FUNCTIONS ====================

// Analyze character's existing greetings to understand their style
function analyzeGreetingStyle(charData) {
    const greetings = charData.alternate_greetings || [];
    const firstMes = charData.first_mes || '';

    let totalLength = firstMes.length;
    let dialogueCount = 0;
    let descriptionCount = 0;
    let samples = [];

    // Analyze first message
    if (firstMes) {
        dialogueCount += (firstMes.match(/["'「」『』]/g) || []).length / 2;
        descriptionCount += (firstMes.match(/\*[^*]+\*/g) || []).length;
        samples.push(firstMes.substring(0, 200));
    }

    // Analyze alternate greetings
    greetings.forEach(g => {
        totalLength += g.length;
        dialogueCount += (g.match(/["'「」『』]/g) || []).length / 2;
        descriptionCount += (g.match(/\*[^*]+\*/g) || []).length;
        if (samples.length < 3) samples.push(g.substring(0, 200));
    });

    const avgLength = totalLength / (greetings.length + 1);
    const avgDialogue = dialogueCount / (greetings.length + 1);
    const avgDescription = descriptionCount / (greetings.length + 1);

    return {
        averageLength: avgLength,
        dialogueHeavy: avgDialogue > avgDescription,
        descriptionHeavy: avgDescription > avgDialogue,
        greetingCount: greetings.length,
        samples: samples,
        hasFirstMes: !!firstMes,
    };
}

// Build greeting generation prompt
function buildGreetingPrompt(options) {
    const {
        charData,
        charAnalysis,
        greetingStyle,
        storyType,
        auType,
        nsfwScenario,
        premise,
        plotHook,
        relationship,
        location,
        storyBeats,
        customScenario,
        narrationStyle,
        length,
        tones,
        nsfwTones,
        canonConflicts,
        canonTensions,
        additionalInstructions,
        personaData,
        personaFocus,
    } = options;

    const lengthGuide = {
        short: '1-2 paragraphs (100-200 words)',
        medium: '3-4 paragraphs (250-400 words)',
        long: '5+ paragraphs (500+ words)',
    };

    const styleText = {
        first: 'first person (I/me)',
        second: 'second person (you)',
        third: 'third person (he/she/they)',
        mixed: 'natural narrative mixing perspectives as appropriate',
    }[narrationStyle] || 'natural narrative';

    let prompt = `Write an alternate greeting for {{char}}.

===== TEMPLATE FORMATTING (MANDATORY) =====
You MUST use these exact placeholders:
- {{char}} = the character (use this EXACT placeholder, never their actual name)
- {{user}} = the user/persona (use this EXACT placeholder, never any name)

CHARACTER INFORMATION:
Name: {{char}}
Description: ${charData.description || 'Not provided'}
Personality: ${charData.personality || 'Not provided'}
Scenario: ${charData.scenario || 'Not provided'}

CRITICAL: Always refer to the character as {{char}} in the greeting, never use their actual name. Always refer to the user as {{user}}, never use any name.
`;

    // Add persona info if provided - ALWAYS use {{user}} placeholder, NEVER include persona names
    if (personaData) {
        // Sanitize persona description to remove ANY persona names - the AI should NEVER see them
        let personaDesc = sanitizePersonaText(personaData.description || 'Not provided', personaData);

        prompt += `PERSONA INFORMATION:
Description: ${personaDesc}

IMPORTANT INSTRUCTIONS FOR PERSONA INTERACTION:
- You are generating a greeting specifically for {{user}} (the persona above).
- The interaction must reflect the unique chemistry between {{char}} and {{user}}.
- Incorporate {{user}}'s physical traits or personality where natural (e.g., {{char}} noticing a specific feature or reacting to their vibe).
- The tone should heavily depend on the relationship (${relationship || 'neutral'}) and the persona's nature.
- Avoid generic greetings; make it personal to {{user}}.

${personaFocus === 'featured' ? 'IMPORTANT: Feature {{user}} prominently, reference their specific traits and personality throughout the greeting.' : ''}
${personaFocus === 'minimal' ? 'NOTE: Keep {{user}} references brief, focus primarily on the character.' : ''}

===== MANDATORY TEMPLATE: {{user}} =====
The user/persona MUST be referred to as {{user}} - this is the DEFAULT TEMPLATE.
- {{user}} is the REQUIRED placeholder - use it EXACTLY as shown
- NEVER write any actual name (Bob, John, Alice, etc.) - ONLY write {{user}}
- NEVER use "you" or any pronoun - ONLY write {{user}}
- {{user}} is the template - write it literally in your response
- If you write any name instead of {{user}}, you have made an error
`;
    } else {
        prompt += `===== MANDATORY TEMPLATE: {{user}} =====
The user MUST be referred to as {{user}} - this is the DEFAULT TEMPLATE.
- {{user}} is the REQUIRED placeholder - use it EXACTLY as shown
- NEVER write any actual name (Bob, John, Alice, etc.) - ONLY write {{user}}
- NEVER use "you" or any pronoun - ONLY write {{user}}
- {{user}} is the template - write it literally in your response
- If you write any name instead of {{user}}, you have made an error
`;
    }

    // Story type context
    prompt += `STORY TYPE: ${storyType.toUpperCase()}
`;

    if (storyType === 'canon') {
        prompt += `Stay true to the character's established world, lore, and personality. The greeting should feel like it could exist in their universe. Reference their canon setting, relationships, and circumstances.

`;
        // Add canon-specific conflicts and tensions
        if (canonConflicts && canonConflicts.length > 0) {
            prompt += `INCORPORATE THESE CANON CONFLICTS: ${canonConflicts.join('; ')}
`;
        }
        if (canonTensions && canonTensions.length > 0) {
            prompt += `UNDERLYING TENSIONS TO WEAVE IN: ${canonTensions.join('; ')}
`;
        }
    } else if (storyType === 'au') {
        prompt += `Alternate Universe setting. Focus on the character's core personality and appearance in a new context. Their mannerisms, speech patterns, and fundamental traits should remain recognizable even in this new setting.
`;
        // Add AU type details
        if (auType) {
            const auInfo = (offlineData.auTypes || []).find(a => a.id === auType);
            if (auInfo) {
                prompt += `AU TYPE: ${auInfo.name} - ${auInfo.description}
Place the character in this ${auInfo.name} setting while maintaining their core identity.

`;
            }
        }
    } else if (storyType === 'nsfw') {
        prompt += `Romantic/intimate encounter. Focus on tension, chemistry, and emotional/physical connection. Keep the character's personality authentic while exploring romantic and sensual themes.
`;
        // Add NSFW scenario details
        if (nsfwScenario) {
            const nsfwInfo = (offlineData.nsfwScenarios || []).find(n => n.id === nsfwScenario);
            if (nsfwInfo) {
                const isExplicit = nsfwInfo.id && nsfwInfo.id.startsWith('explicit_');
                prompt += `SCENARIO TYPE: ${nsfwInfo.name} - ${nsfwInfo.description}
Build the scene around this "${nsfwInfo.name}" dynamic.
${isExplicit ? `
EXPLICIT CONTENT: This scenario should include explicit, detailed descriptions of physical intimacy, sexual acts, and sensual encounters. Be graphic and detailed in describing the physical aspects while maintaining character authenticity and emotional depth.` : ''}

`;
            }
        }
        // Add NSFW-specific tones
        if (nsfwTones && nsfwTones.length > 0) {
            prompt += `INTIMATE TONE: The scene should feel ${nsfwTones.join(', ')}.
`;
        }
    }

    // Premise and scenario - ENHANCED for better adherence
    prompt += `
===== SCENARIO (CRITICAL - FOLLOW THIS CLOSELY) =====
`;
    // Plot hook takes priority if provided
    if (plotHook) {
        prompt += `PLOT HOOK (PRIMARY SCENARIO):
${plotHook}

This plot hook is the CORE of the greeting. Build the entire scene around this specific scenario. Always refer to the user as {{user}}.
`;
    } else if (premise?.name) {
        prompt += `PREMISE: "${premise.name}"
Description: ${premise.description}
${premise.setup ? `Setup: ${premise.setup}` : ''}

This premise is the CORE of the greeting. The entire scene should revolve around this specific situation. Always refer to the user as {{user}}.
`;
    }
    if (relationship) {
        prompt += `
RELATIONSHIP DYNAMIC: ${relationship}
The interaction should clearly reflect this relationship between {{char}} and {{user}}.
`;
    }
    if (location) {
        prompt += `
SETTING/LOCATION: ${location}
Describe this environment and use it to set the mood.
`;
    }
    if (storyBeats && storyBeats.length > 0) {
        prompt += `
STORY BEATS TO INCLUDE:
${storyBeats.map((beat, i) => `${i + 1}. ${beat}`).join('\n')}

These beats should naturally occur within the greeting.
`;
    }
    if (customScenario && !plotHook) {
        prompt += `
ADDITIONAL SCENARIO CONTEXT:
${customScenario}
`;
    }
    prompt += `=====

`;

    // Style guidance
    prompt += `STYLE REQUIREMENTS:
- Length: ${lengthGuide[length] || lengthGuide.medium}
- Narration: ${styleText}
- Tone: ${tones && tones.length > 0 ? tones.join(', ') : 'Match the character\'s usual tone'}
`;

    // Existing greeting analysis
    if (greetingStyle && greetingStyle.samples.length > 0) {
        prompt += `
STYLE REFERENCE (match this style):
The character's existing greetings average ${Math.round(greetingStyle.averageLength)} characters.
They tend to be ${greetingStyle.dialogueHeavy ? 'dialogue-heavy' : greetingStyle.descriptionHeavy ? 'description-heavy' : 'balanced between dialogue and description'}.
Sample excerpt: "${greetingStyle.samples[0]}..."
`;
    }

    if (additionalInstructions) {
        prompt += `
ADDITIONAL INSTRUCTIONS: ${additionalInstructions}
`;
    }

    prompt += `
Write the greeting now. Write ONLY the greeting text, no commentary or headers. The greeting should be written from {{char}}'s perspective, introducing a scene where {{user}} encounters {{char}}.

===== FINAL REMINDER: USE TEMPLATES =====
- Write {{char}} to refer to the character (never their actual name)
- Write {{user}} to refer to the user/persona (never any name)
- These are TEMPLATE PLACEHOLDERS - write them exactly as shown: {{char}} and {{user}}
- {{user}} is the DEFAULT TEMPLATE - use it, don't replace it with names`;

    return prompt;
}

// Generate greeting using AI
async function generateGreetingFromPrompt(prompt, charData, personaData = null) {
    try {
        const charName = charData.name || 'the character';
        const response = await generateRaw({
            prompt,
            systemPrompt: `You are writing an alternate greeting for {{char}}. 
Capture {{char}}'s voice, speech patterns, and personality authentically.
Write an immersive scene that draws the reader in.
Use the format and style of the character's existing content as reference.

===== MANDATORY TEMPLATE FORMATTING =====
You MUST use these exact placeholders - they are TEMPLATES, not suggestions:

1. {{char}} = Use this EXACT placeholder to refer to the character. Do NOT use the character's actual name.
2. {{user}} = Use this EXACT placeholder to refer to the user/persona. Do NOT use any name, persona name, or "you".

===== CRITICAL RULES =====
- {{user}} is the DEFAULT TEMPLATE for referring to the user - use it ALWAYS
- NEVER generate any actual names (Bob, John, Alice, etc.) - ONLY use {{user}}
- NEVER use "you" or any pronoun - ONLY use {{user}}
- {{char}} and {{user}} are TEMPLATE PLACEHOLDERS - write them exactly as shown
- If you write any name instead of {{user}}, you have made an error
- The greeting MUST contain {{user}} to refer to the user - no exceptions
- Do not include any meta-commentary, just the greeting itself.

EXAMPLE CORRECT USAGE:
"{{char}} looks up and sees {{user}} standing there."
"{{char}} turns to {{user}} with a smile."

EXAMPLE INCORRECT USAGE (DO NOT DO THIS):
"{{char}} looks up and sees Bob standing there." ❌ WRONG
"{{char}} turns to you with a smile." ❌ WRONG
"{{char}} looks up and sees the person standing there." ❌ WRONG

You MUST use {{user}} - it is the required template.`,
        });
        // Replace character name with {{char}} and persona names with {{user}}
        let result = response.trim();

        // Collect persona names for verification logging
        const personaNames = [];
        if (personaData && personaData.name && personaData.name !== '{{user}}') personaNames.push(personaData.name);
        if (typeof user_avatar !== 'undefined' && user_avatar && user_avatar.name && user_avatar.name !== '{{user}}') personaNames.push(user_avatar.name);
        if (typeof name1 !== 'undefined' && name1 && name1 !== '{{user}}') personaNames.push(name1);

        // Replace character name (case-insensitive) with {{char}} - be very aggressive
        if (charData.name && charData.name.trim()) {
            const escapedCharName = charData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const charNameRegex = new RegExp(`\\b${escapedCharName}\\b`, 'gi');
            result = result.replace(charNameRegex, '{{char}}');
            // Also replace with quotes and punctuation
            result = result.replace(new RegExp(`"${escapedCharName}"`, 'gi'), '"{{char}}"');
            result = result.replace(new RegExp(`'${escapedCharName}'`, 'gi'), "'{{char}}'");
        }
        // Replace persona name with {{user}} - use helper function with character data for exclusion
        // Multiple aggressive passes to catch all instances
        result = replacePersonaNames(result, personaData, charData);
        result = replacePersonaNames(result, personaData, charData); // Second pass
        result = replacePersonaNames(result, personaData, charData); // Third pass
        result = replacePersonaNames(result, personaData, charData); // Fourth pass
        result = replacePersonaNames(result, personaData, charData); // Fifth pass

        // Replace common incorrect names that might appear - "SillyTavern System" is a character name bug, should be {{char}}
        result = result.replace(/\bSillyTavern System\b/gi, '{{char}}');
        result = result.replace(/\bSillyTavern\b/gi, '{{char}}');

        // Final aggressive pass: Look for common patterns where persona names appear
        // Only replace if we're confident it's a user reference
        const knownCharName = charData.name ? charData.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

        // Pattern: "at [Name]" or "with [Name]" etc. where Name is likely a persona
        const userRefPattern = /\b(at|with|to|for|from|by|near|beside|behind)\s+([A-Z][a-z]{2,})(?=\s|'s|\.|,|!|\?|:|;|$)/gi;
        result = result.replace(userRefPattern, (match, context, name) => {
            // Skip if it's the character name
            if (knownCharName && new RegExp(`\\b${name}\\b`, 'i').test(knownCharName)) {
                return match;
            }
            // Skip common words that aren't names
            const skipWords = ['The', 'A', 'An', 'This', 'That', 'There', 'Here', 'Where', 'When', 'What', 'Who', 'How', 'Why'];
            if (skipWords.includes(name) || name.length < 3) {
                return match;
            }
            // Only replace if we know this is a persona name OR if it's in a very specific user context
            // For now, be conservative - only replace known persona names
            return match;
        });

        // Log if we find potential persona names that weren't replaced
        if (personaNames.length > 0) {
            personaNames.forEach(pName => {
                if (result.includes(pName) && !result.includes('{{user}}')) {
                    console.warn(`[Ultimate Persona] Warning: Persona name "${pName}" may still be present in output`);
                }
            });
        }

        // Normalize {{user}} and {{char}} placeholders
        result = result.replace(/\{\{user\}\}/gi, '{{user}}');
        result = result.replace(/\{\{char\}\}/gi, '{{char}}');

        return result;
    } catch (e) {
        console.error('[Ultimate Persona] Greeting generation error:', e);
        throw new Error('Failed to generate greeting');
    }
}

// Helper function to sanitize text by removing ALL persona names from prompts
// This ensures the AI NEVER sees persona names
function sanitizePersonaText(text, personaData = null) {
    if (!text) return text;
    let sanitized = text;

    // Get all possible persona names
    const namesToRemove = [];
    if (personaData && personaData.name && personaData.name.trim() && personaData.name !== '{{user}}') {
        namesToRemove.push(personaData.name);
    }
    if (user_avatar && user_avatar.name && user_avatar.name.trim() && user_avatar.name !== '{{user}}') {
        namesToRemove.push(user_avatar.name);
    }
    if (power_user && power_user.personas) {
        const activeAvatarId = user_avatar?.avatarId;
        if (activeAvatarId && power_user.personas[activeAvatarId]) {
            const activePersonaName = power_user.personas[activeAvatarId];
            if (activePersonaName && activePersonaName.trim() && activePersonaName !== '{{user}}') {
                namesToRemove.push(activePersonaName);
            }
        }
    }

    // Remove all instances of persona names
    [...new Set(namesToRemove)].forEach(name => {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        sanitized = sanitized.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '{{user}}');
        sanitized = sanitized.replace(new RegExp(`\\b${escaped}'s\\b`, 'gi'), "{{user}}'s");
    });

    return sanitized;
}

// Helper function to aggressively replace persona names with {{user}} in generated output
// Helper function to aggressively replace persona names with {{user}} in generated output
// This function uses MULTIPLE strategies to catch ALL instances of persona names
function replacePersonaNames(text, personaData = null, charData = null) {
    if (!text) return text;
    let result = text;

    // Collect ALL possible persona names from multiple sources
    const personaNames = [];
    if (personaData && personaData.name && personaData.name.trim() && personaData.name !== '{{user}}') {
        personaNames.push(personaData.name);
    }
    if (typeof user_avatar !== 'undefined' && user_avatar && user_avatar.name && user_avatar.name.trim() && user_avatar.name !== '{{user}}') {
        personaNames.push(user_avatar.name);
    }
    if (typeof power_user !== 'undefined' && power_user && power_user.personas) {
        const activeAvatarId = user_avatar?.avatarId;
        if (activeAvatarId && power_user.personas[activeAvatarId]) {
            const activePersonaName = power_user.personas[activeAvatarId];
            if (activePersonaName && activePersonaName.trim() && activePersonaName !== '{{user}}') {
                personaNames.push(activePersonaName);
            }
        }
        // Also check all personas
        Object.values(power_user.personas || {}).forEach(name => {
            if (name && name.trim() && name !== '{{user}}' && !personaNames.includes(name)) {
                personaNames.push(name);
            }
        });
    }

    // Add name1 (global user name)
    if (typeof name1 !== 'undefined' && name1 && name1.trim() && name1 !== '{{user}}' && !personaNames.includes(name1)) {
        personaNames.push(name1);
    }

    const uniquePersonaNames = [...new Set(personaNames.filter(n => n && n.trim() && n !== '{{user}}'))];

    // Get character name to exclude from replacement
    const charName = charData?.name || '';
    const escapedCharName = charName ? charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    // Log for debugging
    if (uniquePersonaNames.length > 0) {
        console.log('[Ultimate Persona] Replacing persona names:', uniquePersonaNames);
    }

    // STRATEGY 1: Replace known persona names with multiple passes and patterns
    // Optimized: Reduced to 2 passes which is sufficient for nested cases
    for (let pass = 0; pass < 2; pass++) {
        uniquePersonaNames.forEach(personaName => {
            const escaped = personaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            // Pattern 1: Word boundaries (most common)
            result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '{{user}}');

            // Pattern 2: Possessive forms
            result = result.replace(new RegExp(`\\b${escaped}'s\\b`, 'gi'), "{{user}}'s");
            result = result.replace(new RegExp(`\\b${escaped}'\\b`, 'gi'), "{{user}}'");

            // Pattern 3: With quotes
            result = result.replace(new RegExp(`"${escaped}"`, 'gi'), '"{{user}}"');
            result = result.replace(new RegExp(`'${escaped}'`, 'gi'), "'{{user}}'");
            result = result.replace(new RegExp(`"${escaped}'s"`, 'gi'), "\"{{user}}'s\"");
            result = result.replace(new RegExp(`'${escaped}'s'`, 'gi'), "'{{user}}'s'");

            // Pattern 4: With punctuation after
            result = result.replace(new RegExp(`${escaped}\\.`, 'gi'), '{{user}}.');
            result = result.replace(new RegExp(`${escaped},`, 'gi'), '{{user}},');
            result = result.replace(new RegExp(`${escaped}!`, 'gi'), '{{user}}!');
            result = result.replace(new RegExp(`${escaped}\\?`, 'gi'), '{{user}}?');
            result = result.replace(new RegExp(`${escaped}:`, 'gi'), '{{user}}:');
            result = result.replace(new RegExp(`${escaped};`, 'gi'), '{{user}};');

            // Pattern 5: In parentheses
            result = result.replace(new RegExp(`\\(${escaped}\\)`, 'gi'), '({{user}})');
            result = result.replace(new RegExp(`\\(${escaped}'s\\)`, 'gi'), "({{user}}'s)");

            // Pattern 6: After context words (prepositions, verbs)
            const contextWords = ['at', 'with', 'to', 'for', 'from', 'by', 'near', 'beside', 'behind', 'sees', 'looks', 'watches', 'meets', 'greets', 'talks', 'speaks', 'says to', 'turns to', 'looks at', 'stares at', 'glances at', 'approaches', 'walks toward', 'runs toward'];
            contextWords.forEach(context => {
                result = result.replace(new RegExp(`\\b${context}\\s+${escaped}\\b`, 'gi'), `${context} {{user}}`);
                result = result.replace(new RegExp(`\\b${context}\\s+${escaped}'s\\b`, 'gi'), `${context} {{user}}'s`);
            });

            // Pattern 7: Before action verbs
            const actionVerbs = ['standing', 'sitting', 'walking', 'running', 'entering', 'leaving', 'waiting', 'standing there', 'sitting there'];
            actionVerbs.forEach(verb => {
                result = result.replace(new RegExp(`\\b${escaped}\\s+${verb}\\b`, 'gi'), `{{user}} ${verb}`);
            });
        });
    }

    // STRATEGY 2: Heuristic replacement - catch ANY capitalized word in user reference contexts
    // This catches names we don't know about, but excludes character name
    if (charName) {
        // Pattern: "at/with/to [Name]" where Name is likely a persona (not character)
        result = result.replace(/\b(at|with|to|for|from|by|near|beside|behind|sees|looks|watches|meets|greets|talks|speaks|says to|turns to|looks at|stares at|glances at|approaches|walks toward|runs toward)\s+([A-Z][a-z]{2,})(?=\s|'s|\.|,|!|\?|:|;|$)/gi, (match, context, name) => {
            // Check for capitalization - if strictly lowercase, it's not a name (because regex is case-insensitive)
            if (name[0] !== name[0].toUpperCase()) return match;

            // Skip if it's the character name or already {{user}} or {{char}}
            if (name === charName || name === '{{user}}' || name === '{{char}}' || name.includes('{{')) {
                return match;
            }
            // Skip common words that shouldn't be replaced
            const skipWords = ['The', 'This', 'That', 'There', 'Here', 'When', 'Where', 'What', 'Who', 'How', 'Why', 'Some', 'Many', 'Most', 'More', 'Less', 'Other', 'Another', 'Each', 'Every', 'All', 'Both', 'Either', 'Neither'];
            if (skipWords.includes(name)) {
                return match;
            }
            return `${context} {{user}}`;
        });

        // Pattern: "[Name] standing/sitting/walking" where Name is likely a persona
        result = result.replace(/\b([A-Z][a-z]{2,})\s+(standing|sitting|walking|running|entering|leaving|waiting)(?=\s|\.|,|!|\?|:|;|$)/gi, (match, name, verb) => {
            // Check for capitalization
            if (name[0] !== name[0].toUpperCase()) return match;

            if (name === charName || name === '{{user}}' || name === '{{char}}' || name.includes('{{')) {
                return match;
            }
            const skipWords = ['The', 'This', 'That', 'There', 'Here', 'When', 'Where', 'What', 'Who', 'How', 'Why'];
            if (skipWords.includes(name)) {
                return match;
            }
            return `{{user}} ${verb}`;
        });
    }

    // STRATEGY 3: Final safety check - if text contains user reference contexts but no {{user}}, be more aggressive
    const userRefIndicators = ['at the', 'with', 'turns to', 'looks at', 'approaches', 'meets', 'greets'];
    const hasUserRef = userRefIndicators.some(indicator => result.toLowerCase().includes(indicator.toLowerCase()));
    const hasUserPlaceholder = result.includes('{{user}}');

    if (hasUserRef && !hasUserPlaceholder) {
        // Very aggressive: replace ANY capitalized word after user reference indicators
        result = result.replace(/\b(at|with|to|for|from|by|near|beside|behind|sees|looks|watches|meets|greets|talks|speaks|says to|turns to|looks at|stares at|glances at|approaches|walks toward|runs toward)\s+([A-Z][a-z]{2,})(?=\s|'s|\.|,|!|\?|:|;|$)/gi, (match, context, name) => {
            // Check for capitalization
            if (name[0] !== name[0].toUpperCase()) return match;

            if (name === charName || name === '{{user}}' || name === '{{char}}' || name.includes('{{')) {
                return match;
            }
            const skipWords = ['The', 'This', 'That', 'There', 'Here', 'When', 'Where', 'What', 'Who', 'How', 'Why', 'Some', 'Many', 'Most', 'More', 'Less'];
            if (skipWords.includes(name)) {
                return match;
            }
            return `${context} {{user}}`;
        });
    }

    return result;
}

// Enhance greeting with more description
async function enhanceGreetingDescription(greeting, charData) {
    const prompt = `Add more vivid sensory descriptions to this greeting while maintaining the character's voice:

Original:
${greeting}

Add more details about:
- Visual descriptions of the scene and characters
- Atmosphere and mood
- Sensory details (sounds, smells, textures)

CRITICAL: Always refer to the user as {{user}}, never use any actual name.

Keep the same length but make it more immersive. Write ONLY the enhanced greeting.`;

    const response = await generateRaw({
        prompt,
        systemPrompt: `Enhance the description while keeping ${charData.name}'s authentic voice. ALWAYS use {{user}} to refer to the user, never use actual names.`
    });

    return replacePersonaNames(response.trim(), null, charData);
}

// Enhance greeting with more dialogue
async function enhanceGreetingDialogue(greeting, charData) {
    const prompt = `Add more dialogue to this greeting while maintaining the character's voice:

Original:
${greeting}

Add more:
- Character speech that shows their personality
- Internal thoughts if appropriate
- Natural conversational flow

CRITICAL: Always refer to the user as {{user}}, never use any actual name.

Keep similar length but shift balance toward dialogue. Write ONLY the enhanced greeting.`;

    const response = await generateRaw({
        prompt,
        systemPrompt: `Add dialogue while keeping ${charData.name}'s authentic speech patterns. ALWAYS use {{user}} to refer to the user, never use actual names.`
    });

    return replacePersonaNames(response.trim(), personaData, charData);
}

// Adjust greeting tone
async function adjustGreetingTone(greeting, charData, newTone) {
    const prompt = `Adjust the tone of this greeting to be more ${newTone} while maintaining the character's core personality:

Original:
${greeting}

CRITICAL: Always refer to the user as {{user}}, never use any actual name.

Make it more ${newTone} while keeping ${charData.name}'s authentic voice and the same basic scenario. Write ONLY the adjusted greeting.`;

    const response = await generateRaw({
        prompt,
        systemPrompt: `Adjust tone while preserving ${charData.name}'s character. ALWAYS use {{user}} to refer to the user, never use actual names.`
    });

    return replacePersonaNames(response.trim(), null, charData);
}

// Enhance greeting with more persona references
async function enhanceGreetingPersona(greeting, charData, personaData) {
    // Sanitize persona description to remove ANY names
    const sanitizedDesc = sanitizePersonaText(personaData.description || 'General user persona', personaData);

    const prompt = `Add more references to {{user}} in this greeting:

Persona Details:
${sanitizedDesc}

Original Greeting:
${greeting}

Add more:
- References to the persona's appearance or traits
- Character's reactions to specific aspects of the persona
- Interactions that highlight the persona's presence

CRITICAL: Always refer to the user/persona as {{user}}, never use any actual name.

Write ONLY the enhanced greeting.`;

    const response = await generateRaw({
        prompt,
        systemPrompt: `Enhance persona presence while keeping ${charData.name}'s authentic voice. ALWAYS use {{user}} to refer to the user, never use actual names.`
    });

    return replacePersonaNames(response.trim(), personaData, charData);
}

// Render greeting wizard UI helpers
function renderPresetChips(container, presets, selectedId) {
    container.empty();
    presets.forEach(p => {
        container.append(`
            <div class="ugw-preset-chip ${selectedId === p.id ? 'selected' : ''}" 
                 data-id="${p.id}" 
                 data-name="${p.name}"
                 data-desc="${p.description}"
                 title="${p.description}">
                ${p.name}
            </div>
        `);
    });
}

function filterRelationshipsByStoryType(relationships, storyType) {
    if (!storyType) return relationships;

    // Filter relationships based on story type
    if (storyType === 'canon') {
        // Canon: More formal, lore-appropriate relationships
        return relationships.filter(r =>
            !['strangers', 'acquaintances'].includes(r.id) ||
            ['enemies', 'rivals', 'mentor_mentee', 'servant_master', 'protector'].includes(r.id)
        );
    } else if (storyType === 'au') {
        // AU: Modern, casual relationships
        return relationships.filter(r =>
            ['strangers', 'acquaintances', 'friends', 'best_friends', 'childhood_friends',
                'rivals', 'coworkers', 'boss_employee', 'teacher_student', 'roommates'].includes(r.id) ||
            r.id.startsWith('crush') || r.id.startsWith('lovers') || r.id.startsWith('ex_')
        );
    } else if (storyType === 'nsfw') {
        // NSFW: Romantic/intimate relationships
        return relationships.filter(r =>
            ['strangers', 'acquaintances', 'friends', 'best_friends', 'childhood_friends',
                'rivals', 'enemies', 'ex_lovers', 'crush', 'lovers', 'married'].includes(r.id)
        );
    }
    return relationships;
}

function filterLocationsByStoryType(locations, storyType) {
    if (!storyType) return locations;

    // Filter locations based on story type
    if (storyType === 'canon') {
        // Canon: Fantasy/medieval locations
        return locations.filter(l =>
            ['throne_room', 'dungeon', 'battlefield', 'tavern', 'forest', 'spaceship'].includes(l.id) ||
            !['office', 'school', 'cafe', 'restaurant', 'bar', 'gym', 'hospital', 'train', 'car', 'hotel'].includes(l.id)
        );
    } else if (storyType === 'au') {
        // AU: Modern locations
        return locations.filter(l =>
            ['home', 'bedroom', 'kitchen', 'office', 'school', 'cafe', 'restaurant', 'bar',
                'park', 'street', 'alley', 'library', 'gym', 'hospital', 'train', 'car', 'hotel', 'balcony'].includes(l.id)
        );
    } else if (storyType === 'nsfw') {
        // NSFW: Intimate/private locations
        return locations.filter(l =>
            ['home', 'bedroom', 'kitchen', 'hotel', 'car', 'balcony', 'alley', 'rooftop'].includes(l.id)
        );
    }
    return locations;
}

// Analyze character card for canon-specific story beats, conflicts, and tensions
async function analyzeCanonStoryElements(charData) {
    if (!charData) return { beats: [], conflicts: [], tensions: [] };

    try {
        const charText = `${charData.description || ''} ${charData.personality || ''} ${charData.scenario || ''} ${charData.first_mes || ''}`.trim();

        if (!charText) {
            // Return default canon elements if no character data
            return {
                beats: ['Character faces a challenge from their past', 'A new threat emerges in their world'],
                conflicts: ['Enemy Approaches', 'Betrayal Revealed'],
                tensions: ['Duty vs Desire', 'Forbidden Knowledge']
            };
        }

        const prompt = `Analyze this character's canon information and generate canon-specific story elements:

CHARACTER INFORMATION:
${charText}

Generate canon-specific story elements based on this character's established lore, world, and circumstances.

Respond with JSON:
{
  "beats": ["story beat 1", "story beat 2", "story beat 3"],
  "conflicts": ["conflict 1", "conflict 2", "conflict 3"],
  "tensions": ["tension 1", "tension 2", "tension 3"]
}

Each element should be:
- Beats: Specific story moments that could occur in this character's canon
- Conflicts: Canon-appropriate conflicts or challenges
- Tensions: Underlying tensions or dilemmas from their world/lore

Keep them specific to this character's established universe.`;

        const response = await generateRaw({
            prompt,
            systemPrompt: 'Analyze the character and respond ONLY with valid JSON containing beats, conflicts, and tensions arrays.'
        });

        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            return {
                beats: parsed.beats || [],
                conflicts: parsed.conflicts || [],
                tensions: parsed.tensions || []
            };
        }
    } catch (e) {
        console.error('[Ultimate Persona] Canon analysis error:', e);
    }

    // Fallback to default
    return {
        beats: ['Character faces a challenge from their past', 'A new threat emerges in their world'],
        conflicts: ['Enemy Approaches', 'Betrayal Revealed'],
        tensions: ['Duty vs Desire', 'Forbidden Knowledge']
    };
}

// Analyze character for canon storylines and return relevant tropes
function analyzeCanonTropes(charData) {
    // Use default tropes if offlineData doesn't have them
    const defaultTropes = [
        { id: 'enemy_approaches', name: 'Enemy Approaches', description: 'A known enemy or antagonist enters the scene', keywords: ['enemy', 'antagonist', 'villain', 'rival', 'foe'] },
        { id: 'betrayal_revealed', name: 'Betrayal Revealed', description: 'A betrayal or secret is uncovered', keywords: ['betrayal', 'secret', 'reveal', 'truth', 'deception'] },
        { id: 'moral_dilemma', name: 'Moral Dilemma', description: 'Character faces a difficult moral choice', keywords: ['moral', 'dilemma', 'choice', 'ethics', 'decision'] },
        { id: 'power_struggle', name: 'Power Struggle', description: 'Conflict over authority or control', keywords: ['power', 'authority', 'control', 'leadership', 'dominance'] },
        { id: 'forbidden_knowledge', name: 'Forbidden Knowledge', description: 'Discovery of dangerous or restricted information', keywords: ['knowledge', 'secret', 'forbidden', 'hidden', 'discovery'] },
        { id: 'duty_vs_desire', name: 'Duty vs Desire', description: 'Conflict between obligations and personal wants', keywords: ['duty', 'desire', 'obligation', 'responsibility', 'conflict'] },
        { id: 'rescue_mission', name: 'Rescue Mission', description: 'Character must save someone or something', keywords: ['rescue', 'save', 'mission', 'help', 'aid'] },
        { id: 'ritual_ceremony', name: 'Ritual or Ceremony', description: 'Important ceremonial event', keywords: ['ritual', 'ceremony', 'rite', 'tradition', 'ceremonial'] },
        { id: 'ancient_prophecy', name: 'Ancient Prophecy', description: 'Prophecy coming to fruition', keywords: ['prophecy', 'prophesy', 'foretell', 'prediction', 'omen'] },
        { id: 'artifact_discovery', name: 'Artifact Discovery', description: 'Finding a powerful or significant object', keywords: ['artifact', 'relic', 'discovery', 'treasure', 'object'] },
        { id: 'alliance_formed', name: 'Alliance Formed', description: 'Forming a new partnership or alliance', keywords: ['alliance', 'partnership', 'pact', 'agreement', 'union'] },
        { id: 'war_begins', name: 'War Begins', description: 'Start of a major conflict or battle', keywords: ['war', 'battle', 'conflict', 'fight', 'combat'] },
    ];

    const allTropes = offlineData.canonTropes && offlineData.canonTropes.length > 0 ? offlineData.canonTropes : defaultTropes;
    const charText = `${charData?.description || ''} ${charData?.personality || ''} ${charData?.scenario || ''}`.toLowerCase();

    // Score tropes based on relevance to character
    const scoredTropes = allTropes.map(trope => {
        let score = 0;
        const tropeKeywords = (trope.keywords || []).map(k => k.toLowerCase());

        // Check if character text contains trope keywords
        tropeKeywords.forEach(keyword => {
            if (charText.includes(keyword)) {
                score += 2;
            }
        });

        // Check if trope name appears in character text
        if (charText.includes(trope.name.toLowerCase())) {
            score += 3;
        }

        // Give base score so all tropes are shown
        score += 1;

        return { ...trope, score };
    });

    // Sort by score and return top 12
    return scoredTropes
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(t => ({ id: t.id || t.name, name: t.name, description: t.description }));
}

// Render scenario chips (for canon tropes, AU genres, NSFW genres)
function renderScenarioChips(container, scenarios, selectedId) {
    container.empty();
    scenarios.forEach(s => {
        const id = s.id || s.name;
        const name = s.name;
        const desc = s.description || '';
        container.append(`
            <div class="ugw-scenario-chip ${selectedId === id ? 'selected' : ''}" 
                 data-id="${id}" 
                 data-name="${name}"
                 title="${desc}">
                ${name}
            </div>
        `);
    });
}

function renderBeatChips(container, beats, selectedBeats) {
    container.empty();
    beats.forEach(beat => {
        const isSelected = selectedBeats.has(beat);
        container.append(`
            <div class="ugw-beat-chip ${isSelected ? 'selected' : ''}" data-beat="${beat}">
                ${beat.length > 40 ? beat.substring(0, 40) + '...' : beat}
            </div>
        `);
    });
}

function renderSelectedBeats(container, selectedBeats) {
    container.empty();
    if (selectedBeats.size === 0) return;

    selectedBeats.forEach(beat => {
        container.append(`
            <div class="ugw-selected-beat" data-beat="${beat}">
                <span>${beat.length > 30 ? beat.substring(0, 30) + '...' : beat}</span>
                <i class="fa-solid fa-xmark remove-beat"></i>
            </div>
        `);
    });
}

function renderToneChips(container, tones, selectedTones) {
    container.empty();
    tones.forEach(t => {
        const isSelected = selectedTones.has(t.id);
        container.append(`
            <div class="ugw-tone-chip ${isSelected ? 'selected' : ''}" 
                 data-id="${t.id}" 
                 title="${t.description}">
                ${t.name}
            </div>
        `);
    });
}

function renderQuickIdeas(container, ideas) {
    container.empty();
    ideas.forEach(idea => {
        // Handle both old string format and new object format
        const isObject = typeof idea === 'object';
        const name = isObject ? idea.name : idea;
        const desc = isObject ? idea.description : idea;
        const setup = isObject ? (idea.setup || '') : '';
        const id = isObject ? idea.id : idea;

        container.append(`
            <div class="ugw-idea-chip" data-idea="${name}" data-desc="${desc}" data-setup="${setup}" data-id="${id}" title="${desc}">
                ${name}
            </div>
        `);
    });
}

function renderCanonElements(conflictContainer, tensionContainer, conflicts, tensions, selectedConflicts, selectedTensions) {
    conflictContainer.empty();
    tensionContainer.empty();

    conflicts.forEach(c => {
        const isSelected = selectedConflicts.has(c.id);
        conflictContainer.append(`
            <div class="ugw-canon-chip ${isSelected ? 'selected' : ''}" data-id="${c.id}" data-name="${c.name}" data-desc="${c.description}" title="${c.description}">
                <i class="fa-solid fa-bolt" style="margin-right: 4px; font-size: 0.8em;"></i>${c.name}
            </div>
        `);
    });

    tensions.forEach(t => {
        const isSelected = selectedTensions.has(t.id);
        tensionContainer.append(`
            <div class="ugw-canon-chip ${isSelected ? 'selected' : ''}" data-id="${t.id}" data-name="${t.name}" data-desc="${t.description}" title="${t.description}">
                <i class="fa-solid fa-exclamation-triangle" style="margin-right: 4px; font-size: 0.8em;"></i>${t.name}
            </div>
        `);
    });
}

function renderNsfwTones(container, tones, selected) {
    container.empty();
    tones.forEach(t => {
        const isSelected = selected.has(t.id);
        container.append(`
            <div class="ugw-tone-chip ${isSelected ? 'selected' : ''}" data-id="${t.id}" data-name="${t.name}" title="${t.description}">
                ${t.name}
            </div>
        `);
    });
}

function renderPersonaCarousel(container, personas, selectedAvatarId) {
    container.empty();
    personas.forEach(p => {
        const isSelected = selectedAvatarId === p.avatarId;
        container.append(`
            <div class="ugp-persona-card ${isSelected ? 'selected' : ''}" data-avatar="${p.avatarId}">
                <img class="ugp-persona-avatar" src="/User Avatars/${encodeURIComponent(p.avatarId)}" onerror="this.src='/img/ai4.png'" alt="${p.name}">
                <div class="ugp-persona-name">${p.name}</div>
            </div>
        `);
    });
}

// ==================== GREETING-ONLY WIZARD ====================

async function showGreetingWizard() {
    try {
        const html = await renderExtensionTemplateAsync(EXTENSION_PATH, 'greeting-wizard');
        const dlg = $(html);
        const settings = getSettings();

        // Initialize UI
        renderCharacterCarousel(dlg.find('#ugw_character_carousel'));
        renderNarrationOptions(dlg.find('#ugw_narration_options'), settings.defaultNarration);

        // State
        const state = {
            charIndex: this_chid >= 0 ? this_chid : -1,
            charData: null,
            greetingStyle: null,
            storyType: '',
            selectedScenario: '', // Selected scenario/trope/genre based on story type
            auType: '',
            nsfwScenario: '',
            premiseMode: 'preset', // 'preset' or 'custom'
            selectedPreset: null,
            relationship: '',
            location: '',
            selectedBeats: new Set(),
            customScenario: '',
            narrationStyle: settings.defaultNarration,
            length: 'medium',
            selectedTones: new Set(),
            selectedNsfwTones: new Set(),
            selectedCanonConflicts: new Set(),
            selectedCanonTensions: new Set(),
            hooks: [],
            selectedHookIndex: -1,
            useCustomHook: false,
            customHookText: '',
            additionalInstructions: '',
            generatedGreeting: '',
        };

        let currentStep = 1;

        const updateSelectedDisplay = () => {
            const name = state.charIndex >= 0 ? characters[state.charIndex]?.name : 'None';
            dlg.find('#ugw_selected_char_name').text(name || 'None');
        };
        updateSelectedDisplay();

        const updateStepDisplay = () => {
            dlg.find('.ugw-step').hide();
            dlg.find(`.ugw-step[data-step="${currentStep}"]`).show();
            dlg.find('.up-progress-step').removeClass('active completed');
            dlg.find('.up-progress-step').each(function () {
                const stepNum = parseInt($(this).data('step'));
                if (stepNum < currentStep) $(this).addClass('completed');
                else if (stepNum === currentStep) $(this).addClass('active');
            });
        };

        // Step 1: Character Selection
        dlg.find('#ugw_char_search').on('input', function () {
            renderCharacterCarousel(dlg.find('#ugw_character_carousel'), $(this).val());
        });

        dlg.find('#ugw_random_char').on('click', () => {
            const validChars = characters.filter(c => c?.name);
            if (validChars.length) {
                const random = validChars[Math.floor(Math.random() * validChars.length)];
                state.charIndex = characters.indexOf(random);
                dlg.find('.up-char-card').removeClass('selected');
                dlg.find(`.up-char-card[data-index="${state.charIndex}"]`).addClass('selected');
                updateSelectedDisplay();
                showGreetingPreview();
            }
        });

        dlg.find('#ugw_carousel_prev').on('click', () => {
            dlg.find('#ugw_character_carousel').scrollLeft(dlg.find('#ugw_character_carousel').scrollLeft() - 250);
        });
        dlg.find('#ugw_carousel_next').on('click', () => {
            dlg.find('#ugw_character_carousel').scrollLeft(dlg.find('#ugw_character_carousel').scrollLeft() + 250);
        });

        dlg.on('click', '.up-char-card', function () {
            dlg.find('.up-char-card').removeClass('selected');
            $(this).addClass('selected');
            state.charIndex = parseInt($(this).data('index'));
            updateSelectedDisplay();
            showGreetingPreview();
        });

        function showGreetingPreview() {
            if (state.charIndex < 0) return;
            const char = characters[state.charIndex];
            if (!char) return;

            const altGreetings = char.data?.alternate_greetings || [];
            const firstMes = char.first_mes || char.data?.first_mes || '';

            dlg.find('#ugw_greeting_count').text(altGreetings.length);

            if (firstMes || altGreetings.length > 0) {
                const sample = firstMes || altGreetings[0];
                dlg.find('#ugw_greeting_sample').text(sample.substring(0, 200) + (sample.length > 200 ? '...' : ''));
                dlg.find('#ugw_greeting_preview').show();
            } else {
                dlg.find('#ugw_greeting_preview').hide();
            }
        }

        dlg.find('#ugw_next_to_type').on('click', () => {
            if (state.charIndex < 0) {
                toastr.warning('Please select a character');
                return;
            }
            state.charData = getCharacterData(state.charIndex);
            state.charData.alternate_greetings = characters[state.charIndex].data?.alternate_greetings || [];
            state.greetingStyle = analyzeGreetingStyle(state.charData);

            dlg.find('#ugw_char_name_display').text(state.charData.name);
            currentStep = 2;
            updateStepDisplay();
        });

        // Step 2: Story Type
        dlg.find('#ugw_back_to_char').on('click', () => {
            currentStep = 1;
            updateStepDisplay();
        });

        dlg.on('click', '.ugw-story-card', function () {
            dlg.find('.ugw-story-card').removeClass('selected');
            $(this).addClass('selected');
            state.storyType = $(this).data('type');
            state.selectedScenario = ''; // Reset scenario selection

            // Show/hide scenarios section
            dlg.find('#ugw_scenarios_section').show();
            dlg.find('#ugw_canon_scenarios, #ugw_au_scenarios, #ugw_nsfw_scenarios').hide();

            if (state.storyType === 'canon') {
                // For canon, hide scenario selection - we'll use character card analysis during plot hook generation
                dlg.find('#ugw_scenarios_section').hide();
                dlg.find('#ugw_scenarios_subtitle').text('Canon mode: Character card will be analyzed during plot hook generation');
            } else if (state.storyType === 'au') {
                // Show AU genres
                const auGenres = offlineData.auTypes || [];
                renderScenarioChips(dlg.find('#ugw_au_scenarios_chips'), auGenres, '');
                dlg.find('#ugw_au_scenarios').show();
                dlg.find('#ugw_scenarios_subtitle').text('Select an AU genre to expand upon');
            } else if (state.storyType === 'nsfw') {
                // Show NSFW genres
                const nsfwGenres = offlineData.nsfwScenarios || [];
                renderScenarioChips(dlg.find('#ugw_nsfw_scenarios_chips'), nsfwGenres, '');
                dlg.find('#ugw_nsfw_scenarios').show();
                dlg.find('#ugw_scenarios_subtitle').text('Select a romantic scenario genre to expand upon');
            }
        });

        // Scenario selection handlers
        // Canon scenario selection removed - using character card analysis only

        dlg.on('click', '#ugw_au_scenarios_chips .ugw-scenario-chip', function () {
            dlg.find('#ugw_au_scenarios_chips .ugw-scenario-chip').removeClass('selected');
            $(this).addClass('selected');
            state.selectedScenario = $(this).data('id');
            state.auType = $(this).data('id');
        });

        dlg.on('click', '#ugw_nsfw_scenarios_chips .ugw-scenario-chip', function () {
            dlg.find('#ugw_nsfw_scenarios_chips .ugw-scenario-chip').removeClass('selected');
            $(this).addClass('selected');
            state.selectedScenario = $(this).data('id');
            state.nsfwScenario = $(this).data('id');
        });

        dlg.find('#ugw_next_to_premise').on('click', () => {
            if (!state.storyType) {
                toastr.warning('Please select a story type');
                return;
            }

            // Initialize premise data - filter by story type
            const filteredRelationships = filterRelationshipsByStoryType(offlineData.greetingRelationships || [], state.storyType);
            const filteredLocations = filterLocationsByStoryType(offlineData.greetingLocations || [], state.storyType);

            renderPresetChips(dlg.find('#ugw_relationship_presets'), filteredRelationships, '');
            renderPresetChips(dlg.find('#ugw_trope_presets'), offlineData.greetingTropes || [], '');
            renderPresetChips(dlg.find('#ugw_encounter_presets'), offlineData.greetingEncounters || [], '');
            renderPresetChips(dlg.find('#ugw_relationship_chips'), filteredRelationships, '');
            renderPresetChips(dlg.find('#ugw_location_chips'), filteredLocations, '');

            // Story beats
            const posBeats = shuffle(offlineData.positiveStoryBeats || []).slice(0, 8);
            const negBeats = shuffle(offlineData.negativeStoryBeats || []).slice(0, 8);
            renderBeatChips(dlg.find('#ugw_positive_beats'), posBeats, state.selectedBeats);
            renderBeatChips(dlg.find('#ugw_negative_beats'), negBeats, state.selectedBeats);

            // Tones
            renderToneChips(dlg.find('#ugw_tone_chips'), offlineData.greetingTones || [], state.selectedTones);

            // NSFW tones (if applicable)
            if (state.storyType === 'nsfw') {
                renderNsfwTones(dlg.find('#ugw_nsfw_tone_chips'), offlineData.nsfwTones || [], state.selectedNsfwTones);
                dlg.find('#ugw_nsfw_tones_group').show();
            } else {
                dlg.find('#ugw_nsfw_tones_group').hide();
            }

            currentStep = 3;
            updateStepDisplay();
        });

        // Step 3: Premise
        dlg.find('#ugw_back_to_type').on('click', () => {
            currentStep = 2;
            updateStepDisplay();
        });

        // Premise tab switching
        dlg.on('click', '.ugw-premise-tab', function () {
            dlg.find('.ugw-premise-tab').removeClass('active');
            $(this).addClass('active');
            state.premiseMode = $(this).data('tab');
            dlg.find('.ugw-premise-panel').removeClass('active').hide();
            dlg.find(`.ugw-premise-panel[data-panel="${state.premiseMode}"]`).addClass('active').show();
        });

        // Preset selection
        dlg.on('click', '#ugw_relationship_presets .ugw-preset-chip, #ugw_trope_presets .ugw-preset-chip, #ugw_encounter_presets .ugw-preset-chip', function () {
            dlg.find('.ugw-preset-chip').removeClass('selected');
            $(this).addClass('selected');
            state.selectedPreset = {
                id: $(this).data('id'),
                name: $(this).data('name'),
                description: $(this).data('desc'),
            };
            dlg.find('#ugw_preset_content').html(`
                <div class="preset-name">${state.selectedPreset.name}</div>
                <div class="preset-desc">${state.selectedPreset.description}</div>
            `);
            dlg.find('#ugw_selected_preset').show();
        });

        // Custom panel - relationship chips
        dlg.on('click', '#ugw_relationship_chips .ugw-preset-chip', function () {
            const isSelected = $(this).hasClass('selected');
            dlg.find('#ugw_relationship_chips .ugw-preset-chip').removeClass('selected');
            if (!isSelected) {
                $(this).addClass('selected');
                state.relationship = $(this).data('name');
            } else {
                state.relationship = '';
            }
            dlg.find('#ugw_relationship_custom').val('');
        });

        dlg.find('#ugw_relationship_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#ugw_relationship_chips .ugw-preset-chip').removeClass('selected');
                state.relationship = $(this).val().trim();
            }
        });

        // Location chips
        dlg.on('click', '#ugw_location_chips .ugw-preset-chip', function () {
            const isSelected = $(this).hasClass('selected');
            dlg.find('#ugw_location_chips .ugw-preset-chip').removeClass('selected');
            if (!isSelected) {
                $(this).addClass('selected');
                state.location = $(this).data('name');
            } else {
                state.location = '';
            }
            dlg.find('#ugw_location_custom').val('');
        });

        dlg.find('#ugw_location_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#ugw_location_chips .ugw-preset-chip').removeClass('selected');
                state.location = $(this).val().trim();
            }
        });


        // Add custom positive beat
        dlg.find('#ugw_add_positive_beat').on('click', async function () {
            const beat = await Popup.show.input('Add Positive Story Beat', 'Enter a positive story beat:');
            if (!beat || !beat.trim()) return;

            const beatText = beat.trim();
            if (!offlineData.positiveStoryBeats) offlineData.positiveStoryBeats = [];
            offlineData.positiveStoryBeats.push(beatText);

            // Add to current display
            const container = dlg.find('#ugw_positive_beats');
            container.append(`<div class="ugw-beat-chip selected" data-beat="${beatText.replace(/"/g, '&quot;')}">${beatText}</div>`);
            state.selectedBeats.add(beatText);
            updateSelectedBeatsDisplay();
            toastr.success(`Added "${beatText}" positive beat!`);
        });

        // Add custom negative beat
        dlg.find('#ugw_add_negative_beat').on('click', async function () {
            const beat = await Popup.show.input('Add Negative Story Beat', 'Enter a tension/conflict story beat:');
            if (!beat || !beat.trim()) return;

            const beatText = beat.trim();
            if (!offlineData.negativeStoryBeats) offlineData.negativeStoryBeats = [];
            offlineData.negativeStoryBeats.push(beatText);

            // Add to current display
            const container = dlg.find('#ugw_negative_beats');
            container.append(`<div class="ugw-beat-chip selected" data-beat="${beatText.replace(/"/g, '&quot;')}">${beatText}</div>`);
            state.selectedBeats.add(beatText);
            updateSelectedBeatsDisplay();
            toastr.success(`Added "${beatText}" negative beat!`);
        });

        // Story beats
        dlg.on('click', '.ugw-beat-chip', function () {
            const beat = $(this).data('beat');
            if (state.selectedBeats.has(beat)) {
                state.selectedBeats.delete(beat);
                $(this).removeClass('selected');
            } else {
                state.selectedBeats.add(beat);
                $(this).addClass('selected');
            }
            updateSelectedBeatsDisplay();
        });

        function updateSelectedBeatsDisplay() {
            const container = dlg.find('#ugw_selected_beats_list');
            renderSelectedBeats(container, state.selectedBeats);
            dlg.find('#ugw_selected_beats_display').toggle(state.selectedBeats.size > 0);
        }

        dlg.on('click', '.remove-beat', function () {
            const beat = $(this).parent().data('beat');
            state.selectedBeats.delete(beat);
            dlg.find(`.ugw-beat-chip[data-beat="${beat}"]`).removeClass('selected');
            updateSelectedBeatsDisplay();
        });

        // Refresh beats
        dlg.find('#ugw_refresh_positive_beats').on('click', () => {
            const newBeats = shuffle(offlineData.positiveStoryBeats || []).slice(0, 8);
            renderBeatChips(dlg.find('#ugw_positive_beats'), newBeats, state.selectedBeats);
        });

        dlg.find('#ugw_refresh_negative_beats').on('click', () => {
            const newBeats = shuffle(offlineData.negativeStoryBeats || []).slice(0, 8);
            renderBeatChips(dlg.find('#ugw_negative_beats'), newBeats, state.selectedBeats);
        });

        // Enhance scenario
        dlg.find('#ugw_enhance_scenario').on('click', async function () {
            // Include context from selected chips
            const contextParts = [];

            if (state.relationship) contextParts.push(`Relationship: ${state.relationship}`);
            if (state.location) contextParts.push(`Location: ${state.location}`);
            if (state.selectedBeats.size > 0) {
                contextParts.push(`Key Story Beats: ${Array.from(state.selectedBeats).join(', ')}`);
            }

            const userInput = dlg.find('#ugw_scenario_custom').val().trim();
            const fullInput = userInput
                ? `${contextParts.length > 0 ? contextParts.join('\n') + '\n\nUser Context: ' : ''}${userInput}`
                : contextParts.join('\n'); // Allow enhancing from just tags if input is empty

            if (!fullInput) {
                toastr.warning('Add some details or select tags first');
                return;
            }

            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                // Modified prompt for context-aware enhancement
                const enhanced = await enhanceText(fullInput);
                dlg.find('#ugw_scenario_custom').val(enhanced);
                state.customScenario = enhanced;
            } catch (e) {
                console.error(e);
                toastr.error('Failed to enhance');
            }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        dlg.find('#ugw_next_to_hooks').on('click', () => {
            state.customScenario = dlg.find('#ugw_scenario_custom').val().trim();

            // Validate we have some premise info
            if (state.premiseMode === 'preset' && !state.selectedPreset) {
                toastr.warning('Please select a premise');
                return;
            }
            if (state.premiseMode === 'custom' && !state.relationship && !state.location && state.selectedBeats.size === 0 && !state.customScenario) {
                toastr.warning('Please add some scenario details');
                return;
            }

            // Go to plot hooks step
            currentStep = 4;
            updateStepDisplay();
        });

        // Step 4: Plot Hooks
        dlg.find('#ugw_back_to_premise').on('click', () => {
            currentStep = 3;
            updateStepDisplay();
        });

        // Generate plot hooks
        dlg.find('#ugw_generate_hooks').on('click', async function () {
            setButtonLoading($(this), true);
            try {
                // Build premise summary for hook generation
                let premiseSummary = '';
                if (state.premiseMode === 'preset' && state.selectedPreset) {
                    premiseSummary = `${state.selectedPreset.name}: ${state.selectedPreset.description}`;
                } else {
                    const parts = [];
                    if (state.relationship) parts.push(`Relationship: ${state.relationship}`);
                    if (state.location) parts.push(`Location: ${state.location}`);
                    if (state.selectedBeats.size > 0) {
                        parts.push(`Story beats: ${Array.from(state.selectedBeats).join(', ')}`);
                    }
                    if (state.customScenario) parts.push(state.customScenario);
                    premiseSummary = parts.join('. ') || 'A meeting between the character and {{user}}';
                }

                // Generate hooks with premise information
                // FIX: If using preset, pass the summary as customScenario so it's included
                const isPreset = state.premiseMode === 'preset';
                const hooks = await generateGreetingHooks(
                    state.charData,
                    state.storyType,
                    state.selectedScenario,
                    isPreset ? '' : state.relationship,
                    isPreset ? '' : state.location,
                    isPreset ? [] : state.selectedBeats,
                    isPreset ? premiseSummary : state.customScenario,
                    null // personaData - not used in greeting-only wizard
                );

                state.hooks = hooks;
                renderHooks(dlg.find('#ugw_hooks_list'), hooks, state.selectedHookIndex);

                if (hooks.length === 0) {
                    toastr.warning('No hooks generated. Try again.');
                } else {
                    toastr.success(`Generated ${hooks.length} plot hooks!`);
                }
            } catch (e) {
                console.error('[Ultimate Persona] Hook generation error:', e);
                toastr.error('Failed to generate hooks: ' + e.message);
            } finally {
                setButtonLoading($(this), false);
            }
        });

        // Hook selection
        dlg.on('click', '#ugw_hooks_list .up-hook-item', function () {
            dlg.find('#ugw_hooks_list .up-hook-item').removeClass('selected');
            $(this).addClass('selected');
            state.selectedHookIndex = parseInt($(this).data('hook'));
            state.useCustomHook = false;
            dlg.find('#ugw_use_custom_hook').prop('checked', false);
        });

        // Custom hook checkbox
        dlg.find('#ugw_use_custom_hook').on('change', function () {
            state.useCustomHook = $(this).is(':checked');
            if (state.useCustomHook) {
                dlg.find('#ugw_hooks_list .up-hook-item').removeClass('selected');
                state.selectedHookIndex = -1;
            }
        });

        // Custom hook text
        dlg.find('#ugw_custom_hook_text').on('input', function () {
            state.customHookText = $(this).val().trim();
        });

        // Enhance hook
        dlg.find('#ugw_enhance_hook').on('click', async function () {
            const input = dlg.find('#ugw_custom_hook_text').val().trim();
            if (!input) {
                toastr.warning('Enter a hook first');
                return;
            }
            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                const enhanced = await enhanceText(input);
                dlg.find('#ugw_custom_hook_text').val(enhanced);
                state.customHookText = enhanced;
            } catch (e) {
                toastr.error('Failed to enhance');
            }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        // Continue from hooks to details
        dlg.find('#ugw_next_to_details').on('click', () => {
            if (!state.useCustomHook && state.selectedHookIndex < 0 && state.hooks.length > 0) {
                toastr.warning('Please select a plot hook or use a custom scenario');
                return;
            }
            if (state.useCustomHook && !state.customHookText.trim()) {
                toastr.warning('Please enter a custom hook');
                return;
            }

            // Update summary
            dlg.find('#ugw_summary_char').text(state.charData.name);
            dlg.find('#ugw_summary_type').text(state.storyType.charAt(0).toUpperCase() + state.storyType.slice(1));

            let premiseSummary = '';
            if (state.useCustomHook) {
                premiseSummary = state.customHookText;
            } else if (state.selectedHookIndex >= 0 && state.hooks[state.selectedHookIndex]) {
                premiseSummary = state.hooks[state.selectedHookIndex];
            } else if (state.premiseMode === 'preset' && state.selectedPreset) {
                premiseSummary = state.selectedPreset.name;
            } else {
                const parts = [];
                if (state.relationship) parts.push(state.relationship);
                if (state.location) parts.push(`at ${state.location}`);
                if (state.selectedBeats.size > 0) parts.push(`${state.selectedBeats.size} story beats`);
                premiseSummary = parts.join(', ') || 'Custom scenario';
            }
            dlg.find('#ugw_summary_premise').text(premiseSummary);

            currentStep = 5;
            updateStepDisplay();
        });

        // Step 5: Details
        dlg.find('#ugw_back_to_hooks').on('click', () => {
            currentStep = 4;
            updateStepDisplay();
        });

        // Narration
        dlg.on('click', '.up-narration-option', function () {
            dlg.find('.up-narration-option').removeClass('selected');
            $(this).addClass('selected');
            state.narrationStyle = $(this).data('style');
        });

        // Length
        dlg.on('click', '.ugw-length-option', function () {
            dlg.find('.ugw-length-option').removeClass('selected');
            $(this).addClass('selected');
            state.length = $(this).data('length');
        });

        // Tones
        dlg.on('click', '#ugw_tone_chips .ugw-tone-chip', function () {
            const toneId = $(this).data('id');
            if (state.selectedTones.has(toneId)) {
                state.selectedTones.delete(toneId);
                $(this).removeClass('selected');
            } else {
                state.selectedTones.add(toneId);
                $(this).addClass('selected');
            }
        });

        // NSFW Tones
        dlg.on('click', '#ugw_nsfw_tone_chips .ugw-tone-chip', function () {
            const toneId = $(this).data('id');
            if (state.selectedNsfwTones.has(toneId)) {
                state.selectedNsfwTones.delete(toneId);
                $(this).removeClass('selected');
            } else {
                state.selectedNsfwTones.add(toneId);
                $(this).addClass('selected');
            }
        });

        // Generate greeting
        dlg.find('#ugw_generate_greeting').on('click', async function () {
            state.additionalInstructions = dlg.find('#ugw_additional_instructions').val().trim();

            setButtonLoading($(this), true);
            try {
                // Get the selected plot hook
                let plotHook = '';
                if (state.useCustomHook) {
                    plotHook = state.customHookText;
                } else if (state.selectedHookIndex >= 0 && state.hooks[state.selectedHookIndex]) {
                    plotHook = state.hooks[state.selectedHookIndex];
                } else if (state.premiseMode === 'preset' && state.selectedPreset) {
                    plotHook = `${state.selectedPreset.name}: ${state.selectedPreset.description}`;
                } else {
                    const parts = [];
                    if (state.relationship) parts.push(`Relationship: ${state.relationship}`);
                    if (state.location) parts.push(`Location: ${state.location}`);
                    if (state.selectedBeats.size > 0) parts.push(`Story beats: ${Array.from(state.selectedBeats).join(', ')}`);
                    if (state.customScenario) parts.push(state.customScenario);
                    plotHook = parts.join('. ') || 'A meeting between the character and {{user}}';
                }

                const toneNames = Array.from(state.selectedTones).map(id => {
                    const tone = offlineData.greetingTones.find(t => t.id === id);
                    return tone?.name || id;
                });

                const nsfwToneNames = Array.from(state.selectedNsfwTones).map(id => {
                    const tone = (offlineData.nsfwTones || []).find(t => t.id === id);
                    return tone?.name || id;
                });

                const canonConflictNames = Array.from(state.selectedCanonConflicts).map(id => {
                    const c = (offlineData.canonConflicts || []).find(c => c.id === id);
                    return c ? `${c.name}: ${c.description}` : id;
                });

                const canonTensionNames = Array.from(state.selectedCanonTensions).map(id => {
                    const t = (offlineData.canonTensions || []).find(t => t.id === id);
                    return t ? `${t.name}: ${t.description}` : id;
                });

                const prompt = buildGreetingPrompt({
                    charData: state.charData,
                    greetingStyle: state.greetingStyle,
                    storyType: state.storyType,
                    auType: state.auType,
                    nsfwScenario: state.nsfwScenario,
                    premise: state.selectedPreset,
                    plotHook: plotHook,
                    relationship: state.relationship,
                    location: state.location,
                    storyBeats: Array.from(state.selectedBeats),
                    customScenario: state.customScenario,
                    narrationStyle: state.narrationStyle,
                    length: state.length,
                    tones: toneNames,
                    nsfwTones: nsfwToneNames,
                    canonConflicts: canonConflictNames,
                    canonTensions: canonTensionNames,
                    additionalInstructions: state.additionalInstructions,
                });

                state.generatedGreeting = await generateGreetingFromPrompt(prompt, state.charData, null);
                dlg.find('#ugw_greeting_preview_text').val(state.generatedGreeting);
                dlg.find('#ugw_final_char_name').text(state.charData.name);

                currentStep = 6;
                updateStepDisplay();
            } catch (e) {
                toastr.error(e.message);
            } finally {
                setButtonLoading($(this), false);
            }
        });

        // Step 6: Review
        dlg.find('#ugw_back_to_details').on('click', () => {
            currentStep = 5;
            updateStepDisplay();
        });

        // Enhancement buttons
        dlg.find('#ugw_more_description').on('click', async function () {
            const current = dlg.find('#ugw_greeting_preview_text').val();
            if (!current) return;

            setButtonLoading($(this), true);
            try {
                const enhanced = await enhanceGreetingDescription(current, state.charData);
                dlg.find('#ugw_greeting_preview_text').val(enhanced.trim());
                toastr.success('Added more description!');
            } catch (e) {
                toastr.error('Failed to enhance');
            }
            setButtonLoading($(this), false);
        });

        dlg.find('#ugw_more_dialogue').on('click', async function () {
            const current = dlg.find('#ugw_greeting_preview_text').val();
            if (!current) return;

            setButtonLoading($(this), true);
            try {
                const enhanced = await enhanceGreetingDialogue(current, state.charData);
                dlg.find('#ugw_greeting_preview_text').val(enhanced.trim());
                toastr.success('Added more dialogue!');
            } catch (e) {
                toastr.error('Failed to enhance');
            }
            setButtonLoading($(this), false);
        });

        dlg.find('#ugw_adjust_tone').on('click', async function () {
            const current = dlg.find('#ugw_greeting_preview_text').val();
            if (!current) return;

            const tone = await Popup.show.input('Adjust Tone', 'What tone would you like? (e.g., more romantic, darker, funnier)');
            if (!tone) return;

            setButtonLoading($(this), true);
            try {
                const adjusted = await adjustGreetingTone(current, state.charData, tone);
                dlg.find('#ugw_greeting_preview_text').val(adjusted.trim());
                toastr.success('Tone adjusted!');
            } catch (e) {
                toastr.error('Failed to adjust');
            }
            setButtonLoading($(this), false);
        });

        // Regenerate
        dlg.find('#ugw_regenerate_greeting').on('click', async function () {
            setButtonLoading($(this), true);
            try {
                // Get the selected plot hook
                let plotHook = '';
                if (state.useCustomHook) {
                    plotHook = state.customHookText;
                } else if (state.selectedHookIndex >= 0 && state.hooks[state.selectedHookIndex]) {
                    plotHook = state.hooks[state.selectedHookIndex];
                } else if (state.premiseMode === 'preset' && state.selectedPreset) {
                    plotHook = `${state.selectedPreset.name}: ${state.selectedPreset.description}`;
                } else {
                    const parts = [];
                    if (state.relationship) parts.push(`Relationship: ${state.relationship}`);
                    if (state.location) parts.push(`Location: ${state.location}`);
                    if (state.selectedBeats.size > 0) parts.push(`Story beats: ${Array.from(state.selectedBeats).join(', ')}`);
                    if (state.customScenario) parts.push(state.customScenario);
                    plotHook = parts.join('. ') || 'A meeting between the character and {{user}}';
                }

                const toneNames = Array.from(state.selectedTones).map(id => {
                    const tone = offlineData.greetingTones.find(t => t.id === id);
                    return tone?.name || id;
                });

                const nsfwToneNames = Array.from(state.selectedNsfwTones).map(id => {
                    const tone = (offlineData.nsfwTones || []).find(t => t.id === id);
                    return tone?.name || id;
                });

                const canonConflictNames = Array.from(state.selectedCanonConflicts).map(id => {
                    const c = (offlineData.canonConflicts || []).find(c => c.id === id);
                    return c ? `${c.name}: ${c.description}` : id;
                });

                const canonTensionNames = Array.from(state.selectedCanonTensions).map(id => {
                    const t = (offlineData.canonTensions || []).find(t => t.id === id);
                    return t ? `${t.name}: ${t.description}` : id;
                });

                const prompt = buildGreetingPrompt({
                    charData: state.charData,
                    greetingStyle: state.greetingStyle,
                    storyType: state.storyType,
                    auType: state.auType,
                    nsfwScenario: state.nsfwScenario,
                    premise: state.selectedPreset,
                    plotHook: plotHook,
                    relationship: state.relationship,
                    location: state.location,
                    storyBeats: Array.from(state.selectedBeats),
                    customScenario: state.customScenario,
                    narrationStyle: state.narrationStyle,
                    length: state.length,
                    tones: toneNames,
                    nsfwTones: nsfwToneNames,
                    canonConflicts: canonConflictNames,
                    canonTensions: canonTensionNames,
                    additionalInstructions: state.additionalInstructions,
                });

                state.generatedGreeting = await generateGreetingFromPrompt(prompt, state.charData, null);
                dlg.find('#ugw_greeting_preview_text').val(state.generatedGreeting);
                toastr.success('Regenerated!');
            } catch (e) {
                toastr.error(e.message);
            }
            setButtonLoading($(this), false);
        });

        // Save greeting
        dlg.find('#ugw_save_greeting').on('click', async function () {
            const greeting = dlg.find('#ugw_greeting_preview_text').val().trim();
            if (!greeting) {
                toastr.warning('Add greeting text');
                return;
            }

            setButtonLoading($(this), true);
            try {
                const num = await saveAlternateGreeting(state.charIndex, greeting);
                toastr.success(`Greeting #${num} saved to ${state.charData.name}!`);

                dlg.find('#ugw_success_message').text(`Greeting #${num} has been added to ${state.charData.name}!`);
                dlg.find('.ugw-step').hide();
                dlg.find('.ugw-step[data-step="success"]').show().addClass('up-visible');
                dlg.find('.up-progress-step').addClass('completed');

                launchConfetti(dlg.find('#ugw_confetti_canvas')[0]);
            } catch (e) {
                toastr.error('Failed: ' + e.message);
            }
            setButtonLoading($(this), false);
        });

        // Success actions
        dlg.find('#ugw_create_another').on('click', () => {
            state.charIndex = -1;
            state.charData = null;
            state.storyType = '';
            state.auType = '';
            state.nsfwScenario = '';
            state.selectedPreset = null;
            state.relationship = '';
            state.location = '';
            state.selectedBeats.clear();
            state.selectedTones.clear();
            state.selectedNsfwTones.clear();
            state.selectedCanonConflicts.clear();
            state.selectedCanonTensions.clear();
            state.customScenario = '';
            dlg.find('.ugw-step').removeClass('up-visible');
            dlg.find('.up-progress-step').removeClass('completed');
            dlg.find('.ugw-preset-chip, .ugw-beat-chip, .ugw-tone-chip, .ugw-story-card, .ugw-idea-chip, .ugw-canon-chip, .up-au-option, .up-nsfw-option').removeClass('selected');
            dlg.find('#ugw_selected_preset, #ugw_selected_beats_display, #ugw_quick_ideas, #ugw_canon_elements, #ugw_au_elements, #ugw_nsfw_elements, #ugw_nsfw_tones_group').hide();
            dlg.find('#ugw_scenario_custom').val('');
            currentStep = 1;
            updateStepDisplay();
            updateSelectedDisplay();
        });

        dlg.find('#ugw_close_wizard').on('click', () => {
            $('.popup-button-cancel').trigger('click');
        });

        updateStepDisplay();
        await callGenericPopup(dlg, POPUP_TYPE.TEXT, '', { wide: true, large: true, okButton: false, cancelButton: 'Close', allowVerticalScrolling: true });
    } catch (e) {
        console.error('[Ultimate Persona] Greeting wizard error:', e);
        toastr.error('Failed to open: ' + e.message);
    }
}

// ==================== PERSONA-BASED GREETING WIZARD ====================

async function showPersonaGreetingWizard() {
    try {
        const html = await renderExtensionTemplateAsync(EXTENSION_PATH, 'greeting-persona');
        const dlg = $(html);
        const settings = getSettings();

        // Get personas
        const personas = getAllPersonas();
        if (personas.length === 0) {
            toastr.warning('No personas found. Create a persona first!');
            return;
        }

        // Initialize UI
        renderPersonaCarousel(dlg.find('#ugp_persona_carousel'), personas, '');
        renderNarrationOptions(dlg.find('#ugp_narration_options'), settings.defaultNarration);

        // State
        const state = {
            selectedPersona: null,
            charIndex: this_chid >= 0 ? this_chid : -1,
            charData: null,
            greetingStyle: null,
            storyType: '',
            selectedScenario: '', // Selected scenario/trope/genre based on story type
            auType: '',
            nsfwScenario: '',
            premiseMode: 'preset',
            selectedPreset: null,
            relationship: '',
            location: '',
            selectedBeats: new Set(),
            customScenario: '',
            narrationStyle: settings.defaultNarration,
            length: 'medium',
            selectedTones: new Set(),
            selectedNsfwTones: new Set(),
            selectedCanonConflicts: new Set(),
            selectedCanonTensions: new Set(),
            hooks: [],
            selectedHookIndex: -1,
            useCustomHook: false,
            customHookText: '',
            personaFocus: 'balanced',
            additionalInstructions: '',
            generatedGreeting: '',
        };

        let currentStep = 1;

        const updateStepDisplay = () => {
            dlg.find('.ugp-step').hide();
            dlg.find(`.ugp-step[data-step="${currentStep}"]`).show();
            dlg.find('.up-progress-step').removeClass('active completed');
            dlg.find('.up-progress-step').each(function () {
                const stepNum = parseInt($(this).data('step'));
                if (stepNum < currentStep) $(this).addClass('completed');
                else if (stepNum === currentStep) $(this).addClass('active');
            });
        };

        // Step 1: Persona Selection
        dlg.find('#ugp_persona_search').on('input', function () {
            const search = $(this).val().toLowerCase();
            dlg.find('.ugp-persona-card').each(function () {
                const name = $(this).find('.ugp-persona-name').text().toLowerCase();
                $(this).toggle(name.includes(search));
            });
        });

        dlg.find('#ugp_persona_prev').on('click', () => {
            dlg.find('#ugp_persona_carousel').scrollLeft(dlg.find('#ugp_persona_carousel').scrollLeft() - 250);
        });
        dlg.find('#ugp_persona_next').on('click', () => {
            dlg.find('#ugp_persona_carousel').scrollLeft(dlg.find('#ugp_persona_carousel').scrollLeft() + 250);
        });

        dlg.on('click', '.ugp-persona-card', function () {
            dlg.find('.ugp-persona-card').removeClass('selected');
            $(this).addClass('selected');
            const avatarId = $(this).data('avatar');
            state.selectedPersona = personas.find(p => p.avatarId === avatarId);
            dlg.find('#ugp_selected_persona_name').text(state.selectedPersona?.name || 'None');

            // Show preview
            if (state.selectedPersona) {
                const desc = state.selectedPersona.description || 'No description available';
                dlg.find('#ugp_persona_preview_content').text(desc.substring(0, 300) + (desc.length > 300 ? '...' : ''));
                dlg.find('#ugp_persona_preview').show();
            }
        });

        dlg.find('#ugp_next_to_char').on('click', () => {
            if (!state.selectedPersona) {
                toastr.warning('Please select a persona');
                return;
            }

            // Initialize character carousel
            renderCharacterCarousel(dlg.find('#ugp_character_carousel'));

            currentStep = 2;
            updateStepDisplay();
        });

        // Step 2: Character Selection
        dlg.find('#ugp_back_to_persona').on('click', () => {
            currentStep = 1;
            updateStepDisplay();
        });

        dlg.find('#ugp_char_search').on('input', function () {
            renderCharacterCarousel(dlg.find('#ugp_character_carousel'), $(this).val());
        });

        dlg.find('#ugp_random_char').on('click', () => {
            const validChars = characters.filter(c => c?.name);
            if (validChars.length) {
                const random = validChars[Math.floor(Math.random() * validChars.length)];
                state.charIndex = characters.indexOf(random);
                dlg.find('.up-char-card').removeClass('selected');
                dlg.find(`.up-char-card[data-index="${state.charIndex}"]`).addClass('selected');
                updateCharDisplay();
            }
        });

        dlg.find('#ugp_carousel_prev').on('click', () => {
            dlg.find('#ugp_character_carousel').scrollLeft(dlg.find('#ugp_character_carousel').scrollLeft() - 250);
        });
        dlg.find('#ugp_carousel_next').on('click', () => {
            dlg.find('#ugp_character_carousel').scrollLeft(dlg.find('#ugp_character_carousel').scrollLeft() + 250);
        });

        dlg.on('click', '.up-char-card', function () {
            dlg.find('.up-char-card').removeClass('selected');
            $(this).addClass('selected');
            state.charIndex = parseInt($(this).data('index'));
            updateCharDisplay();
        });

        function updateCharDisplay() {
            const name = state.charIndex >= 0 ? characters[state.charIndex]?.name : 'None';
            dlg.find('#ugp_selected_char_name').text(name || 'None');

            // Show pairing preview
            if (state.selectedPersona && state.charIndex >= 0) {
                const char = characters[state.charIndex];
                dlg.find('#ugp_pairing_persona_name').text(state.selectedPersona.name);
                dlg.find('#ugp_pairing_persona_img').attr('src', `/User Avatars/${encodeURIComponent(state.selectedPersona.avatarId)}`);
                dlg.find('#ugp_pairing_char_name').text(char.name);
                dlg.find('#ugp_pairing_char_img').attr('src', char.avatar ? `/characters/${encodeURIComponent(char.avatar)}` : '/img/ai4.png');
                dlg.find('#ugp_pairing_preview').show();

                // Greeting preview
                const altGreetings = char.data?.alternate_greetings || [];
                const firstMes = char.first_mes || char.data?.first_mes || '';
                dlg.find('#ugp_greeting_count').text(altGreetings.length);
                if (firstMes || altGreetings.length > 0) {
                    const sample = firstMes || altGreetings[0];
                    dlg.find('#ugp_greeting_sample').text(sample.substring(0, 200) + (sample.length > 200 ? '...' : ''));
                    dlg.find('#ugp_greeting_preview').show();
                }
            }
        }

        dlg.find('#ugp_next_to_type').on('click', () => {
            if (state.charIndex < 0) {
                toastr.warning('Please select a character');
                return;
            }
            state.charData = getCharacterData(state.charIndex);
            state.charData.alternate_greetings = characters[state.charIndex].data?.alternate_greetings || [];
            state.greetingStyle = analyzeGreetingStyle(state.charData);

            dlg.find('#ugp_persona_name_display').text(state.selectedPersona.name);
            dlg.find('#ugp_char_name_display').text(state.charData.name);

            currentStep = 3;
            updateStepDisplay();
        });

        // Step 3: Story Type (same logic as greeting wizard)
        dlg.find('#ugp_back_to_char').on('click', () => {
            currentStep = 2;
            updateStepDisplay();
        });

        dlg.on('click', '.ugw-story-card', function () {
            dlg.find('.ugw-story-card').removeClass('selected');
            $(this).addClass('selected');
            state.storyType = $(this).data('type');
            state.selectedScenario = ''; // Reset scenario selection

            // Show/hide scenarios section
            dlg.find('#ugp_scenarios_section').show();
            dlg.find('#ugp_canon_scenarios, #ugp_au_scenarios, #ugp_nsfw_scenarios').hide();

            if (state.storyType === 'canon') {
                // For canon, hide scenario selection - we'll use character card analysis during plot hook generation
                dlg.find('#ugp_scenarios_section').hide();
                dlg.find('#ugp_scenarios_subtitle').text('Canon mode: Character card will be analyzed during plot hook generation');
            } else if (state.storyType === 'au') {
                // Show AU genres
                const auGenres = offlineData.auTypes || [];
                renderScenarioChips(dlg.find('#ugp_au_scenarios_chips'), auGenres, '');
                dlg.find('#ugp_au_scenarios').show();
                dlg.find('#ugp_scenarios_subtitle').text('Select an AU genre to expand upon');
            } else if (state.storyType === 'nsfw') {
                // Show NSFW genres
                const nsfwGenres = offlineData.nsfwScenarios || [];
                renderScenarioChips(dlg.find('#ugp_nsfw_scenarios_chips'), nsfwGenres, '');
                dlg.find('#ugp_nsfw_scenarios').show();
                dlg.find('#ugp_scenarios_subtitle').text('Select a romantic scenario genre to expand upon');
            }
        });

        // Canon scenario selection removed - using character card analysis only

        dlg.on('click', '#ugp_au_scenarios_chips .ugw-scenario-chip', function () {
            dlg.find('#ugp_au_scenarios_chips .ugw-scenario-chip').removeClass('selected');
            $(this).addClass('selected');
            state.selectedScenario = $(this).data('id');
            state.auType = $(this).data('id');
        });

        dlg.on('click', '#ugp_nsfw_scenarios_chips .ugw-scenario-chip', function () {
            dlg.find('#ugp_nsfw_scenarios_chips .ugw-scenario-chip').removeClass('selected');
            $(this).addClass('selected');
            state.selectedScenario = $(this).data('id');
            state.nsfwScenario = $(this).data('id');
        });

        dlg.on('click', '#ugp_ideas_chips .ugw-idea-chip', function () {
            dlg.find('#ugp_ideas_chips .ugw-idea-chip').removeClass('selected');
            $(this).addClass('selected');
            const setup = $(this).data('setup') || '';
            state.selectedPreset = {
                id: $(this).data('id'),
                name: $(this).data('idea'),
                description: $(this).data('desc') || $(this).data('idea'),
                setup: setup,
            };

            // Auto-apply setup to custom scenario if it exists
            if (setup && !dlg.find('#ugp_scenario_custom').val().trim()) {
                dlg.find('#ugp_scenario_custom').val(setup);
                state.customScenario = setup;
            }
        });

        dlg.find('#ugp_next_to_premise').on('click', () => {
            if (!state.storyType) {
                toastr.warning('Please select a story type');
                return;
            }

            // Filter by story type
            const filteredRelationships = filterRelationshipsByStoryType(offlineData.greetingRelationships || [], state.storyType);
            const filteredLocations = filterLocationsByStoryType(offlineData.greetingLocations || [], state.storyType);

            renderPresetChips(dlg.find('#ugp_relationship_presets'), filteredRelationships, '');
            renderPresetChips(dlg.find('#ugp_trope_presets'), offlineData.greetingTropes || [], '');
            renderPresetChips(dlg.find('#ugp_encounter_presets'), offlineData.greetingEncounters || [], '');
            renderPresetChips(dlg.find('#ugp_relationship_chips'), filteredRelationships, '');
            renderPresetChips(dlg.find('#ugp_location_chips'), filteredLocations, '');

            const posBeats = shuffle(offlineData.positiveStoryBeats || []).slice(0, 8);
            const negBeats = shuffle(offlineData.negativeStoryBeats || []).slice(0, 8);
            renderBeatChips(dlg.find('#ugp_positive_beats'), posBeats, state.selectedBeats);
            renderBeatChips(dlg.find('#ugp_negative_beats'), negBeats, state.selectedBeats);

            renderToneChips(dlg.find('#ugp_tone_chips'), offlineData.greetingTones || [], state.selectedTones);

            // NSFW tones (if applicable)
            if (state.storyType === 'nsfw') {
                renderNsfwTones(dlg.find('#ugp_nsfw_tone_chips'), offlineData.nsfwTones || [], state.selectedNsfwTones);
                dlg.find('#ugp_nsfw_tones_group').show();
            } else {
                dlg.find('#ugp_nsfw_tones_group').hide();
            }

            currentStep = 4;
            updateStepDisplay();
        });

        // Step 4: Premise
        dlg.find('#ugp_back_to_type').on('click', () => {
            currentStep = 3;
            updateStepDisplay();
        });

        // Premise tab switching
        dlg.on('click', '.ugw-premise-tab', function () {
            dlg.find('.ugw-premise-tab').removeClass('active');
            $(this).addClass('active');
            state.premiseMode = $(this).data('tab');
            dlg.find('.ugw-premise-panel').removeClass('active').hide();
            dlg.find(`.ugw-premise-panel[data-panel="${state.premiseMode}"]`).addClass('active').show();
        });

        // Preset selection (persona version)
        dlg.on('click', '#ugp_relationship_presets .ugw-preset-chip, #ugp_trope_presets .ugw-preset-chip, #ugp_encounter_presets .ugw-preset-chip', function () {
            dlg.find('.ugw-preset-chip').removeClass('selected');
            $(this).addClass('selected');
            state.selectedPreset = {
                id: $(this).data('id'),
                name: $(this).data('name'),
                description: $(this).data('desc'),
            };
            dlg.find('#ugp_preset_content').html(`
                <div class="preset-name">${state.selectedPreset.name}</div>
                <div class="preset-desc">${state.selectedPreset.description}</div>
            `);
            dlg.find('#ugp_selected_preset').show();
        });

        // Custom panel handlers
        dlg.on('click', '#ugp_relationship_chips .ugw-preset-chip', function () {
            const isSelected = $(this).hasClass('selected');
            dlg.find('#ugp_relationship_chips .ugw-preset-chip').removeClass('selected');
            if (!isSelected) {
                $(this).addClass('selected');
                state.relationship = $(this).data('name');
            } else {
                state.relationship = '';
            }
            dlg.find('#ugp_relationship_custom').val('');
        });

        dlg.find('#ugp_relationship_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#ugp_relationship_chips .ugw-preset-chip').removeClass('selected');
                state.relationship = $(this).val().trim();
            }
        });

        dlg.on('click', '#ugp_location_chips .ugw-preset-chip', function () {
            const isSelected = $(this).hasClass('selected');
            dlg.find('#ugp_location_chips .ugw-preset-chip').removeClass('selected');
            if (!isSelected) {
                $(this).addClass('selected');
                state.location = $(this).data('name');
            } else {
                state.location = '';
            }
            dlg.find('#ugp_location_custom').val('');
        });

        dlg.find('#ugp_location_custom').on('input', function () {
            if ($(this).val().trim()) {
                dlg.find('#ugp_location_chips .ugw-preset-chip').removeClass('selected');
                state.location = $(this).val().trim();
            }
        });


        // Add custom positive beat
        dlg.find('#ugp_add_positive_beat').on('click', async function () {
            const beat = await Popup.show.input('Add Positive Story Beat', 'Enter a positive story beat:');
            if (!beat || !beat.trim()) return;

            const beatText = beat.trim();
            if (!offlineData.positiveStoryBeats) offlineData.positiveStoryBeats = [];
            offlineData.positiveStoryBeats.push(beatText);

            // Add to current display
            const container = dlg.find('#ugp_positive_beats');
            container.append(`<div class="ugw-beat-chip selected" data-beat="${beatText.replace(/"/g, '&quot;')}">${beatText}</div>`);
            state.selectedBeats.add(beatText);
            updatePersonaBeatsDisplay();
            toastr.success(`Added "${beatText}" positive beat!`);
        });

        // Add custom negative beat
        dlg.find('#ugp_add_negative_beat').on('click', async function () {
            const beat = await Popup.show.input('Add Negative Story Beat', 'Enter a tension/conflict story beat:');
            if (!beat || !beat.trim()) return;

            const beatText = beat.trim();
            if (!offlineData.negativeStoryBeats) offlineData.negativeStoryBeats = [];
            offlineData.negativeStoryBeats.push(beatText);

            // Add to current display
            const container = dlg.find('#ugp_negative_beats');
            container.append(`<div class="ugw-beat-chip selected" data-beat="${beatText.replace(/"/g, '&quot;')}">${beatText}</div>`);
            state.selectedBeats.add(beatText);
            updatePersonaBeatsDisplay();
            toastr.success(`Added "${beatText}" negative beat!`);
        });

        // Beats
        dlg.on('click', '#ugp_positive_beats .ugw-beat-chip, #ugp_negative_beats .ugw-beat-chip', function () {
            const beat = $(this).data('beat');
            if (state.selectedBeats.has(beat)) {
                state.selectedBeats.delete(beat);
                $(this).removeClass('selected');
            } else {
                state.selectedBeats.add(beat);
                $(this).addClass('selected');
            }
            updatePersonaBeatsDisplay();
        });

        function updatePersonaBeatsDisplay() {
            const container = dlg.find('#ugp_selected_beats_list');
            renderSelectedBeats(container, state.selectedBeats);
            dlg.find('#ugp_selected_beats_display').toggle(state.selectedBeats.size > 0);
        }

        dlg.on('click', '#ugp_selected_beats_list .remove-beat', function () {
            const beat = $(this).parent().data('beat');
            state.selectedBeats.delete(beat);
            dlg.find(`.ugw-beat-chip[data-beat="${beat}"]`).removeClass('selected');
            updatePersonaBeatsDisplay();
        });

        dlg.find('#ugp_refresh_positive_beats').on('click', () => {
            const newBeats = shuffle(offlineData.positiveStoryBeats || []).slice(0, 8);
            renderBeatChips(dlg.find('#ugp_positive_beats'), newBeats, state.selectedBeats);
        });

        dlg.find('#ugp_refresh_negative_beats').on('click', () => {
            const newBeats = shuffle(offlineData.negativeStoryBeats || []).slice(0, 8);
            renderBeatChips(dlg.find('#ugp_negative_beats'), newBeats, state.selectedBeats);
        });

        dlg.find('#ugp_enhance_scenario').on('click', async function () {
            // Include context from selected chips
            const contextParts = [];

            if (state.relationship) contextParts.push(`Relationship: ${state.relationship}`);
            if (state.location) contextParts.push(`Location: ${state.location}`);
            if (state.selectedBeats.size > 0) {
                contextParts.push(`Key Story Beats: ${Array.from(state.selectedBeats).join(', ')}`);
            }
            // Add persona context for specific flavor
            if (state.selectedPersona) {
                contextParts.push(`Persona: ${state.selectedPersona.name}`);
            }

            const userInput = dlg.find('#ugp_scenario_custom').val().trim();
            const fullInput = userInput
                ? `${contextParts.length > 0 ? contextParts.join('\n') + '\n\nUser Notes: ' : ''}${userInput}`
                : contextParts.join('\n');

            if (!fullInput) {
                toastr.warning('Add some details or select tags first');
                return;
            }

            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                const enhanced = await enhanceText(fullInput);
                dlg.find('#ugp_scenario_custom').val(enhanced);
                state.customScenario = enhanced;
            } catch (e) {
                console.error(e);
                toastr.error('Failed to enhance');
            }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        dlg.find('#ugp_next_to_hooks').on('click', () => {
            state.customScenario = dlg.find('#ugp_scenario_custom').val().trim();

            if (state.premiseMode === 'preset' && !state.selectedPreset) {
                toastr.warning('Please select a premise');
                return;
            }
            if (state.premiseMode === 'custom' && !state.relationship && !state.location && state.selectedBeats.size === 0 && !state.customScenario) {
                toastr.warning('Please add some scenario details');
                return;
            }

            // Go to plot hooks step
            currentStep = 5;
            updateStepDisplay();
        });

        // Step 5: Plot Hooks
        dlg.find('#ugp_back_to_premise').on('click', () => {
            currentStep = 4;
            updateStepDisplay();
        });

        // Generate plot hooks
        dlg.find('#ugp_generate_hooks').on('click', async function () {
            setButtonLoading($(this), true);
            try {
                // Build premise summary for hook generation
                let premiseSummary = '';
                if (state.premiseMode === 'preset' && state.selectedPreset) {
                    premiseSummary = `${state.selectedPreset.name}: ${state.selectedPreset.description}`;
                } else {
                    const parts = [];
                    if (state.relationship) parts.push(`Relationship: ${state.relationship}`);
                    if (state.location) parts.push(`Location: ${state.location}`);
                    if (state.selectedBeats.size > 0) {
                        parts.push(`Story beats: ${Array.from(state.selectedBeats).join(', ')}`);
                    }
                    if (state.customScenario) parts.push(state.customScenario);
                    premiseSummary = parts.join('. ') || 'A meeting between {{user}} and the character';
                }

                // Generate hooks with premise information and persona data
                // FIX: If using preset, pass the summary as customScenario so it's included
                const isPreset = state.premiseMode === 'preset';
                const hooks = await generateGreetingHooks(
                    state.charData,
                    state.storyType,
                    state.selectedScenario,
                    isPreset ? '' : state.relationship,
                    isPreset ? '' : state.location,
                    isPreset ? [] : state.selectedBeats,
                    isPreset ? premiseSummary : state.customScenario,
                    state.selectedPersona // personaData
                );

                state.hooks = hooks;
                renderHooks(dlg.find('#ugp_hooks_list'), hooks, state.selectedHookIndex);

                if (hooks.length === 0) {
                    toastr.warning('No hooks generated. Try again.');
                } else {
                    toastr.success(`Generated ${hooks.length} plot hooks!`);
                }
            } catch (e) {
                console.error('[Ultimate Persona] Hook generation error:', e);
                toastr.error('Failed to generate hooks: ' + e.message);
            } finally {
                setButtonLoading($(this), false);
            }
        });

        // Hook selection
        dlg.on('click', '#ugp_hooks_list .up-hook-item', function () {
            dlg.find('#ugp_hooks_list .up-hook-item').removeClass('selected');
            $(this).addClass('selected');
            state.selectedHookIndex = parseInt($(this).data('hook'));
            state.useCustomHook = false;
            dlg.find('#ugp_use_custom_hook').prop('checked', false);
        });

        // Custom hook checkbox
        dlg.find('#ugp_use_custom_hook').on('change', function () {
            state.useCustomHook = $(this).is(':checked');
            if (state.useCustomHook) {
                dlg.find('#ugp_hooks_list .up-hook-item').removeClass('selected');
                state.selectedHookIndex = -1;
            }
        });

        // Custom hook text
        dlg.find('#ugp_custom_hook_text').on('input', function () {
            state.customHookText = $(this).val().trim();
        });

        // Enhance hook
        dlg.find('#ugp_enhance_hook').on('click', async function () {
            const input = dlg.find('#ugp_custom_hook_text').val().trim();
            if (!input) {
                toastr.warning('Enter a hook first');
                return;
            }
            $(this).prop('disabled', true).find('i').addClass('fa-spin');
            try {
                const enhanced = await enhanceText(input);
                dlg.find('#ugp_custom_hook_text').val(enhanced);
                state.customHookText = enhanced;
            } catch (e) {
                toastr.error('Failed to enhance');
            }
            $(this).prop('disabled', false).find('i').removeClass('fa-spin');
        });

        // Continue from hooks to details
        dlg.find('#ugp_next_to_details').on('click', () => {
            if (!state.useCustomHook && state.selectedHookIndex < 0 && state.hooks.length > 0) {
                toastr.warning('Please select a plot hook or use a custom scenario');
                return;
            }
            if (state.useCustomHook && !state.customHookText.trim()) {
                toastr.warning('Please enter a custom hook');
                return;
            }

            // Update summary
            dlg.find('#ugp_summary_persona').text(state.selectedPersona.name);
            dlg.find('#ugp_summary_char').text(state.charData.name);
            dlg.find('#ugp_summary_type').text(state.storyType.charAt(0).toUpperCase() + state.storyType.slice(1));

            let premiseSummary = '';
            if (state.useCustomHook) {
                premiseSummary = state.customHookText;
            } else if (state.selectedHookIndex >= 0 && state.hooks[state.selectedHookIndex]) {
                premiseSummary = state.hooks[state.selectedHookIndex];
            } else if (state.premiseMode === 'preset' && state.selectedPreset) {
                premiseSummary = state.selectedPreset.name;
            } else {
                const parts = [];
                if (state.relationship) parts.push(state.relationship);
                if (state.location) parts.push(`at ${state.location}`);
                if (state.selectedBeats.size > 0) parts.push(`${state.selectedBeats.size} story beats`);
                premiseSummary = parts.join(', ') || 'Custom scenario';
            }
            dlg.find('#ugp_summary_premise').text(premiseSummary);

            currentStep = 6;
            updateStepDisplay();
        });

        // Step 6: Details
        dlg.find('#ugp_back_to_hooks').on('click', () => {
            currentStep = 5;
            updateStepDisplay();
        });

        // Step 5: Details
        dlg.find('#ugp_back_to_premise').on('click', () => {
            currentStep = 4;
            updateStepDisplay();
        });

        dlg.on('click', '#ugp_narration_options .up-narration-option', function () {
            dlg.find('#ugp_narration_options .up-narration-option').removeClass('selected');
            $(this).addClass('selected');
            state.narrationStyle = $(this).data('style');
        });

        dlg.on('click', '.ugw-length-option', function () {
            dlg.find('.ugw-length-option').removeClass('selected');
            $(this).addClass('selected');
            state.length = $(this).data('length');
        });

        dlg.on('click', '#ugp_tone_chips .ugw-tone-chip', function () {
            const toneId = $(this).data('id');
            if (state.selectedTones.has(toneId)) {
                state.selectedTones.delete(toneId);
                $(this).removeClass('selected');
            } else {
                state.selectedTones.add(toneId);
                $(this).addClass('selected');
            }
        });

        // NSFW Tones
        dlg.on('click', '#ugp_nsfw_tone_chips .ugw-tone-chip', function () {
            const toneId = $(this).data('id');
            if (state.selectedNsfwTones.has(toneId)) {
                state.selectedNsfwTones.delete(toneId);
                $(this).removeClass('selected');
            } else {
                state.selectedNsfwTones.add(toneId);
                $(this).addClass('selected');
            }
        });

        dlg.on('click', '.ugp-focus-option', function () {
            dlg.find('.ugp-focus-option').removeClass('selected');
            $(this).addClass('selected');
            state.personaFocus = $(this).data('focus');
        });

        // Generate greeting
        dlg.find('#ugp_generate_greeting').on('click', async function () {
            state.additionalInstructions = dlg.find('#ugp_additional_instructions').val().trim();

            setButtonLoading($(this), true);
            try {
                // Get the selected plot hook
                let plotHook = '';
                if (state.useCustomHook) {
                    plotHook = state.customHookText;
                } else if (state.selectedHookIndex >= 0 && state.hooks[state.selectedHookIndex]) {
                    plotHook = state.hooks[state.selectedHookIndex];
                } else if (state.premiseMode === 'preset' && state.selectedPreset) {
                    plotHook = `${state.selectedPreset.name}: ${state.selectedPreset.description}`;
                } else {
                    const parts = [];
                    if (state.relationship) parts.push(`Relationship: ${state.relationship}`);
                    if (state.location) parts.push(`Location: ${state.location}`);
                    if (state.selectedBeats.size > 0) parts.push(`Story beats: ${Array.from(state.selectedBeats).join(', ')}`);
                    if (state.customScenario) parts.push(state.customScenario);
                    plotHook = parts.join('. ') || 'A meeting between {{user}} and the character';
                }

                const toneNames = Array.from(state.selectedTones).map(id => {
                    const tone = offlineData.greetingTones.find(t => t.id === id);
                    return tone?.name || id;
                });

                const nsfwToneNames = Array.from(state.selectedNsfwTones).map(id => {
                    const tone = (offlineData.nsfwTones || []).find(t => t.id === id);
                    return tone?.name || id;
                });

                const canonConflictNames = Array.from(state.selectedCanonConflicts).map(id => {
                    const c = (offlineData.canonConflicts || []).find(c => c.id === id);
                    return c ? `${c.name}: ${c.description}` : id;
                });

                const canonTensionNames = Array.from(state.selectedCanonTensions).map(id => {
                    const t = (offlineData.canonTensions || []).find(t => t.id === id);
                    return t ? `${t.name}: ${t.description}` : id;
                });

                const prompt = buildGreetingPrompt({
                    charData: state.charData,
                    greetingStyle: state.greetingStyle,
                    storyType: state.storyType,
                    auType: state.auType,
                    nsfwScenario: state.nsfwScenario,
                    premise: state.selectedPreset,
                    plotHook: plotHook,
                    relationship: state.relationship,
                    location: state.location,
                    storyBeats: Array.from(state.selectedBeats),
                    customScenario: state.customScenario,
                    narrationStyle: state.narrationStyle,
                    length: state.length,
                    tones: toneNames,
                    nsfwTones: nsfwToneNames,
                    canonConflicts: canonConflictNames,
                    canonTensions: canonTensionNames,
                    additionalInstructions: state.additionalInstructions,
                    personaData: state.selectedPersona,
                    personaFocus: state.personaFocus,
                });

                state.generatedGreeting = await generateGreetingFromPrompt(prompt, state.charData, state.selectedPersona);
                dlg.find('#ugp_greeting_preview_text').val(state.generatedGreeting);
                dlg.find('#ugp_final_char_name').text(state.charData.name);

                currentStep = 7;
                updateStepDisplay();
            } catch (e) {
                toastr.error(e.message);
            } finally {
                setButtonLoading($(this), false);
            }
        });

        // Step 6: Review
        dlg.find('#ugp_back_to_details').on('click', () => {
            currentStep = 5;
            updateStepDisplay();
        });

        // Enhancement buttons
        dlg.find('#ugp_more_description').on('click', async function () {
            const current = dlg.find('#ugp_greeting_preview_text').val();
            if (!current) return;

            setButtonLoading($(this), true);
            try {
                const enhanced = await enhanceGreetingDescription(current, state.charData);
                dlg.find('#ugp_greeting_preview_text').val(enhanced.trim());
                toastr.success('Added more description!');
            } catch (e) {
                toastr.error('Failed to enhance');
            }
            setButtonLoading($(this), false);
        });

        dlg.find('#ugp_more_dialogue').on('click', async function () {
            const current = dlg.find('#ugp_greeting_preview_text').val();
            if (!current) return;

            setButtonLoading($(this), true);
            try {
                const enhanced = await enhanceGreetingDialogue(current, state.charData);
                dlg.find('#ugp_greeting_preview_text').val(enhanced.trim());
                toastr.success('Added more dialogue!');
            } catch (e) {
                toastr.error('Failed to enhance');
            }
            setButtonLoading($(this), false);
        });

        dlg.find('#ugp_more_persona').on('click', async function () {
            const current = dlg.find('#ugp_greeting_preview_text').val();
            if (!current) return;

            setButtonLoading($(this), true);
            try {
                const enhanced = await enhanceGreetingPersona(current, state.charData, state.selectedPersona);
                dlg.find('#ugp_greeting_preview_text').val(enhanced.trim());
                toastr.success('Added more persona references!');
            } catch (e) {
                toastr.error('Failed to enhance');
            }
            setButtonLoading($(this), false);
        });

        dlg.find('#ugp_adjust_tone').on('click', async function () {
            const current = dlg.find('#ugp_greeting_preview_text').val();
            if (!current) return;

            const tone = await Popup.show.input('Adjust Tone', 'What tone would you like? (e.g., more romantic, darker, funnier)');
            if (!tone) return;

            setButtonLoading($(this), true);
            try {
                const adjusted = await adjustGreetingTone(current, state.charData, tone);
                dlg.find('#ugp_greeting_preview_text').val(adjusted.trim());
                toastr.success('Tone adjusted!');
            } catch (e) {
                toastr.error('Failed to adjust');
            }
            setButtonLoading($(this), false);
        });

        // Regenerate
        dlg.find('#ugp_regenerate_greeting').on('click', async function () {
            setButtonLoading($(this), true);
            try {
                // Get the selected plot hook
                let plotHook = '';
                if (state.useCustomHook) {
                    plotHook = state.customHookText;
                } else if (state.selectedHookIndex >= 0 && state.hooks[state.selectedHookIndex]) {
                    plotHook = state.hooks[state.selectedHookIndex];
                } else if (state.premiseMode === 'preset' && state.selectedPreset) {
                    plotHook = `${state.selectedPreset.name}: ${state.selectedPreset.description}`;
                } else {
                    const parts = [];
                    if (state.relationship) parts.push(`Relationship: ${state.relationship}`);
                    if (state.location) parts.push(`Location: ${state.location}`);
                    if (state.selectedBeats.size > 0) parts.push(`Story beats: ${Array.from(state.selectedBeats).join(', ')}`);
                    if (state.customScenario) parts.push(state.customScenario);
                    plotHook = parts.join('. ') || 'A meeting between {{user}} and the character';
                }

                const toneNames = Array.from(state.selectedTones).map(id => {
                    const tone = offlineData.greetingTones.find(t => t.id === id);
                    return tone?.name || id;
                });

                const nsfwToneNames = Array.from(state.selectedNsfwTones).map(id => {
                    const tone = (offlineData.nsfwTones || []).find(t => t.id === id);
                    return tone?.name || id;
                });

                const canonConflictNames = Array.from(state.selectedCanonConflicts).map(id => {
                    const c = (offlineData.canonConflicts || []).find(c => c.id === id);
                    return c ? `${c.name}: ${c.description}` : id;
                });

                const canonTensionNames = Array.from(state.selectedCanonTensions).map(id => {
                    const t = (offlineData.canonTensions || []).find(t => t.id === id);
                    return t ? `${t.name}: ${t.description}` : id;
                });

                const prompt = buildGreetingPrompt({
                    charData: state.charData,
                    greetingStyle: state.greetingStyle,
                    storyType: state.storyType,
                    auType: state.auType,
                    nsfwScenario: state.nsfwScenario,
                    premise: state.selectedPreset,
                    plotHook: plotHook,
                    relationship: state.relationship,
                    location: state.location,
                    storyBeats: Array.from(state.selectedBeats),
                    customScenario: state.customScenario,
                    narrationStyle: state.narrationStyle,
                    length: state.length,
                    tones: toneNames,
                    nsfwTones: nsfwToneNames,
                    canonConflicts: canonConflictNames,
                    canonTensions: canonTensionNames,
                    additionalInstructions: state.additionalInstructions,
                    personaData: state.selectedPersona,
                    personaFocus: state.personaFocus,
                });

                state.generatedGreeting = await generateGreetingFromPrompt(prompt, state.charData, state.selectedPersona);
                dlg.find('#ugp_greeting_preview_text').val(state.generatedGreeting);
                toastr.success('Regenerated!');
            } catch (e) {
                toastr.error(e.message);
            }
            setButtonLoading($(this), false);
        });

        // Step 7: Review
        dlg.find('#ugp_back_to_details').on('click', () => {
            currentStep = 6;
            updateStepDisplay();
        });

        // Save greeting
        dlg.find('#ugp_save_greeting').on('click', async function () {
            const greeting = dlg.find('#ugp_greeting_preview_text').val().trim();
            if (!greeting) {
                toastr.warning('Add greeting text');
                return;
            }

            setButtonLoading($(this), true);
            try {
                const num = await saveAlternateGreeting(state.charIndex, greeting);
                toastr.success(`Greeting #${num} saved to ${state.charData.name}!`);

                dlg.find('#ugp_success_message').text(`Greeting #${num} featuring ${state.selectedPersona.name} has been added to ${state.charData.name}!`);
                dlg.find('.ugp-step').hide();
                dlg.find('.ugp-step[data-step="success"]').show().addClass('up-visible');
                dlg.find('.up-progress-step').addClass('completed');

                launchConfetti(dlg.find('#ugp_confetti_canvas')[0]);
            } catch (e) {
                toastr.error('Failed: ' + e.message);
            }
            setButtonLoading($(this), false);
        });

        // Success actions
        dlg.find('#ugp_create_another').on('click', () => {
            state.selectedPersona = null;
            state.charIndex = -1;
            state.charData = null;
            state.storyType = '';
            state.auType = '';
            state.nsfwScenario = '';
            state.selectedPreset = null;
            state.relationship = '';
            state.location = '';
            state.selectedBeats.clear();
            state.selectedTones.clear();
            state.selectedNsfwTones.clear();
            state.selectedCanonConflicts.clear();
            state.selectedCanonTensions.clear();
            state.customScenario = '';
            dlg.find('.ugp-step').removeClass('up-visible');
            dlg.find('.up-progress-step').removeClass('completed');
            dlg.find('.ugp-persona-card, .up-char-card, .ugw-preset-chip, .ugw-beat-chip, .ugw-tone-chip, .ugw-story-card, .ugw-idea-chip, .ugp-focus-option, .ugw-canon-chip, .up-au-option, .up-nsfw-option').removeClass('selected');
            dlg.find('.ugp-focus-option[data-focus="balanced"]').addClass('selected');
            dlg.find('#ugp_selected_preset, #ugp_selected_beats_display, #ugp_quick_ideas, #ugp_persona_preview, #ugp_pairing_preview, #ugp_greeting_preview, #ugp_canon_elements, #ugp_au_elements, #ugp_nsfw_elements, #ugp_nsfw_tones_group').hide();
            dlg.find('#ugp_selected_persona_name').text('None');
            dlg.find('#ugp_scenario_custom').val('');
            currentStep = 1;
            updateStepDisplay();
        });

        dlg.find('#ugp_close_wizard').on('click', () => {
            $('.popup-button-cancel').trigger('click');
        });

        updateStepDisplay();
        await callGenericPopup(dlg, POPUP_TYPE.TEXT, '', { wide: true, large: true, okButton: false, cancelButton: 'Close', allowVerticalScrolling: true });
    } catch (e) {
        console.error('[Ultimate Persona] Persona greeting wizard error:', e);
        toastr.error('Failed to open: ' + e.message);
    }
}

// ==================== QUICK MENU ====================

function showQuickMenu(btn) {
    console.log('[Ultimate Persona] Opening quick menu...');

    // Remove existing menu
    $('.up-quick-menu').remove();

    const recentHistory = getSettings().history.slice(0, 3);

    let recentHtml = '';
    if (recentHistory.length > 0) {
        recentHtml = `
            <div class="up-quick-menu-header">Recent Personas</div>
            ${recentHistory.map(h => `
                <div class="up-quick-menu-item up-quick-recent" data-id="${h.id}">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <span>${h.name || 'Unnamed'} (${h.characterName || '?'})</span>
                </div>
            `).join('')}
            <div class="up-quick-menu-divider"></div>
        `;
    }

    const menu = $(`
        <div class="up-quick-menu">
            <div class="up-quick-menu-header">Create Persona</div>
            <div class="up-quick-menu-item" id="up_quick_new">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                <span>New Persona (from Character)</span>
            </div>
            <div class="up-quick-menu-item" id="up_quick_standalone">
                <i class="fa-solid fa-bolt"></i>
                <span>Quick Standalone Persona</span>
            </div>
            <div class="up-quick-menu-divider"></div>
            <div class="up-quick-menu-header">Create Greeting</div>
            <div class="up-quick-menu-item" id="up_quick_greeting">
                <i class="fa-solid fa-message"></i>
                <span>New Alternate Greeting</span>
            </div>
            <div class="up-quick-menu-item" id="up_quick_greeting_persona">
                <i class="fa-solid fa-user-pen"></i>
                <span>Greeting with Persona</span>
            </div>
            <div class="up-quick-menu-divider"></div>
            ${recentHtml}
            <div class="up-quick-menu-item" id="up_quick_settings">
                <i class="fa-solid fa-gear"></i>
                <span>Settings</span>
            </div>
        </div>
    `);

    // Append to body instead and position near button
    $('body').append(menu);

    const btnOffset = btn.offset();
    const btnHeight = btn.outerHeight();
    menu.css({
        position: 'fixed',
        top: btnOffset.top + btnHeight + 5,
        right: $(window).width() - btnOffset.left - btn.outerWidth(),
        zIndex: 10000
    });

    menu.find('#up_quick_new').on('click', () => {
        menu.remove();
        showUltimatePersonaPopup();
    });

    menu.find('#up_quick_standalone').on('click', () => {
        menu.remove();
        showQuickPersonaPopup();
    });

    menu.find('#up_quick_greeting').on('click', () => {
        menu.remove();
        showGreetingWizard();
    });

    menu.find('#up_quick_greeting_persona').on('click', () => {
        menu.remove();
        showPersonaGreetingWizard();
    });

    menu.find('#up_quick_settings').on('click', () => {
        menu.remove();
        showSettingsPopup();
    });

    // Close on outside click (with small delay to prevent immediate close)
    setTimeout(() => {
        $(document).one('click', (e) => {
            if (!$(e.target).closest('.up-quick-menu').length) {
                menu.remove();
            }
        });
    }, 100);
}

// ==================== INITIALIZATION ====================

function addUltimatePersonaButton() {
    console.log('[Ultimate Persona] Adding button to UI...');

    // Remove any existing button first
    $('#ultimate_persona_button').remove();

    const btn = $('<div id="ultimate_persona_button" class="fa-solid fa-wand-magic-sparkles menu_button menu_button_icon interactable" title="Ultimate Persona Generator"></div>');

    // Try multiple possible locations
    const targetSelectors = [
        '#persona-management-button',
        '#top-settings-holder',
        '#form_sheld',
        '#leftSendForm',
        'body'
    ];

    let added = false;
    for (const selector of targetSelectors) {
        const target = $(selector);
        if (target.length) {
            if (selector === '#persona-management-button') {
                target.after(btn);
            } else if (selector === 'body') {
                target.append(btn);
            } else {
                target.prepend(btn);
            }
            console.log(`[Ultimate Persona] Button added to: ${selector}`);
            added = true;
            break;
        }
    }

    if (!added) {
        console.error('[Ultimate Persona] Could not find any valid target for button!');
        return;
    }

    btn.on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) {
            showSettingsPopup();
        } else if (e.ctrlKey || e.metaKey) {
            showQuickMenu(btn);
        } else {
            showUltimatePersonaPopup();
        }
    });

    btn.on('contextmenu', (e) => {
        e.preventDefault();
        showQuickMenu(btn);
    });
}

jQuery(async () => {
    try {
        console.log('[Ultimate Persona] Starting initialization...');
        loadSettings();
        console.log('[Ultimate Persona] Settings loaded');
        await loadOfflineData();
        console.log('[Ultimate Persona] Offline data loaded');
        addUltimatePersonaButton();
        console.log('[Ultimate Persona] Button added - Click: Wizard | Shift+Click: Settings | Right-Click: Quick Menu');
    } catch (error) {
        console.error('[Ultimate Persona] Initialization failed:', error);
    }
});
