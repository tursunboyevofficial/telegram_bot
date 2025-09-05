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

function buildHeader(msg) {
  const from = msg.sender || msg.chat;
  const userId = msg.fromId?.userId?.value || from?.id || "yo'q";
  return ` Yangi xabar:
 Foydalanuvchi: ${from?.firstName || ""} ${from?.lastName || ""} (@${from?.username || "yo'q"})
ID: ${userId}

`;
}

async function forwardMedia(msg, client, header) {
  try {
    if (msg.media) {
      const buffer = await client.downloadMedia(msg.media);

      if (msg.media.photo) {
        await bot.telegram.sendPhoto(myId, { source: buffer }, { caption: header + " Foto" });
      }
      else if (msg.media.document?.mimeType?.startsWith("video/")) {
        await bot.telegram.sendVideo(myId, { source: buffer }, { caption: header + " Video" });
      }
      else if (msg.media.document?.mimeType?.startsWith("audio/")) {
        await bot.telegram.sendAudio(myId, { source: buffer }, { caption: header + " Audio" });
      }
      else if (msg.media.document?.mimeType === "image/webp") {
        await bot.telegram.sendSticker(myId, { source: buffer });
        await bot.telegram.sendMessage(myId, header + " Sticker");
      }
      else if (msg.media.document) {
        const fileName = msg.media.document.attributes?.find(a => a.fileName)?.fileName || "file.unknown";
        await bot.telegram.sendDocument(myId, { source: buffer, filename: fileName }, { caption: header + ` Fayl: ${fileName}` });
      }
      
      else if (msg.media.geo) {
        await bot.telegram.sendLocation(myId, msg.media.geo.lat, msg.media.geo.long);
        await bot.telegram.sendMessage(myId, header + " Joylashuv");
      }
      else {
        await bot.telegram.sendMessage(myId, header + "⚠ Noma'lum media turi");
      }
    } else {
      await bot.telegram.sendMessage(myId, header + "⚠ Media topilmadi");
    }
  } catch (err) {
    console.error(" Media yuborishda xato:", err.message);
    await bot.telegram.sendMessage(myId, header + " Media yuborib bo‘lmadi");
  }
}

async function forwardMessage(msg, client) {
  const header = buildHeader(msg);
  if (msg.message) {
    await bot.telegram.sendMessage(myId, header + msg.message);
  } else if (msg.media) {
    forwardMedia(msg, client, header).catch(console.error);
  } else {
    await bot.telegram.sendMessage(myId, header + " Boshqa turdagi xabar");
  }
}

async function startUserbot() {
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.start();
  console.log(" Userbot ishga tushdi!");

  client.addEventHandler(async (event) => {
    const msg = event.message;
    try {
      console.log(" Yangi xabar keldi:", msg);
      await forwardMessage(msg, client);
    } catch (err) {
      console.error(" Xabarni yuborishda xato:", err.message);
    }
  }, new NewMessage({ incoming: true }));
}

startUserbot().then(() => console.log(" Userbot tayyor"));
bot.launch().then(() => console.log(" Bot ishga tushdi"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
