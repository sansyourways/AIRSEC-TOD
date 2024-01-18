require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const creatorUserId = parseInt(process.env.CREATOR_USER_ID);

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

async function deleteMessage(ctx) {
    if (deleteMessages) {
        const chatId = ctx.message.chat.id;
        const messageId = ctx.message.message_id;

        try {
            const chatMember = await ctx.telegram.getChatMember(chatId, ctx.botInfo.id);
            if (chatMember && (chatMember.status === 'administrator' || chatMember.status === 'member')) {
                setTimeout(() => {
                    ctx.telegram.deleteMessage(chatId, messageId).catch((error) => {
                        console.error(`Error deleting message: ${error.description}`);
                    });
                }, 300000); // 5 minutes in milliseconds
            } else {
                console.error('Bot is not a member of the chat. Unable to delete messages.');
            }
        } catch (error) {
            console.error(`Error checking bot membership: ${error.description}`);
        }
    }
}

// Function to generate inline keyboard markup for bot status toggle
function getToggleBotStatusMarkup() {
    return Markup.inlineKeyboard([
        Markup.button.callback(deleteMessages ? 'Disable Deletion' : 'Enable Deletion', 'toggle_delete_status'),
    ]);
}

// Function to generate inline keyboard markup for bot configuration
function getBotConfigMarkup() {
    return Markup.inlineKeyboard([
        [Markup.button.callback(botEnabled ? 'Disable Bot' : 'Enable Bot', 'toggle_bot_status')],
        [Markup.button.callback(deleteMessages ? 'Disable Deletion' : 'Enable Deletion', 'toggle_delete_status')],
        [Markup.button.callback('Back to Main', 'back_to_main')],
    ]);
}

// New function to create buttons
const createButton = (text, callback) => ({
    text,
    callback_data: callback,
});

const getToggleConfigMarkup = () => {
    return Markup.inlineKeyboard([
        [createButton('Bot Configuration', 'bot_config')],
        [createButton('Toggle Delete', 'toggle_delete')],
    ]);
};

// Modify the config command
bot.command('config', (ctx) => {
    // Check if the user is the creator
    if (ctx.from.id === creatorUserId) {
        const configMarkup = getToggleConfigMarkup();
        ctx.reply('Choose a configuration option:', configMarkup);
    } else {
        ctx.reply('You are not authorized to access the configuration.');
    }
});

bot.command('toggledelete', (ctx) => {
    ctx.reply('Please use /config to access the configuration options.');
});

bot.command('togglebot', (ctx) => {
    ctx.reply('Please use /config to access the configuration options.');
});

bot.start((ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.');
        return;
    }
    ctx.reply(`Welcome to Truth or Dare! Send /truth or /dare to get started.\n${creatorNotice}`);
});

bot.help((ctx) => {
    const helpMessage =
        `Available Commands:\n` +
        `/truth - Get a random Truth question\n` +
        `/dare - Get a random Dare question\n` +
        `/remainingtruths - Check remaining available Truth questions\n` +
        `/remainingdares - Check remaining available Dare questions\n` +
        `/random - Randomly choose between Truth and Dare\n` +
        `/config - Configure Bot Settings\n` +
        `/help - Show this help message\n${creatorNotice}`;

    ctx.reply(helpMessage);
});

bot.command('truth', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.');
        return;
    }

    const remainingTruths = getAvailableQuestionsCount('truth');

    if (remainingTruths > 0) {
        const randomTruth = getRandomQuestion('truth');
        ctx.reply(`Truth: ${randomTruth}`, getToggleBotStatusMarkup());
        deleteMessage(ctx);
    } else {
        ctx.reply('No more available Truth questions. Ask for more later!', getToggleBotStatusMarkup());
    }
});

bot.command('dare', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.');
        return;
    }

    const remainingDares = getAvailableQuestionsCount('dare');

    if (remainingDares > 0) {
        const randomDare = getRandomQuestion('dare');
        ctx.reply(`Dare: ${randomDare}`, getToggleBotStatusMarkup());
        deleteMessage(ctx);
    } else {
        ctx.reply('No more available Dare questions. Ask for more later!', getToggleBotStatusMarkup());
    }
});

bot.command('remainingtruths', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.');
        return;
    }

    const remainingTruths = getAvailableQuestionsCount('truth');
    ctx.reply(`Remaining Truth questions: ${remainingTruths}`, getToggleBotStatusMarkup());
    deleteMessage(ctx);
});

bot.command('remainingdares', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.');
        return;
    }

    const remainingDares = getAvailableQuestionsCount('dare');
    ctx.reply(`Remaining Dare questions: ${remainingDares}`, getToggleBotStatusMarkup());
    deleteMessage(ctx);
});

bot.command('random', (ctx) => {
    if (!botEnabled) {
        ctx.reply('Bot is currently disabled. Use the buttons below to enable it.');
        return;
    }

    const randomChoice = Math.random() < 0.5 ? 'truth' : 'dare';
    const remainingCount = getAvailableQuestionsCount(randomChoice);

    if (remainingCount > 0) {
        const randomQuestion = getRandomQuestion(randomChoice);
        ctx.reply(`${randomChoice.charAt(0).toUpperCase() + randomChoice.slice(1)}: ${randomQuestion}`, getToggleBotStatusMarkup());
        deleteMessage(ctx);
    } else {
        ctx.reply(`No  more available ${randomChoice} questions. Ask for more later!`, getToggleBotStatusMarkup());
    }
});

bot.action('enable_bot', (ctx) => {
    botEnabled = true;
    ctx.editMessageText(`Bot is now enabled\n${creatorNotice}`, getBotConfigMarkup());
});

bot.action('disable_bot', (ctx) => {
    botEnabled = false;
    ctx.editMessageText(`Bot is now disabled\n${creatorNotice}`, getBotConfigMarkup());
});

bot.action('enable_delete', (ctx) => {
    deleteMessages = true;
    ctx.editMessageText(`Message deletion is now enabled\n${creatorNotice}`, getBotConfigMarkup());
});

bot.action('disable_delete', (ctx) => {
    deleteMessages = false;
    ctx.editMessageText(`Message deletion is now disabled\n${creatorNotice}`, getBotConfigMarkup());
});

// Action for configuring bot settings
bot.action('toggle_bot_status', (ctx) => {
    const botStatus = botEnabled ? 'enabled' : 'disabled';
    const deleteStatus = deleteMessages ? 'enabled' : 'disabled';
    ctx.editMessageText(`Bot is now ${botStatus} and message deletion is now ${deleteStatus}\n${creatorNotice}`, getBotConfigMarkup());
});

bot.action('toggle_delete_status', (ctx) => {
    const botStatus = botEnabled ? 'enabled' : 'disabled';
    const deleteStatus = deleteMessages ? 'enabled' : 'disabled';
    ctx.editMessageText(`Bot is now ${botStatus} and message deletion is now ${deleteStatus}\n${creatorNotice}`, getBotConfigMarkup());
});

bot.action('bot_config', (ctx) => {
    const botStatus = botEnabled ? 'enabled' : 'disabled';
    const deleteStatus = deleteMessages ? 'enabled' : 'disabled';
    ctx.editMessageText(`Bot is currently ${botStatus} and message deletion is currently ${deleteStatus}\n${creatorNotice}`, getBotConfigMarkup());
});

bot.action('back_to_main', (ctx) => {
    const configMarkup = getToggleConfigMarkup();
    ctx.editMessageText('Choose a configuration option:', configMarkup);
});

bot.launch();