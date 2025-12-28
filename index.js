require('dotenv').config();
const express = require('express'); // Express no topo
const mongoose = require('mongoose');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Options, PermissionsBitField } = require('discord.js');

// ==================== 🌐 SERVIDOR WEB (KEEP-ALIVE) ====================
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('O bot de Facção está operando com sucesso! 🌑');
});

app.listen(PORT, () => {
    console.log(`✅ Servidor Web ativo na porta ${PORT}`);
});

// ==================== 🗄️ CONEXÃO MONGODB ====================
const mongoURI = process.env.MONGO_URI; 

mongoose.connect(mongoURI)
    .then(() => console.log("✅ Conectado ao MongoDB!"))
    .catch(err => console.error("❌ Erro MongoDB:", err));

// ==================== 📁 IMPORTAÇÃO DO MODEL ====================
// Se der erro aqui, siga os comandos do terminal abaixo
// No seu index.js, mude para:
const User = require('./database/User');

// ==================== 🤖 CONFIGURAÇÃO BOT ====================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, 
    ],
    makeCache: Options.cacheWithLimits({
        MessageManager: 10,
        PresenceManager: 0,
        GuildMemberManager: 50, 
    }),
});

const lojaItens = {
    // CATEGORIA: LEGAL
    "escudo": { nome: "Escudo de Energia", preco: 6000, estoque: 3, categoria: "legal", desc: "Protege o teu saldo de um roubo." },
    "picareta": { nome: "Picareta de Ferro", preco: 8000, estoque: 5, categoria: "legal", desc: "Aumenta os ganhos no !trabalhar." },
    "computador": { nome: "Computador", preco: 10000, estoque: 4, categoria: "legal", desc: "Permite trabalhar remotamente com bónus de moedas." },

    // CATEGORIA: SUBMUNDO
    "passaporte": { nome: "Passaporte Falso", preco: 7500, estoque: 5, categoria: "submundo", desc: "Reseta o timer do trabalho." },
    "faca": { nome: "Faca de Combate", preco: 8000, estoque: 10, categoria: "submundo", desc: "Aumenta chance no !roubar e !concluir." },
    "dinamite": { nome: "Dinamite", preco: 10000, estoque: 5, categoria: "submundo", desc: "Sucesso no !crime e ganho x2.5 (Consumível)." },
    "arma": { nome: "Pistola 9mm", preco: 25000, estoque: 2, categoria: "submundo", desc: "Proteção total, bónus no crime e garante o !atacar." },
    "faccao": { nome: "Convite de Facção", preco: 2000000, estoque: 1, categoria: "submundo", desc: "???" }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // 1. Carrega os dados do MongoDB (UMA ÚNICA VEZ AQUI)
    let userData = await User.findOne({ userId: message.author.id });
    if (!userData) userData = await User.create({ userId: message.author.id });

    // Resposta à Menção
    if (message.content === `<@${client.user.id}>` || message.content === `<@!${client.user.id}>`) {
        const embedMencao = new EmbedBuilder()
            .setColor('#5865f2')
            .setTitle('👋 Olá! Eu sou o OmniBot')
            .setDescription('Meu prefixo é: `!`\nUse `!ajuda` para ver comandos.');
        return message.reply({ embeds: [embedMencao] });
    }

    if (!message.content.startsWith('!')) return;
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // COMANDO MONEY
    if (command === 'money' || command === 'bal') {
        const alvo = message.mentions.users.first() || message.author;
        let data = (alvo.id === message.author.id) ? userData : await User.findOne({ userId: alvo.id });
        const saldo = data ? data.money.toLocaleString() : "0";
        return message.reply(`💰 **${alvo.username}** tem **${saldo} moedas**.`);
    }

    // COMANDO DAILY
    if (command === 'daily') {
        const tempoEspera = 24 * 60 * 60 * 1000;
        const agora = Date.now();
        if (agora - (userData.lastDaily || 0) < tempoEspera) {
            const restando = tempoEspera - (agora - userData.lastDaily);
            return message.reply(`❌ Tente novamente em **${Math.floor(restando / 3600000)}h**.`);
        }
        const ganho = Math.floor(Math.random() * 7001) + 3000;
        userData.money += ganho;
        userData.lastDaily = agora;
        await userData.save();
        return message.reply(`🎁 Ganhaste **${ganho.toLocaleString()}** moedas!`);
    }

// ==================== 🔨 COMANDO TRABALHAR (COM RESET DE PASSAPORTE) ====================
if (command === 'trabalhar' || command === 'work') {
    const now = Date.now();
    const cooldown = 3600000; // 1 hora
    const lastWork = userData.lastWork || 0;
    const inventory = userData.inventory || [];

    // 1. Verificação de Cooldown com lógica de Passaporte
    if (now - lastWork < cooldown) {
        // Verifica se ele tem o passaporte para resetar
        if (inventory.includes('passaporte')) {
            // Remove o passaporte do inventário (consome o item)
            const index = userData.inventory.indexOf('passaporte');
            userData.inventory.splice(index, 1);
            userData.markModified('inventory'); 
            // Não retornamos aqui, o código segue para o trabalho abaixo
        } else {
            const restante = cooldown - (now - lastWork);
            const minutos = Math.ceil(restante / 60000);
            return message.reply(`⏳ Estás cansado! Volta em **${minutos} minutos**.\n💡 *Dica: Um **Passaporte Falso** pode resetar este tempo instantaneamente!*`);
        }
    }

    // 2. Cálculo do Ganho Base
    let ganho = Math.floor(Math.random() * 5001) + 1000; 
    let bonusTotal = 0;
    let extras = [];

    // 3. Verificação de Bônus da Mochila
    if (inventory.includes('picareta')) {
        bonusTotal += 800;
        extras.push("⛏️ Picareta (+800)");
    }
    if (inventory.includes('computador')) {
        bonusTotal += 1500;
        extras.push("💻 Computador (+1.500)");
    }

    const totalFinal = ganho + bonusTotal;

    // 4. Atualização dos Dados
    userData.money += totalFinal;
    userData.lastWork = now;
    userData.workCount = (userData.workCount || 0) + 1;

    // 5. Salva no MongoDB
    await userData.save();

    // 6. Resposta Visual
    let resposta = "";
    
    // Se ele usou o passaporte, avisamos na mensagem
    if (now - lastWork < cooldown) {
        resposta += "🎫 **PASSAPORTE USADO!** O teu tempo de espera foi resetado ilegalmente.\n";
    }

    resposta += `🔨 Trabalhaste arduamente e ganhaste **${totalFinal.toLocaleString()} moedas**!`;
    
    if (extras.length > 0) {
        resposta += `\n> **Bônus aplicados:** ${extras.join(' e ')}`;
    }
    
    resposta += `\n📊 Total de turnos realizados: \`${userData.workCount}\``;

    return message.reply(resposta);
}
// ==================== 🛠️ COMANDO SETMONEY (APENAS ADM) ====================
if (command === 'setmoney') {
    // Verifica se és o dono do bot (Troca pelo teu ID)
    if (message.author.id !== '1203435676083822712') {
        return message.reply("❌ Apenas o desenvolvedor pode usar este comando.");
    }

    const valor = parseInt(args[0]);
    if (isNaN(valor)) return message.reply("❌ Indica um número válido.");

    userData.money = valor;
    await userData.save();

    return message.reply(`✅ O teu saldo foi alterado para **${valor.toLocaleString()}** moedas!`);
}

if (command === 'resetar') {
    const meuID = "1203435676083822712"; // Coloque seu ID aqui

    if (message.author.id !== meuID) {
        return message.reply("❌ Apenas o meu desenvolvedor pode usar este comando!");
    }

    const alvo = message.mentions.users.first() || message.author;
    const targetData = (alvo.id === message.author.id) ? userData : await User.findOne({ userId: alvo.id });

    if (!targetData) return message.reply("❌ Usuário não encontrado no banco.");

    // 1. Resetar dados no MongoDB
    targetData.money = 5000; 
    targetData.cargo = "Civil";
    targetData.inventory = ['faccao']; // Devolve o convite para ele poder testar de novo
    targetData.missionCount = 0;
    await targetData.save();

    // 2. Remover o cargo no Discord
    const idDoCargoFaccao = "1454692749482660003"; // Coloque o ID do cargo aqui
    const membroNoServidor = message.guild.members.cache.get(alvo.id);

    if (membroNoServidor) {
        // Verifica se o usuário tem o cargo antes de tentar remover
        if (membroNoServidor.roles.cache.has(idDoCargoFaccao)) {
            await membroNoServidor.roles.remove(idDoCargoFaccao).catch(err => {
                console.error("Erro ao remover cargo:", err);
                return message.channel.send("⚠️ Erro ao remover o cargo no Discord (verifique se o meu cargo está acima do cargo da facção).");
            });
        }
    }

    return message.reply(`🛠️ **[ADMIN]** Reset concluído para **${alvo.username}**!\n- Dinheiro: 5000\n- Cargo: Civil\n- Mochila: Convite Devolvido\n- Discord: Cargo removido.`);
}
    // ==================== 💸 COMANDO PIX ====================
    if (command === 'pix') {
        const targetUser = message.mentions.users.first();
        const quantia = parseInt(args[1]); // args[1] porque args[0] é a menção

        if (!targetUser) return message.reply('❌ Precisas de marcar (@) alguém!');
        if (targetUser.id === userId) return message.reply('❌ Não podes enviar para ti próprio!');
        if (isNaN(quantia) || quantia <= 0) return message.reply('❌ Quantia inválida!');
        if (userData.money < quantia) return message.reply(`❌ Saldo insuficiente!`);

        let targetData = await User.findOne({ userId: targetUser.id });
        if (!targetData) targetData = await User.create({ userId: targetUser.id });

        userData.money -= quantia;
        targetData.money += quantia;

        await userData.save();
        await targetData.save();

        const embed = new EmbedBuilder()
            .setTitle('💸 PIX Realizado!')
            .setColor('#2ecc71')
            .setDescription(`${message.author} enviou dinheiro para ${targetUser}!`)
            .addFields({ name: '💰 Valor', value: `R$ ${quantia.toLocaleString()}` });

        return message.reply({ embeds: [embed] });
    }

    // ==================== 🪙 COMANDO CASSINO ====================
    if (command === 'cassino' || command === 'caraoucoroa') {
        const targetUser = message.mentions.users.first();
        const aposta = parseInt(args[1]);

        if (!targetUser || targetUser.id === userId) return message.reply('❌ Desafia outra pessoa!');
        if (isNaN(aposta) || aposta <= 0) return message.reply('❌ Valor inválido!');

        let targetData = await User.findOne({ userId: targetUser.id });
        if (!targetData) targetData = await User.create({ userId: targetUser.id });

        if (userData.money < aposta || targetData.money < aposta) return message.reply('❌ Alguém não tem dinheiro!');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('aceitar_bet').setLabel(`Aceitar ${aposta}`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('recusar_bet').setLabel('Recusar').setStyle(ButtonStyle.Danger)
        );

        const convite = await message.reply({ content: `🪙 **APOSTA!** ${targetUser}, aceitas o desafio?`, components: [row] });
        const filter = i => i.user.id === targetUser.id;
        const collector = convite.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'aceitar_bet') {
                const freshA = await User.findOne({ userId: userId });
                const freshT = await User.findOne({ userId: targetUser.id });

                const ganhou = Math.random() > 0.5;
                const win = ganhou ? freshA : freshT;
                const lose = ganhou ? freshT : freshA;

                win.money += aposta;
                lose.money -= aposta;
                await win.save();
                await lose.save();

                await i.update({ content: `🪙 **<@${win.userId}> venceu e levou tudo!**`, components: [] });
            } else {
                await i.update({ content: '❌ Recusado.', components: [] });
            }
        });
    }
    // ==================== 📈 INVESTIMENTO OTIMIZADO ====================
