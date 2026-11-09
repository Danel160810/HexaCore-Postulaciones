require('dotenv').config();
const http = require('http');
const {
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  ChannelType,
  REST,
  Routes,
  MessageFlags
} = require('discord.js');

// =====================================================
// HexaCore Postulaciones · Bot puente de la web
// Creado por HexaCore ft. Danel (Discord: danel100816)
// https://github.com/Danel160810/HexaCore-Postulaciones
// Licencia: ver LICENSE. Los créditos no se pueden quitar.
// -----------------------------------------------------
// Toda la lógica (formularios, respuestas, estados, permisos) vive en la web.
// Este bot solo:
//   1. Recoge eventos de la web (GET /api/bot/outbox) y los procesa:
//      · MD al postulante con embed (recibida, en revisión, aprobada, rechazada)
//      · Rol del puesto al aprobar
//      · Registro en el canal de staff
//   2. Avisa a la web cuando cambian los roles de alguien (POST /api/bot/member-sync)
//   3. Publica el panel con el enlace a la web (/postulaciones)
// =====================================================

// =====================================================
// CONFIGURACIÓN
// =====================================================
const CONFIG = {
  token: process.env.DISCORD_BOT_TOKEN,
  guildId: process.env.DISCORD_GUILD_ID || null,

  web: {
    url: (process.env.WEB_URL || '').replace(/\/$/, ''),     // https://tu-web.vercel.app
    secret: process.env.BOT_API_SECRET || '',                  // el mismo que en Vercel
    pollMs: Number(process.env.POLL_INTERVAL_MS) || 10_000,    // cada cuánto pregunta a la web
    httpPort: Number(process.env.BOT_HTTP_PORT) || null        // opcional: para que la web lo "despierte"
  },

  channels: {
    log: process.env.LOG_CHANNEL_ID || null   // registro de staff (nuevas, aprobadas, rechazadas)
  },
  roles: {
    reviewer: process.env.REVIEWER_ROLE_ID || null
  }
};

// Nombre y color de tu comunidad (en el .env)
const BRAND = {
  name: process.env.BRAND_NAME || 'Mi Comunidad',
  color: parseInt(String(process.env.BRAND_COLOR || '#4FDC86').replace('#', ''), 16) || 0x4FDC86
};

// Créditos del sistema (LICENSE, cláusula 3): no se quitan ni se cambian
const CREDITS = 'HexaCore Postulaciones · Creado por HexaCore ft. Danel';

const COLORS = {
  main: BRAND.color,
  pending: 0xF3B54A,
  review: 0x74B9F0,
  ok: BRAND.color,
  bad: 0xEF6B5B,
  neutral: 0x8C9E94
};

// Iconos de estado servidos por la web (public/status/*.png)
const ICON = (name) => (CONFIG.web.url ? `${CONFIG.web.url}/status/${name}.png` : null);

// =====================================================
// UTILIDADES
// =====================================================
const unix = (msOrIso) => Math.floor(new Date(msOrIso).getTime() / 1000);
const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function baseEmbed(color) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: `${BRAND.name} • ${CREDITS}` })
    .setTimestamp();
}

function linkRow(label, url) {
  if (!url) return [];
  return [new ActionRowBuilder().addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(label).setURL(url))];
}

// Llamadas a la web con el secreto compartido
async function webApi(method, path, body) {
  const res = await fetch(`${CONFIG.web.url}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${CONFIG.web.secret}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data.error || ''}`.trim());
  return data;
}

async function safeSend(channelId, payload) {
  if (!channelId) return false; // sin LOG_CHANNEL_ID no hay canal de registro
  try {
    const ch = await client.channels.fetch(channelId);
    await ch.send(payload);
    return true;
  } catch (e) {
    console.error(`❌ No se pudo enviar mensaje a ${channelId}:`, e.message);
    return false;
  }
}

/**
 * Manda un MD. Devuelve true si llegó y false si el usuario tiene los MD cerrados.
 * Cualquier otro error se lanza para que el evento se reintente.
 */
async function sendDM(userId, payload) {
  try {
    const user = await client.users.fetch(userId);
    await user.send(payload);
    return true;
  } catch (e) {
    // 50007: Cannot send messages to this user (MD cerrados o bot bloqueado)
    if (e.code === 50007 || e.code === 50278) return false;
    throw e;
  }
}

// =====================================================
// EMBEDS PARA EL POSTULANTE (MD)
// =====================================================
function refFields(p) {
  return [
    { name: 'Referencia', value: `#${p.reference}`, inline: true },
    { name: 'Categoría', value: p.form.title, inline: true }
  ];
}

