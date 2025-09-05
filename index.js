// index.js
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.SESSION);
const myId = Number(process.env.MY_TELEGRAM_ID); // Shaxsiy akkaunt ID

// BotFather bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// Userbot
async function main() {
  console.log("🤖 Userbot ishga tushmoqda...");

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start();
  console.log("✅ Userbot ishga tushdi!");

  client.addEventHandler(
    async (event) => {
      const msg = event.message;
      if (!msg || msg.out) return; // o‘z xabarlaringizni o'tkazib yuboradi

      const from = msg.sender;

      let header = `📩 Yangi xabar:\n\n👤 Foydalanuvchi: ${
        from?.firstName || ""
      } ${from?.lastName || ""} (@${from?.username || "yo'q"})\nID: ${
        from?.id?.toString() || "yo'q"
      }\n\n`;

      try {
        // Matn
        if (msg.message) {
          await bot.telegram.sendMessage(myId, header + `📄 Matn:\n${msg.message}`);
        }
        // Foto
        else if (msg.media?.photo) {
          const buffer = await client.downloadMedia(msg.media);
          await bot.telegram.sendPhoto(myId, { source: buffer }, { caption: header + "📸 Foto yubordi" });
        }
        // Video
        else if (msg.media?.document && msg.media.document.mimeType.startsWith("video/")) {
          const buffer = await client.downloadMedia(msg.media);
          await bot.telegram.sendVideo(myId, { source: buffer }, { caption: header + "🎬 Video yubordi" });
        }
        // Audio
        else if (msg.media?.document && msg.media.document.mimeType.startsWith("audio/")) {
          const buffer = await client.downloadMedia(msg.media);
          await bot.telegram.sendAudio(myId, { source: buffer }, { caption: header + "🎵 Audio yubordi" });
        }
        // Hujjat (document)
        else if (msg.media?.document) {
          const buffer = await client.downloadMedia(msg.media);
          const fileName =
            msg.media.document.attributes?.find((a) => a.fileName)?.fileName || "fayl.unknown";
          await bot.telegram.sendDocument(myId, { source: buffer, filename: fileName }, { caption: header + `📂 Fayl: ${fileName}` });
        }
        // Sticker
        else if (msg.media?.document && msg.media.document.mimeType === "image/webp") {
          const buffer = await client.downloadMedia(msg.media);
          await bot.telegram.sendSticker(myId, { source: buffer });
          await bot.telegram.sendMessage(myId, header + "⭐ Sticker yubordi");
        }
        // Boshqa turdagi media
        else {
          await bot.telegram.sendMessage(myId, header + "❔ Boshqa turdagi xabar");
        }
      } catch (err) {
        console.error("❌ Bot orqali yuborishda xato:", err.message);
      }
    },
    new NewMessage({ incoming: true })
  );
}

// Userbot ishga tushirish
main().catch(console.error);

// Botni ishga tushirish (shaxsiy akkauntga forward qilish uchun)
bot.launch().then(() => console.log("🤖 Bot ishga tushdi..."));

// Ctrl+C bosilganda to‘xtatish
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
