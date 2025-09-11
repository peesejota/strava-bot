const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
require('dotenv').config();

// Inicializar el bot con tu token
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Escuchar el comando /update
bot.onText(/\/update/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "⏳ Lanzando actualización en GitHub...");

  try {
    // Llamada a la API de GitHub para lanzar el workflow
    await axios.post(
      `https://api.github.com/repos/${process.env.GH_USER}/${process.env.GH_REPO}/actions/workflows/update.yml/dispatches`,
      { ref: "main" }, // rama desde donde se ejecuta el workflow
      {
        headers: {
          Authorization: `Bearer ${process.env.GH_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    bot.sendMessage(chatId, "✅ Workflow lanzado con éxito en GitHub");
  } catch (err) {
    console.error(err.response?.data || err.message);
    bot.sendMessage(chatId, "❌ Error al lanzar el workflow en GitHub");
  }
});
