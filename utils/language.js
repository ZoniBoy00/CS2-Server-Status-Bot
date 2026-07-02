const fs = require('fs');
const path = require('path');

// Load language once at startup
const LANG = process.env.DEFAULT_LANG || 'en';
const languageFilePath = path.resolve(__dirname, `../locales/${LANG}.json`);

let _language = null;

const loadLanguage = () => {
    if (_language) return _language;
    try {
        _language = JSON.parse(fs.readFileSync(languageFilePath, 'utf-8'));
    } catch (error) {
        console.error(`Error loading language file (${LANG}): ${error.message}`);
        _language = {};
    }
    return _language;
};

const translate = (key) => {
    const language = loadLanguage();
    const keys = key.split('.');
    let result = language;

    for (const k of keys) {
        result = result[k];
        if (result === undefined) break;
    }

    return result || key;
};

module.exports = { translate };
