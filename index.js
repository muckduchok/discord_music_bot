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

client.on('error', console.error);
process.on('unhandledRejection', console.error);

client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot || !msg.content.startsWith('!play ')) return;

  // 1) Extract and clean the URL
  const raw = msg.content.slice('!play '.length).trim().split(/\s+/)[0];
  if (!raw) return msg.reply('❌ Укажи ссылку: `!play https://youtu.be/…`');

  const url = raw.replace(/^<|>$/g, '').trim();
  let idMatch = url.match(/[?&]v=([^&]+)/);
  if (!idMatch) return msg.reply('❌ Нужна ссылка с `?v=<ID>`.');
  const cleanUrl = `https://www.youtube.com/watch?v=${idMatch[1]}`;

  // 2) Paste your browser’s Cookie header here:
  const cookieHeader = process.env.CHROME_COOCKIES;

  console.log('→ Streaming with cookies:', cookieHeader.split(';')[0] + '…');

  // 3) Spawn yt-dlp with --add-header
  let proc;
  try {
    proc = spawn('yt-dlp', [
      '-f', 'bestaudio',
      '-o', '-',
      '--quiet',
      '--add-header', `Cookie: ${cookieHeader}`,
      cleanUrl
    ], { stdio: ['ignore','pipe','inherit'] });
  } catch (e) {
    console.error('yt-dlp spawn error:', e);
    return msg.reply('❌ Не удалось запустить yt-dlp. Проверь установку.');
  }

  const stream = proc.stdout;
  if (!stream) return msg.reply('❌ yt-dlp не дал потока.');

  // 4) Join voice channel
  const vc = msg.member.voice.channel;
  if (!vc) return msg.reply('❌ Зайди в голосовой канал.');

  const conn = joinVoiceChannel({
    channelId: vc.id,
    guildId: msg.guild.id,
    adapterCreator: msg.guild.voiceAdapterCreator
  });

  // 5) Play
  const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary, inlineVolume: true });
  let done = false;
  const cleanup = () => { if (!done) { done = true; conn.destroy(); } };

  const player = createAudioPlayer()
    .once(AudioPlayerStatus.Idle, cleanup)
    .once('error', err => { console.error(err); cleanup(); });

  conn.subscribe(player);
  player.play(resource);

  msg.reply(`▶️ Играю https://youtu.be/${idMatch[1]}`);
});

client.login(process.env.DISCORD_TOKEN);
