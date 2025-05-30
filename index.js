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
  if (!msg.content.startsWith('!play ')) return;

  const raw = msg.content.slice('!play '.length).trim().split(/\s+/)[0];
  if (!raw) return msg.reply('❌ Укажи ссылку: `!play https://youtu.be/...`');

  const url = raw.replace(/^<|>$/g, '').trim();
  try { new URL(url); } catch {
    return msg.reply('❌ Невалидный URL.');
  }

  const m = url.match(/[?&]v=([^&]+)/);
  if (!m) return msg.reply('❌ Нужно видео-URL с `v=`.');
  const cleanUrl = `https://www.youtube.com/watch?v=${m[1]}`;

  // **Paste your Cookie header value here**:
  const cookieHeader = `HSID=Ap6Yt7w0qs8icxtLc; SSID=AFUk0e0nj_XXrMjt5; APISID=BmzeG5q2HwTRU-Z-/A2TGjs5CTOVcUEv-Z; SAPISID=42wfCFMuZ35-bib3/A1-hMfhOEr3tD8AFl; __Secure-1PAPISID=42wfCFMuZ35-bib3/A1-hMfhOEr3tD8AFl; __Secure-3PAPISID=42wfCFMuZ35-bib3/A1-hMfhOEr3tD8AFl; YSC=ebW-9DvOvPk; LOGIN_INFO=AFmmF2swRgIhAKVLsuauzM6L-ka1FbQuOdiLXv9hGTS3e-82jLFmw3KsAiEAwMyB9_W4FbjAeUKrbhD8ZIaCoFh8eB4b92UchXmWlZ8:QUQ3MjNmem5CNFpfYVBTSlhZYTh6Nnk0QXZxX0FZRmlaa3FKdHRxQnpQVjNNZHhVSUJfRmlKTERFNHZWbmRfQldhR2Z0TkZ2dW1HNXNIelpKUVY0TGNiVEIzUHZLb0N3Mk5taWxmSGVwSkdnQl9sX0RreFNRN1VhTlpXcWZpMXl3WTRxUmk4azh4d1dNSGoyY21XTUtYbTZsc2FRNkE4Y0Rn; VISITOR_INFO1_LIVE=eNnoCkUeFIQ; VISITOR_PRIVACY_METADATA=CgJVQRIEGgAgaw%3D%3D; _gcl_au=1.1.329207080.1747040769; SID=g.a000xAiWvgsVmclQaKO6ZhXB-ev3aHdpXklTvR9cj6Rt0FL-qsYpl1oDb4oMuHheOPTokHcQAAACgYKAcISARYSFQHGX2MiUCQNhUtNF2HKGwPoq23TlhoVAUF8yKqmvFDEQcSqy4sejgRiX6kq0076; __Secure-1PSID=g.a000xAiWvgsVmclQaKO6ZhXB-ev3aHdpXklTvR9cj6Rt0FL-qsYpDzdidkXF4HDNQ6d0_L8vAwACgYKAUsSARYSFQHGX2MiZnS4PjeaRJQtxuRcFVxyPBoVAUF8yKqCgYdbigjSLv8QLQboJB_10076; __Secure-3PSID=g.a000xAiWvgsVmclQaKO6ZhXB-ev3aHdpXklTvR9cj6Rt0FL-qsYpdW58W-HOJMFVphGZuhfOnAACgYKAaoSARYSFQHGX2MiuFd1RHAF41oRuTIIdCBanBoVAUF8yKrbdkfJqQY1TwAb0toNDkQa0076; wide=1; __Secure-ROLLOUT_TOKEN=CIzsgviLsbjBcxDS7v6RloeNAxiW6sfd3sqNAw%3D%3D; PREF=f6=40000080&tz=Europe.Kiev&f7=100&f5=30000; __Secure-1PSIDTS=sidts-CjEB5H03P9vKVFHG3ElWC3sL6Dwrck5FdTx2ayTxy8kGt3Z-Qux7OfhFKy2VlNIO_HzXEAA; __Secure-3PSIDTS=sidts-CjEB5H03P9vKVFHG3ElWC3sL6Dwrck5FdTx2ayTxy8kGt3Z-Qux7OfhFKy2VlNIO_HzXEAA; ST-3opvp5=session_logininfo=AFmmF2swRgIhAKVLsuauzM6L-ka1FbQuOdiLXv9hGTS3e-82jLFmw3KsAiEAwMyB9_W4FbjAeUKrbhD8ZIaCoFh8eB4b92UchXmWlZ8%3AQUQ3MjNmem5CNFpfYVBTSlhZYTh6Nnk0QXZxX0FZRmlaa3FKdHRxQnpQVjNNZHhVSUJfRmlKTERFNHZWbmRfQldhR2Z0TkZ2dW1HNXNIelpKUVY0TGNiVEIzUHZLb0N3Mk5taWxmSGVwSkdnQl9sX0RreFNRN1VhTlpXcWZpMXl3WTRxUmk4azh4d1dNSGoyY21XTUtYbTZsc2FRNkE4Y0Rn; SIDCC=AKEyXzUWvoocISb8idqp1KY5vmb5T1s-kL_XcCKdyJopMO_ELqnpfDowdJnIEueCXYQKDuj2ESs; __Secure-1PSIDCC=AKEyXzWP_IYp8KyZnqXrWiD0yJmNa6D8uqxQ5tsyEycX_MqcTdeVWqTil8TIt0jxSYGJpAs8yrM; __Secure-3PSIDCC=AKEyXzVNBHhjEyCfia973UKC4KU7DhY8zp24ts69JBp1RJn14DitXEgbJoYjchAZD5Czbd7NAg; ST-1tzw2b8=disableCache=true&itct=CH4Q8qgHGAIiEwiUruaFl8yNAxXtdXoFHcd_ExA%3D&csn=_RmrO-GSqIA8vFKv&session_logininfo=AFmmF2swRgIhAKVLsuauzM6L-ka1FbQuOdiLXv9hGTS3e-82jLFmw3KsAiEAwMyB9_W4FbjAeUKrbhD8ZIaCoFh8eB4b92UchXmWlZ8%3AQUQ3MjNmem5CNFpfYVBTSlhZYTh6Nnk0QXZxX0FZRmlaa3FKdHRxQnpQVjNNZHhVSUJfRmlKTERFNHZWbmRfQldhR2Z0TkZ2dW1HNXNIelpKUVY0TGNiVEIzUHZLb0N3Mk5taWxmSGVwSkdnQl9sX0RreFNRN1VhTlpXcWZpMXl3WTRxUmk4azh4d1dNSGoyY21XTUtYbTZsc2FRNkE4Y0Rn&endpoint=%7B%22clickTrackingParams%22%3A%22CH4Q8qgHGAIiEwiUruaFl8yNAxXtdXoFHcd_ExA%3D%22%2C%22commandMetadata%22%3A%7B%22webCommandMetadata%22%3A%7B%22url%22%3A%22%2Ffeed%2Fsubscriptions%22%2C%22webPageType%22%3A%22WEB_PAGE_TYPE_BROWSE%22%2C%22rootVe%22%3A96368%2C%22apiUrl%22%3A%22%2Fyoutubei%2Fv1%2Fbrowse%22%7D%7D%2C%22browseEndpoint%22%3A%7B%22browseId%22%3A%22FEsubscriptions%22%7D%7D; ST-yve142=session_logininfo=AFmmF2swRgIhAKVLsuauzM6L-ka1FbQuOdiLXv9hGTS3e-82jLFmw3KsAiEAwMyB9_W4FbjAeUKrbhD8ZIaCoFh8eB4b92UchXmWlZ8%3AQUQ3MjNmem5CNFpfYVBTSlhZYTh6Nnk0QXZxX0FZRmlaa3FKdHRxQnpQVjNNZHhVSUJfRmlKTERFNHZWbmRfQldhR2Z0TkZ2dW1HNXNIelpKUVY0TGNiVEIzUHZLb0N3Mk5taWxmSGVwSkdnQl9sX0RreFNRN1VhTlpXcWZpMXl3WTRxUmk4azh4d1dNSGoyY21XTUtYbTZsc2FRNkE4Y0Rn`;

  console.log('→ Streaming with cookies:', cookieHeader.split(';')[0] + '…');

  // Запускаем yt-dlp:
  const ytdlp = spawn('yt-dlp', [
    '-f', 'bestaudio',
    '-o', '-',
    '--quiet',
    '--http-cookie', cookieHeader,
    cleanUrl
  ], { stdio: ['ignore','pipe','inherit'] });

  const stream = ytdlp.stdout;
  if (!stream) return msg.reply('❌ Не удалось получить поток.');

  const channel = msg.member.voice.channel;
  if (!channel) return msg.reply('❌ Зайди в голосовой канал.');

  const conn = joinVoiceChannel({
    channelId: channel.id,
    guildId: msg.guild.id,
    adapterCreator: msg.guild.voiceAdapterCreator
  });

  const resource = createAudioResource(stream, {
    inputType: StreamType.Arbitrary,
    inlineVolume: true
  });

  let destroyed = false;
  const destroy = () => {
    if (!destroyed) {
      destroyed = true;
      conn.destroy();
    }
  };

  const player = createAudioPlayer()
    .once(AudioPlayerStatus.Idle, destroy)
    .once('error', err => {
      console.error('AudioPlayerError:', err);
      msg.reply('❌ Ошибка воспроизведения.');
      destroy();
    });

  conn.subscribe(player);
  player.play(resource);

  msg.reply(`▶️ Играю: ${m[1]}`);
});

client.login(process.env.DISCORD_TOKEN);
