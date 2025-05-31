// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { Player, QueryType, QueueRepeatMode } from 'discord-player';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const player = new Player(client, {
  ytdlOptions: {
    // можно уточнить опции, но по умолчанию Discord Player сам
    // попытается использовать yt-dlp и cookies, если нужно
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
  },
  // опционально: можно настроить, как обрабатывать плейлисты, очередь и т.п.
  // extractors: [ new YtDlpExtractor() ]  // в новых версиях он идёт “из коробки”
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!play ')) return;

  // забираем аргумент после "!play "
  const query = msg.content.slice('!play '.length).trim();
  if (!query) return msg.reply('Укажи, что играть, например: `!play Never Gonna Give You Up`');

  // получаем очередь (создадим, если ещё нет)
  const queue = player.createQueue(msg.guild, {
    metadata: {
      channel: msg.channel,
      requestedBy: msg.author.username,
    },
    // указываем, что делать, если в очереди несколько треков
    leaveOnEnd: false,
    leaveOnEmpty: true,
    leaveOnStop: true,
    leaveOnEmptyCooldown: 300000, // 5 минут
  });

  try {
    if (!queue.connection) await queue.connect(msg.member.voice.channel);
  } catch {
    return msg.reply('Не смог подключиться к вашему голосовому каналу.');
  }

  // ищем трек (queryType можно “auto”, можно “video” для прямых ссылок)
  const searchResult = await player
    .search(query, {
      requestedBy: msg.author.username,
      searchEngine: QueryType.AUTO,
    })
    .catch(() => null);

  if (!searchResult || !searchResult.tracks.length)
    return msg.reply('Ничего не найдено по запросу.');

  // добавляем первый трек в очередь
  const track = searchResult.tracks[0];
  queue.play(track);

  // отправляем в чат сообщение о том, что трек поставлен
  msg.reply(`▶️ Добавлен в очередь: **${track.title}**`);
});

// Обрабатываем ошибки плеера
player.on('error', (queue, error) => {
  console.error(`При проигрывании в ${queue.guild.name} произошла ошибка: ${error.message}`);
  queue.metadata.channel.send('❌ Что-то пошло не так при воспроизведении.');
});

player.on('connectionError', (queue, error) => {
  console.error(`Не удалось подключиться к каналу в ${queue.guild.name}: ${error.message}`);
  queue.metadata.channel.send('❌ Не удалось подключиться к голосовому каналу.');
});

// Пример: по событию завершения трека можно отправить сообщение
player.on('playerStart', (queue, track) => {
  queue.metadata.channel.send(`▶️ Сейчас играет: **${track.title}**`);
});

client.login(process.env.DISCORD_TOKEN);
