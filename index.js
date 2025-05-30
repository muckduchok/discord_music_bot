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

  const raw = msg.content.slice(prefix.length).trim().split(/\s+/)[0];
  if (!raw) return msg.reply('Укажи ссылку: `!play https://www.youtube.com/watch?v=...`');

  // чистка <...> и пробелов
  const url = raw.replace(/^<|>$/g, '').trim();
  console.log('→ Playing URL:', url);

  // базовая валидация
  try {
    new URL(url);
  } catch {
    return msg.reply('Невалидный URL. Проверь опечатки.');
  }

  // проверка параметра v=...
  const match = url.match(/[?&]v=([^&]+)/);
  if (!match) {
    return msg.reply('Нужно именно видео-URL (с параметром v=...).');
  }
  const cleanUrl = `https://www.youtube.com/watch?v=${match[1]}`;

  // спавним yt-dlp
  let ytdlp;
  try {
    ytdlp = spawn('yt-dlp', [
      '--cookies-from-browser', 'chrome',  // или 'firefox'
      '-f', 'bestaudio',
      '-o', '-',
      '--quiet',
      cleanUrl
    ], { stdio: ['ignore','pipe','inherit'] });
  } catch (err) {
    console.error('Не удалось запустить yt-dlp:', err);
    return msg.reply('Проблема с запуском yt-dlp. Установи его глобально.');
  }

  const stream = ytdlp.stdout;
  if (!stream) {
    return msg.reply('Не могу получить поток от yt-dlp.');
  }

  const channel = msg.member.voice.channel;
  if (!channel) return msg.reply('Зайди в голосовой канал.');

  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: msg.guild.id,
    adapterCreator: msg.guild.voiceAdapterCreator
  });

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
      msg.reply('Ошибка при воспроизведении.');
      destroyConn();
    });

  connection.subscribe(player);
  player.play(resource);

  return msg.reply(`▶️ Играю: ${match[1]}`);
});

client.login(process.env.DISCORD_TOKEN);
