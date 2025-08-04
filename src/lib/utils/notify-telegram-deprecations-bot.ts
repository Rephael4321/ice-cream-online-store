export async function notifyTelegramDeprecations(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN_DEPRECATIONS;
  const chatId = process.env.TELEGRAM_CHAT_ID_DEPRECATIONS;

  if (!token || !chatId) return;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
      }),
    });
  } catch (err) {
    console.error("❌ Failed to send Telegram message:", err);
  }
}
