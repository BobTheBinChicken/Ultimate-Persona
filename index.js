import { characters, getRequestHeaders, this_chid, saveSettingsDebounced, generateRaw } from '../../../script.js';
import { getContext, extension_settings, renderExtensionTemplateAsync } from '../../extensions.js';
import { POPUP_TYPE, callGenericPopup, Popup } from '../../popup.js';
import { initPersona, getUserAvatars, setUserAvatar, user_avatar } from '../../personas.js';
import { power_user } from '../../power-user.js';
import { tags, tag_map, addTagsToEntity, getTagKeyForEntity } from '../../tags.js';

// Simple UUID generator
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const MODULE_NAME = 'UltimatePersona';
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
        const response = await fetch(`/scripts/extensions/${MODULE_NAME}/data.json`);
        if (response.ok) {
            offlineData = await response.json();
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

    const particles = [];
    const colors = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * 150 + 50,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.floor(Math.random() * 10) - 10,
            tiltAngleIncrement: Math.random() * 0.07 + 0.05,
            tiltAngle: 0,
        });
    }

    let animationId;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let allDone = true;

        particles.forEach(p => {
            ctx.beginPath();
            ctx.lineWidth = p.r / 2;
            ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
            ctx.stroke();

            p.tiltAngle += p.tiltAngleIncrement;
            p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
            p.x += Math.sin(0);
            p.tilt = Math.sin(p.tiltAngle) * 15;

            if (p.y < canvas.height) allDone = false;
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
Traits: ${(charAnalysis.traits || []).join(', ')}

PERSONA: ${personaData.name || '{{user}}'}
Profession: ${personaData.profession || 'unspecified'}
Dynamic: ${dynamicType}
Traits: ${personaData.positiveTraits.join(', ')}
Flaws: ${personaData.negativeTraits.join(', ')}

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
        const html = await renderExtensionTemplateAsync(MODULE_NAME, 'settings');
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
        const html = await renderExtensionTemplateAsync(MODULE_NAME, 'quick');
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
        const html = await renderExtensionTemplateAsync(MODULE_NAME, 'popup');
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
            personaAvatarId: null, generatedGreeting: '',
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
                        state.generatedGreeting = await generateAlternateGreeting(state.charData, hook, state.narrationStyle);
                        dlg.find('#up_greeting_preview').val(state.generatedGreeting);
                    } catch (e) {
                        dlg.find('#up_greeting_preview').val('Failed to generate. You can write your own.');
                        toastr.error('Greeting generation failed');
                    }
                } else {
                    showSuccessScreen(dlg, finalName, state.personaAvatarId, state);
                }
            } catch (e) { toastr.error('Failed: ' + e.message); }
            finally { setButtonLoading($(this), false); }
        });

        // Step 9 handlers (Greeting)
        dlg.find('#up_back_to_persona').on('click', () => { currentStep = 8; updateStepDisplay(); });

        dlg.find('#up_regen_greeting').on('click', async function () {
            const hook = getFinalHook();
            if (!hook) { toastr.warning('No hook available'); return; }
            setButtonLoading($(this), true);
            try {
                state.generatedGreeting = await generateAlternateGreeting(state.charData, hook, state.narrationStyle);
                dlg.find('#up_greeting_preview').val(state.generatedGreeting);
                toastr.success('Regenerated!');
            } catch (e) { toastr.error('Failed'); }
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

// ==================== QUICK MENU ====================

function showQuickMenu(btn) {
    console.log('[Ultimate Persona] Opening quick menu...');
    
    // Remove existing menu
    $('.up-quick-menu').remove();

    const recentHistory = getSettings().history.slice(0, 3);

    let recentHtml = '';
    if (recentHistory.length > 0) {
        recentHtml = `
            <div class="up-quick-menu-header">Recent</div>
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
            <div class="up-quick-menu-item" id="up_quick_new">
                <i class="fa-solid fa-plus"></i>
                <span>New Persona (from Character)</span>
            </div>
            <div class="up-quick-menu-item" id="up_quick_standalone">
                <i class="fa-solid fa-bolt"></i>
                <span>Quick Standalone Persona</span>
            </div>
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
