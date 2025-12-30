# Ultimate-Persona
Ultimate Persona is an all-in-one persona generator and plot hook creator for SillyTavern. It uses pre-existing character cards to shape a character that matches your RP, and is perfect for sessions where you want to be lazy and use impersonate. 

# ✨ Ultimate Persona Generator

> Create rich, detailed personas for SillyTavern with AI-powered assistance

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![SillyTavern](https://img.shields.io/badge/SillyTavern-Compatible-green)

## 🎯 Overview

Ultimate Persona Generator is a comprehensive extension for SillyTavern that helps you create detailed, consistent personas through an intuitive wizard interface. Whether you're building a persona based on an existing character card or creating a standalone character from scratch, this extension guides you through every step.

---

## ✨ Features

### 🧙 Full Character-Based Wizard (9 Steps)
1. **Character Selection** - Carousel browser with search and random selection
2. **Identity** - Name, gender, vibe presets with AI enhancement
3. **Physical Appearance** - Height, body type, hair, eyes, clothing, weapons
4. **Personality Traits** - AI-generated suggestions + offline database + custom input
5. **Background Story** - Upbringing, life events, motivations, secrets
6. **Relationship Dynamic** - Complement or Friction with the character
7. **Summary & Plot Hooks** - Canon, AU, or Romantic scenario generation
8. **Persona Review** - Edit before creating
9. **Alternate Greeting** - Generate and save to character card

### ⚡ Quick Standalone Mode
- 4-step streamlined wizard
- No character card required
- Perfect for original personas

### 🎨 Smart Features
- **Combo Inputs**: Choose from dropdowns OR type custom values
- **AI Enhancement**: Magic wand buttons to expand your ideas
- **Trait Management**: Click to select, suggestions refresh dynamically
- **Template System**: Save and quick-load favorite trait combinations
- **Creation History**: Track all personas you've created

### 🖼️ AI Image Prompt Generator
- **Booru-style tags** for Illustrious, Pony, and similar models
- **Natural language prompts** for general Stable Diffusion
- One-click copy to clipboard
- Parses physical details (scars, tattoos, etc.) into proper tags

### ⚙️ Settings & Customization
- Customize AI prompts
- Adjust trait/hook generation counts
- Toggle animations and confetti
- Manage templates and history
- **Bulk persona deletion**

---

## 📦 Installation

### Method 1: Manual Install
1. Download this repository as a ZIP
2. Extract the folder
3. Place it in: `SillyTavern/public/scripts/extensions/third-party/`
4. Restart SillyTavern
5. Look for the ✨ wand button near the persona selector

### Method 2: Git Clone
```bash
cd SillyTavern/public/scripts/extensions/third-party/
git clone https://github.com/BobTheBinChicken/Ultimate-Persona
```

---

## 🎮 Usage

### Button Controls
| Action | Result |
|--------|--------|
| **Click** | Open full wizard |
| **Shift + Click** | Open settings |
| **Right-Click** | Quick menu |


### Quick Menu Options
- 📌 New Persona (from Character)
- ⚡ Quick Standalone Persona
- 🕐 Recent creations
- ⚙️ Settings

---

## 📊 Offline Data Included

The extension includes extensive offline databases for:

- **25** Character vibes/aesthetics
- **100+** Positive personality traits
- **80+** Negative traits/flaws
- **18** Upbringing types
- **18** Life-defining events
- **14** Core motivations
- **10** Character secrets
- **20** Alternate Universe types
- **12** Romantic scenario types
- **Settings**: Modern, Fantasy, Sci-Fi clothing & professions
- **Physical**: Heights, body types, hair colors/styles
- **Combat**: Weapons and fighting styles

---

## 🎨 Customization

### Custom AI Prompts
In Settings, you can customize the prompts used for:
- Persona generation
- Plot hook generation
- Greeting generation
- Text enhancement

### Templates
Save your favorite trait combinations as templates for quick reuse.

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

## 📜 Changelog

### v1.0.0
- Initial release
- Full 9-step wizard
- Quick standalone mode
- AI image prompt generator
- Settings panel with customization
- Template and history system
- Bulk persona management

## [1.1.0] - 2025-12-28

### 🚀 New Features
- **Standalone Greeting Wizard**: A new dedicated tool to generate alternate greetings for any character without needing to create a full persona first.
- **Persona Greeting Integration**: Seamlessly generate greetings tailored to your specific personas directly from the creation wizard.
- **Enhanced Premise Selection**: Added "Popular Presets" (e.g., *Enemies to Lovers*, *Coworkers*, *Slow Burn*) to quickly jumpstart your scenario generation.
- **Smart Enhancement Tools**:
    - **Quick Enhance**: One-click buttons to instantly add more description, dialogue, or persona references to your generated greetings.
    - **Tone Adjustment**: Easily shift the greeting's tone (e.g., *Romantic*, *Dark*, *Funny*).
- **Greeting Length Control**: New options to specify "Short", "Medium", or "Long" (5+ paragraphs) outputs for all greeting generators.

### ✨ Improvements
- **UI & Aesthetics**:
    - Redesigned "Success Screens" with a premium glassmorphism look, including radial glows and smoother animations.
    - Standardized the UI across all wizards for a consistent logic and feel.
- **Performance**:
    - Optimized the confetti celebration animation to reduce GPU usage.
    - Improved string replacement efficiency for faster generation times.

### 🐛 Bug Fixes
- **Generation Logic**:
    - Fixed an issue where selected tags (Location, Relationship) were sometimes ignored by the "Enhance with AI" feature.
    - Fixed a bug where "Popular Presets" were not correctly passed to the plot hook generator in some cases.
    - Standardized the generation logic for the Persona Creator to match the high quality of the Standalone Wizard.
- **Text Safety**:
    - Fixed "Over-Aggressive Replacement" to prevent common lowercase words from being accidentally replaced by character placeholders.
    - Improved name checking to prevent hardcoded names from leaking into templates.

---

## 📄 License

MIT License - Feel free to use, modify, and distribute.

---

## 💜 Credits

Created with love for the SillyTavern community (and myself).

Special thanks to:
- The SillyTavern team for the amazing platform
- The madlads who came up with AI

---

**Enjoy creating personas!** ✨

