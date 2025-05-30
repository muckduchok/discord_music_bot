import 'dotenv/config';
import { spawn } from 'child_process';
import { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionType } from 'discord.js';
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

// Хранилище плееров по guildId
const players = new Map();

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
  const m = url.match(/[?&]v=([^&]+)/);
  if (!m) return msg.reply('❌ Нужна ссылка с `?v=<ID>`.');
  const cleanUrl = `https://www.youtube.com/watch?v=${m[1]}`;

  // 2) Cookie header
  const cookieHeader = process.env.CHROME_COOCKIES;
  if (!cookieHeader) return msg.reply('❌ Не задана переменная CHROME_COOCKIES в .env');

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

  // Сохраняем плеер для кнопок
  players.set(msg.guild.id, player);

  // 6) Отправляем сообщение с кнопкой «Pause»
  const pauseButton = new ButtonBuilder()
    .setCustomId('pause')
    .setLabel('⏸ Pause')
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder().addComponents(pauseButton);

  await msg.reply({
    content: `▶️ Играю https://youtu.be/${m[1]}`,
    components: [row]
  });
});

// Обработка нажатий на кнопки
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type !== InteractionType.MessageComponent) return;

  const player = players.get(interaction.guildId);
  if (!player) {
    return interaction.reply({ content: '❌ Плеер не найден.', ephemeral: true });
  }

  // PAUSE
  if (interaction.customId === 'pause') {
    if (player.state.status === AudioPlayerStatus.Paused) {
      return interaction.reply({ content: 'Уже на паузе.', ephemeral: true });
    }
    player.pause();

    // Меняем кнопку на «Resume»
    const resumeBtn = new ButtonBuilder()
      .setCustomId('resume')
      .setLabel('▶️ Resume')
      .setStyle(ButtonStyle.Primary);
    const resumeRow = new ActionRowBuilder().addComponents(resumeBtn);

    return interaction.update({
      content: '⏸ Музыка поставлена на паузу',
      components: [resumeRow]
    });
  }

  // RESUME
  if (interaction.customId === 'resume') {
    if (player.state.status !== AudioPlayerStatus.Paused) {
      return interaction.reply({ content: 'Музыка не на паузе.', ephemeral: true });
    }
    player.unpause();

    // Меняем кнопку обратно на «Pause»
    const pauseBtn = new ButtonBuilder()
      .setCustomId('pause')
      .setLabel('⏸ Pause')
      .setStyle(ButtonStyle.Secondary);
    const pauseRow = new ActionRowBuilder().addComponents(pauseBtn);

    return interaction.update({
      content: '▶️ Музыка продолжена',
      components: [pauseRow]
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
