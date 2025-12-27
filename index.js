const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ComponentType } = require('discord.js');
const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');


dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// BANCO DE DADOS
let db = {};
if (fs.existsSync('./database.json')) {
    db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
}
const app = express();
const PORT = process.env.PORT || 3000;

// Configuração para o Express entender os dados que vêm do formulário do site
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- ROTA QUE MOSTRA A PÁGINA (O SEU HTML) ---
app.get('/daily', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resgate Daily | OmniBot</title>
    <style>
        /* Animação do Fundo */
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        /* Container Estilo Glassmorphism (Vidro) */
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 40px;
            width: 90%;
            max-width: 450px;
            text-align: center;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }

        .bot-avatar {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            border: 4px solid white;
            margin-bottom: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        h1 {
            color: white;
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 800;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }

        p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin-bottom: 30px;
        }

        input {
            width: 100%;
            padding: 15px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            outline: none;
            color: white;
            font-size: 16px;
            transition: 0.3s;
            box-sizing: border-box;
            text-align: center;
        }

        input::placeholder { color: rgba(255, 255, 255, 0.6); }

        input:focus {
            background: rgba(255, 255, 255, 0.3);
            border-color: white;
        }

        button {
            width: 100%;
            margin-top: 20px;
            padding: 15px;
            background: white;
            color: #e73c7e;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: 0.3s transform, 0.3s box-shadow;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        button:hover {
            transform: translateY(-3px);
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        }

        .footer {
            margin-top: 25px;
            color: rgba(255,255,255,0.6);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
    </style>
</head>
<body>

    <div class="card">
        <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Bot Avatar" class="bot-avatar">
        
        <h1>OmniBot Daily</h1>
        <p>Você está prestes a resgatar suas moedas diárias! Insira seu ID abaixo para continuar.</p>

        <form action="/claim" method="POST">
            <input type="text" name="userId" placeholder="ID do Discord (ex: 852147...)" required>
            <button type="submit">Coletar Recompensa ✨</button>
        </form>

        <div class="footer">Powered by OmniBot System</div>
    </div>

</body>
</html>
    `);
});

// --- ROTA QUE PROCESSA O RESGATE (O QUE ESTAVA FALTANDO) ---
app.post('/claim', (req, res) => {
    const userId = req.body.userId;
    const agora = Date.now();
    const tempoEspera = 24 * 60 * 60 * 1000;

    const renderizarTela = (titulo, mensagem, corSucesso = false) => {
        return res.send(`
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resgate | OmniBot</title>
    <style>
        body {
            background-color: #2f3136;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            display: flex; justify-content: center; align-items: center;
            height: 100vh; margin: 0;
        }
        .card {
            background-color: #36393f;
            width: 90%; max-width: 450px;
            padding: 40px; border-radius: 8px;
            text-align: center; position: relative;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
        }
        .icon-circle {
            width: 60px; height: 60px;
            background-color: #43b581;
            border-radius: 50%;
            display: flex; justify-content: center; align-items: center;
            margin: 0 auto 20px;
        }
        .icon-circle svg { width: 35px; fill: white; }
        h1 { color: white; font-size: 24px; margin: 0 0 20px 0; }
        p { color: #b9bbbe; font-size: 16px; line-height: 1.5; margin-bottom: 30px; }
        .btn-close {
            background-color: #5865f2;
            color: white; border: none;
            padding: 12px 24px; border-radius: 4px;
            font-weight: bold; cursor: pointer;
            width: 100%; transition: background 0.2s;
            text-transform: uppercase; text-decoration: none; display: block;
        }
        .btn-close:hover { background-color: #4752c4; }
        .status-bar {
            position: absolute; bottom: 0; left: 0; width: 100%; height: 4px;
            background-color: ${corSucesso ? '#43b581' : '#f04747'};
            border-radius: 0 0 8px 8px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-circle" style="background-color: ${corSucesso ? '#43b581' : '#f04747'}">
            ${corSucesso 
                ? '<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' 
                : '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'}
        </div>
        <h1>${titulo}</h1>
        <p>${mensagem}</p>
        <a href="javascript:window.close();" class="btn-close" onclick="window.close();">FECHAR ESTA JANELA</a>
        <div class="status-bar"></div>
    </div>
</body>
</html>
        `);
    };

    if (!userId) return renderizarTela("Erro de ID", "Você precisa fornecer seu ID do Discord.");

    if (!db[userId]) {
        return renderizarTela("Não Encontrado", "Seu perfil não existe. Mande um '!' no Discord antes de resgatar.");
    }

    if (agora - (db[userId].lastDaily || 0) < tempoEspera) {
        const restando = tempoEspera - (agora - db[userId].lastDaily);
        const horas = Math.floor(restando / (1000 * 60 * 60));
        return renderizarTela("Aguarde", `Você já coletou seu prêmio. Volte em ${horas} horas.`);
    }

    const ganho = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
    db[userId].money = (db[userId].money || 0) + ganho;
    db[userId].lastDaily = agora;

    fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

    return renderizarTela("Resgate Concluído!", `Você adicionou **${ganho.toLocaleString('pt-BR')}** moedas à sua carteira.`, true);
});
// Liga o servidor web
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// --- ROTA QUE PROCESSA O RESGATE (O QUE ESTAVA FALTANDO) ---
app.post('/claim', (req, res) => {
    const userId = req.body.userId;
    const agora = Date.now();
    const tempoEspera = 24 * 60 * 60 * 1000; // 24 horas

    if (!userId) return res.send("❌ ID não fornecido.");

    // Verifica se o usuário existe no db
    if (!db[userId]) {
        return res.send("❌ Usuário não encontrado! Mande uma mensagem no Discord primeiro.");
    }

    // Verifica o tempo de 24h
    if (agora - (db[userId].lastDaily || 0) < tempoEspera) {
        const restando = tempoEspera - (agora - db[userId].lastDaily);
        const horas = Math.floor(restando / (1000 * 60 * 60));
        const minutos = Math.floor((restando % (1000 * 60 * 60)) / (1000 * 60));
        return res.send(`❌ Você já coletou hoje! Volte em ${horas}h ${minutos}min.`);
    }

    // Dá o dinheiro (3k a 10k)
    const ganho = Math.floor(Math.random() * (10000 - 3000 + 1)) + 3000;
    db[userId].money = (db[userId].money || 0) + ganho;
    db[userId].lastDaily = agora;

    fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));

    res.send(`✅ Sucesso! Você resgatou ${ganho} moedas!`);
});

// Liga o servidor web
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Rota que processa o clique no botão e dá o dinheiro
app.post('/claim-daily', (req, res) => {
    const userId = req.body.userId;
    const now = Date.now();

    // Verifica se o usuário existe no seu database.json
    if (!db[userId]) {
        return res.send("❌ Erro: Usuário não encontrado. Fale algo no Discord primeiro!");
    }

    // Lógica de tempo (24 horas = 86400000 ms)
    if (now - (db[userId].lastDaily || 0) < 86400000) {
        return res.send("❌ Você já pegou seu daily hoje! Volte amanhã.");
    }

    // Dá o dinheiro e salva
    const ganho = Math.floor(Math.random() * 5000) + 2000;
    db[userId].money += ganho;
    db[userId].lastDaily = now;
    saveDB();

    res.send(`<h1>✅ Sucesso!</h1><p>Você resgatou <b>${ganho} moedas</b>!</p><a href="/daily" style="color: #5865F2;">Voltar</a>`);
});

// Inicia o servidor do site
app.listen(PORT, () => {
    console.log(`🌐 Site do Daily ON em http://localhost:${PORT}/daily`);
});
// FORA DE QUALQUER COMANDO
var lojaItens = {
    "escudo": { preco: 2000, nome: "Escudo de Energia", estoque: 0, desc: "Protege contra 1 assalto." },
    "passaporte": { preco: 1500, nome: "Passaporte Falso", estoque: 0, desc: "Zera o tempo do trabalho." },
    "dinamite": { preco: 1000, nome: "Dinamite", estoque: 0, desc: "Melhora o !crime." },
    "bilhete": { preco: 500, nome: "Bilhete de Loteria", estoque: 0, desc: "Dinheiro aleatório (!usar)." },
    "faca": { preco: 1500, nome: "Faca", estoque: 0, desc: "Melhora o !roubar." },
    "picareta": { preco: 3000, nome: "Picareta", estoque: 0, desc: "Bônus no trabalho." },
    "computador": { preco: 8000, nome: "Computador", estoque: 0, desc: "Bônus home office." }
};

function saveDB() {
    fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

// 🔥 FIREWALL CONTRA QUEDAS
process.on('unhandledRejection', (reason) => console.log('🛡️ Firewall:', reason));
process.on('uncaughtException', (err) => console.log('🛡️ Firewall:', err));

client.once('ready', () => {
    console.log(`🚀 OMNI ON: ECONOMIA E @MENTIONS AJUSTADOS!`);
});

client.on('messageCreate', async (message) => {
    // Ignora bots e mensagens que não começam com !
    if (message.author.bot || !message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const userId = message.author.id;

    // Garante que o usuário existe no DB
    if (!db[userId]) {
        db[userId] = { money: 100, inventory: [], lastDaily: 0, lastWork: 0, lastContract: 0, relations: {}, lastSocial: {}, marriedWith: null, contract: null, jobsDone: 0 };
        fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
    }

// ==================== 🎁 COMANDO !DAILY ====================
    if (command === 'daily') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Ir para o Site de Resgate')
                .setURL('https://omnibot-mina.onrender.com/daily')
                .setStyle(ButtonStyle.Link)
        );

        await message.reply({ 
            content: '🎁 Clique no botão abaixo para ir ao site e resgatar suas moedas diárias!', 
            components: [row] 
        });
    }

    // ==================== ⚙️ COMANDO !RESETDAILY ====================
    if (command === 'resetdaily') {
        // Verifica se é ADM usando o nome da permissão como texto para evitar erros
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ Apenas administradores podem usar este comando.');
        }

        for (let id in db) {
            db[id].lastDaily = 0;
        }

        fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
        await message.reply('✅ O tempo de espera do Daily foi resetado para todos os usuários!');
    }
if (command === 'trabalhar') {
        const now = Date.now();
        const cooldown = 3600000; // 1 hora
        const lastWork = db[userId].lastWork || 0;

        if (now - lastWork < cooldown) {
            const restante = cooldown - (now - lastWork);
            const minutos = Math.ceil(restante / 60000);
            return message.reply(`⏳ Estás cansado! Volta em **${minutos} minutos**.`);
        }

        // --- NOVO GANHO BASE: 1k a 6k ---
        let ganho = Math.floor(Math.random() * 5001) + 1000; 
        let bonusTotal = 0;
        let extras = [];

        // ⛏️ Bônus da Picareta
        if (db[userId].inventory.includes('picareta')) {
            const bonusPicareta = 800; // Aumentei um pouco o bônus para acompanhar o novo piso
            bonusTotal += bonusPicareta;
            extras.push("⛏️ Picareta (+800)");
        }

        // 💻 Bônus do Computador
        if (db[userId].inventory.includes('computador')) {
            const bonusPC = 1500; // Aumentei um pouco o bônus para acompanhar
            bonusTotal += bonusPC;
            extras.push("💻 Computador (+1.500)");
        }

        const totalFinal = ganho + bonusTotal;
        db[userId].money += totalFinal;
        db[userId].lastWork = now;
        saveDB();

        let resposta = `🔨 Trabalhaste arduamente e ganhaste **${totalFinal.toLocaleString()} moedas**!`;
        
        if (extras.length > 0) {
            resposta += `\n> **Bônus aplicados:** ${extras.join(' e ')}`;
        }

        return message.reply(resposta);
    }
// ==================== 💸 COMANDO PIX (TRANSFERÊNCIA) ====================
    if (command === 'pix') {
        const target = message.mentions.users.first();
        const quantia = parseInt(args[1]); // Pega o número depois do @arroba

        // 1. Verificações de Segurança
        if (!target) return message.reply('❌ Precisas de marcar (@arroba) para quem queres enviar o pix! Ex: `!pix @usuario 1000`');
        if (target.id === userId) return message.reply('❌ Não podes fazer um pix para ti próprio!');
        if (isNaN(quantia) || quantia <= 0) return message.reply('❌ Diz uma quantia válida e maior que zero para enviar!');
        
        // 2. Verifica se o autor tem dinheiro suficiente
        if (db[userId].money < quantia) {
            return message.reply(`❌ Não tens **${quantia.toLocaleString()} moedas** na tua conta!`);
        }

        // 3. Processa a transferência
        db[userId].money -= quantia;
        
        // Garante que a conta do alvo existe no banco
        if (!db[target.id]) db[target.id] = { money: 100, inventory: [], relations: {}, lastSocial: {}, marriedWith: null };
        db[target.id].money += quantia;

        saveDB();

        // 4. Resposta Visual
        const embed = new EmbedBuilder()
            .setTitle('💸 PIX Realizado com Sucesso!')
            .setColor('#2ecc71') // Verde Sucesso
            .setDescription(`${message.author} enviou dinheiro para ${target}!`)
            .addFields(
                { name: '💰 Valor Enviado', value: `R$ ${quantia.toLocaleString()}`, inline: true },
                { name: '🏦 Banco', value: 'OmniBank', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Transação segura e sem taxas!' });

        return message.reply({ embeds: [embed] });
    }
    if (command === 'cassino' || command === 'caraoucoroa') {
        const target = message.mentions.users.first();
        const aposta = parseInt(args[1]);

        if (!target) return message.reply('❌ Marca (@arroba) quem queres desafiar!');
        if (target.id === userId) return message.reply('❌ Não podes jogar contra ti próprio!');
        if (isNaN(aposta) || aposta <= 0) return message.reply('❌ Diz um valor válido! Ex: `!cassino @user 1000`');

        // Verifica saldo de ambos
        if (db[userId].money < aposta) return message.reply('❌ Tu não tens dinheiro suficiente!');
        if (!db[target.id] || db[target.id].money < aposta) return message.reply('❌ O teu oponente não tem dinheiro suficiente!');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('aceitar_bet').setLabel(`Aceitar Apostar ${aposta}`).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('recusar_bet').setLabel('Recusar').setStyle(ButtonStyle.Danger)
        );

        const convite = await message.reply({
            content: `🪙 **DESAFIO DE CARA OU COROA!**\n${target}, ${message.author} desafiou-te para uma aposta de **${aposta.toLocaleString()} moedas**! Quem ganhar leva o pote de **${(aposta * 2).toLocaleString()}**!`,
            components: [row]
        });

        const filter = i => i.user.id === target.id;
        const collector = convite.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'aceitar_bet') {
                // Re-checa saldo na hora do clique
                if (db[userId].money < aposta || db[target.id].money < aposta) {
                    return i.reply({ content: '❌ Alguém gastou o dinheiro antes de começar!', ephemeral: true });
                }

                const ganhador = Math.random() > 0.5 ? userId : target.id;
                const perdedor = ganhador === userId ? target.id : userId;

                db[ganhador].money += aposta;
                db[perdedor].money -= aposta;
                saveDB();

                await i.update({
                    content: `🪙 O disco girou e... **<@${ganhador}> GANHOU TUDO!** 🏆\n💰 Recebeu **${(aposta * 2).toLocaleString()} moedas**!`,
                    components: []
                });
            } else {
                await i.update({ content: '❌ O desafio foi recusado.', components: [] });
            }
        });
    }
    if (command === 'dado') {
        const ladoEscolhido = parseInt(args[0]);
        const aposta = parseInt(args[1]);

        if (!ladoEscolhido || ![1, 2].includes(ladoEscolhido)) return message.reply('❌ Escolhe um lado do dado: **1** ou **2**! Ex: `!dado 1 5000`');
        if (isNaN(aposta) || aposta <= 0) return message.reply('❌ Diz um valor para apostar!');
        if (db[userId].money < aposta) return message.reply('❌ Dinheiro insuficiente!');

        const resultado = Math.floor(Math.random() * 2) + 1; // Cai 1 ou 2

        if (ladoEscolhido === resultado) {
            db[userId].money += aposta;
            saveDB();
            return message.reply(`🎲 O dado caiu no lado **${resultado}**! **GANHASTE!** 🎉\nRecebeste **${(aposta * 2).toLocaleString()} moedas**!`);
        } else {
            db[userId].money -= aposta;
            saveDB();
            return message.reply(`🎲 O dado caiu no lado **${resultado}**... **PERDESTE!** 📉\nPerdeste **${aposta.toLocaleString()} moedas**.`);
        }
    }
// ==================== 🏆 TOP RICOS ====================
    if (command === 'top') {
        const sorted = Object.entries(db)
            .sort(([, a], [, b]) => b.money - a.money)
            .slice(0, 10);
        
        let lista = "";
        for (let i = 0; i < sorted.length; i++) {
            const user = await client.users.fetch(sorted[i][0]).catch(() => null);
            const nome = user ? user.username : "Desconhecido";
            lista += `**${i + 1}.** ${nome} — ${sorted[i][1].money.toLocaleString()} moedas\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 Ranking de Ricos')
            .setColor('#FFD700')
            .setDescription(lista || "Ninguém no ranking.");
        return message.reply({ embeds: [embed] });
    }

    // ==================== 💖 SOCIAL COM @ARROBA OBRIGATÓRIO ====================

if (command === 'casar') {
        const target = message.mentions.users.first();
        const custo = 25000;

        // Verificações Iniciais
        if (!target) return message.reply('❌ Precisas de marcar (@arroba) a pessoa para enviares o pedido!');
        if (target.id === userId) return message.reply('❌ Não te podes casar contigo próprio!');
        
        // Verifica saldo do autor
        if (db[userId].money < custo) return message.reply(`❌ Não tens **${custo.toLocaleString()} moedas** para as taxas do casamento!`);
        
        // Verifica saldo do alvo
        if (!db[target.id] || db[target.id].money < custo) {
            return message.reply(`❌ O usuário ${target.username} não tem as **${custo.toLocaleString()} moedas** necessárias para aceitar o casamento!`);
        }

        if (db[userId].marriedWith) return message.reply('❌ Tu já estás casado(a)!');
        if (db[target.id]?.marriedWith) return message.reply('❌ Essa pessoa já está casada!');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('aceitar')
                    .setLabel(`Aceitar (Custa ${custo.toLocaleString()})`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('recusar')
                    .setLabel('Recusar')
                    .setStyle(ButtonStyle.Danger),
            );

        const pedido = await message.reply({
            content: `💍 **PEDIDO DE CASAMENTO**\n${target}, aceitas casar com ${message.author}?\n⚠️ *O casamento custará **${custo.toLocaleString()} moedas** de cada um.*`,
            components: [row]
        });

        const filter = i => i.user.id === target.id;
        const collector = pedido.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId === 'aceitar') {
                // Verificação dupla no momento do clique (segurança extra)
                if (db[userId].money < custo || db[target.id].money < custo) {
                    return i.reply({ content: '❌ Alguém gastou o dinheiro antes de aceitar! Casamento cancelado.', ephemeral: true });
                }

                // Cobra o dinheiro dos dois
                db[userId].money -= custo;
                db[target.id].money -= custo;

                // Salva o casamento
                db[userId].marriedWith = target.id;
                db[target.id].marriedWith = userId;
                
                if (!db[userId].relations) db[userId].relations = {};
                db[userId].relations[target.id] = 0;
                
                saveDB();
                await i.update({ content: `💖 **VIVAM OS NOIVOS!** Foram cobradas ${custo.toLocaleString()} moedas de cada um e agora ${message.author} e ${target} estão casados! 🎉`, components: [] });
            } else {
                await i.update({ content: `💔 O pedido foi recusado...`, components: [] });
            }
        });
    }
    // ==================== 📊 VER CASAMENTO (RESUMO) ====================
    if (command === 'vercasamento') {
        const conjugeId = db[userId].marriedWith;
        
        if (!conjugeId) {
            return message.reply('❌ Você ainda não está casado(a)! Use `!casar @alguem` para fazer o pedido.');
        }

        // Busca os pontos de afinidade (se não houver, assume 0)
        const afinidade = db[userId].relations ? db[userId].relations[conjugeId] || 0 : 0;
        
        // Tenta pegar o nome do cônjuge para ficar bonito no Embed
        const conjugeUser = await client.users.fetch(conjugeId).catch(() => null);
        const nomeConjuge = conjugeUser ? conjugeUser.username : "Usuário Desconhecido";

        const embed = new EmbedBuilder()
            .setTitle('💍 Certidão de Casamento Omni')
            .setColor('#FF69B4') // Cor Rosa
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: '❤️ Cônjuge', value: `<@${conjugeId}>`, inline: true },
                { name: '💖 Afinidade', value: `**${afinidade} pontos**`, inline: true },
                { name: '📜 Status do Casal', value: afinidade > 100 ? 'Amor Eterno' : (afinidade > 50 ? 'Casal Apaixonado' : 'Recém-Casados') }
            )
            .setFooter({ text: 'Aumente a afinidade com !beijar ou !cartinha' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
    // ==================== 💌 CARTINHA (CUSTA 7.500 / 3-6 PTS) ====================
    if (command === 'cartinha') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Marca (@arroba) para quem é a cartinha!');
        if (db[userId].money < 7500) return message.reply('❌ Precisas de **7.500 moedas** para enviar uma cartinha!');
        if (db[userId].marriedWith !== target.id) return message.reply('❌ Só podes enviar cartinhas românticas para o teu cônjuge!');

        const pts = Math.floor(Math.random() * (6 - 3 + 1)) + 3;
        db[userId].money -= 7500;
        
        if (!db[userId].relations) db[userId].relations = {};
        db[userId].relations[target.id] = (db[userId].relations[target.id] || 0) + pts;
        
        saveDB();
        return message.reply(`💌 ${message.author} enviou uma cartinha apaixonada para ${target}!\n💖 Afinidade subiu **+${pts}** pontos! (Custou 7.500 moedas)`);
    }
    // ==================== 💔 COMANDO DIVORCIAR (@ARROBA OBRIGATÓRIO) ====================
    if (command === 'divorciar') {
        const target = message.mentions.users.first();
        const conjugeId = db[userId].marriedWith;

        // 1. Verificações
        if (!conjugeId) return message.reply('❌ Você nem está casado para querer se divorciar!');
        if (!target) return message.reply(`❌ Você precisa marcar (@arroba) o seu cônjuge <@${conjugeId}> para oficializar a separação!`);
        if (target.id !== conjugeId) return message.reply('❌ Você só pode se divorciar da pessoa com quem está casado!');

        // 2. Limpar os dados de casamento para os DOIS
        db[userId].marriedWith = null;
        // Zera a afinidade também (opcional, mas comum em bots)
        if (db[userId].relations) db[userId].relations[target.id] = 0;

        if (db[target.id]) {
            db[target.id].marriedWith = null;
            if (db[target.id].relations) db[target.id].relations[userId] = 0;
        }

        saveDB();

        // 3. Resposta Visual
        const embed = new EmbedBuilder()
            .setTitle('💔 Divórcio Confirmado')
            .setColor('#333333') // Cor cinza/escuro para tristeza
            .setDescription(`${message.author} e ${target} não estão mais casados.`)
            .addFields({ name: 'Aviso', value: 'Os pontos de afinidade foram zerados.' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }

// ==================== 💋 BEIJAR (SOMA AFINIDADE) ====================
    if (command === 'beijar') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Marca (@arroba) quem queres beijar!');
        if (target.id === userId) return message.reply('❌ Não podes beijar a ti próprio!');

        let msg = `💋 ${message.author} deu um beijo em ${target}!`;

        // Se estiverem casados, ganha afinidade (1 a 3 pontos)
        if (db[userId].marriedWith === target.id) {
            const pts = Math.floor(Math.random() * 3) + 1;
            if (!db[userId].relations) db[userId].relations = {};
            db[userId].relations[target.id] = (db[userId].relations[target.id] || 0) + pts;
            saveDB();
            msg += `\n💖 **+${pts}** de afinidade ganha!`;
        }

        return message.reply(msg);
    }
    if (command === 'ship') {
        const user1 = message.mentions.users.first();
        const user2 = message.mentions.users.at(1); // Pega o segundo mencionado

        if (!user1 || !user2) {
            return message.reply("❌ Formato correto: `!ship @user com @user`.");
        }

        const amor = Math.floor(Math.random() * 101);
        let barra = "";
        
        // Cria uma barrinha visual de amor
        const progresso = Math.floor(amor / 10);
        barra = "❤️".repeat(progresso) + "🖤".repeat(10 - progresso);

        let mensagem = "";
        if (amor < 30) mensagem = "Melhor nem tentarem... 💀";
        else if (amor < 70) mensagem = "Tem potencial! 👀";
        else mensagem = "Feitos um para o outro! 💍";

        const embed = new EmbedBuilder()
            .setTitle("❤️ CALCULADORA DO AMOR ❤️")
            .setDescription(`**${user1.username}** & **${user2.username}**\n\n**${amor}%** [${barra}]\n\n> ${mensagem}`)
            .setColor(amor > 50 ? '#ff0000' : '#5865f2');

        return message.reply({ embeds: [embed] });
    }

    if (command === 'abracar') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Marca (@arroba) quem queres abraçar!');
        return message.reply(`🤗 ${message.author} deu um abraço apertado em ${target}!`);
    }
    // ==================== ✋ COMANDO TAPA ====================
    if (command === 'tapa') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Precisas de marcar (@arroba) quem queres esbofetear!');
        if (target.id === userId) return message.reply('❌ Não te podes dar um tapa a ti próprio... ou podes? Mas o bot não deixa! 😂');

        return message.reply(`🖐️ **POW!** ${message.author} deu um tapa bem estalado em ${target}! Isso deve ter doído...`);
    }

if (command === 'atacar') {
        const target = message.mentions.users.first();
        
        if (!target) return message.reply('❌ Marca (@arroba) quem queres atacar!');
        if (target.id === userId) return message.reply('❌ Não podes atacar a ti próprio!');

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setDescription(`⚔️ **${message.author.username}** atacou **${target.username}**!`)
            .setImage('https://media.tenor.com/E96mFvY6_6AAAAAC/anime-fight.gif'); // GIF de Luta Funcional

        return message.reply({ embeds: [embed] });
    }
    // ==================== 🌑 SUBMUNDO COM @ARROBA ====================

    // ==================== COMANDO ROUBAR ====================
    if (command === 'roubar') {
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Precisas de marcar (@arroba) a vítima do teu roubo!');
        if (target.id === userId) return message.reply('❌ Não podes roubar a ti próprio!');

        // 🛡️ VERIFICAÇÃO DO ESCUDO (Vítima)
        if (db[target.id]?.inventory.includes('escudo')) {
            const indexEscudo = db[target.id].inventory.indexOf('escudo');
            db[target.id].inventory.splice(indexEscudo, 1); // O escudo quebra e some
            saveDB();
            return message.reply(`🛡️ O roubo falhou! **${target.username}** estava protegido por um **Escudo de Energia**! (O escudo dele quebrou).`);
        }

        // 🔪 BÔNUS DA FACA (Aumenta a chance de sucesso)
        let chanceSucesso = 0.3; // 30% de chance padrão (chance > 0.7)
        if (db[userId].inventory.includes('faca')) {
            chanceSucesso = 0.6; // Sobe para 60% se o ladrão tiver faca
        }

        const sorteio = Math.random();
        if (sorteio < chanceSucesso) {
            const roubado = Math.floor((db[target.id]?.money || 0) * 0.1);
            if (roubado <= 0) return message.reply('❌ A vítima está mais pobre que tu, não tem nada para roubar!');
            
            db[userId].money += roubado;
            db[target.id].money -= roubado;
            saveDB();
            
            let textoFaca = db[userId].inventory.includes('faca') ? " 🔪 (Usaste a tua faca!)" : "";
            return message.reply(`🥷 Sucesso! Roubaste **${roubado.toLocaleString()} moedas** de ${target}!${textoFaca}`);
        } else {
            return message.reply(`👮 O ${target} chamou a polícia e tu tiveste de fugir!`);
        }
    }

    // ==================== COMANDO CRIME ====================
    if (command === 'crime') {
        // 🧨 BÔNUS DA DINAMITE (Aumenta o ganho e a chance)
        let chanceCrime = 0.4; // 40% de chance padrão
        let multiplicador = 1;

        if (db[userId].inventory.includes('dinamite')) {
            chanceCrime = 0.7; // Sobe para 70% de chance
            multiplicador = 2; // Ganha o dobro do dinheiro
            const indexDinamite = db[userId].inventory.indexOf('dinamite');
            db[userId].inventory.splice(indexDinamite, 1); // A dinamite é gasta (item consumível)
        }

        const sorteio = Math.random();
        if (sorteio < chanceCrime) {
            const ganho = (Math.floor(Math.random() * 2000) + 500) * multiplicador;
            db[userId].money += ganho;
            saveDB();

            let textoDina = multiplicador > 1 ? " 🧨 (Usaste uma dinamite e explodiste o cofre!)" : "";
            return message.reply(`🥷 **Sucesso!** Cometeste um assalto e ganhaste **${ganho.toLocaleString()} moedas**!${textoDina}`);
        } else {
            const multa = 1000;
            db[userId].money = Math.max(0, db[userId].money - multa);
            saveDB();
            return message.reply(`👮 **Foste apanhado!** Pagaste uma multa de **1.000 moedas**.`);
        }
    }
    if (command === 'anuncio') {
        if (!message.member.permissions.has('Administrator')) return;
        const texto = args.join(' ');
        if (!texto) return message.reply('❌ Escreve o texto do anúncio!');
        
        const embed = new EmbedBuilder()
            .setTitle('📢 ANÚNCIO IMPORTANTE')
            .setDescription(texto)
            .setColor('#FF0000')
            .setTimestamp();
            
        return message.channel.send({ embeds: [embed] });
    }

    // ==================== 🛡️ STAFF ====================
    if (command === 'falar') {
        if (!message.member.permissions.has('Administrator')) return;
        const texto = args.join(' ');
        message.delete().catch(() => {});
        return message.channel.send(texto);
    }

    if (command === 'saldo' || command === 'perfil') {
        return message.reply(`💰 **Teu Saldo:** ${db[userId].money.toLocaleString()} moedas.`);
    }
 // ==================== 🛍️ COMANDO LOJA ====================

 if (command === 'loja' || command === 'stock') {
        try {
            let menu = "🏪 **LOJA DO OMNI - STOCK DO DIA** 🏪\n";
            menu += "*Os estoques renovam a cada 24h (1-5 unidades por item)*\n\n";

            // Emojis antigos que você gosta
            const emojis = {
                "escudo": "🛡️", "passaporte": "🎫", "dinamite": "🧨", 
                "bilhete": "🎟️", "faca": "🔪", "picareta": "⛏️", "computador": "💻"
            };

            for (const id in lojaItens) {
                const info = lojaItens[id];
                const emoji = emojis[id] || "📦";
                
                // Formatação do Status do Stock
                const status = info.estoque > 0 
                    ? `🟢 Stock: **${info.estoque}**` 
                    : "🔴 **ESGOTADO**";

                menu += `${emoji} **${info.nome}** — 💰 \`${info.preco.toLocaleString()}\`\n`;
                menu += `> ${info.desc}\n`; // Mini resumo dos itens
                menu += `> ${status} | \`!comprar ${id}\`\n\n`;
            }

            const embed = {
                title: "🏪 Vitrine do Omni",
                description: menu,
                color: 0xf1c40f,
                footer: { text: "Use !comprar <nome> para adquirir" }
            };

            return message.reply({ embeds: [embed] });
        } catch (err) {
            console.error(err);
            return message.reply("❌ Erro ao abrir a loja. Verifique se a variável lojaItens existe.");
        }
    }

    // ==================== 💸 COMANDO COMPRAR ====================
    if (command === 'comprar') {
    const itemEscolhido = args[0]?.toLowerCase();
    const itemInfo = lojaItens[itemEscolhido];

    if (!itemInfo) return message.reply("Item não existe.");

    // Checa se tem no stock
    if (itemInfo.estoque <= 0) {
        return message.reply("❌ Este item esgotou hoje! Tente novamente amanhã após a renovação.");
    }

    if (db[userId].money < itemInfo.preco) {
        return message.reply("Dinheiro insuficiente!");
    }

    // Processa a compra
    db[userId].money -= itemInfo.preco;
    db[userId].inventory.push(itemEscolhido);
    
    // DIMINUI O ESTOQUE DA LOJA
    itemInfo.estoque -= 1;

    saveDB();
    return message.reply(`✅ Compraste **${itemInfo.nome}**! Restam apenas ${itemInfo.estoque} no stock de hoje.`);
}
    if (command === 'usar') {
    const itemParaUsar = args[0]?.toLowerCase();
    const inventario = db[userId].inventory;
    const index = inventario.indexOf(itemParaUsar);

    if (index === -1) return message.reply("Você não tem esse item na mochila!");

    if (itemParaUsar === 'bilhete') {
        const ganho = Math.floor(Math.random() * 5000) + 1;
        db[userId].money += ganho;
        db[userId].inventory.splice(index, 1); // Remove 1 bilhete
        return message.reply(`🎟️ Você usou o bilhete e ganhou **${ganho} moedas**!`);
    }

    if (itemParaUsar === 'passaporte') {
        db[userId].lastWork = 0; // Zera o tempo do !trabalhar
        db[userId].inventory.splice(index, 1);
        return message.reply("🎫 Passaporte usado! O tempo do `!trabalhar` foi zerado.");
    }
}

    // ==================== 🎒 COMANDO MOCHILA / INVENTÁRIO ====================
