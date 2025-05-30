// index.js
import 'dotenv/config';
import { spawn } from 'child_process';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType
} from '@discordjs/voice';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});
process.on('unhandledRejection', console.error);
client.on('error', console.error);

client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot) return;
  const prefix = '!play ';
  if (!msg.content.toLowerCase().startsWith(prefix)) return;

  // 1) Забираем «сырую» ссылку
  const raw = msg.content.slice(prefix.length).trim().split(/\s+/)[0];
  if (!raw) return msg.reply('Укажи ссылку: `!play https://youtu.be/...`');

  // 2) Чистим от < и > и пробелов
  const url = raw.replace(/^<|>$/g, '').trim();
  console.log('→ Raw URL:', url);

  // 3) Валидация URL
  try {
    new URL(url);
  } catch {
    return msg.reply('Невалидный URL. Проверь опечатки.');
  }

  // 4) Обрезаем всё после ?v=ID
  const match = url.match(/[?&]v=([^&]+)/);
  if (!match) {
    return msg.reply('Нужно видео с параметром `v=` (YouTube URL).');
  }
  const videoId = match[1];
  const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
  console.log('→ Clean URL:', cleanUrl);

  // 5) Спавним yt-dlp с вашим cookies.txt
  let ytdlp;
  try {
    ytdlp = spawn('yt-dlp', [
      '-f', 'bestaudio',
      '-o', '-',
      '--quiet',
      '--cookies', 'cookies.txt',   // <— используем файл куки
      cleanUrl
    ], {
      stdio: ['ignore', 'pipe', 'inherit']
    });
  } catch (err) {
    console.error('Ошибка запуска yt-dlp:', err);
    return msg.reply('Проблема с запуском yt-dlp. Убедись, что он установлен.');
  }

  const stream = ytdlp.stdout;
  if (!stream) {
    return msg.reply('Не удалось получить аудиопоток от yt-dlp.');
  }

  // 6) Подключаемся к голосовому каналу
  const channel = msg.member.voice.channel;
  if (!channel) {
    return msg.reply('Зайди в голосовой канал, чтобы я мог проиграть музыку.');
  }
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: msg.guild.id,
    adapterCreator: msg.guild.voiceAdapterCreator
  });

  // 7) Создаём ресурс и плеер
  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
    inlineVolume: true
  });

  let destroyed = false;
  const destroyConn = () => {
    if (!destroyed) {
      destroyed = true;
      connection.destroy();
    }
  };

  const player = createAudioPlayer()
    .once(AudioPlayerStatus.Idle, destroyConn)
    .once('error', err => {
      console.error('Audio player error:', err);
      msg.reply('❌ Ошибка при воспроизведении трека.');
      destroyConn();
    });

  connection.subscribe(player);
  player.play(resource);

  return msg.reply(`▶️ Играю видео: ${videoId}`);
});

client.login(process.env.DISCORD_TOKEN);
