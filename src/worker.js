import nacl from 'tweetnacl'
const Buffer = require('buffer/').Buffer

export default {
    async fetch(request, env) {
        
        const url = new URL(request.url);
        const path = url.pathname;

        if (path === '/tg-bot') {
            const TelegramApi = "https://api.telegram.org/bot";
            const BotToken = env.TelegramBotToken;

            // 解析 Telegram 推送的 Webhook 数据
            const update = await request.json();

            // 提取消息内容
            const chatId = update.message.chat.id;
            const messageThreadId = update.message.message_thread_id;
            const firstName = update.message.from?.first_name || '';
            const lastName = update.message.from?.last_name || '';
            const username = update.message.from?.username || "Unknown";
            const text = update.message.text;

            // 根据用户消息生成响应内容
            // let responseText;
            // if (text === "/start") {
            //     responseText = "欢迎使用我的机器人！试试发送其他消息吧。";
            // } else {
            //     responseText = `${text}`;
            // }
            let responseText = `${text}`;
            
            // 发送回复消息
            await fetch(`${TelegramApi}${BotToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_thread_id: messageThreadId,
                    text: `${firstName} ${lastName}\n${username}\n---------------\n${responseText}`,
                }),
            });

            return new Response("ok"); // 响应 Telegram 的请求
        } else if (path === '/dc-bot') {
            if (request.method === 'POST') {
                const publicKey = env.DiscordPublicKey;
                const applicationId = env.DiscordApplicationId;
                const tokent = env.DiscordToken;

                const req = await request.json()
                const headers = request.headers
                const signature = headers.get('X-Signature-Ed25519')
                const timestamp = headers.get('X-Signature-Timestamp')
                
                if (!(signature && timestamp)) {
                    return new Response(JSON.stringify(req), { status: 401 })
                }

                const isVerified = nacl.sign.detached.verify(
                    Buffer(timestamp + JSON.stringify(req)),
                    Buffer(signature, 'hex'),
                    Buffer(publicKey, 'hex'),
                )

                if (!isVerified) {
                    return new Response(JSON.stringify(req), { status: 401 })
                } else {

                    const interaction = req;

                    if (interaction.type === 1) {
                        return new Response(JSON.stringify({type: 1}), {
                            headers: { "Content-Type": "application/json" },
                        });
                    } else if (interaction.type === 2) {
                        if (interaction.data.name == 'say') {
                            const text = interaction.data.options[0].value;
                            return new Response(JSON.stringify({
                                    type: 4,
                                    data: { content: `${text}` }
                                }), {
                                    headers: { "Content-Type": "application/json" }
                                });
                        }
                    }

                    return new Response(JSON.stringify({
                            type: 4,
                            data: { content: "Unknown command or missing parameters." }
                        }), {
                            headers: { "Content-Type": "application/json" }
                        });
                }

            }
        
        }
        return new Response("Discord 和 Telegram 消息同步程序");
    },
};