if (command === 'mochila' || command === 'inv') {
        const inventario = db[userId].inventory;

        if (!inventario || inventario.length === 0) {
            return message.reply("Tua mochila está vazia! 🎒");
        }

        // --- LÓGICA DE ESTACAR (CONTAR ITENS) ---
        const contagem = {};
        inventario.forEach(item => {
            contagem[item] = (contagem[item] || 0) + 1;
        });

        // --- MAPA DE EMOJIS E NOMES ---
        const infoItens = {
            "escudo": { emoji: "🛡️", nome: "Escudo de Energia" },
            "passaporte": { emoji: "🎫", nome: "Passaporte Falso" },
            "dinamite": { emoji: "🧨", nome: "Dinamite" },
            "bilhete": { emoji: "🎟️", nome: "Bilhete de Loteria" },
            "anel": { emoji: "💍", nome: "Anel" },
            "alianca": { emoji: "💍", nome: "Aliança" },
            "faca": { emoji: "🔪", nome: "Faca" },
            "picareta": { emoji: "⛏️", nome: "Picareta" },
            "computador": { emoji: "💻", nome: "Computador" }
        };

        let listaTexto = "";
        for (const [idItem, quantidade] of Object.entries(contagem)) {
            const info = infoItens[idItem];
            const emoji = info ? info.emoji : "📦";
            const nome = info ? info.nome : idItem;
            
            // Aqui ele monta a linha: Ex: 🔪 Faca (x3)
            listaTexto += `${emoji} **${nome}** — \`x${quantidade}\`\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎒 Mochila de ${message.author.username}`)
            .setDescription(listaTexto)
            .setColor('#2b2d31')
            .setThumbnail(message.author.displayAvatarURL())
            .setFooter({ text: 'Usa !usar <item> para itens consumíveis' });

        return message.reply({ embeds: [embed] });
    }
    // ==================== 🧹 COMANDO CLEAR (LIMPAR CHAT) ====================
    if (command === 'clear' || command === 'limpar') {
        if (!message.member.permissions.has('ManageMessages')) return message.reply('❌ Não tens permissão para gerenciar mensagens!');
        
        const quantidade = parseInt(args[0]);
        if (isNaN(quantidade) || quantidade < 1 || quantidade > 100) return message.reply('❌ Diz um número de 1 a 100 para eu apagar!');

        await message.channel.bulkDelete(quantidade + 1, true).catch(err => {
            console.error(err);
            message.reply('❌ Ocorreu um erro ao tentar apagar as mensagens (mensagens com mais de 14 dias não podem ser apagadas em massa).');
        });
        
        const msg = await message.channel.send(`✅ Limpei **${quantidade}** mensagens!`);
        setTimeout(() => msg.delete(), 3000); // Apaga a confirmação depois de 3 segundos
        return;
    }

    // ==================== 🚫 COMANDO BAN ====================
    if (command === 'ban') {
        if (!message.member.permissions.has('BanMembers')) return message.reply('❌ Não tens permissão para banir membros!');

        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Marca quem queres banir!');
        if (!target.bannable) return message.reply('❌ Eu não consigo banir este membro.');

        const motivo = args.slice(1).join(' ') || 'Sem motivo especificado';
        await target.ban({ reason: motivo });
        return message.reply(`🚫 **${target.user.username}** foi banido!\n**Motivo:** ${motivo}`);
    }

    // ==================== 🦵 COMANDO KICK ====================
    if (command === 'kick') {
        if (!message.member.permissions.has('KickMembers')) return message.reply('❌ Não tens permissão para expulsar membros!');

        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Marca quem queres expulsar!');
        if (!target.kickable) return message.reply('❌ Eu não consigo expulsar este membro.');

        const motivo = args.slice(1).join(' ') || 'Sem motivo especificado';
        await target.kick(motivo);
        return message.reply(`✅ **${target.user.username}** foi expulso!\n**Motivo:** ${motivo}`);
    }
