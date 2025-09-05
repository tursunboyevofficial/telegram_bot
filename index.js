import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";

dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.SESSION);
const myId = Number(process.env.MY_TELEGRAM_ID);
const bot = new Telegraf(process.env.BOT_TOKEN);

function buildHeader(from) {
  return `📩 Yangi xabar:\n\n👤 Foydalanuvchi: ${from?.firstName || ""} ${from?.lastName || ""} (@${from?.username || "yo'q"})\nID: ${from?.id?.toString() || "yo'q"}\n\n`;
}

async function sendLongMessage(tg, chatId, text) {
  const maxLength = 4096;
  for (let i = 0; i < text.length; i += maxLength) {
    await tg.sendMessage(chatId, text.slice(i, i + maxLength));
  }
}

async function sendMessageNormally(client, msg, header) {
  const tg = bot.telegram;

  if (msg.message) {
    const fullText = header + `📄 Matn:\n${msg.message}`;
    return sendLongMessage(tg, myId, fullText);
  }

  if (msg.media) {
    try {
      const buffer = await client.downloadMedia(msg.media);
      const mime = msg.media?.document?.mimeType || "";

      if (msg.media.photo) {
        return tg.sendPhoto(myId, { source: buffer }, { caption: header + "📸 Foto yubordi" });
      }
      if (mime.startsWith("video/")) {
        return tg.sendVideo(myId, { source: buffer }, { caption: header + "🎬 Video yubordi" });
      }
      if (mime.startsWith("audio/")) {
        return tg.sendAudio(myId, { source: buffer }, { caption: header + "🎵 Audio yubordi" });
      }
      if (mime === "image/webp") {
        await tg.sendSticker(myId, { source: buffer });
        return tg.sendMessage(myId, header + "⭐ Sticker yubordi");
      }
      if (msg.media.document) {
        const fileName = msg.media.document.attributes?.find(a => a.fileName)?.fileName || "fayl.unknown";
        return tg.sendDocument(myId, { source: buffer, filename: fileName }, { caption: header + `📂 Fayl: ${fileName}` });
      }
    } catch (err) {
      console.error("❌ Media yuborishda xato:", err.message);
      return tg.sendMessage(myId, header + "⚠ Media yuborib bo‘lmadi");
    }
  }

  return tg.sendMessage(myId, header + "❔ Boshqa turdagi xabar");
}

async function main() {
  console.log("🤖 Userbot ishga tushmoqda...");

  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.start();
  console.log("✅ Userbot ishga tushdi!");

  client.addEventHandler(
    async (event) => {
      const msg = event.message;
      if (!msg || msg.out) return;
      if (msg.senderId?.toString() === myId.toString() || msg.fwdFrom || msg.viaBot) return;
      const header = buildHeader(msg.sender);
      try {
        await sendMessageNormally(client, msg, header);
      } catch (err) {
        console.error("❌ Xabarni yuborishda xato:", err.message);
      }
    },
    new NewMessage({ incoming: true })
  );
}

main().catch(console.error);
bot.launch().then(() => console.log("🤖 Bot ishga tushdi..."));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