if (command === 'investir' || command === 'stock') {
    const valorInput = args[0];
    
    // 1. Verificações de Segurança (Early Returns)
    if (!valorInput) return message.reply("❓ Indica quanto queres investir. Ex: `!investir 5000` ou `!investir all`.");

    let quantia;
    if (valorInput.toLowerCase() === 'all') {
        quantia = userData.money;
    } else {
        quantia = parseInt(valorInput);
    }

    if (isNaN(quantia) || quantia <= 0) return message.reply("❌ Valor inválido.");
    if (quantia < 500) return message.reply("❌ O investimento mínimo é de **500 moedas**.");
    if (userData.money < quantia) return message.reply("❌ Não tens saldo suficiente.");

    // 2. Sistema de Cooldown (Para evitar spam)
    const agora = Date.now();
    const tempoEspera = 600000; // 10 minutos
    if (agora - (userData.lastInvest || 0) < tempoEspera) {
        const restante = Math.ceil((tempoEspera - (agora - (userData.lastInvest || 0))) / 60000);
        return message.reply(`⏳ O mercado financeiro está instável. Volta em **${restante} minutos**.`);
    }

    // 3. Lógica de Mercado (Calculada num único bloco)
    const sorte = Math.random();
    let resultado;
    let cor;
    let mudanca;

    if (sorte > 0.55) { // 45% de chance de lucro
        const mult = (Math.random() * 0.5) + 0.1; // Ganho entre 10% e 60%
        mudanca = Math.floor(quantia * mult);
        userData.money += mudanca;
        resultado = `📈 **LUCRO!** As ações subiram e ganhaste **${mudanca.toLocaleString()}** moedas.`;
        cor = 0x2ecc71; // Verde
    } else { // 55% de chance de perda
        const mult = (Math.random() * 0.3) + 0.1; // Perda entre 10% e 40%
        mudanca = Math.floor(quantia * mult);
        userData.money -= mudanca;
        resultado = `📉 **QUEDA!** O mercado derreteu e perdeste **${mudanca.toLocaleString()}** moedas.`;
        cor = 0xe74c3c; // Vermelho
    }

    // 4. Gravação Única no Banco
    userData.lastInvest = agora;
    await userData.save();

    // 5. Resposta Visual
    const embed = {
        title: "🏛️ Bolsa de Valores",
        description: resultado,
        color: cor,
        fields: [{ name: "Saldo Atual", value: `💰 ${userData.money.toLocaleString()} moedas` }],
        timestamp: new Date()
    };

    return message.reply({ embeds: [embed] });
}

    // ==================== 🏆 COMANDO TOP ====================
    if (command === 'top') {
        const topRicos = await User.find().sort({ money: -1 }).limit(10);
        let lista = topRicos.map((u, i) => `**${i + 1}.** <@${u.userId}> — ${u.money.toLocaleString()} moedas`).join('\n');
        
        const embed = new EmbedBuilder()
            .setTitle('🏆 TOP 10 RICOS')
            .setColor('#FFD700')
            .setDescription(lista || "Ninguém ainda.");
        return message.reply({ embeds: [embed] });
    }