// ==================== 🕶️ CONTRATO COM CARGO ====================
    if (command === 'contrato') {
        const cooldown = 60 * 60 * 1000; 
        const tempoPassado = Date.now() - (db[userId].lastContract || 0);

        if (tempoPassado < cooldown) {
            const faltam = Math.ceil((cooldown - tempoPassado) / (60 * 1000));
            return message.reply(`❌ O submundo está vigiado! Espera **${faltam} minutos**.`);
        }

        if (db[userId].contract) return message.reply(`❌ Já tens um alvo: **${db[userId].contract}**!`);

        // Procura o cargo no servidor
        const cargoAssassino = message.guild.roles.cache.find(r => r.name === 'Assassino de Aluguel');
        if (cargoAssassino) {
            message.member.roles.add(cargoAssassino).catch(console.error);
        }

        const alvos = ["Geraldo da Padaria", "O Agiota", "Juiz Corrupto", "Líder de Gangue", "Político Sujo"];
        const alvoSorteado = alvos[Math.floor(Math.random() * alvos.length)];

        db[userId].contract = alvoSorteado;
        saveDB();

        return message.reply(`🕶️ **CONTRATO ACEITE:** Alvo: **${alvoSorteado}**.\nO cargo <@&${cargoAssassino?.id}> foi-te atribuído até terminares o serviço!`);
    }

    // ==================== 🎯 CONCLUIR COM RISCO DE PRISÃO ====================
    if (command === 'concluir') {
        if (!db[userId].contract) return message.reply('❌ Não tens contratos ativos!');

        // 1. Chance de ser apanhado (ex: 15% de chance)
        // Se quiseres que seja baseado nos "5 trabalhos", usamos o contador:
        const sorteioPrisao = Math.random(); 
        const foiApanhado = sorteioPrisao < 0.15; // 15% de chance de ir preso

        if (foiApanhado) {
            const multa = 20000;
            db[userId].money = Math.max(0, db[userId].money - multa);
            db[userId].contract = null;
            db[userId].lastContract = Date.now(); // Cooldown mesmo se for preso

            // Tira o cargo
            const cargoAssassino = message.guild.roles.cache.find(r => r.name === 'Assassino de Aluguel');
            if (cargoAssassino) message.member.roles.remove(cargoAssassino).catch(console.error);

            saveDB();
            return message.reply(`🚨 **FOSTE APANHADO PELA POLÍCIA!**\nO serviço para eliminar **${db[userId].contract}** falhou. Pagaste **20.000 moedas** de fiança para não seres banido do servidor!`);
        }

        // 2. Se não foi apanhado, recebe a recompensa
        const ganho = Math.floor(Math.random() * (20000 - 3000 + 1)) + 3000;
        const alvoFinalizado = db[userId].contract;

        db[userId].money += ganho;
        db[userId].contract = null;
        db[userId].lastContract = Date.now();
        db[userId].jobsDone = (db[userId].jobsDone || 0) + 1; // Aumenta o contador de trabalhos

        // Tira o cargo de assassino
        const cargoAssassino = message.guild.roles.cache.find(r => r.name === 'Assassino de Aluguel');
        if (cargoAssassino) message.member.roles.remove(cargoAssassino).catch(console.error);

        saveDB();

        const embed = new EmbedBuilder()
            .setTitle('🎯 SERVIÇO IMPECÁVEL')
            .setColor('#2b2d31')
            .setDescription(`**${message.author.username}**, eliminaste **${alvoFinalizado}** sem deixar rasto.`)
            .addFields(
                { name: '💰 Pagamento', value: `${ganho.toLocaleString()} moedas`, inline: true },
                { name: '📊 Trabalhos Feitos', value: `${db[userId].jobsDone}`, inline: true }
            );

        return message.reply({ embeds: [embed] });
    }
    // ==================== 💀 COMANDO MATAR (TIMEOUT) ====================
    if (command === 'matar') {
        // 1. Verificação de Segurança: Apenas Moderadores ou Administradores
        if (!message.member.permissions.has('ModerateMembers')) {
            return message.reply('❌ Tu não tens poder suficiente para matar alguém!');
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Marca quem desejas matar!');

        // 2. Verifica se o alvo pode ser silenciado (hierarquia de cargos)
        if (!target.moderatable) {
            return message.reply('❌ Esse membro é muito forte para ser morto (cargo superior ou igual ao meu)!');
        }

        const tempoMS = 30 * 60 * 1000; // 1 minuto em milissegundos
        const motivo = args.slice(1).join(' ') || 'Executado pela moderação';

        try {
            // Aplica o Timeout
            await target.timeout(tempoMS, motivo);
            
            return message.reply(`💀 **${target.user.username}** foi morto e enviado para o limbo por 1 minutos!\n**Motivo:** ${motivo}`);
        } catch (error) {
            console.error(error);
            return message.reply('❌ Ocorreu um erro ao tentar matar este membro.');
        }
    }
    // ==================== 📖 RESUMO DE AJUDA ATUALIZADO ====================
    if (command === 'ajuda') {
        const embed = new EmbedBuilder()
            .setTitle('📖 Central de Comandos OmniBot')
            .setColor('#5865F2')
            .setDescription('Confira abaixo o resumo de todas as ações disponíveis:')
            .addFields(
                { 
                    name: '💰 ECONOMIA', 
                    value: '`!perfil`: Vê teus dados e saldo.\n`!trabalhar`: Ganha uma quantia fixa de moedas.\n`!daily`: Ganha de 3k a 10k diários.\n`!pix @user [valor]`: Envia dinheiro para alguém.\n`!top`: Ranking dos 10 mais ricos do servidor.' 
                },
                { 
                    name: '🎰 JOGOS & CASSINO', 
                    value: '`!cassino @user [valor]`: Desafia alguém no Cara ou Coroa (PvP).\n`!dado [1 ou 2] [valor]`: Aposta contra o bot no dado de 2 lados.' 
                },
                { 
                    name: '💖 SOCIAL & CASAMENTO', 
                    value: '`!tapa @user`: Dá um tapa em alguém.\n`!ship @user com @user` - Calcula o amor.\n`!atacar @user`: Tenta atacar um membro (cuidado com o contra-ataque!).``!casar @user`: Pedido oficial (Custa 25k de cada).\n`!vercasamento`: Vê seu cônjuge e pontos de afinidade.\n`!cartinha @user`: Envia amor (Custa 7.5k / +3-6 pts).\n`!beijar @user`: Dá carinho e afinidade ao casal.\n`!divorciar @user`: Separação oficial (Zera afinidade).' 
                },
                { 
                    name: '🌑 SUBMUNDO', 
                    value: '`!crime`: Tenta um assalto arriscado.\n`!contrato`: Aceita um serviço de assassino.\n`!concluir`: Finaliza o contrato e recebe o pagamento (3k a 20k).\n`!roubar @user`: Tenta furtar 10% do saldo de alguém.' 
                },
                { 
                    name: '🛡️ STAFF', 
                    value: '`!kick @user`: Expulsa alguém.\n`!matar @user`: Mata o membro (1 min de timeout).\n`!ban @user`: Bane alguém.\n`!clear [nº]`: Limpa o chat.\n`!falar [texto]`: Faz o bot repetir sua mensagem.\n`!anuncio [texto]`: Cria um quadro de aviso vermelho.' 
                },
                { 
    name: '🛍️ MERCADO', 
    value: '`!loja`: Vê os itens à venda.\n`!comprar [item]`: Compra algo da loja.\n`!mochila`: Vê os teus itens guardados.' 
}
            )
            .setFooter({ text: 'Sua Obra-Prima - Use ! antes de cada comando.' })
            .setTimestamp();

        return message.reply({ embeds: [embed] });
    }
});

function renovarEstoque() {
    console.log("🏪 Iniciando renovação de estoque...");
    
    // Verificamos se a variável global está acessível
    if (typeof lojaItens !== 'undefined') {
        for (const id in lojaItens) {
            const novoEstoque = Math.floor(Math.random() * 5) + 1;
            lojaItens[id].estoque = novoEstoque;
        }
        console.log("✅ Estoque renovado!");
    } else {
        console.log("❌ Erro fatal: A variável lojaItens não foi encontrada no topo do código.");
    }
}

// Configuração do Timer
setInterval(renovarEstoque, 86400000);
renovarEstoque(); // Chamada inicial

client.login(process.env.TOKEN);