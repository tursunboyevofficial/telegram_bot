// index.js
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Config
const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.SESSION);
const myId = Number(process.env.MY_TELEGRAM_ID); // faqat sizga forward qilinadi

// BotFather bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Global client (userbot)
let client;

// 🔹 Xabarlarni logga yozish
function logMessage(text) {
  const log = `[${new Date().toISOString()}] ${text}\n`;
  fs.appendFileSync("logs.txt", log);
}

// 🔹 Admin komandalarini boshqarish
function handleAdminCommands() {
  bot.command("status", async (ctx) => {
    if (ctx.from.id !== myId) return;
    const status = client ? "✅ Userbot ishlayapti" : "❌ Userbot ishlamayapti";
    await ctx.reply(`🤖 Bot ishlayapti\n${status}`);
  });

  bot.command("stop", async (ctx) => {
    if (ctx.from.id !== myId) return;
    await ctx.reply("🛑 Bot to‘xtatildi");
    logMessage("Bot admin tomonidan to‘xtatildi");
    process.exit(0);
  });
}

// 🔹 Userbotni ishga tushirish
async function main() {
  console.log("🤖 Userbot ishga tushmoqda...");

  client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start();
  console.log("✅ Userbot ishga tushdi!");
  logMessage("Userbot ishga tushdi");

  client.addEventHandler(
    async (event) => {
      const msg = event.message;
      if (!msg || msg.out) return; // o‘z xabaringizni o'tkazib yuboradi

      const from = msg.sender;

      // Header (foydalanuvchi haqida ma’lumot)
      const header = `📩 Yangi xabar:\n\n👤 Foydalanuvchi: ${
        from?.firstName || ""
      } ${from?.lastName || ""} (@${from?.username || "yo'q"})\nID: ${
        from?.id?.toString() || "yo'q"
      }`;

      try {
        // Header yuborish
        await bot.telegram.sendMessage(myId, header);

        // Asl xabarni forward qilish
        await bot.telegram.forwardMessage(myId, msg.peerId, msg.id);

        // Logga yozish
        logMessage(`Xabar forward qilindi: ${from?.id || "no-id"}`);
      } catch (err) {
        console.error("❌ Bot orqali forward qilishda xato:", err.message);
        logMessage(`Xatolik: ${err.message}`);
      }
    },
    new NewMessage({ incoming: true })
  );
}

// 🔹 Ishga tushirish
main().catch((err) => {
  console.error("❌ Userbot ishga tushmadi:", err.message);
  logMessage(`Userbot xatosi: ${err.message}`);
});

// 🔹 Botni ishga tushirish
handleAdminCommands();
bot.launch().then(() => {
  console.log("🤖 Bot ishga tushdi...");
  logMessage("Telegraf bot ishga tushdi");
});

// 🔹 Ctrl+C bosilganda to‘xtatish
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