function submittedDM(p) {
  return baseEmbed(COLORS.pending)
    .setTitle('Hemos recibido tu postulación')
    .setThumbnail(ICON('pending'))
    .setDescription(
      `Hola, hemos recibido tu postulación a **${p.form.title}**.\n` +
      'Estado: **Recibida**. Te avisaremos por aquí de cualquier cambio.'
    )
    .addFields(refFields(p))
    .setTimestamp(new Date(p.at));
}

function statusDM(p) {
  if (p.status === 'IN_REVIEW') {
    return baseEmbed(COLORS.review)
      .setTitle('Tu postulación ha pasado a revisión')
      .setThumbnail(ICON('review'))
      .setDescription(
        p.previousStatus === 'APPROVED' || p.previousStatus === 'REJECTED'
          ? `El equipo ha **reabierto** tu postulación a **${p.form.title}** y la está valorando de nuevo.`
          : `Tu postulación a **${p.form.title}** ha pasado a **En revisión**. El equipo la está valorando.`
      )
      .addFields(refFields(p))
      .setTimestamp(new Date(p.at));
  }

  if (p.status === 'APPROVED') {
    const e = baseEmbed(COLORS.ok)
      .setTitle('¡Tu postulación ha sido aprobada!')
      .setThumbnail(ICON('approved'))
      .setDescription(
        `Enhorabuena: tu postulación a **${p.form.title}** ha sido **aprobada** el <t:${unix(p.at)}:f>.` +
        (p.acceptedRoleId ? '\nYa tienes el rol del puesto en el servidor.' : '')
      )
      .addFields(refFields(p))
      .setTimestamp(new Date(p.at));
    if (p.note) e.addFields({ name: 'Mensaje del equipo', value: truncate(p.note, 1000) });
    return e;
  }

  // REJECTED
  const e = baseEmbed(COLORS.bad)
    .setTitle('Tu postulación ha sido rechazada')
    .setThumbnail(ICON('rejected'))
    .setDescription(`Tu postulación a **${p.form.title}** ha sido **rechazada** el <t:${unix(p.at)}:f>.`)
    .addFields(refFields(p))
    .setTimestamp(new Date(p.at));
  if (p.note) e.addFields({ name: 'Motivo', value: truncate(p.note, 1000) });
  if (p.cooldownUntil) {
    e.addFields({
      name: 'Volver a postular',
      value: `Podrás presentarte de nuevo <t:${unix(p.cooldownUntil)}:R> (<t:${unix(p.cooldownUntil)}:f>).`
    });
  }
  return e;
}

// =====================================================
// EMBEDS PARA EL STAFF (canal de registro)
// =====================================================
function submittedLog(p) {
  return baseEmbed(COLORS.pending)
    .setTitle(`Nueva postulación · ${p.form.title}`)
    .setDescription(`<@${p.userId}> (\`${p.username}\`) ha enviado una postulación.`)
    .addFields(
      { name: 'Referencia', value: `#${p.reference}`, inline: true },
      { name: 'Categoría', value: p.form.title, inline: true },
      { name: 'Enviada', value: `<t:${unix(p.at)}:R>`, inline: true }
    );
}

function statusLog(p, extra) {
  const label = { IN_REVIEW: 'En revisión', APPROVED: 'Aprobada', REJECTED: 'Rechazada' }[p.status];
  const color = { IN_REVIEW: COLORS.review, APPROVED: COLORS.ok, REJECTED: COLORS.bad }[p.status];
  const e = baseEmbed(color)
    .setTitle(`Registro · ${label} · #${p.reference}`)
    .addFields(
      { name: 'Postulante', value: `<@${p.userId}> (\`${p.username}\`)`, inline: true },
      { name: 'Categoría', value: p.form.title, inline: true },
      { name: 'Revisor', value: `<@${p.reviewer.id}> (\`${p.reviewer.username}\`)`, inline: true }
    );
  if (p.note) e.addFields({ name: p.status === 'REJECTED' ? 'Motivo' : 'Mensaje', value: truncate(p.note, 1000) });
  if (extra.length) e.addFields({ name: 'Avisos', value: extra.join('\n') });
  return e;
}

