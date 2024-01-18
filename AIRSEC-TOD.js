require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const questions = JSON.parse(fs.readFileSync('questions.json', 'utf-8'));
const creatorNotice = 'Created by @sansyourways ©';

// Track asked questions
const askedQuestions = {
    truth: [],
    dare: [],
};

// Flags
let deleteMessages = true;
let botEnabled = true;

function getRandomQuestion(type) {
    const questionList = questions[`${type}Questions`];
    const unusedQuestions = questionList.filter((q) => !askedQuestions[type].includes(q));

    if (unusedQuestions.length === 0) {
        // Reset asked questions if all questions have been used
        askedQuestions[type] = [];
        return null; // Signal that there are no available questions
    }

    const randomQuestion = unusedQuestions[Math.floor(Math.random() * unusedQuestions.length)];
    askedQuestions[type].push(randomQuestion);

    return randomQuestion;
}

function getAvailableQuestionsCount(type) {
    const totalQuestions = questions[`${type}Questions`].length;
    const remainingQuestions = totalQuestions - askedQuestions[type].length;
    return remainingQuestions;
}

function deleteMessage(ctx) {
    if (deleteMessages) {
        const chatId = ctx.message.chat.id;
        const messageId = ctx.message.message_id;

        setTimeout(() => {
            ctx.telegram.deleteMessage(chatId, messageId).catch((error) => {
                console.error(`Error deleting message: ${error.description}`);
            });
        }, 300000); // 5 minutes in milliseconds
    }
}

// Inline keyboard markup to toggle settings
const toggleSettingsMarkup = Markup.inlineKeyboard([
    Markup.callbackButton(`Message Deletion: ${deleteMessages ? 'Enabled' : 'Disabled'}`, 'toggle_delete'),
    Markup.callbackButton(`Bot Status: ${botEnabled ? 'Enabled' : 'Disabled'}`, 'toggle_bot'),
]).extra();

bot.command('toggledelete', (ctx) => {
    deleteMessages = !deleteMessages;
    const status = deleteMessages ? 'enabled' : 'disabled';
    ctx.reply(`Message deletion is now ${status}\n${creatorNotice}`, toggleSettingsMarkup);
});

bot.command('togglebot', (ctx) => {
    botEnabled = !botEnabled;
    const status = botEnabled ? 'enabled' : 'disabled';
    ctx.reply(`Bot is now ${status}\n${creatorNotice}`, toggleSettingsMarkup);
});

// Inline keyboard markup to toggle bot status
const toggleBotMarkup = Markup.inlineKeyboard([
    Markup.callbackButton('Enable Bot', 'enable_bot'),
    Markup.callbackButton('Disable Bot', 'disable_bot'),
]).extra();

bot.command('togglebot', (ctx) => {
    botEnabled = !botEnabled;
    const status = botEnabled ? 'enabled' : 'disabled';
    ctx.reply(`Bot is now ${status}\n${creatorNotice}`, toggleSettingsMarkup);
});

bot.start((ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.\n${creatorNotice}', toggleBotMarkup);
        return;
    }
    ctx.reply(`Welcome to Truth or Dare! Send /truth or /dare to get started.\n${creatorNotice}`, toggleSettingsMarkup);
});

bot.help((ctx) => {
    ctx.reply(
        `Available Commands:\n` +
        `/truth - Get a random Truth question\n` +
        `/dare - Get a random Dare question\n` +
        `/remainingtruths - Check remaining available Truth questions\n` +
        `/remainingdares - Check remaining available Dare questions\n` +
        `/random - Randomly choose between Truth and Dare\n` +
        `/toggledelete - Toggle automatic message deletion\n` +
        `/togglebot - Toggle bot on/off\n` +
        `/help - Show this help message\n${creatorNotice}`
    );
});

bot.command('truth', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.\n${creatorNotice}', toggleBotMarkup);
        return;
    }

    const remainingTruths = getAvailableQuestionsCount('truth');
    
    if (remainingTruths > 0) {
        const randomTruth = getRandomQuestion('truth');
        ctx.reply(`Truth: ${randomTruth}\n${creatorNotice}`, toggleSettingsMarkup);
        deleteMessage(ctx);
    } else {
        ctx.reply('No more available Truth questions. Ask for more later!\n${creatorNotice}', toggleSettingsMarkup);
    }
});

bot.command('dare', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below  to enable it.\n${creatorNotice}', toggleBotMarkup);
        return;
    }

    const remainingDares = getAvailableQuestionsCount('dare');
    
    if (remainingDares > 0) {
        const randomDare = getRandomQuestion('dare');
        ctx.reply(`Dare: ${randomDare}\n${creatorNotice}`, toggleSettingsMarkup);
        deleteMessage(ctx);
    } else {
        ctx.reply('No more available Dare questions. Ask for more later!\n${creatorNotice}', toggleSettingsMarkup);
    }
});

bot.command('remainingtruths', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.\n${creatorNotice}', toggleBotMarkup);
        return;
    }

    const remainingTruths = getAvailableQuestionsCount('truth');
    ctx.reply(`Remaining Truth questions: ${remainingTruths}\n${creatorNotice}`, toggleSettingsMarkup);
    deleteMessage(ctx);
});

bot.command('remainingdares', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.\n${creatorNotice}', toggleBotMarkup);
        return;
    }

    const remainingDares = getAvailableQuestionsCount('dare');
    ctx.reply(`Remaining Dare questions: ${remainingDares}\n${creatorNotice}`, toggleSettingsMarkup);
    deleteMessage(ctx);
});

bot.command('random', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.\n${creatorNotice}', toggleBotMarkup);
        return;
    }

    const randomChoice = Math.random() < 0.5 ? 'truth' : 'dare';
    const remainingCount = getAvailableQuestionsCount(randomChoice);

    if (remainingCount > 0) {
        const randomQuestion = getRandomQuestion(randomChoice);
        ctx.reply(`${randomChoice.charAt(0).toUpperCase() + randomChoice.slice(1)}: ${randomQuestion}\n${creatorNotice}`, toggleSettingsMarkup);
        deleteMessage(ctx);
    } else {
        ctx.reply(`No more available ${randomChoice} questions. Ask for more later!\n${creatorNotice}`, toggleSettingsMarkup);
    }
});

// Handle inline keyboard callbacks
bot.action('enable_bot', (ctx) => {
    botEnabled = true;
    ctx.editMessageText('Bot is now enabled\n${creatorNotice}', toggleSettingsMarkup);
});

bot.action('disable_bot', (ctx) => {
    botEnabled = false;
    ctx.editMessageText('Bot is now disabled\n${creatorNotice}', toggleSettingsMarkup);
});

// Handle inline keyboard callbacks for toggling settings
bot.action('toggle_delete', (ctx) => {
    deleteMessages = !deleteMessages;
    const status = deleteMessages ? 'enabled' : 'disabled';
    ctx.editMessageText(`Message deletion is now ${status}\n${creatorNotice}`, toggleSettingsMarkup);
});

bot.launch();