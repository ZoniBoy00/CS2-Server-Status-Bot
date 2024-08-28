const fs = require('fs');
const path = require('path');

// Load language based on environment variable
const LANG = process.env.DEFAULT_LANG || 'en';
const languageFilePath = path.resolve(__dirname, `../locales/${LANG}.json`);

const loadLanguage = () => {
    try {
        const languageData = fs.readFileSync(languageFilePath);
        return JSON.parse(languageData);
    } catch (error) {
        console.error(`Error loading language file: ${error.message}`);
        return {}; // Return an empty object if there's an error
    }
};

const translate = (key) => {
    const language = loadLanguage();
    const keys = key.split('.');
    let result = language;

    for (const k of keys) {
        result = result[k];
        if (result === undefined) break;
    }

    return result || key; // Return the key if no translation found
};

module.exports = {
    translate
};