// ==================== 🚀 COMANDO VOTE (COMPLETO) ====================
    if (command === 'votar' || command === 'vote') {
        const embedVoto = new EmbedBuilder()
            .setColor('#ff3366')
            .setAuthor({ name: 'Top.gg - Sistema de Votos', iconURL: 'https://cdn.discordapp.com/emojis/1083437286161485824.png' })
            .setTitle('🚀 Ajude o OmniBot e Ganhe Recompensas!')
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription(
                `Votar no bot ajuda a nossa comunidade a crescer e você ainda sai ganhando!\n\n` +
                `💰 **Recompensa:** \`5.000 moedas\`\n` +
                `⏰ **Intervalo:** A cada \`12 horas\``
            )
            .addFields(
                { name: '🔗 Link Direto', value: '[CLIQUE AQUI PARA VOTAR](https://top.gg/bot/1453894302978670604/vote)' },
                { name: '📢 Como funciona?', value: 'Após votar, o Top.gg nos avisa e eu envio seu dinheiro e um aviso no seu PV automaticamente!' }
            )
            .setFooter({ text: `Solicitado por ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        const botaoVoto = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Votar no Top.gg')
                .setURL('https://top.gg/bot/ID_DO_SEU_BOT/vote')
                .setStyle(ButtonStyle.Link)
        );

        return message.reply({ embeds: [embedVoto], components: [botaoVoto] });
    }
    // ==================== ❤️ COMANDO SHIP (OTIMIZADO) ====================
    if (command === 'ship') {
        const users = message.mentions.users.map(u => u);

        if (users.length < 2) {
            return message.reply('❌ Precisas de mencionar duas pessoas para ver a compatibilidade! Ex: `!ship @user1 @user2`');
        }

        const user1 = users[0];
        const user2 = users[1];

        // Lógica para a porcentagem ser sempre a mesma para o mesmo par (Seed baseada nos IDs)
        // Isso evita spam, pois o resultado não muda se repetirem o comando.
        const combinedId = (BigInt(user1.id) + BigInt(user2.id)).toString();
        const lovePercent = parseInt(combinedId.substring(combinedId.length - 2)) || Math.floor(Math.random() * 101);

        // Barra de progresso visual (Simples e leve)
        const progress = Math.floor(lovePercent / 10);
        const bar = "❤️".repeat(progress) + "🖤".repeat(10 - progress);

        let status = "";
        if (lovePercent < 20) status = "💔 Horrível. Nem tentem.";
        else if (lovePercent < 50) status = "😐 Talvez como amigos...";
        else if (lovePercent < 80) status = "🔔 Há esperança! Um jantar resolvia.";
        else if (lovePercent < 95) status = "💖 Que casal lindo! Já podem casar.";
        else status = "💍 ALMAS GÊMEAS! O amor da vida toda.";

        const embed = new EmbedBuilder()
            .setTitle('💘 Calculadora do Amor Omni')
            .setColor('#FF1493')
            .setDescription(`Será que **${user1.username}** e **${user2.username}** combinam?\n\n**${lovePercent}%** [${bar}]\n\n> ${status}`)
            .setFooter({ text: 'Dica: Usem !casar se o amor for real!' });

        return message.reply({ embeds: [embed] });
    }

// ==================== 💍 COMANDO CASAR (ALTAMENTE OTIMIZADO) ====================
    if (command === 'casar') {
        const target = message.mentions.users.first();
        const custo = 25000;

        if (!target) return message.reply('❌ Precisas de marcar (@) a pessoa!');
        if (target.id === message.author.id) return message.reply('❌ Não te podes casar contigo próprio!');
        if (target.bot) return message.reply('❌ Robôs não têm sentimentos... nem moedas!');

        // 1. Verificações rápidas antes do botão
        if (userData.money < custo) return message.reply(`❌ Não tens **${custo.toLocaleString()} moedas** para as taxas.`);
        if (userData.marriedWith) return message.reply('❌ Já estás casado(a)! Divorcia-te primeiro.');

        let targetData = await User.findOne({ userId: target.id });
        if (!targetData) targetData = await User.create({ userId: target.id });

        if (targetData.marriedWith) return message.reply('❌ Essa pessoa já está casada!');
        if (targetData.money < custo) return message.reply(`❌ ${target.username} não tem moedas suficientes para a cerimônia.`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('aceitar_casar').setLabel('Aceitar Casamento').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('recusar_casar').setLabel('Recusar').setStyle(ButtonStyle.Danger)
        );

        const pedido = await message.reply({
            content: `💍 **PEDIDO DE CASAMENTO**\n${target}, aceitas casar com ${message.author}?\n⚠️ *Custo: **${custo.toLocaleString()} moedas** de cada.*`,
            components: [row]
        });

        const filter = i => i.user.id === target.id;
        const collector = pedido.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'aceitar_casar') {
                // RE-VERIFICAÇÃO DE SALDO (Segurança anti-exploit)
                const freshAuthor = await User.findOne({ userId: message.author.id });
                const freshTarget = await User.findOne({ userId: target.id });

                if (freshAuthor.money < custo || freshTarget.money < custo) {
                    return i.update({ content: '❌ Alguém gastou o dinheiro durante o pedido! Casamento cancelado.', components: [] });
                }

                // Atualiza os dois de uma vez
                freshAuthor.money -= custo;
                freshAuthor.marriedWith = target.id;
                freshAuthor.affinity = 0;

                freshTarget.money -= custo;
                freshTarget.marriedWith = message.author.id;
                freshTarget.affinity = 0;

                await freshAuthor.save();
                await freshTarget.save();

                return i.update({ content: `💖 **VIVAM OS NOIVOS!** ${message.author} e ${target} casaram-se oficialmente! 🎉`, components: [] });
            } else {
                return i.update({ content: `💔 O pedido foi recusado...`, components: [] });
            }
        });
    }
    // ==================== 💔 COMANDO DIVORCIAR (COM CONFIRMAÇÃO) ====================
    if (command === 'divorciar') {
        const conjugeId = userData.marriedWith;

        if (!conjugeId) {
            return message.reply('❌ Estás solteiro, não há ninguém para divorciar.');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirmar_divorcio')
                .setLabel('Sim, quero o divórcio')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancelar_divorcio')
                .setLabel('Não, mudei de ideia')
                .setStyle(ButtonStyle.Secondary)
        );

        const pergunta = await message.reply({
            content: `⚠️ **TEM CERTEZA?**\nEstás prestes a separar-te de <@${conjugeId}>. Toda a vossa afinidade será zerada e não há volta atrás.\nDesejas mesmo divorciar-te?`,
            components: [row]
        });

        const filter = i => i.user.id === message.author.id;
        const collector = pergunta.createMessageComponentCollector({ filter, time: 30000 });

        collector.on('collect', async i => {
            if (i.customId === 'confirmar_divorcio') {
                // Limpa os dados do autor (userData que já carregamos)
                userData.marriedWith = null;
                userData.affinity = 0;
                await userData.save();

                // Limpa o perfil do ex-cônjuge no banco de dados
                await User.updateOne(
                    { userId: conjugeId }, 
                    { $set: { marriedWith: null, affinity: 0 } }
                );

                return i.update({ 
                    content: `💔 **O divórcio foi oficializado.** Estás oficialmente solteiro(a) e a vossa afinidade foi zerada.`, 
                    components: [] 
                });
            } else {
                return i.update({ 
                    content: `💖 **Ufa!** O amor venceu. O divórcio foi cancelado.`, 
                    components: [] 
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                pergunta.edit({ content: '⏳ O tempo acabou. O pedido de divórcio foi cancelado automaticamente.', components: [] }).catch(() => {});
            }
        });
    }

// ==================== 💍 VER CASAMENTO (OTIMIZADO) ====================
    if (command === 'vercasamento' || command === 'casamento') {
        const conjugeId = userData.marriedWith;

        // 1. Se não tiver casado, nem faz busca no banco (Economiza RAM)
        if (!conjugeId) {
            return message.reply('❌ Não estás casado(a)! Usa `!casar @user` para pedires alguém em casamento.');
        }

        // 2. Lógica de Status baseada na Afinidade
        const afinidade = userData.affinity || 0;
        let status = '💍 Recém-Casados';
        let cor = '#FF69B4'; // Rosa padrão

        if (afinidade > 500) {
            status = '💎 Amor Eterno';
            cor = '#00FFFF'; // Ciano para níveis altos
        } else if (afinidade > 100) {
            status = '💖 Casal Apaixonado';
            cor = '#FF0000'; // Vermelho
        } else if (afinidade > 50) {
            status = '🌹 Relação Estável';
        }

        const embed = new EmbedBuilder()
            .setTitle('📜 Certidão de Casamento Omni')
            .setColor(cor)
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/3656/3656861.png') // Ícone de alianças
            .addFields(
                { name: '❤️ Cônjuge', value: `<@${conjugeId}>`, inline: true },
                { name: '💖 Afinidade', value: `**${afinidade}** pontos`, inline: true },
                { name: '📊 Status', value: `\`${status}\``, inline: false }
            )
            .setFooter({ text: 'Dica: Aumenta a afinidade com !beijar ou !cartinha' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

// ==================== 💌 COMANDO CARTINHA (OTIMIZADO) ====================
    if (command === 'cartinha' || command === 'letter') {
        const conjugeId = userData.marriedWith;

        // 1. Verificações de Segurança
        if (!conjugeId) return message.reply('❌ Só podes enviar cartinhas se estiveres casado(a)!');
        
        const target = message.mentions.users.first();
        if (!target || target.id !== conjugeId) {
            return message.reply(`❌ Precisas de marcar o teu cônjuge (<@${conjugeId}>) para lhe enviares uma cartinha!`);
        }

        const custo = 7500;
        if (userData.money < custo) {
            return message.reply(`❌ Uma cartinha perfumada custa **${custo.toLocaleString()} moedas**. Não tens saldo suficiente!`);
        }

        // 2. Execução (Gasta dinheiro e gera afinidade)
        try {
            const pontosGanhos = Math.floor(Math.random() * 4) + 3; // Ganha entre 3 e 6 pontos
            
            userData.money -= custo;
            userData.affinity = (userData.affinity || 0) + pontosGanhos;
            
            // 3. Otimização Mongoose: Atualiza o parceiro sem precisar carregar o perfil dele na RAM
            await User.updateOne(
                { userId: conjugeId }, 
                { $inc: { affinity: pontosGanhos } }
            );

            await userData.save();

            const embed = new EmbedBuilder()
                .setColor('#FF1493')
                .setTitle('💌 Uma Cartinha de Amor Chegou!')
                .setDescription(`${message.author} enviou uma carta escrita à mão para ${target}!\n\n> "O meu amor por ti cresce a cada dia..."`)
                .addFields(
                    { name: '💖 Afinidade', value: `**+${pontosGanhos}** pontos`, inline: true },
                    { name: '💰 Custo', value: `\`${custo.toLocaleString()}\``, inline: true }
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] });

        } catch (err) {
            console.error("Erro no comando cartinha:", err);
            return message.reply("❌ O correio falhou! Tenta enviar a cartinha novamente mais tarde.");
        }
    }
// ==================== 💋 COMANDO BEIJAR (OTIMIZADO) ====================
    if (command === 'beijar' || command === 'kiss') {
        const target = message.mentions.users.first();

        // 1. Verificações Iniciais
        if (!target) return message.reply('❌ Precisas de marcar (@) quem queres beijar!');
        if (target.id === message.author.id) return message.reply('❌ Beijar o espelho não conta! Marca outra pessoa.');
        if (target.bot) return message.reply('❌ Beijar circuitos eletrónicos dá choque! Tenta alguém real.');

        // 2. Cooldown para evitar spam (10 segundos)
        const agora = Date.now();
        const cooldownSocial = 10000; 
        if (agora - (userData.lastSocial || 0) < cooldownSocial) {
            return message.reply("⏳ Calma! Beijar demais cansa. Espera uns segundos.");
        }

        // 3. Lógica de Afinidade (Se estiverem casados)
        let msgAdicional = "";
        if (userData.marriedWith === target.id) {
            const pts = Math.floor(Math.random() * 3) + 1; // 1 a 3 pontos
            
            userData.affinity = (userData.affinity || 0) + pts;
            
            // Atualiza o cônjuge no banco de forma atômica (leve)
            await User.updateOne({ userId: target.id }, { $inc: { affinity: pts } });
            
            msgAdicional = `\n💖 **O amor está no ar!** Ganharam **+${pts}** de afinidade.`;
        }

        // 4. Salva o tempo da última interação social
        userData.lastSocial = agora;
        await userData.save();

        // 5. Resposta Visual
        const embed = new EmbedBuilder()
            .setColor('#FF69B4')
            .setDescription(`💋 ${message.author} deu um beijo apaixonado em ${target}!${msgAdicional}`);

        return message.reply({ embeds: [embed] });
    }
// ==================== 💆 COMANDO CAFUNÉ (OTIMIZADO) ====================
    if (command === 'cafune' || command === 'headpat') {
        const target = message.mentions.users.first();

        // 1. Verificações Básicas
        if (!target) return message.reply('❌ Precisas de marcar (@) alguém para fazer um cafuné!');
        if (target.id === message.author.id) return message.reply('❌ Fazeres cafuné em ti próprio é apenas coçar a cabeça!');

        // 2. Cooldown de Interação Social (10 segundos) para evitar spam
        const agora = Date.now();
        const cooldownSocial = 10000; 
        if (agora - (userData.lastSocial || 0) < cooldownSocial) {
            return message.reply("⏳ Relaxa! Espera uns segundos para o próximo carinho.");
        }

        // 3. Lógica de Afinidade para Casados
        let msgBonus = "";
        if (userData.marriedWith === target.id) {
            const pts = 1; // Cafuné dá sempre 1 ponto fixo (é mais simples que o beijo)
            userData.affinity = (userData.affinity || 0) + pts;
            
            // Atualiza o parceiro no banco (Leve e rápido)
            await User.updateOne({ userId: target.id }, { $inc: { affinity: pts } });
            msgBonus = `\n😊 <@${target.id}> adorou o carinho! **+1** de afinidade.`;
        }

        // 4. Salva o estado
        userData.lastSocial = agora;
        await userData.save();

        // 5. Resposta
        const embed = new EmbedBuilder()
            .setColor('#DEB887') // Cor de "conforto"
            .setDescription(`💆 ${message.author} está a fazer um cafuné relaxante em ${target}!${msgBonus}`);

        return message.reply({ embeds: [embed] });
    }
    
// ==================== 🤗 COMANDO ABRAÇAR (OTIMIZADO) ====================
    if (command === 'abracar' || command === 'hug') {
        const target = message.mentions.users.first();

        // 1. Verificações de Alvo
        if (!target) return message.reply('❌ Marca alguém para dares um abraço quentinho!');
        if (target.id === message.author.id) return message.reply('❌ Um abraço em ti próprio? Estás carente? 🥺');

        // 2. Cooldown Social Integrado (10 segundos)
        const agora = Date.now();
        const cooldownSocial = 10000; 
        if (agora - (userData.lastSocial || 0) < cooldownSocial) {
            return message.reply("⏳ Calma! Muitos abraços ao mesmo tempo tiram o fôlego. Espera um pouco.");
        }

        // 3. Bónus de Afinidade (Casados)
        let msgAfinidade = "";
        if (userData.marriedWith === target.id) {
            const pts = 2; // O abraço é mais forte que o cafuné, dá 2 pontos
            userData.affinity = (userData.affinity || 0) + pts;
            
            // Atualiza o parceiro de forma atómica no banco
            await User.updateOne({ userId: target.id }, { $inc: { affinity: pts } });
            msgAfinidade = `\n💖 O vosso vínculo ficou mais forte! **+${pts}** de afinidade.`;
        }

        // 4. Salva o cooldown no perfil do autor
        userData.lastSocial = agora;
        await userData.save();

        // 5. Embed Visual
        const embed = new EmbedBuilder()
            .setColor('#5865F2') // Azul Blurple do Discord (cor acolhedora)
            .setDescription(`🤗 ${message.author} deu um abraço bem apertado em ${target}!${msgAfinidade}`);

        return message.reply({ embeds: [embed] });
    }
// ==================== 🖐️ COMANDO TAPA (OTIMIZADO) ====================
    if (command === 'tapa' || command === 'slap') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Precisas de marcar alguém para dar um tapa!');
        if (target.id === message.author.id) return message.reply('❌ Dar um tapa em ti próprio? Estás bem? 🤨');

        const agora = Date.now();
        if (agora - (userData.lastSocial || 0) < 10000) return message.reply("⏳ Calma, a violência não é a resposta! Espera uns segundos.");

        userData.lastSocial = agora;
        await userData.save();

        return message.reply(`🖐️ **POW!** ${message.author} deu um tapa bem estalado em ${target}!`);
    }

