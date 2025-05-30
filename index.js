import 'dotenv/config';
import { Client, GatewayIntentBits, Events, EmbedBuilder } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  StreamType
} from '@discordjs/voice';
import ytdl from 'ytdl-core';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const player = createAudioPlayer();
const PREFIX = process.env.PREFIX;

client.once(Events.ClientReady, () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async msg => {
  if (msg.author.bot || !msg.content.startsWith(PREFIX)) return;

  const [cmd, ...args] = msg.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  if (cmd === 'play') {
    const url = args[0];
    if (!url || !ytdl.validateURL(url))
      return msg.reply('Нужна корректная ссылка на YouTube!');

    const channel = msg.member.voice.channel;
    if (!channel)
      return msg.reply('Зайди в голосовой канал, чтобы я мог играть музыку.');

    const conn = joinVoiceChannel({
      channelId: channel.id,
      guildId: msg.guildId,
      adapterCreator: msg.guild.voiceAdapterCreator
    });

    const stream = ytdl(url, { filter: 'audioonly', highWaterMark: 1<<25 });
    const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

    player.play(resource);
    conn.subscribe(player);

    player.once(AudioPlayerStatus.Playing, () => {
      msg.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('▶️ Играем сейчас')
            .setDescription(`${url}`)
            .setColor('Blue')
        ]
      });
    });

    player.once(AudioPlayerStatus.Idle, () => conn.destroy());
    player.on('error', error => {
      console.error(error);
      msg.reply('Ошибка при воспроизведении.');
      conn.destroy();
    });
  }

  if (cmd === 'skip') {
    player.stop();
    msg.reply('⏭️ Пропускаю трек.');
  }

  if (cmd === 'stop') {
    player.stop();
    msg.reply('⏹️ Останавливаюсь и выхожу.');
  }
});

client.login(process.env.DISCORD_TOKEN);