// =====================================================
// PROCESADO DE EVENTOS DE LA WEB
// =====================================================
async function handleEvent(ev) {
  const p = ev.payload;

  if (ev.type === 'APPLICATION_SUBMITTED') {
    const dmDelivered = await sendDM(p.userId, {
      embeds: [submittedDM(p)],
      components: linkRow('Ver mi postulación', p.url)
    });
    await safeSend(CONFIG.channels.log, {
      content: CONFIG.roles.reviewer ? `<@&${CONFIG.roles.reviewer}> hay una nueva postulación pendiente.` : 'Hay una nueva postulación pendiente.',
      allowedMentions: { roles: CONFIG.roles.reviewer ? [CONFIG.roles.reviewer] : [] },
      embeds: [submittedLog(p)],
      components: linkRow('Revisar en el panel', p.adminUrl)
    });
    return { id: ev.id, ok: true, dmDelivered };
  }

  if (ev.type === 'STATUS_CHANGED') {
    const extra = [];

    // 1) Rol del puesto al aprobar (no bloquea el MD si falla)
    if (p.status === 'APPROVED' && p.acceptedRoleId) {
      try {
        const guild = await client.guilds.fetch(CONFIG.guildId);
        const member = await guild.members.fetch(p.userId).catch(() => null);
        if (!member) extra.push('⚠️ El usuario ya no está en el servidor: no se le pudo dar el rol.');
        else await member.roles.add(p.acceptedRoleId, `Postulación #${p.reference} aprobada por ${p.reviewer.username}`);
      } catch (e) {
        console.error('❌ No se pudo dar el rol:', e.message);
        extra.push('⚠️ No pude dar el rol. Revisa que el rol del bot esté **por encima** y tenga **Gestionar roles**.');
      }
    }

    // 2) MD al postulante
    const dmDelivered = await sendDM(p.userId, {
      embeds: [statusDM(p)],
      components: linkRow('Ver mi postulación', p.url)
    });
    if (!dmDelivered) extra.push('📭 Tiene los MD cerrados: verá el estado solo en la web.');

    // 3) Registro para el staff
    await safeSend(CONFIG.channels.log, {
      embeds: [statusLog(p, extra)],
      components: linkRow('Abrir en el panel', p.adminUrl),
      allowedMentions: { parse: [] }
    });

    return { id: ev.id, ok: true, dmDelivered };
  }

  // Tipo desconocido: lo damos por procesado para que no bloquee la cola
  console.warn('⚠️ Evento desconocido:', ev.type);
  return { id: ev.id, ok: true };
}

let polling = false;
let pollAgain = false;
const BATCH = 10;

async function pollOutbox() {
  if (!CONFIG.web.url || !CONFIG.web.secret) return;
  if (polling) {
    pollAgain = true;
    return;
  }
  polling = true;
  try {
    let more = true;
    while (more) {
      pollAgain = false;
      const { events = [] } = await webApi('GET', `/api/bot/outbox?limit=${BATCH}`);
      if (events.length === 0) break;

      const results = [];
      for (const ev of events) {
        try {
          results.push(await handleEvent(ev));
        } catch (e) {
          console.error(`💥 Error procesando ${ev.type} (${ev.id}):`, e.message);
          results.push({ id: ev.id, ok: false, error: e.message });
        }
        await sleep(250); // margen con el rate limit de MDs
      }
      await webApi('POST', '/api/bot/outbox/ack', { results });
      more = events.length === BATCH || pollAgain;
    }
  } catch (e) {
    console.error('⚠️ No se pudo contactar con la web:', e.message);
  } finally {
    polling = false;
  }
}

// =====================================================
// SINCRONIZACIÓN DE ROLES → WEB
// (quitar el rol Reviewer en Discord quita el acceso al panel al momento)
// =====================================================
const syncQueue = new Map();

function queueMemberSync(member, inGuild = true) {
  syncQueue.set(member.id, {
    id: member.id,
    inGuild,
    roles: inGuild ? member.roles.cache.filter((r) => r.id !== member.guild.id).map((r) => r.id) : [],
    username: member.user?.username,
    globalName: member.user?.globalName ?? null,
    avatar: member.user?.avatar ?? null
  });
}

async function flushMemberSync() {
  if (!syncQueue.size || !CONFIG.web.url || !CONFIG.web.secret) return;
  const members = [...syncQueue.values()].slice(0, 100);
  members.forEach((m) => syncQueue.delete(m.id));
  try {
    await webApi('POST', '/api/bot/member-sync', { members });
  } catch (e) {
    console.error('⚠️ No se pudieron sincronizar roles:', e.message);
    members.forEach((m) => { if (!syncQueue.has(m.id)) syncQueue.set(m.id, m); }); // reintento en el siguiente ciclo
  }
}

// =====================================================
// CLIENTE
// =====================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers // necesario para detectar cambios de roles (intent privilegiado)
  ]
});

client.on('error', (err) => console.error('⚠️ Client error:', err.message));
client.on('warn', (msg) => console.warn('⚠️', msg));
process.on('unhandledRejection', (err) => console.error('⚠️ Unhandled:', err?.message || err));

const panelCommand = new SlashCommandBuilder()
  .setName('postulaciones')
  .setDescription('Publica el panel con el enlace a la web de postulaciones')
  .addChannelOption((o) =>
    o.setName('canal').setDescription('Canal donde publicarlo (por defecto, este)').addChannelTypes(ChannelType.GuildText)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

async function registerCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(CONFIG.token);
    await rest.put(Routes.applicationGuildCommands(client.user.id, CONFIG.guildId), {
      body: [panelCommand.toJSON()]
    });
    console.log('✅ Slash /postulaciones registrado');
  } catch (e) {
    console.error('❌ Error registrando comandos:', e.message);
  }
}