// ==================== ⚔️ COMANDO ATACAR (SISTEMA DE ARMAS) ====================
    if (command === 'atacar' || command === 'attack') {
        const target = message.mentions.users.first();
        if (!target || target.id === message.author.id || target.bot) {
            return message.reply('❌ Escolhe um alvo válido (que não sejas tu nem um bot)!');
        }

        const targetData = await User.findOne({ userId: target.id }) || new User({ userId: target.id });
        const agora = Date.now();
        
        // Cooldown de 15 segundos
        if (agora - (userData.lastSocial || 0) < 15000) {
            return message.reply("⏳ Estás sem fôlego! Espera um pouco antes da próxima luta.");
        }

        const euTenhoArma = (userData.inventory || []).includes('arma');
        const alvoTemArma = (targetData.inventory || []).includes('arma');

        let venceu = false;
        let descricao = "";

        // --- LÓGICA DE COMBATE COM ARMAS ---
        if (euTenhoArma && !alvoTemArma) {
            // Vitória garantida se só o atacante tiver arma
            venceu = true;
            descricao = `🔫 **DOMÍNIO TOTAL!** ${message.author} sacou uma Pistola 9mm. ${target} não teve chance e rendeu-se imediatamente! 🏆`;
        } 
        else if (!euTenhoArma && alvoTemArma) {
            // Derrota garantida se o alvo tiver arma e o atacante não
            venceu = false;
            descricao = `🛡️ **REAÇÃO ARMADA!** ${message.author} tentou atacar, mas ${target} puxou uma Pistola 9mm e colocou o agressor para correr! 🏃💨`;
        } 
        else if (euTenhoArma && alvoTemArma) {
            // Duelo se ambos tiverem arma (50/50)
            venceu = Math.random() > 0.5;
            descricao = venceu 
                ? `💥 **TIROTEIO!** Ambos estavam armados, mas ${message.author} foi mais rápido no gatilho e venceu o duelo contra ${target}! 🏆`
                : `💥 **TIROTEIO!** No meio da troca de tiros, ${target} levou a melhor e desarmou ${message.author}!`;
        } 
        else {
            // Luta comum se ninguém tiver arma (50/50)
            venceu = Math.random() > 0.5;
            descricao = venceu 
                ? `⚔️ **Luta de rua!** ${message.author} atacou ${target} e venceu no soco! 🏆`
                : `🛡️ **Contra-ataque!** ${message.author} tentou atacar ${target}, mas acabou por levar a pior na briga!`;
        }

        userData.lastSocial = agora;
        await userData.save();

        const embed = new EmbedBuilder()
            .setTitle('🤺 ARENA DE COMBATE')
            .setColor(venceu ? '#2ecc71' : '#e74c3c')
            .setDescription(descricao)
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
// ==================== 🥷 COMANDO ROUBAR (SISTEMA OMNI ARMAS) ====================
    if (command === 'roubar' || command === 'steal') {
        const target = message.mentions.users.first();
        
        // 1. Verificações de Segurança
        if (!target) return message.reply('❌ Precisas de marcar (@) a vítima!');
        if (target.id === message.author.id) return message.reply('❌ Não podes roubar a ti próprio!');
        if (target.bot) return message.reply('❌ Não podes roubar robôs!');

        let targetData = await User.findOne({ userId: target.id }) || await User.create({ userId: target.id });
        if (targetData.money < 500) return message.reply('❌ Esta pessoa está falida, não vale o risco!');

        // --- INVENTÁRIOS ---
        const myInv = userData.inventory || [];
        const victimInv = targetData.inventory || [];

        const euTenhoArma = myInv.includes('arma');
        const euTenhoFaca = myInv.includes('faca');
        const alvoTemArma = victimInv.includes('arma');
        const indexEscudo = victimInv.indexOf('escudo');

        // 2. 🛡️ DEFESA PRIORITÁRIA: PISTOLA (Vítima)
        if (alvoTemArma) {
            const multaReacao = 3000;
            userData.money = Math.max(0, userData.money - multaReacao);
            await userData.save();
            return message.reply(`🔫 **REAGIRAM!** Tentaste roubar ${target.username}, mas ele sacou uma **Pistola 9mm**! Fugiste a correr e perdeste **${multaReacao.toLocaleString()} moedas**.`);
        }

        // 3. 🛡️ DEFESA SECUNDÁRIA: ESCUDO (Vítima)
        if (indexEscudo !== -1) {
            targetData.inventory.splice(indexEscudo, 1);
            targetData.markModified('inventory');
            await targetData.save();
            return message.reply(`🛡️ O roubo falhou! **${target.username}** tinha um **Escudo** que foi destruído, mas protegeu o dinheiro!`);
        }

        // 4. 🔪 CÁLCULO DE CHANCE (Ataque)
        let chanceSucesso = 0.30; // 30% base
        if (euTenhoFaca) chanceSucesso = 0.50; // Faca sobe para 50%
        if (euTenhoArma) chanceSucesso = 0.75; // Pistola no ataque sobe para 75%

        // 5. EXECUÇÃO
        if (Math.random() < chanceSucesso) {
            // Sucesso: Rouba entre 10% e 20% do alvo
            const roubo = Math.floor(targetData.money * (Math.random() * (0.20 - 0.10) + 0.10));
            
            userData.money += roubo;
            targetData.money -= roubo;

            await userData.save();
            await targetData.save();

            let bonusMsg = "";
            if (euTenhoArma) bonusMsg = " 🔫 *(A tua Pistola garantiu o domínio!)*";
            else if (euTenhoFaca) bonusMsg = " 🔪 *(A tua faca ajudou no silêncio!)*";

            return message.reply(`💰 **Assalto bem sucedido!** Levaste **${roubo.toLocaleString()} moedas** de ${target.username}.${bonusMsg}`);
        } else {
            // Falha
            const perda = 1000;
            userData.money = Math.max(0, userData.money - perda);
            await userData.save();
            return message.reply(`👮 **A casa caiu!** O alarme disparou e tiveste de largar **${perda.toLocaleString()} moedas** para conseguir fugir!`);
        }
    }
 // ==================== 🏴 COMANDO ENTRAR NA FACÇÃO (SISTEMA COMPLETO) ====================
if (command === 'entrarfaccao' || command === 'entrar') {
    const inventory = userData.inventory || [];
    
    // 1. ID do Cargo que o jogador vai ganhar no Discord
    // Substitua os números abaixo pelo ID real do cargo no seu servidor
    const cargoDiscordID = "1454692749482660003";

    // 2. Verificação: Já é membro?
    if (userData.cargo === "Membro da Facção") {
        return message.reply("⚠️ Tu já fazes parte da elite!");
    }

    // 3. Verificação: Tem o convite?
    if (!inventory.includes('faccao')) {
        return message.reply("❌ Não tens o **Convite de Facção** na mochila. Compra um no `!submundo`!");
    }

    try {
        // 4. REMOVE O ITEM DA MOCHILA (CONSUMIR)
        const index = userData.inventory.indexOf('faccao');
        if (index > -1) {
            userData.inventory.splice(index, 1);
        }

        // 5. ATUALIZA O BANCO DE DATOS
        userData.cargo = "Membro da Facção";
        userData.markModified('inventory');
        userData.markModified('cargo');
        await userData.save();

        // 6. ATRIBUI O CARGO NO DISCORD (Ação Visual)
        const role = message.guild.roles.cache.get(cargoDiscordID);
        if (role) {
            await message.member.roles.add(role).catch(e => console.log("Erro ao dar cargo: Bot sem permissão."));
        }

        // 7. RESPOSTA VISUAL (Embed)
        const embed = {
            color: 0x1a1a1a,
            title: "🔥 Iniciação Concluída!",
            description: `O teu **Convite** foi destruído.\n\nBem-vindo à elite, **${message.author.username}**.\nAgora és oficialmente um **Membro da Facção** no banco de dados e no servidor!`,
            thumbnail: { url: 'https://cdn-icons-png.flaticon.com/512/743/743225.png' },
            footer: { text: "O teu status é permanente." }
        };

        return message.reply({ embeds: [embed] });

    } catch (err) {
        console.error(err);
        return message.reply("❌ Ocorreu um erro ao processar a tua entrada.");
    }
}
if (command === 'dominio') {
    // Busca todos os usuários que são da facção
    const membros = await User.find({ cargo: "Membro da Facção" });
    const totalPoder = membros.length;
    const riquezaTotal = membros.reduce((acc, user) => acc + user.money, 0);

    const embed = {
        color: 0x000000,
        title: "🏴 Estatísticas da Organização",
        fields: [
            { name: "👥 Soldados", value: `${totalPoder}`, inline: true },
            { name: "💰 Fundo de Caixa", value: `${riquezaTotal.toLocaleString()} moedas`, inline: true },
            { name: "📊 Influência", value: totalPoder > 5 ? "🔥 Alta (Domínio da Cidade)" : "⚖️ Baixa (Em ascensão)", inline: false }
        ]
    };
    return message.reply({ embeds: [embed] });
}
if (command === 'assaltodupla') {
    // 1. Verificação de Casamento
    if (!userData.marriedWith) {
        return message.reply("❌ Este crime exige um parceiro de extrema confiança. Precisas de estar **casado** para planear este assalto!");
    }

    // 2. Cooldown (6 horas para não quebrar a economia)
    const cooldown = 21600000; 
    const agora = Date.now();
    if (agora - (userData.lastRob || 0) < cooldown) {
        const restante = Math.ceil((cooldown - (agora - (userData.lastRob || 0))) / 3600000);
        return message.reply(`⏳ A polícia está a vigiar a vossa casa. Esperem mais **${restante} horas** para o próximo assalto.`);
    }

    // 3. Lógica de Ganho (Valores altos por ser em dupla)
    const ganho = Math.floor(Math.random() * 30000) + 15000; // Entre 15k e 45k
    
    userData.money += ganho;
    userData.lastRob = agora;
    userData.affinity += 15; // Aumenta a afinidade do casal no seu Schema
    await userData.save();

    // 4. Resposta Temática
    const embed = {
        title: "🏦 Assalto em Dupla!",
        description: `Tu e o teu cônjuge (<@${userData.marriedWith}>) planearam o golpe perfeito no Banco Central!`,
        color: 0xff0000, // Vermelho
        fields: [
            { name: "💰 Lucro Total", value: `${ganho.toLocaleString()} moedas`, inline: true },
            { name: "❤️ Afinidade", value: "+15 pontos", inline: true }
        ],
        footer: { text: "O amor e o crime andam de mãos dadas." }
    };

    return message.reply({ embeds: [embed] });
}
if (command === 'lavar') {
    if (userData.cargo !== "Membro da Facção") return message.reply("🚫 Apenas a elite sabe como lavar dinheiro.");

    const quantia = parseInt(args[0]);
    if (!quantia || quantia <= 0) return message.reply("❓ Quanto queres lavar?");
    if (userData.money < quantia) return message.reply("❌ Não tens esse dinheiro todo.");

    // Sorte: 70% de chance de sucesso
    if (Math.random() > 0.3) {
        const bonus = Math.floor(quantia * 0.15); // Ganha 15% de bônus sobre o valor
        userData.money += bonus;
        await userData.save();
        return message.reply(`🧼 **Dinheiro Limpo!** Lavaste **${quantia.toLocaleString()}** e conseguiste um retorno de **${bonus.toLocaleString()}** em bónus.`);
    } else {
        const perda = Math.floor(quantia * 0.5); // Perde metade se for pego
        userData.money -= perda;
        await userData.save();
        return message.reply(`🚨 **PF na porta!** A lavagem foi descoberta e o governo confiscou **${perda.toLocaleString()}** das tuas contas.`);
    }
}
// ==================== ❄️ COMANDO TRÁFICO (EXCLUSIVO FACÇÃO) ====================
if (command === 'traficar' || command === 'trafico') {
    // 1. Verificação de Cargo
    if (userData.cargo !== "Membro da Facção") {
        return message.reply("🚫 **Acesso Negado.** Apenas membros da elite da facção conhecem as rotas de tráfico.");
    }

    const now = Date.now();
    const cooldown = 7200000; // 2 horas de espera
    const lastTrafico = userData.lastTrafico || 0;

    if (now - lastTrafico < cooldown) {
        const restante = cooldown - (now - lastTrafico);
        const horas = Math.floor(restante / 3600000);
        const minutos = Math.ceil((restante % 3600000) / 60000);
        return message.reply(`⏳ A polícia está a vigiar as rotas. Volta em **${horas}h e ${minutos}min**.`);
    }

    // 2. Lógica de Sucesso (80% sucesso, 20% prejuízo/prisão)
    const sorte = Math.random();
    
    if (sorte > 0.20) {
        let ganho = Math.floor(Math.random() * 20001) + 15000; // Ganha entre 15k e 35k
        
        // Bônus se tiver Pistola no inventário
        if ((userData.inventory || []).includes('arma')) {
            ganho += 5000;
        }

        userData.money += ganho;
        userData.lastTrafico = now;
        await userData.save();

        return message.reply(`📦 **Entrega concluída!** Movimentaste a mercadoria com sucesso e lucraste **${ganho.toLocaleString()} moedas**.`);
    } else {
        const multa = 10000;
        userData.money = Math.max(0, userData.money - multa);
        userData.lastTrafico = now; // Mesmo perdendo, entra em cooldown
        await userData.save();
        
        return message.reply(`🚨 **Cercado!** Tiveste de abandonar a mercadoria e subornar os polícias. Perdeste **${multa.toLocaleString()} moedas**.`);
    }
}
// ==================== 🎯 COMANDO MISSÕES (EXCLUSIVO FACÇÃO) ====================
if (command === 'missao' || command === 'mission') {
    if (userData.cargo !== "Membro da Facção") {
        return message.reply("🚫 As missões de elite só estão disponíveis para a Facção.");
    }

    const now = Date.now();
    if (now - (userData.lastMission || 0) < 3600000) return message.reply("⏳ Já realizaste uma operação recentemente. Descansa 1 hora.");

    const missoes = [
        { nome: "Escoltar o Chefe", ganho: 12000, desc: "Garantiste que o comboio chegasse seguro." },
        { nome: "Hackear o Banco Central", ganho: 25000, desc: "Desviaste fundos de contas inativas." },
        { nome: "Queima de Arquivo", ganho: 15000, desc: "Eliminaste provas contra a organização." },
        { nome: "Infiltração Policial", ganho: 18000, desc: "Recuperaste o dossiê da facção na esquadra." }
    ];

    const missaoSorteada = missoes[Math.floor(Math.random() * missoes.length)];

    userData.money += missaoSorteada.ganho;
    userData.lastMission = now;
    userData.missionCount = (userData.missionCount || 0) + 1;
    
    await userData.save();

    return message.reply(`🎯 **MISSÃO CONCLUÍDA: ${missaoSorteada.nome}**\n> ${missaoSorteada.desc}\n💰 Recompensa: **${missaoSorteada.ganho.toLocaleString()} moedas**.`);
}
// ==================== 🌑 COMANDO CRIME (VERSÃO OMNI - ARMA INTEGRADA) ====================
    if (command === 'crime') {
        const now = Date.now();
        const cooldown = 1800000; // 30 minutos
        const lastCrime = userData.lastCrime || 0;

        // 1. Verificação de Cooldown
        if (now - lastCrime < cooldown) {
            const restante = cooldown - (now - lastCrime);
            const minutos = Math.ceil(restante / 60000);
            return message.reply(`⏳ A polícia ainda está à tua procura! Espera **${minutos} minutos**.`);
        }

        const myInv = userData.inventory || [];
        
        // Verificação de itens no inventário
        const indexDinamite = myInv.indexOf('dinamite');
        const temDinamite = indexDinamite !== -1;
        const temFaccao = myInv.includes('faccao');
        const temArma = myInv.includes('arma');

        let chanceSucesso = 0.45; // 45% base
        let multiplicador = 1;

        // --- LÓGICA DE BÔNUS (PRIORIDADE) ---
        
        // Bônus da Pistola (Melhoria leve e permanente)
        if (temArma) {
            chanceSucesso = 0.60; 
            multiplicador = 1.5;
        }

        // Bônus da Dinamite (Melhoria alta, mas consome o item)
        if (temDinamite) {
            chanceSucesso = 0.75; 
            multiplicador = 2.5;
        }

        // Bônus da Facção (Poder Supremo)
        if (temFaccao) {
            chanceSucesso = 0.90; 
            multiplicador = 125;
        }

        // 2. Execução
        const sorteio = Math.random();

        if (sorteio < chanceSucesso) {
            const ganhoBase = Math.floor(Math.random() * 3001) + 2000; 
            const ganhoFinal = Math.floor(ganhoBase * multiplicador);

            userData.money += ganhoFinal;
            userData.lastCrime = now;

            // Lógica de consumo: Só gasta a dinamite se o jogador NÃO tiver Facção
            if (temDinamite && !temFaccao) {
                userData.inventory.splice(indexDinamite, 1);
                userData.markModified('inventory');
            }

            await userData.save();

            let msg = `🥷 **O golpe foi um sucesso!** `;
            
            if (temFaccao) {
                msg += `Dominaste a cidade com a tua **Facção** e lucraste **${ganhoFinal.toLocaleString()} moedas**! 🏴`;
            } else if (temDinamite) {
                msg += `A **Dinamite** abriu o cofre! Lucraste **${ganhoFinal.toLocaleString()} moedas**! 🧨`;
            } else if (temArma) {
                msg += `Com a tua **Pistola**, rendeste os guardas e levaste **${ganhoFinal.toLocaleString()} moedas**! 🔫`;
            } else {
                msg += `Conseguiste escapar com **${ganhoFinal.toLocaleString()} moedas**! 💰`;
            }
            
            return message.reply(msg);

        } else {
            // Falha
            let multa = 1500;
            if (temFaccao) multa = 0; // Facção tem proteção contra multas
            else if (temArma) multa = 750; // Arma intimida a polícia, multa menor

            userData.money = Math.max(0, userData.money - multa);
            userData.lastCrime = now;
            await userData.save();

            if (temFaccao) {
                return message.reply(`👮 **A polícia cercou o local!** Mas os teus contatos na Facção tiraram-te de lá antes de seres multado.`);
            }

            return message.reply(`👮 **A casa caiu!** Tiveste de pagar uma "taxa" de **${multa.toLocaleString()} moedas** para não ires preso.`);
        }
    }
// ==================== 📢 COMANDO ANÚNCIO (OTIMIZADO) ====================
    if (command === 'anuncio' || command === 'broadcast') {
        // 1. Verificação de Permissão (Apenas Administradores)
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Não tens permissão de Administrador para usar este comando!');
        }

        // 2. Separar Canal e Mensagem
        const args = message.content.split(' ').slice(1);
        const channel = message.mentions.channels.first();
        const texto = args.slice(1).join(' ');

        if (!channel || !texto) {
            return message.reply('❓ Como usar: `!anuncio #canal Sua mensagem aqui`');
        }

        // 3. Criar a Embed de Anúncio
        const embedAnuncio = new EmbedBuilder()
            .setTitle('📢 Comunicado Oficial')
            .setColor('#F1C40F') // Amarelo vibrante
            .setDescription(texto)
            .setThumbnail(message.guild.iconURL())
            .setFooter({ text: `Enviado por: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        // 4. Enviar e dar feedback
        try {
            await channel.send({ embeds: [embedAnuncio] });
            return message.reply(`✅ Anúncio enviado com sucesso em ${channel}!`);
        } catch (err) {
            console.error(err);
            return message.reply('❌ Não consegui enviar a mensagem. Verifica se eu tenho permissão de ver esse canal!');
        }
    }

// ==================== 🗣️ COMANDO FALAR (OTIMIZADO) ====================
    if (command === 'falar' || command === 'say') {
        // 1. Verificação de Permissão (Apenas Staff com permissão de Gerenciar Mensagens)
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ Não tens permissão para fazer o bot falar!');
        }

        // 2. Pegar a mensagem
        const fala = args.join(' ');
        if (!fala) return message.reply('❓ O que queres que eu diga? Ex: `!falar Olá pessoal!`');

        // 3. Filtro de Segurança Anti-Spam de Menções
        // Impede que o bot seja usado para marcar @everyone ou @here se o autor não puder
        if (fala.includes('@everyone') || fala.includes('@here')) {
            if (!message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                return message.reply('❌ Não podes usar o bot para marcar todos!');
            }
        }

        // 4. Apagar a mensagem original do autor e enviar a do bot
        try {
            await message.delete(); // Remove o comando "!falar ..." para ficar limpo
            return message.channel.send(fala);
        } catch (err) {
            // Se o bot não tiver permissão de apagar mensagens, ele apenas envia a fala
            return message.channel.send(fala);
        }
    }

// ==================== 👤 COMANDO PERFIL (OTIMIZADO) ====================
if (command === 'perfil' || command === 'p' || command === 'me') {
    const inventory = userData.inventory || [];
    const cargo = userData.cargo || "Civil"; // Padrão é Civil se não tiver cargo
    
    // Configuração visual baseada no cargo
    const corEmbed = cargo === "Membro da Facção" ? "#2f3136" : "#0099ff";
    const emojiStatus = cargo === "Membro da Facção" ? "🏴‍☠️" : " citizen_emoji "; // Use um emoji de cidadão aqui
    const banner = cargo === "Membro da Facção" 
        ? "https://i.imgur.com/8pP2B7u.png" // Imagem temática de facção
        : "https://i.imgur.com/X4z3vX7.png"; // Imagem temática civil

    // Formatação do Inventário
    let itensFormatados = inventory.length > 0 
        ? inventory.map(item => `\`${item}\``).join(', ') 
        : "Nenhum item";

    const embed = {
        color: parseInt(corEmbed.replace('#', ''), 16),
        title: `${emojiStatus} Perfil de ${message.author.username}`,
        thumbnail: { url: message.author.displayAvatarURL({ dynamic: true }) },
        description: `**Status Social:** \`${cargo}\``,
        fields: [
            {
                name: "💰 Economia",
                value: `**Saldo:** ${userData.money.toLocaleString()} moedas\n**Trabalhos:** \`${userData.workCount || 0}\``,
                inline: true
            },
            {
                name: "🎯 Operações",
                value: `**Missões:** \`${userData.missionCount || 0}\`\n**Poder:** ${inventory.includes('arma') ? '🔥 Alto' : '⚖️ Médio'}`,
                inline: true
            },
            {
                name: "🎒 Mochila",
                value: itensFormatados,
                inline: false
            }
        ],
        footer: { text: `ID: ${message.author.id}` },
        timestamp: new Date()
    };

    return message.reply({ embeds: [embed] });
}
// ==================== 🏪 COMANDO !LOJA (VERSÃO COM RESUMOS) ====================
if (command === 'loja' || command === 'shop') {
    const emojis = { 
        "escudo": "🛡️", 
        "picareta": "⛏️", 
        "computador": "💻" 
    };

    // Filtra apenas os itens da categoria 'legal' e gera o texto usando os resumos
    const itensLegais = Object.entries(lojaItens)
        .filter(([id, info]) => info.categoria === "legal")
        .map(([id, info]) => {
            const status = info.estoque > 0 
                ? `🟢 Stock: **${info.estoque}**` 
                : "🔴 **ESGOTADO**";

            // O resumo (info.desc) aparece em itálico logo abaixo do nome e preço
            return `${emojis[id] || "📦"} **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\`\n> *${info.desc}*\n> ${status} | \`!comprar ${id}\``;
        });

    const embed = new EmbedBuilder()
        .setTitle("🏪 Loja Oficial do OmniBot")
        .setColor('#F1C40F') // Cor Amarela para representar a Loja Legal
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081559.png')
        .setDescription(
            "Bem-vindo à vitrine oficial! Aqui encontras equipamentos para trabalhar e proteger o teu património legalmente.\n\n" + 
            itensLegais.join('\n\n')
        )
        .setFooter({ text: "Dica: Itens de trabalho como a Picareta e o Computador aumentam a tua renda!" })
        .setTimestamp();

    return message.reply({ embeds: [embed] });
}
// ==================== 🌑 COMANDO !SUBMUNDO (VERSÃO COM RESUMOS) ====================
if (command === 'submundo' || command === 'blackmarket') {
    const emojis = { 
        "dinamite": "🧨", 
        "faca": "🔪", 
        "arma": "🔫", 
        "passaporte": "🎫", 
        "faccao": "🏴" 
    };

    // Filtra apenas os itens da categoria 'submundo'
    const itensIlegais = Object.entries(lojaItens)
        .filter(([id, info]) => info.categoria === "submundo")
        .map(([id, info]) => {
            const status = info.estoque > 0 
                ? `🟢 Stock: **${info.estoque}**` 
                : "🔴 **ESGOTADO**";

            // Itens lendários ganham um destaque visual diferente
            const prefixo = id === "faccao" ? "⭐ **RELÍQUIA**:" : "💀";

            // O resumo (info.desc) explica a vantagem criminal
            return `${prefixo} **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\`\n> *${info.desc}*\n> ${status} | \`!comprar ${id}\``;
        });

    const embedSub = new EmbedBuilder()
        .setTitle('🕵️ Mercado Negro - Conexão Submundo')
        .setColor('#1a1a1a') // Preto profundo para imersão
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/1000/1000966.png')
        .setDescription(
            "Cuidado onde pisas. Estes equipamentos são para profissionais que dominam as sombras e não temem a lei.\n\n" + 
            itensIlegais.join('\n\n')
        )
        .setFooter({ text: "Aviso: A posse destes itens pode atrair atenção indesejada da polícia." })
        .setTimestamp();

    return message.reply({ embeds: [embedSub] });
}
// ==================== 🛒 COMANDO COMPRAR (UNIVERSAL) ====================
if (command === 'comprar' || command === 'buy') {
    const itemID = args[0]?.toLowerCase(); // Pega o nome do item (ex: !comprar faca)

    // 1. Verifica se o item existe no nosso objeto principal
    const itemInfo = lojaItens[itemID];

    if (!itemInfo) {
        return message.reply("❌ Esse item não existe na nossa base de dados. Verifique o nome em `!loja` ou `!submundo`.");
    }

    // 2. Verifica se há estoque disponível
    if (itemInfo.estoque <= 0) {
        return message.reply(`❌ O item **${itemInfo.nome}** está esgotado no momento!`);
    }

    // 3. Verifica se o jogador tem dinheiro suficiente
    if (userData.money < itemInfo.preco) {
        const faltam = itemInfo.preco - userData.money;
        return message.reply(`❌ Dinheiro insuficiente! Faltam **${faltam.toLocaleString()}** moedas.`);
    }

    // 4. PROCESSANDO A COMPRA
    try {
        // Reduz o dinheiro
        userData.money -= itemInfo.preco;
        
        // Reduz o estoque no objeto (Opcional: se quiser que o estoque seja global)
        itemInfo.estoque -= 1;

        // Adiciona ao inventário (Garante que o array existe)
        if (!userData.inventory) userData.inventory = [];
        userData.inventory.push(itemID);

        // Salva as alterações
        userData.markModified('inventory');
        userData.markModified('money');
        await userData.save();

        // Resposta de Sucesso
        const local = itemInfo.categoria === 'submundo' ? "no Mercado Negro" : "na Loja";
        return message.reply(`✅ Compraste **${itemInfo.nome}** por **${itemInfo.preco.toLocaleString()}** moedas ${local}!`);

    } catch (err) {
        console.error("Erro ao comprar item:", err);
        return message.reply("❌ Ocorreu um erro ao processar a tua compra.");
    }
}
 // ==================== 📦 COMANDO USAR (OTIMIZADO) ====================
    if (command === 'usar') {
        const itemParaUsar = args[0]?.toLowerCase();
        
        if (!itemParaUsar) return message.reply("❌ Diz qual item queres usar! Ex: `!usar bilhete`.");

        // Procuramos o índice do item na mochila
        const inventory = userData.inventory || [];
        const index = inventory.indexOf(itemParaUsar);

        if (index === -1) return message.reply("❌ Não tens esse item na mochila!");

        try {
            // --- LÓGICA: BILHETE DE LOTERIA ---
            if (itemParaUsar === 'bilhete') {
                const ganho = Math.floor(Math.random() * 5000) + 500; // Mínimo de 500 para não ser triste
                userData.money += ganho;
                
                // Remove o item e salva
                userData.inventory.splice(index, 1);
                userData.markModified('inventory');
                await userData.save();

                return message.reply(`🎟️ Usaste o bilhete e a sorte sorriu! Ganhaste **${ganho.toLocaleString()} moedas**!`);
            }

            // --- LÓGICA: PASSAPORTE ---
            if (itemParaUsar === 'passaporte') {
                userData.lastWork = 0; // Zera o cooldown de trabalho
                
                userData.inventory.splice(index, 1);
                userData.markModified('inventory');
                await userData.save();

                return message.reply("🎫 Passaporte carimbado! O teu cansaço sumiu, podes `!trabalhar` novamente agora!");
            }

            // --- SE O ITEM NÃO TIVER FUNÇÃO DE USO ---
            // Itens como 'faca' ou 'escudo' são automáticos, não precisa de !usar
            const itensPassivos = {
                'escudo': '🛡️ O Escudo é automático! Ele protege-te de um roubo se o tiveres na mochila.',
                'faca': '🔪 A Faca é automática! Ela aumenta as tuas chances no comando `!roubar`.',
                'picareta': '⛏️ A Picareta é automática! Dá bônus sempre que usas `!trabalhar`.',
                'computador': '💻 O Computador é automático! Dá bônus de home office no `!trabalhar`.',
                'dinamite': '🧨 A Dinamite é automática! É consumida ao usar o comando `!crime`.'
            };

            if (itensPassivos[itemParaUsar]) {
                return message.reply(itensPassivos[itemParaUsar]);
            }

            return message.reply("❓ Esse item não tem uma função de uso direto.");

        } catch (err) {
            console.error("Erro ao usar item:", err);
            return message.reply("❌ Ocorreu um erro ao processar o uso do item.");
        }
    }
// ==================== 🎒 COMANDO MOCHILA (OTIMIZADO) ====================
    if (command === 'mochila' || command === 'inv' || command === 'inventory') {
        const alvo = message.mentions.users.first() || message.author;
        
        // Se for o autor, usa o userData já carregado. Se não, busca o alvo.
        let data = (alvo.id === message.author.id) 
            ? userData 
            : await User.findOne({ userId: alvo.id });

        if (!data || !data.inventory || data.inventory.length === 0) {
            return message.reply(alvo.id === message.author.id 
                ? "🎒 A tua mochila está vazia! Compra algo na `!loja`." 
                : `🎒 A mochila de **${alvo.username}** está vazia.`);
        }

        // Lógica de contagem de itens para não repetir nomes
        const contagem = {};
        data.inventory.forEach(item => { 
            contagem[item] = (contagem[item] || 0) + 1; 
        });

        const emojis = {
            "escudo": "🛡️", "passaporte": "🎫", "dinamite": "🧨", 
            "bilhete": "🎟️", "faca": "🔪", "picareta": "⛏️", "computador": "💻"
        };

        const listaItens = Object.entries(contagem)
            .map(([nome, qtd]) => {
                const emoji = emojis[nome] || "📦";
                // Deixa a primeira letra maiúscula para ficar bonito
                const nomeFormatado = nome.charAt(0).toUpperCase() + nome.slice(1);
                return `${emoji} **${nomeFormatado}** x\`${qtd}\``;
            })
            .join("\n");

        const embed = new EmbedBuilder()
            .setTitle(`🎒 Mochila de ${alvo.username}`)
            .setColor('#2F3136') // Cor discreta de fundo do Discord
            .setDescription(listaItens)
            .setFooter({ text: 'Dica: Itens como Escudo e Faca funcionam automaticamente!' });

        return message.reply({ embeds: [embed] });
    }
// ==================== 🧹 COMANDO CLEAR (OTIMIZADO) ====================
    if (command === 'clear' || command === 'limpar') {
        // 1. Verificação de Permissão
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('❌ Não tens permissão para limpar o chat!');
        }

        // 2. Definir a quantidade (padrão 10, máximo 100)
        const quantidade = parseInt(args[0]);

        if (isNaN(quantidade) || quantidade < 1 || quantidade > 100) {
            return message.reply('❓ Indica um número entre **1 e 100** para limpar.');
        }

        // 3. Execução da limpeza
        try {
            // Apaga a mensagem do comando antes de começar a limpeza
            await message.delete();

            // O bulkDelete apaga várias mensagens de uma vez (mais rápido)
            const apagadas = await message.channel.bulkDelete(quantidade, true);

            // Resposta temporária que se apaga sozinha em 5 segundos (para não sujar o chat de novo)
            const feedback = await message.channel.send(`✅ Limpei **${apagadas.size}** mensagens com sucesso!`);
            
            setTimeout(() => feedback.delete().catch(() => {}), 5000);

        } catch (err) {
            console.error("Erro no Clear:", err);
            return message.reply('❌ Ocorreu um erro ao tentar apagar as mensagens. (Mensagens com mais de 14 dias não podem ser apagadas pelo bot).');
        }
    }
