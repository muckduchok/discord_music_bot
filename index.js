// index.js
import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionType
} from 'discord.js';

import DiscordPlayer from 'discord-player';
import { YoutubeiExtractor } from "discord-player-youtubei"
const { Player, useQueue, QueryType } = DiscordPlayer;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 1) Инициализируем плеер
const player = new Player(client, {
  ytdlDownloadOptions: {},
  ytdlOptions: {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25
  }
});

player.extractors.register(YoutubeiExtractor, {});

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

player.events.on('playerError', (queue, error) => {
  console.error(`Ошибка в ${queue.guild.name}: ${error.message}`);
  queue.metadata.channel.send('❌ Произошла ошибка при воспроизведении.');
});

// 4) При старте трека отправляем сообщение
player.events.on('playerStart', (queue, track) => {
  queue.metadata.channel.send(`▶️ Начал играть: **${track.title}**`);
});

// 5) Обработка команды !play
client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot || !msg.content.startsWith('!play ')) return;

  // а) Извлекаем текст после «!play »
  const query = msg.content.slice('!play '.length).trim();
  if (!query) {
    return msg.reply('❌ Укажи, что проигрывать: `!play <YouTube URL или текст>`');
  }

  // б) Проверяем, что пользователь в голосовом канале
  const voiceChannel = msg.member.voice.channel;
  if (!voiceChannel) {
    return msg.reply('❌ Сначала зайди в голосовой канал.');
  }

  // в) Создаём (или достаём) очередь (Queue) для этой гильдии
  const queue = player.nodes.create(msg.guild, {
    metadata: {
      channel: msg.channel,
      voiceChannel: voiceChannel
    },
    leaveOnEnd: false,          // не выходить, когда очередь кончилась
    leaveOnEmpty: true,         // выйти, если канал пуст
    leaveOnEmptyCooldown: 300000 // 5 минут
  });

  if (!queue.connection) {
    try {
      await queue.connect(voiceChannel);
    } catch (err) {
      console.error('Не удалось подключиться к голосовому каналу:', err);
      return msg.reply('❌ Не удалось подключиться к голосовому каналу.');
    }
  }

  const searchResult = await player.search(query, {
    requestedBy: msg.author,
    searchEngine: QueryType.AUTO
  });

  // е) Если ничего не найдено, сообщаем
  if (!searchResult || !searchResult.tracks.length) {
    return msg.reply('❌ Ничего не найдено по запросу.');
  }

  // ж) Берём первый трек
  const track = searchResult.tracks[0];

  // з) Добавляем трек в очередь и запускаем воспроизведение, если не играет
  queue.addTrack(track);
  if (!queue.isPlaying()) {
    await queue.node.play();
  }

  // и) Отправляем сообщение с кнопкой «Pause»
  const pauseButton = new ButtonBuilder()
    .setCustomId('pause')
    .setLabel('⏸ Pause')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(pauseButton);

  await msg.reply({
    content: `⏳ В очередь добавлен: **${track.title}** (поз. #${queue.getSize()})`,
    components: [row]
  });
});

// 6) Обработка нажатий на кнопки Pause/Resume
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.type !== InteractionType.MessageComponent) return;

  const queue = useQueue(interaction.guild.id);
  if (!queue) {
    return interaction.reply({ content: '❌ Нет активной очереди.', ephemeral: true });
  }

  // Paused → Resume
  if (interaction.customId === 'pause') {
    if (queue.node.isPaused()) {
      return interaction.reply({ content: '⚠️ Уже на паузе.', ephemeral: true });
    }
    queue.node.pause();

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

  // Resume → Pause
  if (interaction.customId === 'resume') {
    if (!queue.node.isPaused()) {
      return interaction.reply({ content: '⚠️ Трек уже играет.', ephemeral: true });
    }
    queue.node.resume();

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