function panelEmbed() {
  return baseEmbed(COLORS.main)
    .setTitle(`⬡ ${BRAND.name.toUpperCase()} — POSTULACIONES`)
    .setThumbnail(CONFIG.web.url ? `${CONFIG.web.url}/logo.png` : null)
    .setDescription(
      `**¿Quieres formar parte del equipo de ${BRAND.name}?**\n\n` +
      'Las postulaciones se hacen desde la web: entra con tu cuenta de Discord, elige el puesto y responde el examen.\n\n' +
      '📬 Te avisaré por **MD** de cada cambio de estado, así que ten los mensajes directos abiertos.\n' +
      '🔎 También puedes seguir tu postulación en la web en cualquier momento.'
    );
}

client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot listo: ${client.user.tag}`);
  console.log(`⬡ ${CREDITS} (Discord: danel100816)`);

  if (!CONFIG.guildId) {
    const first = client.guilds.cache.first();
    CONFIG.guildId = first?.id || null;
    console.warn(`⚠️ DISCORD_GUILD_ID no está definido. Uso el primer servidor: ${CONFIG.guildId}`);
  }
  if (!CONFIG.web.url || !CONFIG.web.secret) {
    console.error('❌ Falta WEB_URL o BOT_API_SECRET en el .env: no podré recibir eventos de la web.');
  }

  await registerCommands();
  await pollOutbox();
  setInterval(() => pollOutbox(), CONFIG.web.pollMs);
  setInterval(() => flushMemberSync(), 3_000);
  console.log(`🔄 Consultando la web cada ${Math.round(CONFIG.web.pollMs / 1000)} s`);
});

// Cambios de roles / nombre / avatar
client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
  if (newMember.guild.id !== CONFIG.guildId) return;
  const rolesChanged = oldMember.partial || !oldMember.roles.cache.equals(newMember.roles.cache);
  const profileChanged =
    oldMember.user?.username !== newMember.user?.username ||
    oldMember.user?.avatar !== newMember.user?.avatar;
  if (rolesChanged || profileChanged) queueMemberSync(newMember, true);
});

client.on(Events.GuildMemberAdd, (member) => {
  if (member.guild.id === CONFIG.guildId) queueMemberSync(member, true);
});

client.on(Events.GuildMemberRemove, (member) => {
  if (member.guild.id === CONFIG.guildId) queueMemberSync(member, false);
});

// /postulaciones
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'postulaciones') return;

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
    }
    if (!CONFIG.web.url) {
      return interaction.reply({ content: '❌ Falta `WEB_URL` en el .env del bot.', flags: MessageFlags.Ephemeral });
    }

    const channel = interaction.options.getChannel('canal') || interaction.channel;
    await channel.send({
      embeds: [panelEmbed()],
      components: linkRow('Abrir postulaciones', `${CONFIG.web.url}/postular`)
    });
    return interaction.reply({ content: `✅ Panel publicado en <#${channel.id}>.`, flags: MessageFlags.Ephemeral });
  } catch (e) {
    console.error('💥 Interaction error:', e);
    const payload = { content: '❌ No pude publicar el panel. ¿Tengo permisos para escribir en ese canal?', flags: MessageFlags.Ephemeral };
    try {
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload);
      else if (interaction.isRepliable()) await interaction.reply(payload);
    } catch {}
  }
});

// =====================================================
// HTTP OPCIONAL: la web avisa al instante (POST /kick)
// Solo se activa si defines BOT_HTTP_PORT y tu hosting expone ese puerto.
// =====================================================
if (CONFIG.web.httpPort) {
  http
    .createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, ready: client.isReady() }));
      }
      if (req.method === 'POST' && req.url === '/kick') {
        if (req.headers.authorization !== `Bearer ${CONFIG.web.secret}`) {
          res.writeHead(401);
          return res.end();
        }
        res.writeHead(204);
        res.end();
        if (client.isReady()) pollOutbox();
        return;
      }
      res.writeHead(404);
      res.end();
    })
    .listen(CONFIG.web.httpPort, () => console.log(`🌐 HTTP de aviso escuchando en :${CONFIG.web.httpPort}`));
}

// =====================================================
// ARRANQUE
// =====================================================
if (!CONFIG.token) {
  console.error('❌ Falta DISCORD_BOT_TOKEN en el .env');
  process.exit(1);
}

client.login(CONFIG.token).catch((err) => {
  console.error('❌ Error login:', err.message);
  process.exit(1);
});