// ==================== 👢 COMANDO KICK (OTIMIZADO) ====================
    if (command === 'kick' || command === 'expulsar') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) 
            return message.reply('❌ Não tens permissão para expulsar membros!');

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Menciona quem desejas expulsar!');
        if (!member.kickable) return message.reply('❌ Não posso expulsar este usuário (cargo superior ao meu).');

        const motivo = args.slice(1).join(' ') || 'Motivo não informado';
        await member.kick(motivo);
        return message.reply(`✅ **${member.user.username}** foi expulso com sucesso!`);
    }

    // ==================== 🔨 COMANDO BAN (OTIMIZADO) ====================
    if (command === 'ban' || command === 'banir') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) 
            return message.reply('❌ Não tens permissão para banir membros!');

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Menciona quem desejas banir!');
        if (!member.bannable) return message.reply('❌ Não posso banir este usuário.');

        const motivo = args.slice(1).join(' ') || 'Motivo não informado';
        await member.ban({ reason: motivo });
        return message.reply(`🚫 **${member.user.username}** foi banido permanentemente!`);
    }
// ==================== 🕶️ CONTRATO (ASSASSINO - OTIMIZADO) ====================
    if (command === 'contrato') {
        const cooldown = 60 * 60 * 1000; // 1 hora
        const agora = Date.now();
        const tempoPassado = agora - (userData.lastContract || 0);

        if (tempoPassado < cooldown) {
            const faltam = Math.ceil((cooldown - tempoPassado) / (60 * 1000));
            return message.reply(`❌ O submundo está vigiado! Espera **${faltam} minutos**.`);
        }

        if (userData.contract) return message.reply(`❌ Já tens um alvo: **${userData.contract}**!`);

        // --- SISTEMA DE CARGO ---
        // 1. Tenta encontrar o cargo pelo nome exato
        const cargoAssassino = message.guild.roles.cache.find(r => r.name === 'Assassino de Aluguel');
        
        if (cargoAssassino) {
            // 2. Adiciona o cargo ao membro que digitou o comando
            await message.member.roles.add(cargoAssassino).catch(err => {
                console.log("⚠️ Erro de Permissão: O cargo do bot deve estar ACIMA do cargo 'Assassino de Aluguel'.");
            });
        } else {
            // Aviso caso você esqueça de criar o cargo no servidor
            console.log("⚠️ Aviso: O cargo 'Assassino de Aluguel' não existe no servidor.");
        }
        // -------------------------

        const alvos = ["Geraldo da Padaria", "O Agiota", "Juiz Corrupto", "Líder de Gangue", "Político Sujo"];
        const alvoSorteado = alvos[Math.floor(Math.random() * alvos.length)];

        userData.contract = alvoSorteado;
        userData.lastContract = agora;
        await userData.save();

        return message.reply(`🕶️ **CONTRATO ACEITO:** Teu alvo é **${alvoSorteado}**.\nAcabaste de receber o cargo de **Assassino de Aluguel**. Vai e não deixes rastos!`);
    }

    // ==================== 🎯 CONCLUIR SERVIÇO (OTIMIZADO) ====================
    if (command === 'concluir') {
        if (!userData.contract) return message.reply('❌ Não tens nenhum contrato ativo no momento!');

        const alvoAtual = userData.contract;
        const foiApanhado = Math.random() < 0.15; // 15% de chance

        // Tenta remover o cargo se ele existir
        const cargoAssassino = message.guild.roles.cache.find(r => r.name === 'Assassino de Aluguel');
        if (cargoAssassino) {
            message.member.roles.remove(cargoAssassino).catch(() => {});
        }

        if (foiApanhado) {
            const multa = 20000;
            userData.money = Math.max(0, userData.money - multa);
            userData.contract = null;
            await userData.save();
            
            return message.reply(`🚨 **A CASA CAIU!** A polícia apanhou-te ao tentar eliminar **${alvoAtual}**.\nPerbeste **20.000 moedas** em fiança.`);
        }

        // Sucesso: Ganho aleatório entre 3000 e 20000
        const ganho = Math.floor(Math.random() * (20000 - 3000 + 1)) + 3000;
        
        userData.money += ganho;
        userData.jobsDone = (userData.jobsDone || 0) + 1;
        userData.contract = null; 

        await userData.save();

        const embedSucesso = new EmbedBuilder()
            .setTitle('🎯 SERVIÇO CONCLUÍDO')
            .setColor('#00FF00')
            .setThumbnail('https://cdn-icons-png.flaticon.com/512/1021/1021443.png') // Ícone de alvo/morte
            .setDescription(`**${message.author.username}**, eliminaste **${alvoAtual}** com sucesso!`)
            .addFields(
                { name: '💰 Pagamento', value: `\`${ganho.toLocaleString()} moedas\``, inline: true },
                { name: '📊 Total de Serviços', value: `\`${userData.jobsDone}\``, inline: true }
            )
            .setFooter({ text: 'O submundo agradece os teus serviços.' })
            .setTimestamp();

        return message.reply({ embeds: [embedSucesso] });
    }
// ==================== 💀 COMANDO MATAR (TIMEOUT) ====================
    if (command === 'matar') {
        // 1. Verificação de Permissão usando Flags
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply('❌ Tu não tens permissão de "Castigar Membros" para usar isto!');
        }

        const target = message.mentions.members.first();
        
        if (!target) return message.reply('❌ Precisas de mencionar (@) o alvo!');

        // Log de depuração (aparecerá no console da Discloud)
        console.log(`Tentando matar: ${target.user.username}. Moderatable: ${target.moderatable}`);

        // 2. Verificação de Hierarquia
        if (!target.moderatable) {
            return message.reply('❌ O meu cargo está ABAIXO do cargo dessa pessoa. Não tenho poder sobre ela!');
        }

        if (target.id === message.author.id) return message.reply('❌ Não te podes matar a ti próprio!');

        const tempoMS = 60 * 1000; // 1 minuto
        const motivo = args.slice(1).join(' ') || 'Executado pela moderação Omni';

        try {
            // A função timeout exige o tempo em milissegundos e o motivo
            await target.timeout(tempoMS, motivo);

            // Estatísticas
            userData.jobsDone = (userData.jobsDone || 0) + 1;
            await userData.save();
            
            const embedMorte = new EmbedBuilder()
                .setTitle('💀 EXECUÇÃO CONFIRMADA')
                .setColor('#000000')
                .setDescription(`**${target.user.username}** foi silenciado com sucesso.`)
                .addFields(
                    { name: '⏳ Duração', value: '`1 minuto`', inline: true },
                    { name: '📝 Motivo', value: `\`${motivo}\``, inline: true }
                )
                .setTimestamp();

            return message.reply({ embeds: [embedMorte] });
            
        } catch (error) {
            console.error("ERRO NO TIMEOUT:", error);
            return message.reply('❌ Erro ao silenciar! Verifica se o meu cargo está no topo da lista de cargos.');
        }
    }
// ==================== 📖 AJUDA OTIMIZADA ====================
    if (command === 'ajuda' || command === 'help' || command === 'ayuda') {
        
        let avisoIdioma = '';
        if (command === 'help') avisoIdioma = '🌐 **Note:** This bot is originally in Portuguese.';
        if (command === 'ayuda') avisoIdioma = '🌐 **Nota:** Este bot es originalmente en Portugués.';

        const embedAjuda = new EmbedBuilder()
            .setTitle('📖 Central de Comandos OmniBot')
            .setColor('#5865F2')
            .setDescription(`${avisoIdioma}${avisoIdioma ? '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' : ''}Confira abaixo as ações disponíveis para interagir no servidor:`)
            .addFields(
                { 
                    name: '💰 ECONOMIA', 
                    value: '`!perfil`: Vê teus dados e saldo.\n`!money`: Atalho para ver saldo.\n`!trabalhar`: Ganha moedas legalmente.\n`!daily`: Resgata sua recompensa diária.\n`!pix @user [valor]`: Transfere moedas.\n`!top`: Ranking dos mais ricos.' 
                },
                { 
                    name: '🎰 JOGOS & CASSINO', 
                    value: '`!investir <valor>** - Arrisca na bolsa (lucro ou perda variável).\n`!cassino @user [valor]`: Desafio PvP de Cara ou Coroa.\n`!dado [1 ou 2] [valor]`: Aposta contra a banca.' 
                },
                { 
                    name: '💖 SOCIAL & CASAMENTO', 
                    value: '`!ship @user @user`: Calcula a compatibilidade.\n`!casar @user`: Inicia um casamento (25k).\n`!vercasamento`: Status da relação e afinidade.\n`!cartinha @user`: Envia pontos de afinidade (7.5k).\n`!beijar`, `!abracar`, `!cafune`: Interações de afeto.\n`!divorciar`: Finaliza a relação atual.\n`!tapa`, `!atacar`: Interações agressivas.'  
                },
                { 
                    name: '🌑 SUBMUNDO', 
                    value: '`!submundo`: Loja de itens ilegais.\n`!crime`: Assalto arriscado.\n`!roubar`: Furtar moedas.\n`!contrato`: Caçar alvos.\n`!entrar`: Virar Membro.\n`!traficar`: Rota de lucro.\n`!missao`: Operações da elite.\n`!assaltodupla`: Grande golpe (Requer Casamento).\n`!roubar @user`: Tenta furtar 10% de alguém.\n`!contrato`: Aceita um alvo para eliminar.\n`!concluir`: Finaliza o serviço e recebe o prêmio.\n`!tapa`, `!atacar`: Interações agressivas.' 
                },
                { 
                    name: '🛡️ STAFF', 
                    value: '`!matar @user`: Aplica 1 min de silêncio (Timeout).\n`!clear [nº]`: Limpa até 100 mensagens.\n`!kick`/`!ban`: Expulsa ou bane membros.\n`!anuncio [#canal] [texto]`: Envia uma Embed oficial.\n`!falar [texto]`: O bot repete sua mensagem.\n`!renovar`: Restaura o stock da loja.' 
                },
                { 
                    name: '🛍️ MERCADO', 
                    value: '`!loja`: Itens disponíveis e stock.\n`!comprar [item]`: Adquire um item.\n`!mochila`: Vê o que guardaste no inventário.' 
                }
            )
            .setFooter({ text: 'Use o prefixo ! antes de cada comando.' })
            .setTimestamp();

        return message.reply({ embeds: [embedAjuda] });
    }
});

// ==================== 🏪 SISTEMA DE STOCK (OTIMIZADO) ====================

function renovarEstoque() {
    console.log("🏪 [LOJA] Iniciando renovação de stock...");
    
    // Verificamos se a variável global existe
    if (typeof lojaItens !== 'undefined' && lojaItens !== null) {
        // Usamos Object.keys para iterar de forma mais segura
        const itensIds = Object.keys(lojaItens);
        
        itensIds.forEach(id => {
            // Sorteia entre 1 e 5 unidades
            const novoEstoque = Math.floor(Math.random() * 5) + 1;
            lojaItens[id].estoque = novoEstoque;
        });

        console.log(`✅ [LOJA] Stock renovado para ${itensIds.length} itens!`);
    } else {
        console.log("❌ [ERRO] Variável 'lojaItens' não definida. Verifique o topo do código.");
    }
}

// Configuração do Timer: 86.400.000ms = 24 Horas
// Na Discloud, o bot pode reiniciar antes disso, então a chamada inicial é vital
setInterval(renovarEstoque, 86400000);

// Chamada inicial para garantir que a loja comece com stock ao ligar
renovarEstoque();

// ==================== 🚀 LOGIN ====================
client.login(process.env.TOKEN);